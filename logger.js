// Persistent logger — writes to both console and server.log.
// Use this instead of console.log/error/warn throughout the application.

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'server.log');

function serialize(arg) {
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === 'string') return arg;
  return JSON.stringify(arg);
}

function write(level, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(serialize).join(' ');
  const line = `[${timestamp}] [${level}] ${message}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (e) {
    // If we can't write to the log file, fall back silently —
    // the console output above still preserves the message.
  }
}

const logger = {
  log:   (...args) => { console.log(...args);   write('INFO',  args); },
  error: (...args) => { console.error(...args); write('ERROR', args); },
  warn:  (...args) => { console.warn(...args);  write('WARN',  args); },

  // Call once at server startup to mark a new session in the log.
  sessionStart: () => {
    const timestamp = new Date().toISOString();
    const line = `\n${'─'.repeat(72)}\n  Server session started: ${timestamp}\n${'─'.repeat(72)}\n`;
    try {
      fs.appendFileSync(LOG_FILE, line, 'utf8');
    } catch (e) {
      // fall back silently
    }
    console.log(`Logging to ${LOG_FILE}`);
  }
};

module.exports = logger;
