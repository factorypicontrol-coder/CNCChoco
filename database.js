const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'cncchoco.db');
let db;

function init() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }

      db.serialize(() => {
        // Jobs table
        db.run(`
          CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT,
            last_name TEXT,
            email_address TEXT,
            phone_number TEXT,
            question_1 TEXT,
            question_2 TEXT,
            question_3 TEXT,
            best_contact TEXT,
            contact_details TEXT,
            reach_out_next_month TEXT,
            message_1 TEXT,
            message_2 TEXT,
            agreement TEXT,
            status TEXT DEFAULT 'Pending',
            created_at INTEGER,
            completed_at INTEGER
          )
        `);

        // Config table
        db.run(`
          CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);

        // Statistics table
        db.run(`
          CREATE TABLE IF NOT EXISTS statistics (
            key TEXT PRIMARY KEY,
            value INTEGER DEFAULT 0
          )
        `);

        // Daily statistics table
        db.run(`
          CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT PRIMARY KEY,
            jobs_created INTEGER DEFAULT 0,
            jobs_completed INTEGER DEFAULT 0,
            jobs_cancelled INTEGER DEFAULT 0,
            lines_printed INTEGER DEFAULT 0,
            chars_printed INTEGER DEFAULT 0
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            Promise.all([initDefaultConfig(), initDefaultStats()])
              .then(resolve)
              .catch(reject);
          }
        });
      });
    });
  });
}

function initDefaultStats() {
  const defaults = {
    total_jobs_created: 0,
    total_jobs_completed: 0,
    total_jobs_cancelled: 0,
    total_lines_printed: 0,
    total_chars_printed: 0
  };

  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO statistics (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(defaults)) {
      stmt.run(key, value);
    }
    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function initDefaultConfig() {
  const defaults = {
    template_text: 'KPMG',
    template_font: 'hershey',
    template_font_size: '12',
    template_alignment: 'centered',
    bar_width: '100',
    bar_height: '40',
    message_font: 'hershey',
    message_font_size_1_line: '10',
    message_font_size_2_lines: '7',
    message_alignment: 'centered',
    gap_template_to_message: '5',
    gap_between_lines: '3',
    z_safe_height: '5',
    z_engrave_depth: '-0.5',
    feed_rate: '200',
    normalize_glyph_z: 'false',
    normalize_glyph_feed: 'false',
    decimals: '3'
  };

  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(defaults)) {
      stmt.run(key, value);
    }
    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Job operations
function createJob(jobData) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO jobs (
        first_name, last_name, email_address, phone_number,
        question_1, question_2, question_3,
        best_contact, contact_details, reach_out_next_month,
        message_1, message_2, agreement,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `;
    const params = [
      jobData.first_name,
      jobData.last_name,
      jobData.email_address,
      jobData.phone_number,
      jobData.question_1,
      jobData.question_2,
      jobData.question_3,
      jobData.best_contact,
      jobData.contact_details,
      jobData.reach_out_next_month,
      jobData.message_1,
      jobData.message_2,
      jobData.agreement,
      Math.floor(Date.now() / 1000)
    ];

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
}

function getJobs(statusFilter = null) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM jobs';
    const params = [];

    if (statusFilter) {
      sql += ' WHERE status = ?';
      params.push(statusFilter);
    }

    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getJobById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM jobs WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getNextPendingJob() {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM jobs WHERE status = ? ORDER BY created_at ASC LIMIT 1',
      ['Pending'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function isAnyJobPrinting() {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM jobs WHERE status = ? LIMIT 1',
      ['Printing'],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

function updateJob(id, updates) {
  return new Promise((resolve, reject) => {
    const allowedFields = [
      'first_name', 'last_name', 'email_address', 'phone_number',
      'question_1', 'question_2', 'question_3',
      'best_contact', 'contact_details', 'reach_out_next_month',
      'message_1', 'message_2', 'agreement', 'status', 'completed_at'
    ];

    const setClauses = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0) {
      resolve({ changes: 0 });
      return;
    }

    params.push(id);
    const sql = `UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`;

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

// Config operations
function getConfig() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM config', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const config = {};
        for (const row of rows) {
          config[row.key] = row.value;
        }
        resolve(config);
      }
    });
  });
}

function updateConfig(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
      [key, value],
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

function updateConfigMultiple(updates) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(updates)) {
      stmt.run(key, value);
    }
    stmt.finalize((err) => {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

// Statistics operations
function getStatistics() {
  return new Promise((resolve, reject) => {
    db.all('SELECT key, value FROM statistics', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const stats = {};
        for (const row of rows) {
          stats[row.key] = row.value;
        }
        resolve(stats);
      }
    });
  });
}

function incrementStat(key, amount = 1) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE statistics SET value = value + ? WHERE key = ?',
      [amount, key],
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

function getJobStatusCounts() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT status, COUNT(*) as count FROM jobs GROUP BY status',
      (err, rows) => {
        if (err) reject(err);
        else {
          const counts = {};
          for (const row of rows) {
            counts[row.status] = row.count;
          }
          resolve(counts);
        }
      }
    );
  });
}

function getDailyStats(days = 30) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM daily_stats
       ORDER BY date DESC
       LIMIT ?`,
      [days],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function updateDailyStat(field, amount = 1) {
  const today = new Date().toISOString().split('T')[0];
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO daily_stats (date, ${field}) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET ${field} = ${field} + ?`,
      [today, amount, amount],
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

function getRecentJobs(limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, first_name, last_name, message_1, message_2, status, created_at, completed_at FROM jobs ORDER BY created_at DESC LIMIT ?',
      [limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function updateJobsBulk(ids, updates) {
  return new Promise((resolve, reject) => {
    const allowedFields = ['status'];
    const setClauses = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (setClauses.length === 0 || ids.length === 0) {
      resolve({ changes: 0 });
      return;
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE jobs SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`;
    params.push(...ids);

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes });
    });
  });
}

function getAverageCompletionTime() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT AVG(completed_at - created_at) as avg_time
       FROM jobs
       WHERE status = 'Completed' AND completed_at IS NOT NULL`,
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.avg_time : 0);
      }
    );
  });
}

function close() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  init,
  createJob,
  getJobs,
  getJobById,
  getNextPendingJob,
  isAnyJobPrinting,
  updateJob,
  updateJobsBulk,
  getConfig,
  updateConfig,
  updateConfigMultiple,
  getStatistics,
  incrementStat,
  getJobStatusCounts,
  getDailyStats,
  updateDailyStat,
  getRecentJobs,
  getAverageCompletionTime,
  close
};
