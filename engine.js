// CNC Engine - Job queue processing and serial communication

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const database = require('./database');
const config = require('./config');
const gcode = require('./gcode');

let port = null;
let parser = null;
let currentJobId = null;
let isConnected = false;
let responseResolvers = [];


// Scan for USB serial devices
async function scanForDevice() {
  try {
    const ports = await SerialPort.list();
    // Look for USB serial devices
    const usbPorts = ports.filter(p =>
      p.path.includes('ttyUSB') ||
      p.path.includes('ttyACM') ||
      (p.vendorId && p.productId)
    );

    if (usbPorts.length > 0) {
      console.log('Found USB devices:', usbPorts.map(p => p.path));
      return usbPorts[0].path;
    }

    console.log('No USB serial devices found');
    return null;
  } catch (err) {
    console.error('Error scanning for devices:', err);
    return null;
  }
}

// Connect to GRBL controller
async function connect(devicePath = null) {
  if (isConnected && port) {
    console.log('Already connected to', port.path);
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
      console.log('GRBL:', data);
      handleGrblResponse(data);
    });

    port.on('open', () => {
      console.log('Connected to GRBL at', path);
      isConnected = true;
    });

    port.on('error', (err) => {
      console.error('Serial error:', err);
      isConnected = false;
    });

    port.on('close', () => {
      console.log('Serial connection closed');
      isConnected = false;
    });


    // Wait for port to open
    await new Promise((resolve, reject) => {
      port.once('open', resolve);
      port.once('error', reject);
    });

    return { success: true, path: path };
  } catch (err) {
    console.error('Failed to connect:', err);
    return { success: false, error: err.message };
  }
}
/*
// Handle GRBL responses
function handleGrblResponse(data) {
  const response = data.trim();

  // Check for completion signals
  if (response === 'ok' || response.includes('Grbl')) {
    // Normal response, continue
  } else if (response.startsWith('error:')) {
    console.error('GRBL Error:', response);
  } else if (response.startsWith('<') && response.endsWith('>')) {
    // Status response
    console.log('GRBL Status:', response);
  }
}
*/

//Status based
function handleGrblResponse(data) {
  const response = data.trim();

  console.log('GRBL:', response);

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
    // Status report
    console.log('GRBL Status:', response);
   _toggleUiStatus?.(response); // optional
    return;
  }

  if (response.includes('Grbl')) {
    // Startup banner
    console.log('GRBL Startup:', response);
    return;
  }

  if (response.startsWith('ALARM')) {
    console.error('GRBL Alarm:', response);
    return;
  }

  // Other chatter can be ignored or logged
}


// Disconnect from GRBL
function disconnect() {
  if (port && port.isOpen) {
    port.close();
  }
  port = null;
  parser = null;
  isConnected = false;
}

//Status based response start
function sendCommandAndWait(command) {
  const fs = require('fs');
  fs.appendFileSync('sent_gcode.txt', command + '\n', 'utf8');

  return new Promise((resolve, reject) => {
    if (!port || !isConnected) {
      reject(new Error('Not connected to GRBL'));
      return;
    }

    responseResolvers.push((response) => {
      if (response.startsWith('ok')) {
        resolve();
      } else if (response.startsWith('error')) {
        reject(new Error(`GRBL ${response} on command: ${command}`));
      }
      // ignore status chatter
    });

    port.write(command + '\n', (err) => {
      if (err) reject(err);
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

//Status based send end.

/*
//Time based send
// Send G-code command
function sendCommand(command) {
        const fs = require('fs');
      fs.appendFileSync('sent_gcode.txt', command + '\n', 'utf8');
      
  return new Promise((resolve, reject) => {
    if (!port || !isConnected) {
      reject(new Error('Not connected to GRBL'));
      return;
    }

    port.write(command + '\n', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  
}

// Send G-code line by line with small delay
async function sendGcode(gcodeString) {
  const lines = gcodeString.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith(';');
  });

  for (const line of lines) {
    await sendCommand(line);
    // Small delay between commands for GRBL buffer
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
*/


// Print next job in queue
async function printNext() {
  // Check if already printing
  const isPrinting = await database.isAnyJobPrinting();
  if (isPrinting) {
    return { success: false, error: 'A job is already printing' };
  }

  // Get next pending job (oldest first)
  const job = await database.getNextPendingJob();
  if (!job) {
    return { success: false, error: 'No pending jobs in queue' };
  }

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

    console.log('Starting print job:', job.id);
    console.log('G-code:\n', gcodeString);

    // Send G-code to CNC
    await sendGcode(gcodeString);

    // For now, mark as completed after 10 seconds (placeholder)
    // This will be updated later when we know the actual completion signal
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
    console.error('Print error:', err);
    // Revert to pending status on error
    await database.updateJob(job.id, { status: 'Pending' });
    currentJobId = null;
    return { success: false, error: err.message };
  }
}

// Print a specific job by ID
async function printJob(jobId) {
  // Check if already printing
  const isPrinting = await database.isAnyJobPrinting();
  if (isPrinting) {
    return { success: false, error: 'A job is already printing' };
  }

  // Get the specific job
  const job = await database.getJobById(jobId);
  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status !== 'Pending') {
    return { success: false, error: 'Job is not in Pending status' };
  }

  //Testing
  const configData = await config.getConfig();
  const gcodeString = gcode.generateGcode(job, configData);
  console.log('G-code:\n', gcodeString);
  const fs = require('fs');
  fs.writeFileSync("output.txt", gcodeString.toString(), 'utf8');
  //End testing

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
    const linesPrinted = (job.message_1 ? 1 : 0) + (job.message_2 ? 1 : 0) + 1;
    const charsPrinted = (configData.template_text || '').length +
      (job.message_1 || '').length +
      (job.message_2 || '').length;

    console.log('Starting print job:', job.id);
    console.log('G-code:\n', gcodeString);

    // Send G-code to CNC
    await sendGcode(gcodeString);

    // For now, mark as completed after 10 seconds (placeholder)
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
    console.error('Print error:', err);
    await database.updateJob(job.id, { status: 'Pending' });
    currentJobId = null;
    return { success: false, error: err.message };
  }
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
  const fs = require('fs');
  fs.writeFileSync("script.txt", gcodeString.toString(), 'utf8');
      return {
      success: true,
      jobId: job.id,
      message: 'Script Saved',
    };
}

// Mark job as completed and update statistics
async function completeJob(jobId, linesPrinted = 0, charsPrinted = 0) {
  const completedAt = Math.floor(Date.now() / 1000);
  await database.updateJob(jobId, {
    status: 'Completed',
    completed_at: completedAt
  });

  // Update statistics
  await database.incrementStat('total_jobs_completed');
  await database.incrementStat('total_lines_printed', linesPrinted);
  await database.incrementStat('total_chars_printed', charsPrinted);
  await database.updateDailyStat('jobs_completed');
  await database.updateDailyStat('lines_printed', linesPrinted);
  await database.updateDailyStat('chars_printed', charsPrinted);

  console.log('Job completed:', jobId);
  currentJobId = null;
}

// Get connection status
function getStatus() {
  return {
    connected: isConnected,
    port: port ? port.path : null,
    currentJobId: currentJobId
  };
}

// Get available USB devices
async function listDevices() {
  try {
    const ports = await SerialPort.list();
    return ports.filter(p =>
      p.path.includes('ttyUSB') ||
      p.path.includes('ttyACM') ||
      (p.vendorId && p.productId)
    );
  } catch (err) {
    console.error('Error listing devices:', err);
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
  getStatus,
  listDevices
};
