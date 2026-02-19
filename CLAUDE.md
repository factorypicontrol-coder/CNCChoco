# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CNC Chocolate Engraver - A Node.js/Express server for engraving personalized messages on chocolate bars via a GRBL-controlled CNC router. Features a job queue system, web-based management interface, statistics dashboard, and configurable text templates. Designed for integration with SAP BTP via SAP Cloud Connector.

## Commands

```bash
npm install              # Install dependencies (including sqlite3)
npm start               # Run the main server (cncserver.js)
npm run server:old      # Run the legacy test server (server.js)
```

## Architecture

### File Structure

| File | Purpose |
|------|---------|
| `cncserver.js` | Main entry point - Express server setup, initialization |
| `api.js` | REST API endpoints for jobs, config, stats, and CNC control |
| `database.js` | SQLite operations for jobs, config, and statistics storage |
| `config.js` | Configuration management with validation |
| `engine.js` | Job queue processing, serial communication, USB scanning |
| `gcode.js` | G-code generation from text using fonts |
| `fontHershey.js` | Hershey single-stroke font paths |
| `fontBlock.js` | Block geometric font paths |
| `fontScript.js` | Script cursive font paths |
| `public/index.html` | Web UI for queue monitoring, statistics, and configuration |
| `server.js` | Legacy test server (original GRBL skeleton) |

### Data Flow

1. Web UI / SAP BTP → API endpoints (`/api/*`)
2. Jobs stored in SQLite (`cncchoco.db`)
3. Statistics tracked on job creation, completion, and cancellation
4. Print triggered → Engine fetches pending job → G-code generated → Serial output
5. Job marked complete after 10s (placeholder for actual GRBL completion signal)

### API Endpoints

**Jobs:**
- `POST /api/createjob` - Create new job with form data
- `GET /api/getqueue?status=Pending` - Get jobs (optional status filter)
- `GET /api/getjob/:id` - Get single job
- `PATCH /api/updatejobs/:id` - Update job attributes
- `PATCH /api/updatejobs/bulk` - Bulk update job statuses
- `GET /api/print` - Trigger print of next pending job
- `GET /api/print/:id` - Print a specific job by ID

**Config:**
- `GET /api/getConfig` - Get all configuration
- `PATCH /api/updateConfig` - Update config values

**Statistics:**
- `GET /api/stats` - Get all statistics (totals, daily, status counts)
- `GET /api/queue/live` - Get live queue data for real-time updates

**CNC:**
- `GET /api/status` - Connection status and available devices
- `POST /api/connect` - Connect to CNC
- `POST /api/disconnect` - Disconnect from CNC
- `POST /api/estop` - **Emergency stop** — sends GRBL soft reset (Ctrl-X/0x18), halts all motion immediately, reverts active job to Pending. Machine must be re-homed after use.
- `POST /api/command` - Send raw G-code

### Job Status Values

`Pending`, `Printing`, `Completed`, `Cancelled_by_User`, `Cancelled_by_Admin`

### Configuration Keys

Template: `template_text`, `template_font`, `template_font_size`, `template_alignment`
Bar: `bar_width`, `bar_height`
Message: `message_font`, `message_font_size_1_line`, `message_font_size_2_lines`, `message_alignment`
Spacing: `gap_template_to_message`, `gap_between_lines`
CNC: `z_safe_height`, `z_engrave_depth`, `feed_rate`

### Statistics Tracked

- `total_jobs_created`, `total_jobs_completed`, `total_jobs_cancelled`
- `total_lines_printed`, `total_chars_printed`
- Daily stats: `jobs_created`, `jobs_completed`, `jobs_cancelled`, `lines_printed`, `chars_printed`

### Fonts

Three stroke fonts available: `hershey` (classic CNC), `block` (geometric), `script` (cursive)

## Web UI Features

- **Queue View**: Live-updating job list with bulk selection, status filtering, per-job print buttons
- **Statistics View**: Real-time charts (Chart.js) showing job status distribution, daily activity, character counts
- **Configuration View**: All engraving parameters configurable via web interface
- **API Docs View**: Interactive Swagger UI for testing all API endpoints

## API Documentation

Swagger/OpenAPI documentation available at:
- Interactive UI: http://localhost:3000/api-docs
- JSON spec: http://localhost:3000/api-docs.json

## Hardware

- USB serial connection to GRBL controller (auto-scanned from `/dev/ttyUSB*` or `/dev/ttyACM*`)
- Baud rate: 115200
- Default chocolate bar size: 100mm x 40mm

## SAP Integration

This engine is designed to be called from SAP BTP screens via:
- SAP Cloud Connector (for secure on-premise connectivity)
- SAP JDK running on this machine
- REST API endpoints exposed on port 3000
