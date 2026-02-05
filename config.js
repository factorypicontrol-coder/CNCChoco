const database = require('./database');

// Available fonts
const AVAILABLE_FONTS = ['hershey', 'block', 'script','pristina','logo','calibri'];

// Available alignments
const TEMPLATE_ALIGNMENTS = ['left', 'centered', 'right'];
const MESSAGE_ALIGNMENTS = ['left', 'centered'];

// Status values
const JOB_STATUSES = ['Pending', 'Printing', 'Completed', 'Cancelled_by_User', 'Cancelled_by_Admin'];

// Config key validation
const CONFIG_KEYS = {
  template_text: { type: 'string' },
  template_font: { type: 'enum', values: AVAILABLE_FONTS },
  template_font_size: { type: 'number', min: 1, max: 50 },
  template_alignment: { type: 'enum', values: TEMPLATE_ALIGNMENTS },
  bar_width: { type: 'number', min: 10, max: 500 },
  bar_height: { type: 'number', min: 10, max: 500 },
  message_font: { type: 'enum', values: AVAILABLE_FONTS },
  message_font_size_1_line: { type: 'number', min: 1, max: 50 },
  message_font_size_2_lines: { type: 'number', min: 1, max: 50 },
  message_alignment: { type: 'enum', values: MESSAGE_ALIGNMENTS },
  gap_template_to_message: { type: 'number', min: 0, max: 50 },
  gap_between_lines: { type: 'number', min: 0, max: 50 },
  z_safe_height: { type: 'number', min: 0, max: 50 },
  z_engrave_depth: { type: 'number', min: -10, max: 0 },
  feed_rate: { type: 'number', min: 10, max: 2000 }
};

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

  return { valid: false, error: 'Unknown validation type' };
}

async function getConfig() {
  const config = await database.getConfig();

  // Parse numeric values
  const parsed = { ...config };
  for (const [key, rule] of Object.entries(CONFIG_KEYS)) {
    if (rule.type === 'number' && parsed[key]) {
      parsed[key] = parseFloat(parsed[key]);
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
  validateConfigValue,
  getConfig,
  updateConfig,
  updateConfigMultiple
};
