// G-code generation module for CNC chocolate engraving

const fontHershey = require('./fontHershey');
const fontBlock = require('./fontBlock');
const fontScript = require('./fontScript');

const fonts = {
  hershey: fontHershey,
  block: fontBlock,
  script: fontScript
};

function getFont(fontName) {
  return fonts[fontName] || fonts.hershey;
}

function calculateAlignment(textWidth, barWidth, alignment) {
  switch (alignment) {
    case 'left':
      return 0;
    case 'right':
      return barWidth - textWidth;
    case 'centered':
    default:
      return (barWidth - textWidth) / 2;
  }
}

function generateGcode(job, config) {
  const gcode = [];

  // Extract config values
  const barWidth = config.bar_width;
  const barHeight = config.bar_height;
  const zSafe = config.z_safe_height;
  const zEngrave = config.z_engrave_depth;
  const feedRate = config.feed_rate;
  const gapTemplateToMessage = config.gap_template_to_message;
  const gapBetweenLines = config.gap_between_lines;

  // Font settings
  const templateFont = getFont(config.template_font);
  const templateFontSize = config.template_font_size;
  const templateAlignment = config.template_alignment;

  const messageFont = getFont(config.message_font);
  const messageAlignment = config.message_alignment;

  // Determine message font size based on whether we have 1 or 2 lines
  const hasMessage1 = job.message_1 && job.message_1.trim().length > 0;
  const hasMessage2 = job.message_2 && job.message_2.trim().length > 0;
  const messageCount = (hasMessage1 ? 1 : 0) + (hasMessage2 ? 1 : 0);
  const messageFontSize = messageCount <= 1
    ? config.message_font_size_1_line
    : config.message_font_size_2_lines;

  // G-code header
  gcode.push('; CNC Chocolate Engraver');
  gcode.push('; Job ID: ' + job.id);
  gcode.push('; Template: ' + config.template_text);
  gcode.push('; Message 1: ' + (job.message_1 || ''));
  gcode.push('; Message 2: ' + (job.message_2 || ''));
  gcode.push('');
  gcode.push('G21 ; Set units to millimeters');
  gcode.push('G90 ; Absolute positioning');
  gcode.push('G92 X0 Y0 Z0 ; Set current position as origin');
  gcode.push(`G0 Z${zSafe} ; Raise to safe height`);
  gcode.push('');

  // Calculate vertical layout
  // Start from top of bar, work down
  let currentY = barHeight;

  // Template text
  const templateText = config.template_text || '';
  if (templateText.length > 0) {
    const templateWidth = templateFont.getTextWidth(templateText, templateFontSize);
    const templateX = calculateAlignment(templateWidth, barWidth, templateAlignment);
    currentY -= templateFontSize;

    gcode.push('; Template: ' + templateText);
    const templatePaths = templateFont.textToPath(templateText, templateFontSize, templateX, currentY);
    gcode.push(...pathsToGcode(templatePaths, zSafe, zEngrave, feedRate));
    gcode.push('');

    currentY -= gapTemplateToMessage;
  }

  // Message 1
  if (hasMessage1) {
    const msg1Width = messageFont.getTextWidth(job.message_1, messageFontSize);
    const msg1X = calculateAlignment(msg1Width, barWidth, messageAlignment);
    currentY -= messageFontSize;

    gcode.push('; Message 1: ' + job.message_1);
    const msg1Paths = messageFont.textToPath(job.message_1, messageFontSize, msg1X, currentY);
    gcode.push(...pathsToGcode(msg1Paths, zSafe, zEngrave, feedRate));
    gcode.push('');

    if (hasMessage2) {
      currentY -= gapBetweenLines;
    }
  }

  // Message 2
  if (hasMessage2) {
    const msg2Width = messageFont.getTextWidth(job.message_2, messageFontSize);
    const msg2X = calculateAlignment(msg2Width, barWidth, messageAlignment);
    currentY -= messageFontSize;

    gcode.push('; Message 2: ' + job.message_2);
    const msg2Paths = messageFont.textToPath(job.message_2, messageFontSize, msg2X, currentY);
    gcode.push(...pathsToGcode(msg2Paths, zSafe, zEngrave, feedRate));
    gcode.push('');
  }

  // G-code footer
  gcode.push('; End of job');
  gcode.push(`G0 Z${zSafe} ; Raise to safe height`);
  gcode.push('G0 X0 Y0 ; Return to origin');
  gcode.push('M2 ; End program');

  return gcode.join('\n');
}

function pathsToGcode(paths, zSafe, zEngrave, feedRate) {
  const gcode = [];

  for (const stroke of paths) {
    if (stroke.length === 0) continue;

    // Move to start of stroke (pen up)
    const start = stroke[0];
    gcode.push(`G0 Z${zSafe}`);
    gcode.push(`G0 X${start.x.toFixed(3)} Y${start.y.toFixed(3)}`);
    gcode.push(`G1 Z${zEngrave} F${feedRate}`);

    // Draw stroke
    for (let i = 1; i < stroke.length; i++) {
      const point = stroke[i];
      gcode.push(`G1 X${point.x.toFixed(3)} Y${point.y.toFixed(3)} F${feedRate}`);
    }
  }

  // Lift at end
  gcode.push(`G0 Z${zSafe}`);

  return gcode;
}

module.exports = {
  generateGcode,
  getFont,
  fonts
};
