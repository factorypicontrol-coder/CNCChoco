# CNC Chocolate Engraver

A Node.js application for engraving personalized messages on chocolate bars using a GRBL-controlled CNC router. Designed for integration with SAP BTP via SAP Cloud Connector.

## Features

- **Job Queue Management** - Create, view, update, and track engraving jobs
- **Bulk Operations** - Select multiple jobs and change status in bulk
- **Live Updates** - Real-time queue monitoring with auto-refresh
- **Statistics Dashboard** - Visual charts showing job counts, completion rates, daily activity
- **Web Interface** - Modern, responsive browser-based UI
- **Configurable Templates** - Customizable template text with two message lines
- **Multiple Fonts** - Three CNC-optimized stroke fonts: Hershey, Block, and Script
- **Auto USB Detection** - Automatically scans for connected CNC devices
- **SAP BTP Ready** - REST API designed for integration via SAP Cloud Connector

## Requirements

- Node.js 18+
- GRBL-compatible CNC router connected via USB
- Linux system (for `/dev/ttyUSB*` device access)

## Installation

```bash
git clone <repository>
cd CNCChoco
npm install
```

## Usage

```bash
npm start
```

Open http://localhost:3000 in your browser.

## Web Interface

### Queue View
- View all jobs with status filtering (Pending, Printing, Completed, Cancelled)
- **Live updates** every 3 seconds
- **Bulk selection** with "Select All" checkbox
- **Bulk status change** for selected jobs
- **Per-job Print button** (disabled when another job is printing)
- Click job row to edit details

### Statistics View
- **Total Jobs** - Created, Completed, Pending, Cancelled counts
- **Lines & Characters** - Total printed statistics
- **Status Distribution** - Doughnut chart of job statuses
- **Daily Activity** - Line chart of jobs created/completed over 30 days
- **Characters Printed** - Bar chart of daily character output
- **Completion Rate** - Pie chart showing success/failure breakdown

### Job Form
- Enter customer details and personalized messages
- Message 1 and Message 2 appear below the template
- Status dropdown (Pending, Printing, Completed, Cancelled_by_User, Cancelled_by_Admin)

### Configuration
- **Chocolate Bar Size** - Width and height in mm
- **Template** - Text, font, size, and alignment (left/centered/right)
- **Messages** - Font, size for 1 line, size for 2 lines, alignment (left/centered)
- **Spacing** - Gap between template and messages, gap between message lines
- **CNC Settings** - Z safe height, engrave depth, feed rate

### API Docs
- **Interactive Swagger UI** - Test all API endpoints directly from the browser
- Full OpenAPI 3.0 specification with request/response schemas
- Try out GET, PUT, PATCH requests with live testing

## API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json

## API Reference

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/createjob` | Create a new job |
| GET | `/api/getqueue` | Get all jobs (optional `?status=` filter) |
| GET | `/api/getjob/:id` | Get a specific job |
| PATCH | `/api/updatejobs/:id` | Update a job |
| PATCH | `/api/updatejobs/bulk` | Bulk update jobs `{ids: [...], status: "..."}` |
| GET | `/api/print` | Print next pending job |
| GET | `/api/print/:id` | Print specific job by ID |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/getConfig` | Get all configuration values |
| PATCH | `/api/updateConfig` | Update configuration values |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get all statistics and charts data |
| GET | `/api/queue/live` | Get live queue data for real-time updates |

### CNC Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Get CNC connection status |
| POST | `/api/connect` | Connect to CNC device |
| POST | `/api/disconnect` | Disconnect from CNC |
| POST | `/api/command` | Send raw G-code command |

## Job Fields

| Field | Description |
|-------|-------------|
| first_name | Customer first name |
| last_name | Customer last name |
| email_address | Customer email |
| phone_number | Customer phone |
| question_1, question_2, question_3 | Custom survey questions |
| best_contact | Best contact person in company |
| contact_details | Contact details |
| reach_out_next_month | Permission to reach out |
| message_1 | First message line (engraved) |
| message_2 | Second message line (engraved) |
| agreement | Agreement confirmation |
| status | Job status |
| created_at | Unix timestamp when created |
| completed_at | Unix timestamp when completed |

## Configuration Options

| Key | Description | Default |
|-----|-------------|---------|
| template_text | Template text to engrave | KPMG |
| template_font | Template font (hershey/block/script) | hershey |
| template_font_size | Template font size in mm | 12 |
| template_alignment | Template alignment (left/centered/right) | centered |
| bar_width | Chocolate bar width in mm | 100 |
| bar_height | Chocolate bar height in mm | 40 |
| message_font | Message font | hershey |
| message_font_size_1_line | Font size when 1 message line | 10 |
| message_font_size_2_lines | Font size when 2 message lines | 7 |
| message_alignment | Message alignment (left/centered) | centered |
| gap_template_to_message | Gap between template and messages (mm) | 5 |
| gap_between_lines | Gap between message lines (mm) | 3 |
| z_safe_height | Z height for travel moves (mm) | 5 |
| z_engrave_depth | Z depth for engraving (mm) | -0.5 |
| feed_rate | Engraving feed rate (mm/min) | 200 |

## Statistics Tracked

| Statistic | Description |
|-----------|-------------|
| total_jobs_created | Total number of jobs created |
| total_jobs_completed | Total number of jobs completed |
| total_jobs_cancelled | Total number of jobs cancelled |
| total_lines_printed | Total message lines printed |
| total_chars_printed | Total characters engraved |

Daily statistics are also tracked for the last 30 days.

## Fonts

- **Hershey** - Classic single-stroke CNC font, clean and readable
- **Block** - Modern geometric font with straight lines only
- **Script** - Elegant cursive style for branding

## Database

SQLite database (`cncchoco.db`) stores:
- `jobs` table with all job attributes and status
- `config` table with key-value configuration pairs
- `statistics` table with cumulative totals
- `daily_stats` table with per-day metrics

## Print Process

1. `GET /api/print` or `GET /api/print/:id` triggers the engine
2. Engine checks if any job is currently Printing
3. Finds target job (oldest Pending or specific ID)
4. Updates status to Printing
5. Generates G-code from template + messages using configured fonts
6. Sends G-code to CNC via serial connection
7. After 10 seconds (placeholder), marks job as Completed
8. Updates statistics (jobs completed, lines printed, characters printed)

## SAP BTP Integration

This engine is designed to be called from SAP BTP:

1. **SAP Cloud Connector** - Establishes secure tunnel between SAP BTP and on-premise network
2. **SAP JDK** - Runs on the same machine as this CNC server
3. **REST API** - All endpoints accessible via HTTP on port 3000

### Integration Architecture

```
SAP BTP Cloud  <-->  SAP Cloud Connector  <-->  Local Network  <-->  CNC Server (port 3000)  <-->  GRBL CNC
```

## License

MIT
