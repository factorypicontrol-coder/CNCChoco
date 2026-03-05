# Architecture

Technical reference for the CNC Chocolate Engraver. For working guidelines and workflow, see [CLAUDE.md](./CLAUDE.md).

## Stack

- **Runtime**: Node.js 18+
- **Framework**: Express
- **Database**: SQLite (via `sqlite3`, WAL mode)
- **Serial**: `serialport` — GRBL over USB at 115200 baud
- **API Docs**: Swagger / OpenAPI 3.0 (`swagger-ui-express`)
- **Frontend (standalone)**: Vanilla JS + Chart.js (`public/index.html`)
- **Frontend (production)**: SAP Fiori UI5 (`fiori/webapp/`)

---

## File Structure

### Backend

| File | Purpose |
|------|---------|
| `cncserver.js` | Main entry point — Express server setup, initialisation |
| `api.js` | REST API endpoints for jobs, config, stats, CNC control, and calibration |
| `database.js` | SQLite operations for jobs, config, and statistics (WAL mode) |
| `config.js` | Configuration management with validation and typed defaults |
| `engine.js` | Job queue processing, serial communication, USB scanning, jog/home/trace |
| `gcode.js` | G-code generation from text using fonts |
| `swagger.js` | OpenAPI/Swagger spec definition |
| `server.js` | Legacy test server (original GRBL skeleton — do not extend) |

### Fonts

| File | Purpose |
|------|---------|
| `fontHershey.js` | Hershey single-stroke font paths |
| `fontBlock.js` | Block geometric font paths |
| `fontScript.js` | Script cursive font paths |
| `fontPristina.js` | Pristina TrueType-derived stroke font |
| `fontCalibri.js` | Calibri TrueType-derived stroke font |
| `fontLogo.js` | Custom logo/brand font |
| `gcodeconverter.js` | Utility for converting font data |

### Frontend

| Path | Purpose |
|------|---------|
| `public/index.html` | Standalone dark-theme web UI (queue, stats, config, calibration, API docs) |
| `fiori/webapp/` | SAP Fiori UI5 app (production interface) |
| `fiori/webapp/view/Worklist.view.xml` | Single-view app — all tabs in one IconTabBar |
| `fiori/webapp/controller/Worklist.controller.js` | All UI logic |
| `fiori/webapp/Component.js` | Model initialisation (queue, cnc, view, stats, config, calibration) |
| `fiori/webapp/model/formatter.js` | Value formatters for UI binding |
| `fiori/webapp/fragment/JobDetailDialog.fragment.xml` | Job edit dialog |
| `fiori/webapp/fragment/JobViewDialog.fragment.xml` | Job view dialog |
| `fiori/webapp/css/style.css` | Custom SAP UI5 overrides |
| `fiori/webapp/i18n/i18n.properties` | All UI text strings |

### Docs

| Path | Purpose |
|------|---------|
| `docs/CNC_Chocolate_Engraver_Specification.html` | Full product specification |
| `docs/architecture.drawio` | Architecture diagram |

---

## Data Flow

1. Web UI / SAP BTP → API endpoints (`/api/*`)
2. Jobs stored in SQLite (`cncchoco.db`, WAL mode)
3. Statistics tracked on job creation, completion, and cancellation
4. Print triggered → Engine fetches pending job → G-code generated → Serial output
5. Job marked complete after GRBL finishes (polling completion signal)

---

## API Endpoints

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/createjob` | Create new job with form data |
| `GET` | `/api/getqueue?status=Pending` | Get jobs (optional status filter) |
| `GET` | `/api/getjob/:id` | Get single job |
| `PATCH` | `/api/updatejobs/:id` | Update job attributes |
| `PUT` | `/api/updatejobs/:id` | Replace job attributes |
| `PATCH` | `/api/updatejobs/bulk` | Bulk update job statuses |
| `GET` | `/api/print` | Trigger print of next pending job |
| `GET` | `/api/print/:id` | Print a specific job by ID |
| `GET` | `/api/script/:id` | Get generated G-code script for a job |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/getConfig` | Get all configuration |
| `PATCH` | `/api/updateConfig` | Update one or more config values |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Get all statistics (totals, daily, status counts) |
| `GET` | `/api/queue/live` | Get live queue data for real-time updates |

### CNC Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Connection status and available devices |
| `POST` | `/api/connect` | Connect to CNC |
| `POST` | `/api/disconnect` | Disconnect from CNC |
| `POST` | `/api/estop` | **Emergency stop** — sends GRBL soft reset (0x18), halts all motion, reverts active job to Pending. Machine must be re-homed after use. |
| `POST` | `/api/command` | Send raw G-code |

### Calibration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/calibrate/home` | Home the machine (G28) |
| `POST` | `/api/calibrate/unlock` | Send GRBL unlock ($X) |
| `POST` | `/api/calibrate/jog` | Jog by axis/distance/feed |
| `POST` | `/api/calibrate/jog/cancel` | Cancel active jog (0x85) |
| `POST` | `/api/calibrate/moveto` | Move to absolute position |
| `GET` | `/api/calibrate/position` | Get current machine position |
| `POST` | `/api/calibrate/setorigin` | Set G54 work coordinate origin (optional xDelta/yDelta shift) |
| `POST` | `/api/calibrate/dryrun` | Trace bar boundary at safe Z (verify alignment) |
| `POST` | `/api/calibrate/tracejob` | Trace bounding box of a job's text layout at safe Z |

> Interactive API docs (Swagger UI): endpoint `/api-docs` — spec defined in `swagger.js`
> OpenAPI JSON spec: endpoint `/api-docs.json`

---

## Job Status Values

`Pending` → `Printing` → `Completed`
`Pending` → `Cancelled_by_User` | `Cancelled_by_Admin`

---

## Configuration Keys

| Group | Key | Description |
|-------|-----|-------------|
| Template | `template_text` | Text engraved at top of bar |
| Template | `template_font` | Font for template (`hershey` / `block` / `script` / `pristina` / `calibri` / `logo`) |
| Template | `template_font_size` | Font size in mm |
| Template | `template_alignment` | `left` / `centered` / `right` |
| Bar | `bar_width` | Chocolate bar width (mm) |
| Bar | `bar_height` | Chocolate bar height (mm) |
| Message | `message_font` | Font for message lines |
| Message | `message_font_size_1_line` | Font size when only 1 message line |
| Message | `message_font_size_2_lines` | Font size when 2 message lines |
| Message | `message_alignment` | `left` / `centered` |
| Spacing | `gap_template_to_message` | Gap between template and messages (mm) |
| Spacing | `gap_between_lines` | Gap between message lines (mm) |
| CNC | `z_safe_height` | Z travel height (mm) |
| CNC | `z_engrave_depth` | Z engraving depth (mm) |
| CNC | `feed_rate` | Engraving feed rate (mm/min) |
| CNC | `jog_feed_rate` | Jog feed rate (mm/min) |
| G-code | `normalize_glyph_z` | Normalise Z per glyph |
| G-code | `decimals` | Decimal precision in G-code output |
| G-code | `use_g54_calibration` | Apply G54 work coordinate offset |
| Spindle | `spindle_enabled` | Enable spindle output |
| Spindle | `spindle_speed` | Spindle speed (RPM) |

---

## Statistics Tracked

**Cumulative:**
- `total_jobs_created`, `total_jobs_completed`, `total_jobs_cancelled`
- `total_lines_printed`, `total_chars_printed`

**Daily (last 30 days):**
- `jobs_created`, `jobs_completed`, `jobs_cancelled`, `lines_printed`, `chars_printed`

---

## Fonts

| Name | File | Style |
|------|------|-------|
| `hershey` | `fontHershey.js` | Classic CNC single-stroke |
| `block` | `fontBlock.js` | Geometric, straight lines only |
| `script` | `fontScript.js` | Cursive stroke |
| `pristina` | `fontPristina.js` | TrueType-derived stroke |
| `calibri` | `fontCalibri.js` | TrueType-derived stroke |
| `logo` | `fontLogo.js` | Custom brand font |

---

## Web UI Features

Both `public/index.html` and the Fiori app provide:

| Tab | Features |
|-----|---------|
| **Queue** | Live-updating job list, bulk selection, status filtering, per-job print/view/edit |
| **Statistics** | Chart.js charts — status distribution, daily activity, character counts, completion rate |
| **Configuration** | All engraving parameters editable via web interface |
| **Calibrate** | Jog controls, home, set origin, dry run, trace job area |
| **API Docs** | Embedded Swagger UI (`/api-docs`) |
| **Spec** | Embedded product specification (`/docs/CNC_Chocolate_Engraver_Specification.html`) |

---

## Hardware

- USB serial to GRBL controller — auto-scanned from `/dev/ttyUSB*` or `/dev/ttyACM*`
- Baud rate: 115200
- Default bar size: 100mm × 40mm
- G54 work coordinates used for calibration offsets (stored in GRBL EEPROM)

---

## SAP Integration

```
SAP BTP Cloud  ←→  SAP Cloud Connector  ←→  Local Network  ←→  CNC Server :3000  ←→  GRBL CNC
```

- **SAP Cloud Connector** — secure tunnel from SAP BTP to on-premise network
- **SAP JDK** — runs on the same machine as this server
- **REST API** — all endpoints on port 3000, called directly from SAP BTP screens
