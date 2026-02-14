const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CNC Chocolate Engraver API',
      version: '1.0.0',
      description: 'REST API for controlling a CNC chocolate engraving system. Manages job queue, configuration, statistics, and CNC hardware control.',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server'
      }
    ],
    tags: [
      { name: 'Jobs', description: 'Job queue management operations' },
      { name: 'Print', description: 'Print control operations' },
      { name: 'Configuration', description: 'System configuration' },
      { name: 'Statistics', description: 'Statistics and reporting' },
      { name: 'CNC Control', description: 'CNC hardware control' },
      { name: 'Calibration', description: 'Homing, jogging, and work coordinate calibration' }
    ],
    components: {
      schemas: {
        Job: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Unique job ID', example: 1 },
            first_name: { type: 'string', description: 'Customer first name', example: 'John' },
            last_name: { type: 'string', description: 'Customer last name', example: 'Doe' },
            email_address: { type: 'string', format: 'email', description: 'Customer email', example: 'john.doe@example.com' },
            phone_number: { type: 'string', description: 'Customer phone', example: '+1-555-123-4567' },
            question_1: { type: 'string', description: 'Survey question 1 response' },
            question_2: { type: 'string', description: 'Survey question 2 response' },
            question_3: { type: 'string', description: 'Survey question 3 response' },
            best_contact: { type: 'string', description: 'Best contact person in company' },
            contact_details: { type: 'string', description: 'Contact details' },
            reach_out_next_month: { type: 'string', enum: ['yes', 'no'], description: 'Permission to reach out' },
            message_1: { type: 'string', maxLength: 50, description: 'First message line to engrave', example: 'Hello World' },
            message_2: { type: 'string', maxLength: 50, description: 'Second message line to engrave', example: 'Welcome!' },
            agreement: { type: 'string', enum: ['agreed', 'not_agreed'], description: 'Agreement confirmation' },
            status: {
              type: 'string',
              enum: ['Pending', 'Printing', 'Completed', 'Cancelled_by_User', 'Cancelled_by_Admin'],
              description: 'Job status',
              example: 'Pending'
            },
            created_at: { type: 'integer', description: 'Unix timestamp when created', example: 1706666400 },
            completed_at: { type: 'integer', nullable: true, description: 'Unix timestamp when completed', example: 1706666500 }
          }
        },
        CreateJobRequest: {
          type: 'object',
          required: ['first_name', 'last_name'],
          properties: {
            first_name: { type: 'string', description: 'Customer first name', example: 'John' },
            last_name: { type: 'string', description: 'Customer last name', example: 'Doe' },
            email_address: { type: 'string', format: 'email', description: 'Customer email', example: 'john.doe@example.com' },
            phone_number: { type: 'string', description: 'Customer phone', example: '+1-555-123-4567' },
            question_1: { type: 'string', description: 'Survey question 1 response' },
            question_2: { type: 'string', description: 'Survey question 2 response' },
            question_3: { type: 'string', description: 'Survey question 3 response' },
            best_contact: { type: 'string', description: 'Best contact person in company' },
            contact_details: { type: 'string', description: 'Contact details' },
            reach_out_next_month: { type: 'string', enum: ['yes', 'no'], description: 'Permission to reach out' },
            message_1: { type: 'string', maxLength: 50, description: 'First message line to engrave', example: 'Hello World' },
            message_2: { type: 'string', maxLength: 50, description: 'Second message line to engrave', example: 'Welcome!' },
            agreement: { type: 'string', enum: ['agreed', 'not_agreed'], description: 'Agreement confirmation' }
          }
        },
        UpdateJobRequest: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Customer first name', example: 'John' },
            last_name: { type: 'string', description: 'Customer last name', example: 'Doe' },
            email_address: { type: 'string', format: 'email', description: 'Customer email' },
            phone_number: { type: 'string', description: 'Customer phone' },
            question_1: { type: 'string', description: 'Survey question 1 response' },
            question_2: { type: 'string', description: 'Survey question 2 response' },
            question_3: { type: 'string', description: 'Survey question 3 response' },
            best_contact: { type: 'string', description: 'Best contact person in company' },
            contact_details: { type: 'string', description: 'Contact details' },
            reach_out_next_month: { type: 'string', enum: ['yes', 'no'], description: 'Permission to reach out' },
            message_1: { type: 'string', maxLength: 50, description: 'First message line to engrave' },
            message_2: { type: 'string', maxLength: 50, description: 'Second message line to engrave' },
            agreement: { type: 'string', enum: ['agreed', 'not_agreed'], description: 'Agreement confirmation' },
            status: {
              type: 'string',
              enum: ['Pending', 'Printing', 'Completed', 'Cancelled_by_User', 'Cancelled_by_Admin'],
              description: 'Job status'
            }
          }
        },
        BulkUpdateRequest: {
          type: 'object',
          required: ['ids', 'status'],
          properties: {
            ids: {
              type: 'array',
              items: { type: 'integer' },
              description: 'Array of job IDs to update',
              example: [1, 2, 3]
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Completed', 'Cancelled_by_User', 'Cancelled_by_Admin'],
              description: 'New status for all selected jobs',
              example: 'Cancelled_by_Admin'
            }
          }
        },
        Config: {
          type: 'object',
          properties: {
            template_text: { type: 'string', description: 'Template text to engrave', example: 'KPMG' },
            template_font: { type: 'string', enum: ['hershey', 'block', 'script'], description: 'Template font', example: 'hershey' },
            template_font_size: { type: 'number', description: 'Template font size in mm', example: 12 },
            template_alignment: { type: 'string', enum: ['left', 'centered', 'right'], description: 'Template alignment', example: 'centered' },
            bar_width: { type: 'number', description: 'Chocolate bar width in mm', example: 100 },
            bar_height: { type: 'number', description: 'Chocolate bar height in mm', example: 40 },
            message_font: { type: 'string', enum: ['hershey', 'block', 'script'], description: 'Message font', example: 'hershey' },
            message_font_size_1_line: { type: 'number', description: 'Font size for single message line in mm', example: 10 },
            message_font_size_2_lines: { type: 'number', description: 'Font size for two message lines in mm', example: 7 },
            message_alignment: { type: 'string', enum: ['left', 'centered'], description: 'Message alignment', example: 'centered' },
            gap_template_to_message: { type: 'number', description: 'Gap between template and messages in mm', example: 5 },
            gap_between_lines: { type: 'number', description: 'Gap between message lines in mm', example: 3 },
            z_safe_height: { type: 'number', description: 'Z height for travel moves in mm', example: 5 },
            z_engrave_depth: { type: 'number', description: 'Z depth for engraving in mm (negative)', example: -0.5 },
            feed_rate: { type: 'number', description: 'Engraving feed rate in mm/min', example: 200 }
          }
        },
        UpdateConfigRequest: {
          type: 'object',
          description: 'Object with config keys to update. Only include keys you want to change.',
          properties: {
            template_text: { type: 'string', description: 'Template text to engrave', example: 'KPMG' },
            template_font: { type: 'string', enum: ['hershey', 'block', 'script'], description: 'Template font' },
            template_font_size: { type: 'number', minimum: 1, maximum: 50, description: 'Template font size in mm' },
            template_alignment: { type: 'string', enum: ['left', 'centered', 'right'], description: 'Template alignment' },
            bar_width: { type: 'number', minimum: 10, maximum: 500, description: 'Chocolate bar width in mm' },
            bar_height: { type: 'number', minimum: 10, maximum: 500, description: 'Chocolate bar height in mm' },
            message_font: { type: 'string', enum: ['hershey', 'block', 'script'], description: 'Message font' },
            message_font_size_1_line: { type: 'number', minimum: 1, maximum: 50, description: 'Font size for single message' },
            message_font_size_2_lines: { type: 'number', minimum: 1, maximum: 50, description: 'Font size for two messages' },
            message_alignment: { type: 'string', enum: ['left', 'centered'], description: 'Message alignment' },
            gap_template_to_message: { type: 'number', minimum: 0, maximum: 50, description: 'Gap template to messages' },
            gap_between_lines: { type: 'number', minimum: 0, maximum: 50, description: 'Gap between message lines' },
            z_safe_height: { type: 'number', minimum: 0, maximum: 50, description: 'Z safe height' },
            z_engrave_depth: { type: 'number', minimum: -10, maximum: 0, description: 'Z engrave depth' },
            feed_rate: { type: 'number', minimum: 10, maximum: 2000, description: 'Feed rate' }
          },
          example: {
            template_text: 'KPMG',
            bar_width: 100,
            feed_rate: 200
          }
        },
        Statistics: {
          type: 'object',
          properties: {
            totals: {
              type: 'object',
              properties: {
                total_jobs_created: { type: 'integer', example: 150 },
                total_jobs_completed: { type: 'integer', example: 120 },
                total_jobs_cancelled: { type: 'integer', example: 10 },
                total_lines_printed: { type: 'integer', example: 280 },
                total_chars_printed: { type: 'integer', example: 3500 }
              }
            },
            statusCounts: {
              type: 'object',
              properties: {
                Pending: { type: 'integer', example: 15 },
                Printing: { type: 'integer', example: 1 },
                Completed: { type: 'integer', example: 120 },
                Cancelled_by_User: { type: 'integer', example: 5 },
                Cancelled_by_Admin: { type: 'integer', example: 5 }
              }
            },
            dailyStats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string', example: '2026-01-31' },
                  jobs_created: { type: 'integer', example: 10 },
                  jobs_completed: { type: 'integer', example: 8 },
                  jobs_cancelled: { type: 'integer', example: 1 },
                  lines_printed: { type: 'integer', example: 20 },
                  chars_printed: { type: 'integer', example: 250 }
                }
              }
            },
            averageCompletionTime: { type: 'number', nullable: true, description: 'Average seconds to complete a job', example: 15.5 },
            isPrinting: { type: 'boolean', description: 'Whether a job is currently printing', example: false }
          }
        },
        CNCStatus: {
          type: 'object',
          properties: {
            connected: { type: 'boolean', description: 'Whether CNC is connected', example: true },
            port: { type: 'string', nullable: true, description: 'Connected port path', example: '/dev/ttyUSB0' },
            currentJobId: { type: 'integer', nullable: true, description: 'Currently printing job ID', example: null }
          }
        },
        ConnectRequest: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Optional device path to connect to', example: '/dev/ttyUSB0' }
          }
        },
        CommandRequest: {
          type: 'object',
          required: ['gcode'],
          properties: {
            gcode: { type: 'string', description: 'G-code command to send', example: 'G0 X10 Y10' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error description' }
          }
        },
        PrintResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            jobId: { type: 'integer', example: 1 },
            message: { type: 'string', example: 'Print job started' },
            gcode: { type: 'string', description: 'Generated G-code' },
            stats: {
              type: 'object',
              properties: {
                linesPrinted: { type: 'integer', example: 3 },
                charsPrinted: { type: 'integer', example: 25 }
              }
            }
          }
        },
        JogRequest: {
          type: 'object',
          required: ['axis', 'distance'],
          properties: {
            axis: { type: 'string', enum: ['X', 'Y', 'Z'], description: 'Axis to jog', example: 'X' },
            distance: { type: 'number', description: 'Distance in mm (negative for opposite direction)', example: 10 },
            feedRate: { type: 'number', description: 'Feed rate in mm/min (optional, defaults to config jog_feed_rate)', example: 500 }
          }
        },
        GrblPosition: {
          type: 'object',
          properties: {
            state: { type: 'string', description: 'GRBL state (Idle, Run, Jog, Home, Alarm)', example: 'Idle' },
            mpos: {
              type: 'object',
              nullable: true,
              properties: {
                x: { type: 'number', example: -150.5 },
                y: { type: 'number', example: -80.3 },
                z: { type: 'number', example: 0 }
              }
            },
            wpos: {
              type: 'object',
              nullable: true,
              properties: {
                x: { type: 'number', example: 0 },
                y: { type: 'number', example: 0 },
                z: { type: 'number', example: 0 }
              }
            }
          }
        },
        DryRunRequest: {
          type: 'object',
          properties: {
            barWidth: { type: 'number', description: 'Override bar width in mm', example: 100 },
            barHeight: { type: 'number', description: 'Override bar height in mm', example: 40 }
          }
        }
      }
    }
  },
  apis: ['./api.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
