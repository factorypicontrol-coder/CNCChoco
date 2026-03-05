// CNC Engine - Job queue processing and serial communication

const fs = require('fs');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const logger = require('./logger');
const database = require('./database');
const config = require('./config');
const gcode = require('./gcode');

let port = null;
let parser = null;
let currentJobId = null;
let isConnected = false;
let responseResolvers = [];
let printLock = false;
let lastStatusReport = null;
let statusReportCallback = null;
let isCalibrated = false;


// Scan for USB serial devices
async function scanForDevice() {
  try {
    const ports = await SerialPort.list();
    // Look for USB serial devices
    const usbPorts = ports.filter(p =>
      (p.path && p.path.includes('ttyUSB')) ||
      (p.path && p.path.includes('ttyACM')) ||
      (p.path && p.vendorId && p.productId)
    );

    if (usbPorts.length > 0) {
      logger.log('Found USB devices:', usbPorts.map(p => p.path));
      return usbPorts[0].path;
    }

    logger.log('No USB serial devices found');
    return null;
  } catch (err) {
    logger.error('Error scanning for devices:', err);
    return null;
  }
}

// Connect to GRBL controller
async function connect(devicePath = null) {
  if (isConnected && port) {
    logger.log('Already connected to', port.path);
    return { success: true, path: port.path };
  }

  try {
    const path = devicePath || await scanForDevice();

    if (!path) {
      return { success: false, error: 'No USB device found' };
    }

    port = new SerialPort({
      path: path,
      baudRate: 115200
    });

    parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (data) => {
      handleGrblResponse(data);
    });

    port.on('open', () => {
      logger.log('Connected to GRBL at', path);
      isConnected = true;
    });

    port.on('error', (err) => {
      logger.error('Serial error:', err);
      isConnected = false;
    });

    port.on('close', () => {
      logger.log('Serial connection closed');
      isConnected = false;
    });


    // Wait for port to open
    await new Promise((resolve, reject) => {
      port.once('open', resolve);
      port.once('error', reject);
    });

    // Wait for GRBL to finish booting (sends welcome banner ~2s after open)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const appliedSettings = await applyGrblSettings();

    return { success: true, path: path, appliedSettings };
  } catch (err) {
    logger.error('Failed to connect:', err);
    return { success: false, error: err.message };
  }
}

// Apply critical GRBL machine settings after connection
async function applyGrblSettings() {
  const settings = [
    { cmd: '$21=1', desc: 'Hard limits enabled' },
    { cmd: '$22=1', desc: 'Homing cycle enabled' }
  ];

  const results = [];
  for (const { cmd, desc } of settings) {
    try {
      await sendCommandAndWait(cmd, 5000);
      logger.log(`Applied GRBL setting: ${cmd} (${desc})`);
      results.push({ setting: cmd, success: true });
    } catch (err) {
      logger.warn(`Failed to apply GRBL setting ${cmd}: ${err.message}`);
      results.push({ setting: cmd, success: false, error: err.message });
    }
  }
  return results;
}
// Parse GRBL status report string like <Idle|MPos:0.000,0.000,0.000|FS:0,0>
function parseStatusReport(raw) {
  const inner = raw.slice(1, -1);
  const parts = inner.split('|');
  const state = parts[0];
  const result = { state, mpos: null, wpos: null, raw };

  for (const part of parts) {
    if (part.startsWith('MPos:')) {
      const coords = part.substring(5).split(',').map(Number);
      result.mpos = { x: coords[0], y: coords[1], z: coords[2] };
    } else if (part.startsWith('WPos:')) {
      const coords = part.substring(5).split(',').map(Number);
      result.wpos = { x: coords[0], y: coords[1], z: coords[2] };
    }
  }

  return result;
}

function handleGrblResponse(data) {
  const response = data.trim();

  logger.log('GRBL:', response);

  // --- Flow control FIRST ---
  if (responseResolvers.length > 0) {
    if (response === 'ok') {
      responseResolvers.shift()('ok');
      return;
    }

    if (response.startsWith('error:')) {
      responseResolvers.shift()(response);
      return;
    }
  }

  // --- Non-blocking informational handling ---
  if (response.startsWith('<') && response.endsWith('>')) {
    lastStatusReport = parseStatusReport(response);
    if (statusReportCallback) {
      const cb = statusReportCallback;
      statusReportCallback = null;
      cb(lastStatusReport);
    }
    return;
  }

  if (response.includes('Grbl')) {
    // Startup banner
    logger.log('GRBL Startup:', response);
    return;
  }

  if (response.startsWith('ALARM')) {
    logger.error('GRBL Alarm:', response);
    return;
  }

  // Other chatter can be ignored or logged
}


// Disconnect from GRBL
function disconnect() {
  // Reject any pending command resolvers
  const pending = responseResolvers;
  responseResolvers = [];
  pending.forEach(resolver => {
    try { resolver('error:disconnected'); } catch (e) { /* already rejected */ }
  });

  if (port && port.isOpen) {
    port.close();
  }
  port = null;
  parser = null;
  isConnected = false;
}

function sendCommandAndWait(command, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (!port || !isConnected) {
      reject(new Error('Not connected to GRBL'));
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        // Remove this resolver from the queue
        const idx = responseResolvers.indexOf(resolver);
        if (idx !== -1) responseResolvers.splice(idx, 1);
        reject(new Error(`GRBL timeout (${timeoutMs}ms) on command: ${command}`));
      }
    }, timeoutMs);

    const resolver = (response) => {
      if (settled) return;
      if (response.startsWith('ok')) {
        settled = true;
        clearTimeout(timeout);
        resolve();
      } else if (response.startsWith('error')) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`GRBL ${response} on command: ${command}`));
      }
      // ignore status chatter
    };

    responseResolvers.push(resolver);

    port.write(command + '\n', (err) => {
      if (err && !settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

async function sendGcode(gcodeString) {
  const lines = gcodeString
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith(';'));

  for (const line of lines) {
    await sendCommandAndWait(line);

    // Small safety delay (optional but recommended)
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}



// Print next job in queue
async function printNext() {
  if (printLock) {
    return { success: false, error: 'A print operation is already in progress' };
  }
  printLock = true;
  try {
    return await _printNext();
  } finally {
    printLock = false;
  }
}

async function _executePrint(job) {
  // Ensure we're connected
  if (!isConnected) {
    const connectResult = await connect();
    if (!connectResult.success) {
      return { success: false, error: 'Failed to connect to CNC: ' + connectResult.error };
    }
  }

  // Update job status to Printing
  await database.updateJob(job.id, { status: 'Printing' });
  currentJobId = job.id;

  try {
    // Get config and generate G-code
    const configData = await config.getConfig();
    const gcodeString = gcode.generateGcode(job, configData);

    // Calculate statistics
    const linesPrinted = (job.message_1 ? 1 : 0) + (job.message_2 ? 1 : 0) + 1; // +1 for template
    const charsPrinted = (configData.template_text || '').length +
      (job.message_1 || '').length +
      (job.message_2 || '').length;

    logger.log('Starting print job:', job.id);
    logger.log('G-code:\n', gcodeString);

    // Send G-code to CNC
    await sendGcode(gcodeString);

    // Mark as completed after 10 seconds (placeholder for actual GRBL completion signal)
    setTimeout(async () => {
      await completeJob(job.id, linesPrinted, charsPrinted);
    }, 10000);

    return {
      success: true,
      jobId: job.id,
      message: 'Print job started',
      gcode: gcodeString,
      stats: { linesPrinted, charsPrinted }
    };
  } catch (err) {
    logger.error('Print error:', err);
    await database.updateJob(job.id, { status: 'Pending' });
    currentJobId = null;
    return { success: false, error: err.message };
  }
}

async function _printNext() {
  const isPrinting = await database.isAnyJobPrinting();
  if (isPrinting) {
    return { success: false, error: 'A job is already printing' };
  }

  const job = await database.getNextPendingJob();
  if (!job) {
    return { success: false, error: 'No pending jobs in queue' };
  }

  return _executePrint(job);
}

// Print a specific job by ID
async function printJob(jobId) {
  if (printLock) {
    return { success: false, error: 'A print operation is already in progress' };
  }
  printLock = true;
  try {
    return await _printJob(jobId);
  } finally {
    printLock = false;
  }
}

async function _printJob(jobId) {
  const isPrinting = await database.isAnyJobPrinting();
  if (isPrinting) {
    return { success: false, error: 'A job is already printing' };
  }

  const job = await database.getJobById(jobId);
  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status !== 'Pending') {
    return { success: false, error: 'Job is not in Pending status' };
  }

  return _executePrint(job);
}

// Print only the gcode of a print job to script.txt
async function printScript(jobId) {
  // Get the specific job
  const job = await database.getJobById(jobId);
  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  const configData = await config.getConfig();
  const gcodeString = gcode.generateGcode(job, configData);
  fs.writeFileSync("script.txt", gcodeString.toString(), 'utf8');
      return {
      success: true,
      jobId: job.id,
      message: 'Script Saved',
      gcode: gcodeString,
    };
}

// Mark job as completed and update statistics
async function completeJob(jobId, linesPrinted = 0, charsPrinted = 0) {
  const completedAt = Math.floor(Date.now() / 1000);
  await database.updateJob(jobId, {
    status: 'Completed',
    completed_at: completedAt
  });

  // Update statistics in parallel
  await Promise.all([
    database.incrementStat('total_jobs_completed'),
    database.incrementStat('total_lines_printed', linesPrinted),
    database.incrementStat('total_chars_printed', charsPrinted),
    database.updateDailyStat('jobs_completed'),
    database.updateDailyStat('lines_printed', linesPrinted),
    database.updateDailyStat('chars_printed', charsPrinted)
  ]);

  logger.log('Job completed:', jobId);
  currentJobId = null;
}

// ============================================
// Calibration functions
// ============================================

// Query current GRBL position via real-time '?' command
function queryPosition(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (!port || !isConnected) {
      reject(new Error('Not connected to GRBL'));
      return;
    }

    const timeout = setTimeout(() => {
      statusReportCallback = null;
      reject(new Error('Status query timeout'));
    }, timeoutMs);

    statusReportCallback = (report) => {
      clearTimeout(timeout);
      resolve(report);
    };

    // '?' is a real-time command, does not produce 'ok', produces <...> status report
    port.write('?', (err) => {
      if (err) {
        clearTimeout(timeout);
        statusReportCallback = null;
        reject(err);
      }
    });
  });
}

// Home the machine via $H
async function home() {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }
  if (printLock || currentJobId) {
    return { success: false, error: 'Cannot home while a job is printing' };
  }

  try {
    await sendCommandAndWait('$H', 60000);
    isCalibrated = false;
    const position = await queryPosition();
    return { success: true, message: 'Homing complete', position };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Clear alarm lock via $X
async function unlock() {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }

  try {
    await sendCommandAndWait('$X', 5000);
    return { success: true, message: 'Alarm cleared' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Jog the tool along an axis
async function jog(axis, distance, feedRate = 500) {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }
  if (printLock || currentJobId) {
    return { success: false, error: 'Cannot jog while a job is printing' };
  }

  const upperAxis = axis.toUpperCase();
  if (!['X', 'Y', 'Z'].includes(upperAxis)) {
    return { success: false, error: 'Invalid axis. Must be X, Y, or Z' };
  }
  if (!Number.isFinite(distance)) {
    return { success: false, error: 'Distance must be a finite number' };
  }

  try {
    await sendCommandAndWait(`$J=G91 ${upperAxis}${distance} F${feedRate}`, 30000);
    const position = await queryPosition();
    return { success: true, position };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Move to absolute work coordinates (G54)
async function moveTo(x, y, z, feedRate = 500) {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }
  if (printLock || currentJobId) {
    return { success: false, error: 'Cannot move while a job is printing' };
  }

  const coords = [];
  if (x !== undefined && x !== null && x !== '') coords.push(`X${Number(x).toFixed(3)}`);
  if (y !== undefined && y !== null && y !== '') coords.push(`Y${Number(y).toFixed(3)}`);
  if (z !== undefined && z !== null && z !== '') coords.push(`Z${Number(z).toFixed(3)}`);

  if (coords.length === 0) {
    return { success: false, error: 'At least one coordinate required' };
  }

  try {
    await sendCommandAndWait('G90 G54', 5000);
    await sendCommandAndWait(`G0 ${coords.join(' ')}`, 60000);
    const position = await queryPosition();
    return { success: true, position };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Cancel an active jog via real-time command 0x85
function jogCancel() {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }
  port.write(Buffer.from([0x85]));
  return { success: true, message: 'Jog cancel sent' };
}

// Set G54 work coordinate offset at current position
async function setWorkOffset(xDelta = 0, yDelta = 0) {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }
  if (printLock || currentJobId) {
    return { success: false, error: 'Cannot set offset while a job is printing' };
  }

  try {
    const status = await queryPosition();

    if (!status.mpos) {
      return { success: false, error: 'Could not read machine position. Ensure GRBL $10 setting reports MPos ($10=1 or $10=2).' };
    }

    const { x, y, z } = status.mpos;
    const ox = x + xDelta;
    const oy = y + yDelta;
    await sendCommandAndWait(`G10 L2 P1 X${ox} Y${oy} Z${z}`, 5000);
    isCalibrated = true;

    return {
      success: true,
      message: 'G54 work offset set successfully',
      machinePosition: status.mpos,
      offset: { x: ox, y: oy, z }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Dry-run: trace bar boundary rectangle at safe Z height
async function dryRunBoundary(barWidth, barHeight, zSafe, feedRate) {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }
  if (printLock || currentJobId) {
    return { success: false, error: 'Cannot run dry run while a job is printing' };
  }

  printLock = true;
  try {
    const gcodeLines = [
      'G54',
      'G21',
      'G90',
      `G0 Z${zSafe}`,
      'G0 X0 Y0',
      `G1 X${barWidth} Y0 F${feedRate}`,
      `G1 X${barWidth} Y${barHeight}`,
      `G1 X0 Y${barHeight}`,
      'G1 X0 Y0',
      `G0 Z${zSafe}`,
      'G0 X0 Y0'
    ];

    await sendGcode(gcodeLines.join('\n'));

    return {
      success: true,
      message: 'Dry run complete',
      boundary: { width: barWidth, height: barHeight }
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    printLock = false;
  }
}

async function traceJobBoundary(x0, y0, x1, y1, zSafe, feedRate) {
  if (!port || !isConnected) {
    return { success: false, error: 'Not connected to GRBL' };
  }
  if (printLock || currentJobId) {
    return { success: false, error: 'Cannot trace while a job is printing' };
  }

  printLock = true;
  try {
    const gcodeLines = [
      'G54',
      'G21',
      'G90',
      `G0 Z${zSafe}`,
      `G0 X${x0.toFixed(3)} Y${y0.toFixed(3)}`,
      `G1 X${x1.toFixed(3)} Y${y0.toFixed(3)} F${feedRate}`,
      `G1 X${x1.toFixed(3)} Y${y1.toFixed(3)}`,
      `G1 X${x0.toFixed(3)} Y${y1.toFixed(3)}`,
      `G1 X${x0.toFixed(3)} Y${y0.toFixed(3)}`,
      `G0 Z${zSafe}`,
      'G0 X0 Y0'
    ];

    await sendGcode(gcodeLines.join('\n'));

    return {
      success: true,
      message: 'Job boundary trace complete',
      boundary: { x0, y0, x1, y1 }
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    printLock = false;
  }
}

// Emergency stop — sends GRBL soft reset (Ctrl-X / 0x18) to immediately halt all motion.
// Clears the motion planner buffer, reverts the active job to Pending, and releases the print lock.
// The machine must be re-homed after an emergency stop.
function emergencyStop() {
  // Reject all pending command resolvers — GRBL will discard its buffer and won't send 'ok'
  const pending = responseResolvers;
  responseResolvers = [];
  pending.forEach(resolver => {
    try { resolver('error:emergency-stop'); } catch (e) { /* already settled */ }
  });

  // Send GRBL soft reset (real-time command, no newline needed)
  if (port && isConnected) {
    port.write(Buffer.from([0x18]));
  }

  // Revert the current job back to Pending so it can be retried
  const jobId = currentJobId;
  currentJobId = null;
  printLock = false;

  if (jobId) {
    database.updateJob(jobId, { status: 'Pending' }).catch(err => {
      logger.error('Error reverting job after emergency stop:', err);
    });
  }

  return { success: true, message: 'Emergency stop sent — machine halted and reset' };
}

// Get connection status
function getStatus() {
  return {
    connected: isConnected,
    port: port ? port.path : null,
    currentJobId: currentJobId,
    isCalibrated: isCalibrated,
    lastPosition: lastStatusReport
  };
}

// Get available USB devices
async function listDevices() {
  try {
    const ports = await SerialPort.list();
    return ports.filter(p =>
      (p.path && p.path.includes('ttyUSB')) ||
      (p.path && p.path.includes('ttyACM')) ||
      (p.path && p.vendorId && p.productId)
    );
  } catch (err) {
    logger.error('Error listing devices:', err);
    return [];
  }
}

module.exports = {
  scanForDevice,
  connect,
  disconnect,
  sendCommandAndWait,
  sendGcode,
  printNext,
  printJob,
  printScript,
  completeJob,
  emergencyStop,
  getStatus,
  listDevices,
  // Calibration
  home,
  unlock,
  jog,
  moveTo,
  jogCancel,
  setWorkOffset,
  dryRunBoundary,
  traceJobBoundary,
  queryPosition
};
