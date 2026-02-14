const database = require('./database');
const { AVAILABLE_FONTS } = require('./gcode');

// Available alignments
const TEMPLATE_ALIGNMENTS = ['left', 'centered', 'right'];
const MESSAGE_ALIGNMENTS = ['left', 'centered'];

// Status values
const JOB_STATUSES = ['Pending', 'Printing', 'Completed', 'Cancelled_by_User', 'Cancelled_by_Admin'];

// Config key validation and defaults
const CONFIG_KEYS = {
  template_text: { type: 'string', default: 'KPMG' },
  template_font: { type: 'enum', values: AVAILABLE_FONTS, default: 'hershey' },
  template_font_size: { type: 'number', min: 1, max: 50, default: '12' },
  template_alignment: { type: 'enum', values: TEMPLATE_ALIGNMENTS, default: 'centered' },
  bar_width: { type: 'number', min: 10, max: 500, default: '100' },
  bar_height: { type: 'number', min: 10, max: 500, default: '40' },
  message_font: { type: 'enum', values: AVAILABLE_FONTS, default: 'hershey' },
  message_font_size_1_line: { type: 'number', min: 1, max: 50, default: '10' },
  message_font_size_2_lines: { type: 'number', min: 1, max: 50, default: '7' },
  message_alignment: { type: 'enum', values: MESSAGE_ALIGNMENTS, default: 'centered' },
  gap_template_to_message: { type: 'number', min: -20, max: 50, default: '5' },
  gap_between_lines: { type: 'number', min: 0, max: 50, default: '3' },
  z_safe_height: { type: 'number', min: 0, max: 50, default: '5' },
  z_engrave_depth: { type: 'number', min: -10, max: 0, default: '-0.5' },
  feed_rate: { type: 'number', min: 10, max: 2000, default: '200' },
  normalize_glyph_z: { type: 'boolean', default: 'false' },
  normalize_glyph_feed: { type: 'boolean', default: 'false' },
  decimals: { type: 'number', min: 0, max: 8, default: '3' },
  use_g54_calibration: { type: 'boolean', default: 'true' },
  jog_feed_rate: { type: 'number', min: 10, max: 5000, default: '500' }
};

// Get default config values (for database initialization)
function getConfigDefaults() {
  const defaults = {};
  for (const [key, rule] of Object.entries(CONFIG_KEYS)) {
    defaults[key] = rule.default;
  }
  return defaults;
}

function validateConfigValue(key, value) {
  const rule = CONFIG_KEYS[key];
  if (!rule) {
    return { valid: false, error: `Unknown config key: ${key}` };
  }

  if (rule.type === 'string') {
    return { valid: true, value: String(value) };
  }

  if (rule.type === 'enum') {
    if (!rule.values.includes(value)) {
      return { valid: false, error: `Invalid value for ${key}. Must be one of: ${rule.values.join(', ')}` };
    }
    return { valid: true, value: String(value) };
  }

  if (rule.type === 'number') {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: `${key} must be a number` };
    }
    if (num < rule.min || num > rule.max) {
      return { valid: false, error: `${key} must be between ${rule.min} and ${rule.max}` };
    }
    return { valid: true, value: String(num) };
  }

  if (rule.type === 'boolean') {
    const str = String(value).toLowerCase();
    if (str === 'true' || str === '1') return { valid: true, value: 'true' };
    if (str === 'false' || str === '0') return { valid: true, value: 'false' };
    return { valid: false, error: `${key} must be a boolean (true/false)` };
  }

  return { valid: false, error: 'Unknown validation type' };
}

async function getConfig() {
  const config = await database.getConfig();

  // Parse typed values
  const parsed = { ...config };
  for (const [key, rule] of Object.entries(CONFIG_KEYS)) {
    if (rule.type === 'number' && parsed[key] != null) {
      parsed[key] = parseFloat(parsed[key]);
    } else if (rule.type === 'boolean' && parsed[key] != null) {
      parsed[key] = parsed[key] === 'true';
    }
  }

  return parsed;
}

async function updateConfig(key, value) {
  const validation = validateConfigValue(key, value);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return database.updateConfig(key, validation.value);
}

async function updateConfigMultiple(updates) {
  const errors = [];
  const validated = {};

  for (const [key, value] of Object.entries(updates)) {
    const validation = validateConfigValue(key, value);
    if (!validation.valid) {
      errors.push(validation.error);
    } else {
      validated[key] = validation.value;
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return database.updateConfigMultiple(validated);
}

module.exports = {
  AVAILABLE_FONTS,
  TEMPLATE_ALIGNMENTS,
  MESSAGE_ALIGNMENTS,
  JOB_STATUSES,
  CONFIG_KEYS,
  getConfigDefaults,
  validateConfigValue,
  getConfig,
  updateConfig,
  updateConfigMultiple
};
