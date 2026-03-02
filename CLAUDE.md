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

**Backend:**

| File | Purpose |
|------|---------|
| `cncserver.js` | Main entry point - Express server setup, initialization |
| `api.js` | REST API endpoints for jobs, config, stats, CNC control, and calibration |
| `database.js` | SQLite operations for jobs, config, and statistics storage (WAL mode) |
| `config.js` | Configuration management with validation and typed defaults |
| `engine.js` | Job queue processing, serial communication, USB scanning, jog/home/trace |
| `gcode.js` | G-code generation from text using fonts |
| `swagger.js` | OpenAPI/Swagger spec definition |
| `server.js` | Legacy test server (original GRBL skeleton) |

**Fonts:**

| File | Purpose |
|------|---------|
| `fontHershey.js` | Hershey single-stroke font paths |
| `fontBlock.js` | Block geometric font paths |
| `fontScript.js` | Script cursive font paths |
| `fontPristina.js` | Pristina TrueType-derived stroke font |
| `fontCalibri.js` | Calibri TrueType-derived stroke font |
| `fontLogo.js` | Custom logo/brand font |
| `gcodeconverter.js` | Utility for converting font data |

**Frontend:**

| Path | Purpose |
|------|---------|
| `public/index.html` | Standalone dark-theme web UI (queue, stats, config, calibration, API docs) |
| `fiori/webapp/` | SAP Fiori UI5 app (production interface) |
| `fiori/webapp/view/Worklist.view.xml` | Single-view app — all tabs in one IconTabBar |
| `fiori/webapp/controller/Worklist.controller.js` | All UI logic |
| `fiori/webapp/Component.js` | Model initialization (queue, cnc, view, stats, config, calibration) |
| `fiori/webapp/model/formatter.js` | Value formatters for UI binding |
| `fiori/webapp/fragment/JobDetailDialog.fragment.xml` | Job edit dialog |
| `fiori/webapp/fragment/JobViewDialog.fragment.xml` | Job view dialog |
| `fiori/webapp/css/style.css` | Custom SAP UI5 overrides |
| `fiori/webapp/i18n/i18n.properties` | All UI text strings |

**Docs:**

| Path | Purpose |
|------|---------|
| `docs/CNC_Chocolate_Engraver_Specification.html` | Full product specification |
| `docs/architecture.drawio` | Architecture diagram |

### Data Flow

1. Web UI / SAP BTP → API endpoints (`/api/*`)
2. Jobs stored in SQLite (`cncchoco.db`, WAL mode)
3. Statistics tracked on job creation, completion, and cancellation
4. Print triggered → Engine fetches pending job → G-code generated → Serial output
5. Job marked complete after GRBL finishes (polling completion signal)

### API Endpoints

**Jobs:**
- `POST /api/createjob` - Create new job with form data
- `GET /api/getqueue?status=Pending` - Get jobs (optional status filter)
- `GET /api/getjob/:id` - Get single job
- `PATCH /api/updatejobs/:id` - Update job attributes
- `PUT /api/updatejobs/:id` - Replace job attributes
- `PATCH /api/updatejobs/bulk` - Bulk update job statuses
- `GET /api/print` - Trigger print of next pending job
- `GET /api/print/:id` - Print a specific job by ID
- `GET /api/script/:id` - Get generated G-code script for a job

**Config:**
- `GET /api/getConfig` - Get all configuration
- `PATCH /api/updateConfig` - Update one or more config values

**Statistics:**
- `GET /api/stats` - Get all statistics (totals, daily, status counts)
- `GET /api/queue/live` - Get live queue data for real-time updates

**CNC:**
- `GET /api/status` - Connection status and available devices
- `POST /api/connect` - Connect to CNC
- `POST /api/disconnect` - Disconnect from CNC
- `POST /api/estop` - **Emergency stop** — sends GRBL soft reset (Ctrl-X/0x18), halts all motion immediately, reverts active job to Pending. Machine must be re-homed after use.
- `POST /api/command` - Send raw G-code

**Calibration:**
- `POST /api/calibrate/home` - Home the machine (G28)
- `POST /api/calibrate/unlock` - Send GRBL unlock ($X)
- `POST /api/calibrate/jog` - Jog by axis/distance/feed
- `POST /api/calibrate/jog/cancel` - Cancel active jog (0x85)
- `POST /api/calibrate/moveto` - Move to absolute position
- `GET /api/calibrate/position` - Get current machine position
- `POST /api/calibrate/setorigin` - Set G54 work coordinate origin (optional xDelta/yDelta shift)
- `POST /api/calibrate/dryrun` - Trace bar boundary at safe Z (verify alignment)
- `POST /api/calibrate/tracejob` - Trace bounding box of a job's text layout at safe Z

### Job Status Values

`Pending`, `Printing`, `Completed`, `Cancelled_by_User`, `Cancelled_by_Admin`

### Configuration Keys

Template: `template_text`, `template_font`, `template_font_size`, `template_alignment`
Bar: `bar_width`, `bar_height`
Message: `message_font`, `message_font_size_1_line`, `message_font_size_2_lines`, `message_alignment`
Spacing: `gap_template_to_message`, `gap_between_lines`
CNC: `z_safe_height`, `z_engrave_depth`, `feed_rate`, `jog_feed_rate`
G-code: `normalize_glyph_z`, `normalize_glyph_feed`, `decimals`, `use_g54_calibration`
Spindle: `spindle_enabled`, `spindle_speed`

### Statistics Tracked

- `total_jobs_created`, `total_jobs_completed`, `total_jobs_cancelled`
- `total_lines_printed`, `total_chars_printed`
- Daily stats: `jobs_created`, `jobs_completed`, `jobs_cancelled`, `lines_printed`, `chars_printed`

### Fonts

Six fonts available: `hershey` (classic CNC single-stroke), `block` (geometric), `script` (cursive stroke), `pristina` (TrueType-derived), `calibri` (TrueType-derived), `logo` (custom brand)

## Web UI Features

Both `public/index.html` and the Fiori app provide:
- **Queue Tab**: Live-updating job list with bulk selection, status filtering, per-job print/view/edit buttons
- **Statistics Tab**: Real-time charts (Chart.js) — job status distribution, daily activity, character counts, completion rate
- **Configuration Tab**: All engraving parameters configurable via web interface
- **Calibrate Tab**: Jog controls, home, set origin, dry run, trace job area
- **API Docs Tab**: Embedded Swagger UI (`/api-docs`)
- **Spec Tab**: Embedded product specification (`/docs/CNC_Chocolate_Engraver_Specification.html`)

## API Documentation

Swagger/OpenAPI documentation available at:
- Interactive UI: http://localhost:3000/api-docs
- JSON spec: http://localhost:3000/api-docs.json

## Hardware

- USB serial connection to GRBL controller (auto-scanned from `/dev/ttyUSB*` or `/dev/ttyACM*`)
- Baud rate: 115200
- Default chocolate bar size: 100mm x 40mm
- G54 work coordinates used for calibration offsets (stored in GRBL EEPROM)

## SAP Integration

This engine is designed to be called from SAP BTP screens via:
- SAP Cloud Connector (for secure on-premise connectivity)
- SAP JDK running on this machine
- REST API endpoints exposed on port 3000
