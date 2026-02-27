// API endpoints for CNC Chocolate Engraver

const express = require('express');
const database = require('./database');
const configModule = require('./config');
const engine = require('./engine');
const { generateGcode } = require('./gcode');

const router = express.Router();

// ============================================
// Job APIs
// ============================================

/**
 * @swagger
 * /api/createjob:
 *   post:
 *     summary: Create a new engraving job
 *     description: Creates a new job in the queue with customer details and messages to engrave
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *     responses:
 *       200:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Job created successfully
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/createjob', async (req, res) => {
  try {
    const jobData = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email_address: req.body.email_address,
      phone_number: req.body.phone_number,
      question_1: req.body.question_1,
      question_2: req.body.question_2,
      question_3: req.body.question_3,
      best_contact: req.body.best_contact,
      contact_details: req.body.contact_details,
      reach_out_next_month: req.body.reach_out_next_month,
      message_1: req.body.message_1,
      message_2: req.body.message_2,
      agreement: req.body.agreement
    };

    const result = await database.createJob(jobData);

    // Update statistics
    await database.incrementStat('total_jobs_created');
    await database.updateDailyStat('jobs_created');

    res.json({
      success: true,
      id: result.id,
      message: 'Job created successfully'
    });
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/getqueue:
 *   get:
 *     summary: Get all jobs in queue
 *     description: Retrieves all jobs with optional status filter
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Printing, Completed, Cancelled_by_User, Cancelled_by_Admin]
 *         description: Filter jobs by status
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *       400:
 *         description: Invalid status filter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/getqueue', async (req, res) => {
  try {
    const statusFilter = req.query.status || null;

    // Validate status if provided
    if (statusFilter && !configModule.JOB_STATUSES.includes(statusFilter)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid values: ${configModule.JOB_STATUSES.join(', ')}`
      });
    }

    const jobs = await database.getJobs(statusFilter);
    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs
    });
  } catch (err) {
    console.error('Error getting queue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/getjob/{id}:
 *   get:
 *     summary: Get a single job by ID
 *     description: Retrieves detailed information about a specific job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 job:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/getjob/:id', async (req, res) => {
  try {
    const job = await database.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, job: job });
  } catch (err) {
    console.error('Error getting job:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/updatejobs/bulk:
 *   patch:
 *     summary: Bulk update multiple jobs
 *     description: Updates the status of multiple jobs at once
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateRequest'
 *     responses:
 *       200:
 *         description: Jobs updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 changes:
 *                   type: integer
 *                   example: 3
 *                 message:
 *                   type: string
 *                   example: 3 jobs updated
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/updatejobs/bulk', async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No job IDs provided' });
    }

    if (!status || !configModule.JOB_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid values: ${configModule.JOB_STATUSES.join(', ')}`
      });
    }

    const result = await database.updateJobsBulk(ids, { status });

    // Track cancelled jobs for statistics using actual changes count
    if (status.startsWith('Cancelled') && result.changes > 0) {
      await database.incrementStat('total_jobs_cancelled', result.changes);
      await database.updateDailyStat('jobs_cancelled', result.changes);
    }

    res.json({
      success: true,
      changes: result.changes,
      message: `${result.changes} jobs updated`
    });
  } catch (err) {
    console.error('Error bulk updating jobs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/updatejobs/{id}:
 *   patch:
 *     summary: Update a job (partial update)
 *     description: Updates specific fields of a job. Only include fields you want to change.
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobRequest'
 *     responses:
 *       200:
 *         description: Job updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 changes:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Job updated successfully
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/updatejobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const updates = req.body;

    // Validate status if being updated
    if (updates.status && !configModule.JOB_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid values: ${configModule.JOB_STATUSES.join(', ')}`
      });
    }

    // Check if job exists
    const existingJob = await database.getJobById(jobId);
    if (!existingJob) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const result = await database.updateJob(jobId, updates);

    // Track cancellation statistics
    if (updates.status && updates.status.startsWith('Cancelled') && !existingJob.status.startsWith('Cancelled') && result.changes > 0) {
      await database.incrementStat('total_jobs_cancelled', 1);
      await database.updateDailyStat('jobs_cancelled', 1);
    }

    res.json({
      success: true,
      changes: result.changes,
      message: 'Job updated successfully'
    });
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/updatejobs/{id}:
 *   put:
 *     summary: Update a job (full update)
 *     description: Updates a job with the provided data
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateJobRequest'
 *     responses:
 *       200:
 *         description: Job updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 changes:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Job updated successfully
 *       404:
 *         description: Job not found
 *       400:
 *         description: Invalid status value
 */
router.put('/updatejobs/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const updates = req.body;

    // Validate status if being updated
    if (updates.status && !configModule.JOB_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Valid values: ${configModule.JOB_STATUSES.join(', ')}`
      });
    }

    const existingJob = await database.getJobById(jobId);
    if (!existingJob) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const result = await database.updateJob(jobId, updates);
    res.json({
      success: true,
      changes: result.changes,
      message: 'Job updated successfully'
    });
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Print API
// ============================================

/**
 * @swagger
 * /api/print:
 *   get:
 *     summary: Print next pending job
 *     description: Triggers printing of the next job in the queue (oldest pending job first)
 *     tags: [Print]
 *     responses:
 *       200:
 *         description: Print job started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrintResponse'
 *       400:
 *         description: Cannot print (already printing or no pending jobs)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/print', (req, res) => {
  res.json({ success: true, message: 'Print Request Received' });
  engine.printNext().then(result => {
    if (!result.success) console.warn('Print next failed:', result.error);
  }).catch(err => console.error('Error printing:', err));
});

/**
 * @swagger
 * /api/print/{id}:
 *   get:
 *     summary: Print a specific job
 *     description: Triggers printing of a specific job by ID. Job must be in Pending status.
 *     tags: [Print]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID to print
 *     responses:
 *       200:
 *         description: Print job started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PrintResponse'
 *       400:
 *         description: Cannot print (already printing, job not pending, or job not found)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/print/:id', (req, res) => {
  const jobId = parseInt(req.params.id);
  res.json({ success: true, message: 'Print Request Received' });
  engine.printJob(jobId).then(result => {
    if (!result.success) console.warn(`Print job ${jobId} failed:`, result.error);
  }).catch(err => console.error(`Error printing job ${jobId}:`, err));
});

/**
 * @swagger
 * /api/script/{id}:
 *   get:
 *     summary: Download G-code script for a job
 *     description: Generates and returns the full G-code script for a specific job as a plain-text file download. Does not send anything to the machine.
 *     tags: [Print]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Job ID
 *     responses:
 *       200:
 *         description: G-code script as plain text
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       400:
 *         description: Job not found or generation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/script/:id', async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const result = await engine.printScript(jobId);
    if (result.success) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="script_job_${jobId}.txt"`);
      res.send(result.gcode);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error scripting job:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============================================
// Config APIs
// ============================================

/**
 * @swagger
 * /api/getConfig:
 *   get:
 *     summary: Get all configuration values
 *     description: Retrieves all system configuration including available options
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Configuration data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 config:
 *                   $ref: '#/components/schemas/Config'
 *                 availableFonts:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["hershey", "block", "script"]
 *                 templateAlignments:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["left", "centered", "right"]
 *                 messageAlignments:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["left", "centered"]
 *                 jobStatuses:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Pending", "Printing", "Completed", "Cancelled_by_User", "Cancelled_by_Admin"]
 */
router.get('/getConfig', async (req, res) => {
  try {
    const config = await configModule.getConfig();
    res.json({
      success: true,
      config: config,
      availableFonts: configModule.AVAILABLE_FONTS,
      templateAlignments: configModule.TEMPLATE_ALIGNMENTS,
      messageAlignments: configModule.MESSAGE_ALIGNMENTS,
      jobStatuses: configModule.JOB_STATUSES
    });
  } catch (err) {
    console.error('Error getting config:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/updateConfig:
 *   patch:
 *     summary: Update configuration values
 *     description: Updates one or more configuration values. Only include keys you want to change.
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateConfigRequest'
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Config updated successfully
 *                 config:
 *                   $ref: '#/components/schemas/Config'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/updateConfig', async (req, res) => {
  try {
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided'
      });
    }

    await configModule.updateConfigMultiple(updates);

    // Return updated config
    const config = await configModule.getConfig();
    res.json({
      success: true,
      message: 'Config updated successfully',
      config: config
    });
  } catch (err) {
    console.error('Error updating config:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================
// Engine/Status APIs
// ============================================

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get CNC connection status
 *     description: Returns current CNC connection status and available USB devices
 *     tags: [CNC Control]
 *     responses:
 *       200:
 *         description: Status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   $ref: '#/components/schemas/CNCStatus'
 *                 availableDevices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                         example: /dev/ttyUSB0
 *                       vendorId:
 *                         type: string
 *                       productId:
 *                         type: string
 */
router.get('/status', async (req, res) => {
  try {
    const status = engine.getStatus();
    const devices = await engine.listDevices();
    res.json({
      success: true,
      status: status,
      availableDevices: devices
    });
  } catch (err) {
    console.error('Error getting status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/connect:
 *   post:
 *     summary: Connect to CNC device
 *     description: Connects to a CNC device. If no path specified, auto-detects first available USB device.
 *     tags: [CNC Control]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConnectRequest'
 *     responses:
 *       200:
 *         description: Connection result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 path:
 *                   type: string
 *                   example: /dev/ttyUSB0
 *       500:
 *         description: Connection failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/connect', async (req, res) => {
  try {
    const devicePath = req.body.path || null;
    const result = await engine.connect(devicePath);
    res.json(result);
  } catch (err) {
    console.error('Error connecting:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/disconnect:
 *   post:
 *     summary: Disconnect from CNC device
 *     description: Disconnects from the currently connected CNC device
 *     tags: [CNC Control]
 *     responses:
 *       200:
 *         description: Disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/disconnect', async (req, res) => {
  try {
    engine.disconnect();
    res.json({ success: true, message: 'Disconnected' });
  } catch (err) {
    console.error('Error disconnecting:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/estop:
 *   post:
 *     summary: Emergency stop
 *     description: |
 *       Immediately halts all CNC motion by sending the GRBL soft reset command (Ctrl-X / 0x18).
 *       This clears the motion planner buffer and stops the machine instantly.
 *       Any active print job is reverted to **Pending** status so it can be retried.
 *       The machine must be re-homed before resuming normal operation.
 *     tags: [CNC Control]
 *     responses:
 *       200:
 *         description: Emergency stop sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/estop', (req, res) => {
  try {
    const result = engine.emergencyStop();
    res.json(result);
  } catch (err) {
    console.error('Error during emergency stop:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/command:
 *   post:
 *     summary: Send raw G-code command
 *     description: Sends a raw G-code command to the CNC controller
 *     tags: [CNC Control]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommandRequest'
 *     responses:
 *       200:
 *         description: Command sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: No G-code provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Not connected or send failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/command', async (req, res) => {
  try {
    const { gcode } = req.body;
    if (!gcode) {
      return res.status(400).json({ success: false, error: 'No gcode provided' });
    }

    await engine.sendCommandAndWait(gcode);
    res.json({ success: true, message: 'Command sent' });
  } catch (err) {
    console.error('Error sending command:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Calibration APIs
// ============================================

/**
 * @swagger
 * /api/calibrate/home:
 *   post:
 *     summary: Home the machine
 *     description: Sends $H homing cycle to find limit switches and establish machine zero. Takes up to 60 seconds.
 *     tags: [Calibration]
 *     responses:
 *       200:
 *         description: Homing result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 position:
 *                   $ref: '#/components/schemas/GrblPosition'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/calibrate/home', async (req, res) => {
  try {
    const result = await engine.home();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error homing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/calibrate/unlock:
 *   post:
 *     summary: Clear alarm lock
 *     description: Sends $X to clear GRBL alarm state. Use after homing failure or alarm.
 *     tags: [Calibration]
 *     responses:
 *       200:
 *         description: Unlock result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/calibrate/unlock', async (req, res) => {
  try {
    const result = await engine.unlock();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error unlocking:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/calibrate/jog:
 *   post:
 *     summary: Jog the tool along an axis
 *     description: Sends a GRBL jog command to move the tool incrementally. Used during calibration to position the tool over the chocolate bar corner.
 *     tags: [Calibration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JogRequest'
 *     responses:
 *       200:
 *         description: Jog completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 position:
 *                   $ref: '#/components/schemas/GrblPosition'
 *       400:
 *         description: Invalid parameters or not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/calibrate/jog', async (req, res) => {
  try {
    const { axis, distance, feedRate } = req.body;

    if (!axis || distance === undefined || distance === null) {
      return res.status(400).json({ success: false, error: 'axis and distance are required' });
    }

    const configData = await configModule.getConfig();
    const jogFeed = feedRate ? Number(feedRate) : configData.jog_feed_rate;

    const result = await engine.jog(axis, Number(distance), jogFeed);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error jogging:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/calibrate/jog/cancel:
 *   post:
 *     summary: Cancel active jog
 *     description: Sends real-time jog cancel command (0x85) to immediately stop jog motion.
 *     tags: [Calibration]
 *     responses:
 *       200:
 *         description: Jog cancel sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post('/calibrate/jog/cancel', (req, res) => {
  const result = engine.jogCancel();
  res.json(result);
});

/**
 * @swagger
 * /api/calibrate/moveto:
 *   post:
 *     summary: Move to absolute work coordinates
 *     description: Moves the tool to specified X, Y, Z work coordinates (G54). Omit any axis to leave it unchanged.
 *     tags: [Calibration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               x: { type: number, description: 'Target X work coordinate (mm)' }
 *               y: { type: number, description: 'Target Y work coordinate (mm)' }
 *               z: { type: number, description: 'Target Z work coordinate (mm)' }
 *               feedRate: { type: number, description: 'Feed rate mm/min (default 500)' }
 *     responses:
 *       200:
 *         description: Move complete
 *       400:
 *         description: Invalid request or move failed
 */
router.post('/calibrate/moveto', async (req, res) => {
  try {
    const { x, y, z, feedRate } = req.body;
    const result = await engine.moveTo(x, y, z, feedRate);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/calibrate/position:
 *   get:
 *     summary: Query current position
 *     description: Sends GRBL real-time status query (?) and returns current machine and work positions.
 *     tags: [Calibration]
 *     responses:
 *       200:
 *         description: Current position
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 position:
 *                   $ref: '#/components/schemas/GrblPosition'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/calibrate/position', async (req, res) => {
  try {
    const position = await engine.queryPosition();
    res.json({ success: true, position });
  } catch (err) {
    console.error('Error querying position:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/calibrate/setorigin:
 *   post:
 *     summary: Set G54 work coordinate offset
 *     description: Sets the current machine position as the G54 work coordinate origin (0,0,0). Stores the offset in GRBL EEPROM. Requires GRBL $10=1 or $10=2 for MPos reporting. Optional xDelta/yDelta shift the origin by a fixed amount (mm).
 *     tags: [Calibration]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               xDelta:
 *                 type: number
 *                 description: Shift origin by this amount in X (mm, default 0)
 *                 example: 0
 *               yDelta:
 *                 type: number
 *                 description: Shift origin by this amount in Y (mm, default 0)
 *                 example: 0
 *     responses:
 *       200:
 *         description: Origin set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 machinePosition:
 *                   type: object
 *                   properties:
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     z:
 *                       type: number
 *                 offset:
 *                   type: object
 *                   properties:
 *                     x:
 *                       type: number
 *                     y:
 *                       type: number
 *                     z:
 *                       type: number
 *       400:
 *         description: Cannot set offset (not connected, printing, or MPos unavailable)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/calibrate/setorigin', async (req, res) => {
  try {
    const xDelta = req.body?.xDelta ?? 0;
    const yDelta = req.body?.yDelta ?? 0;
    const result = await engine.setWorkOffset(xDelta, yDelta);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error setting origin:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/calibrate/dryrun:
 *   post:
 *     summary: Dry-run bar boundary
 *     description: Traces the chocolate bar boundary rectangle at safe Z height using G54 coordinates. Verifies calibration alignment without engraving.
 *     tags: [Calibration]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DryRunRequest'
 *     responses:
 *       200:
 *         description: Dry run completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 boundary:
 *                   type: object
 *                   properties:
 *                     width:
 *                       type: number
 *                     height:
 *                       type: number
 *       400:
 *         description: Cannot run (not connected or printing)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/calibrate/dryrun', async (req, res) => {
  try {
    const configData = await configModule.getConfig();
    const barWidth = req.body?.barWidth || configData.bar_width;
    const barHeight = req.body?.barHeight || configData.bar_height;
    const zSafe = configData.z_safe_height;
    const feedRate = configData.feed_rate;

    const result = await engine.dryRunBoundary(barWidth, barHeight, zSafe, feedRate);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error running dry run:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/calibrate/tracejob:
 *   post:
 *     summary: Trace print area of a job
 *     description: Calculates the minimum bounding rectangle of a job's text layout, adds 1mm padding on each side, and traces it at safe Z height. If no jobId is provided, uses the next pending job.
 *     tags: [Calibration]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobId:
 *                 type: integer
 *                 nullable: true
 *                 description: Specific job ID to trace. Omit to use the next pending job.
 *                 example: 5
 *     responses:
 *       200:
 *         description: Trace complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 jobId: { type: integer, nullable: true }
 *                 boundary:
 *                   type: object
 *                   properties:
 *                     x0: { type: number }
 *                     y0: { type: number }
 *                     x1: { type: number }
 *                     y1: { type: number }
 *       400:
 *         description: Not connected or busy
 */
router.post('/calibrate/tracejob', async (req, res) => {
  try {
    const configData = await configModule.getConfig();

    // Use the specified job ID if provided, otherwise fall back to next pending job
    let job;
    const requestedId = req.body?.jobId;
    if (requestedId !== undefined && requestedId !== null && requestedId !== '') {
      job = await database.getJobById(Number(requestedId));
      if (!job) {
        return res.status(404).json({ success: false, error: `Job #${requestedId} not found` });
      }
    } else {
      job = (await database.getNextPendingJob()) || { message_1: '', message_2: '' };
    }

    // Generate the actual G-code for this job so we measure real coordinates
    const gcode = generateGcode(job, configData);

    // Parse all G1/G2/G3 engraving moves to find the true X/Y bounding box.
    // We deliberately skip G0 rapids (safe-height traversals) and the return-to-origin
    // at the end — only the actual engraving strokes matter for fit verification.
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;

    for (const rawLine of gcode.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith(';')) continue;

      // Only consider engraving moves
      if (!/^G[123]\b/i.test(line)) continue;

      const xMatch = line.match(/X(-?\d+(?:\.\d+)?)/i);
      const yMatch = line.match(/Y(-?\d+(?:\.\d+)?)/i);

      if (xMatch) {
        const x = parseFloat(xMatch[1]);
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
      }
      if (yMatch) {
        const y = parseFloat(yMatch[1]);
        yMin = Math.min(yMin, y);
        yMax = Math.max(yMax, y);
      }
    }

    if (xMin === Infinity) {
      return res.status(400).json({ success: false, error: 'No engraving moves found in generated G-code' });
    }

    const PAD = 1;
    const x0 = xMin - PAD;
    const y0 = yMin - PAD;
    const x1 = xMax + PAD;
    const y1 = yMax + PAD;

    const result = await engine.traceJobBoundary(x0, y0, x1, y1, configData.z_safe_height, configData.feed_rate);
    if (result.success) {
      res.json({ ...result, jobId: job.id || null, boundary: { x0, y0, x1, y1 } });
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error('Error tracing job boundary:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// Statistics APIs
// ============================================

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get all statistics
 *     description: Retrieves comprehensive statistics including totals, status counts, and daily data for charts
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Statistics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totals:
 *                   type: object
 *                   properties:
 *                     total_jobs_created:
 *                       type: integer
 *                     total_jobs_completed:
 *                       type: integer
 *                     total_jobs_cancelled:
 *                       type: integer
 *                     total_lines_printed:
 *                       type: integer
 *                     total_chars_printed:
 *                       type: integer
 *                 statusCounts:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 dailyStats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       jobs_created:
 *                         type: integer
 *                       jobs_completed:
 *                         type: integer
 *                       jobs_cancelled:
 *                         type: integer
 *                       lines_printed:
 *                         type: integer
 *                       chars_printed:
 *                         type: integer
 *                 averageCompletionTime:
 *                   type: number
 *                   nullable: true
 *                 isPrinting:
 *                   type: boolean
 */
router.get('/stats', async (req, res) => {
  try {
    const [stats, statusCounts, dailyStats, avgCompletionTime, isPrinting] = await Promise.all([
      database.getStatistics(),
      database.getJobStatusCounts(),
      database.getDailyStats(30),
      database.getAverageCompletionTime(),
      database.isAnyJobPrinting()
    ]);

    res.json({
      success: true,
      totals: stats,
      statusCounts: statusCounts,
      dailyStats: dailyStats.reverse(), // Oldest first for charts
      averageCompletionTime: avgCompletionTime,
      isPrinting: isPrinting
    });
  } catch (err) {
    console.error('Error getting statistics:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @swagger
 * /api/queue/live:
 *   get:
 *     summary: Get live queue data
 *     description: Retrieves current queue state for live updates (used by web UI polling)
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Live queue data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 isPrinting:
 *                   type: boolean
 *                 statusCounts:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 timestamp:
 *                   type: integer
 *                   description: Unix timestamp in milliseconds
 */
router.get('/queue/live', async (req, res) => {
  try {
    const statusFilter = req.query.status || null;
    const [jobs, isPrinting, statusCounts] = await Promise.all([
      database.getJobs(statusFilter),
      database.isAnyJobPrinting(),
      database.getJobStatusCounts()
    ]);

    res.json({
      success: true,
      jobs: jobs,
      isPrinting: isPrinting,
      statusCounts: statusCounts,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Error getting live queue:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
