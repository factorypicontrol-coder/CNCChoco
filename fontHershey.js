// Hershey Simplex Font - Single-stroke font for CNC engraving
// Each character is defined as an array of strokes
// Each stroke is an array of [x, y] coordinates (pen down)
// null separates strokes (pen up between)
// Coordinates are normalized to a 21-unit height grid

const CHAR_WIDTH = 16;
const CHAR_HEIGHT = 21;

// Character definitions - coordinates relative to baseline
// Format: { width, strokes: [[x,y], [x,y], null, [x,y], ...] }
const characters = {
  'A': {
    width: 18,
    strokes: [[9,21], [1,0], null, [9,21], [17,0], null, [4,7], [14,7]]
  },
  'B': {
    width: 18,
    strokes: [[2,21], [2,0], null, [2,21], [11,21], [14,20], [15,18], [15,16], [14,14], [11,13], [2,13], null, [11,13], [14,12], [15,10], [15,4], [14,2], [11,0], [2,0]]
  },
  'C': {
    width: 18,
    strokes: [[16,18], [14,20], [11,21], [8,21], [5,20], [3,18], [2,15], [2,6], [3,3], [5,1], [8,0], [11,0], [14,1], [16,3]]
  },
  'D': {
    width: 18,
    strokes: [[2,21], [2,0], null, [2,21], [9,21], [12,20], [14,18], [15,15], [15,6], [14,3], [12,1], [9,0], [2,0]]
  },
  'E': {
    width: 16,
    strokes: [[2,21], [2,0], null, [2,21], [14,21], null, [2,11], [10,11], null, [2,0], [14,0]]
  },
  'F': {
    width: 16,
    strokes: [[2,21], [2,0], null, [2,21], [14,21], null, [2,11], [10,11]]
  },
  'G': {
    width: 19,
    strokes: [[16,18], [14,20], [11,21], [8,21], [5,20], [3,18], [2,15], [2,6], [3,3], [5,1], [8,0], [11,0], [14,1], [16,3], [16,9], null, [11,9], [16,9]]
  },
  'H': {
    width: 18,
    strokes: [[2,21], [2,0], null, [16,21], [16,0], null, [2,11], [16,11]]
  },
  'I': {
    width: 8,
    strokes: [[4,21], [4,0]]
  },
  'J': {
    width: 14,
    strokes: [[10,21], [10,4], [9,1], [7,0], [5,0], [3,1], [2,4]]
  },
  'K': {
    width: 18,
    strokes: [[2,21], [2,0], null, [16,21], [2,8], null, [7,12], [16,0]]
  },
  'L': {
    width: 14,
    strokes: [[2,21], [2,0], null, [2,0], [12,0]]
  },
  'M': {
    width: 22,
    strokes: [[2,21], [2,0], null, [2,21], [11,0], null, [20,21], [11,0], null, [20,21], [20,0]]
  },
  'N': {
    width: 18,
    strokes: [[2,21], [2,0], null, [2,21], [16,0], null, [16,21], [16,0]]
  },
  'O': {
    width: 20,
    strokes: [[9,21], [6,20], [4,18], [2,15], [1,11], [1,10], [2,6], [4,3], [6,1], [9,0], [11,0], [14,1], [16,3], [18,6], [19,10], [19,11], [18,15], [16,18], [14,20], [11,21], [9,21]]
  },
  'P': {
    width: 18,
    strokes: [[2,21], [2,0], null, [2,21], [11,21], [14,20], [15,18], [15,15], [14,13], [11,12], [2,12]]
  },
  'Q': {
    width: 20,
    strokes: [[9,21], [6,20], [4,18], [2,15], [1,11], [1,10], [2,6], [4,3], [6,1], [9,0], [11,0], [14,1], [16,3], [18,6], [19,10], [19,11], [18,15], [16,18], [14,20], [11,21], [9,21], null, [13,5], [19,-2]]
  },
  'R': {
    width: 18,
    strokes: [[2,21], [2,0], null, [2,21], [11,21], [14,20], [15,18], [15,15], [14,13], [11,12], [2,12], null, [9,12], [16,0]]
  },
  'S': {
    width: 18,
    strokes: [[15,18], [13,20], [9,21], [6,21], [3,20], [1,18], [1,15], [2,13], [4,11], [12,8], [14,6], [15,4], [15,2], [14,1], [12,0], [6,0], [3,1], [1,3]]
  },
  'T': {
    width: 16,
    strokes: [[8,21], [8,0], null, [1,21], [15,21]]
  },
  'U': {
    width: 18,
    strokes: [[2,21], [2,5], [3,2], [5,0], [9,0], [13,0], [15,2], [16,5], [16,21]]
  },
  'V': {
    width: 18,
    strokes: [[1,21], [9,0], null, [17,21], [9,0]]
  },
  'W': {
    width: 24,
    strokes: [[1,21], [5,0], null, [9,21], [5,0], null, [9,21], [13,0], null, [17,21], [13,0], null, [17,21], [21,0]]
  },
  'X': {
    width: 18,
    strokes: [[1,21], [16,0], null, [16,21], [1,0]]
  },
  'Y': {
    width: 18,
    strokes: [[1,21], [9,11], [9,0], null, [17,21], [9,11]]
  },
  'Z': {
    width: 18,
    strokes: [[15,21], [1,0], null, [1,21], [15,21], null, [1,0], [15,0]]
  },
  '0': {
    width: 18,
    strokes: [[9,21], [6,20], [4,17], [2,12], [2,9], [3,4], [5,1], [8,0], [10,0], [13,1], [15,4], [16,9], [16,12], [14,17], [12,20], [9,21]]
  },
  '1': {
    width: 12,
    strokes: [[4,17], [6,18], [9,21], [9,0]]
  },
  '2': {
    width: 18,
    strokes: [[3,17], [3,18], [4,20], [5,21], [8,21], [11,20], [13,18], [14,16], [14,13], [13,11], [10,8], [1,0], [15,0]]
  },
  '3': {
    width: 18,
    strokes: [[3,18], [5,20], [8,21], [11,21], [14,20], [15,18], [15,15], [14,13], [11,11], [8,11], null, [11,11], [14,10], [15,8], [15,3], [14,1], [11,0], [8,0], [5,1], [3,3]]
  },
  '4': {
    width: 18,
    strokes: [[12,21], [1,7], [16,7], null, [12,21], [12,0]]
  },
  '5': {
    width: 18,
    strokes: [[14,21], [4,21], [3,12], [5,14], [8,15], [11,15], [14,14], [16,11], [16,8], [15,4], [13,1], [9,0], [6,0], [3,1], [2,3]]
  },
  '6': {
    width: 18,
    strokes: [[14,18], [12,20], [9,21], [7,21], [4,20], [2,17], [1,12], [1,7], [2,3], [4,1], [7,0], [9,0], [12,1], [14,3], [15,6], [15,7], [14,10], [12,12], [9,13], [7,13], [4,12], [2,10], [1,7]]
  },
  '7': {
    width: 18,
    strokes: [[15,21], [6,0], null, [2,21], [15,21]]
  },
  '8': {
    width: 18,
    strokes: [[8,21], [5,20], [4,18], [4,16], [5,14], [7,13], [11,12], [14,11], [16,9], [17,7], [17,4], [16,2], [14,0], [9,0], [4,0], [2,2], [1,4], [1,7], [2,9], [4,11], [7,12], [11,13], [13,14], [14,16], [14,18], [13,20], [10,21], [8,21]]
  },
  '9': {
    width: 18,
    strokes: [[15,14], [14,10], [12,8], [9,7], [7,7], [4,8], [2,10], [1,14], [1,15], [2,18], [4,20], [7,21], [9,21], [12,20], [14,18], [15,14], [15,9], [14,4], [12,1], [9,0], [7,0], [4,1], [2,4]]
  },
  ' ': {
    width: 10,
    strokes: []
  },
  '.': {
    width: 6,
    strokes: [[3,2], [2,1], [3,0], [4,1], [3,2]]
  },
  ',': {
    width: 6,
    strokes: [[3,2], [2,1], [3,0], [4,1], [3,2], [2,-3]]
  },
  '!': {
    width: 8,
    strokes: [[4,21], [4,7], null, [4,2], [3,1], [4,0], [5,1], [4,2]]
  },
  '?': {
    width: 16,
    strokes: [[2,17], [2,18], [3,20], [5,21], [8,21], [11,20], [13,18], [14,16], [14,14], [13,12], [11,11], [8,10], [8,7], null, [8,2], [7,1], [8,0], [9,1], [8,2]]
  },
  '-': {
    width: 14,
    strokes: [[2,11], [12,11]]
  },
  '+': {
    width: 18,
    strokes: [[9,18], [9,3], null, [2,11], [16,11]]
  },
  '=': {
    width: 18,
    strokes: [[2,14], [16,14], null, [2,7], [16,7]]
  },
  '/': {
    width: 16,
    strokes: [[14,21], [0,-3]]
  },
  '(': {
    width: 10,
    strokes: [[8,25], [5,22], [3,18], [2,13], [2,8], [3,3], [5,-1], [8,-4]]
  },
  ')': {
    width: 10,
    strokes: [[2,25], [5,22], [7,18], [8,13], [8,8], [7,3], [5,-1], [2,-4]]
  },
  '@': {
    width: 24,
    strokes: [[15,13], [14,15], [12,16], [9,16], [7,15], [6,14], [5,11], [5,8], [6,6], [8,5], [11,5], [13,6], [14,8], null, [15,16], [15,6], [16,5], [18,5], [20,7], [21,10], [21,12], [20,15], [19,17], [17,19], [15,20], [12,21], [9,21], [6,20], [4,19], [2,17], [1,15], [0,12], [0,9], [1,6], [2,4], [4,2], [6,1], [9,0], [12,0], [15,1], [17,2], [18,3]]
  },
  '#': {
    width: 20,
    strokes: [[8,25], [4,-4], null, [16,25], [12,-4], null, [2,13], [19,13], null, [1,6], [18,6]]
  },
  '$': {
    width: 18,
    strokes: [[5,25], [5,-4], null, [11,25], [11,-4], null, [15,18], [13,20], [9,21], [6,21], [3,20], [1,18], [1,15], [2,13], [4,11], [12,8], [14,6], [15,4], [15,2], [14,1], [12,0], [6,0], [3,1], [1,3]]
  },
  '%': {
    width: 22,
    strokes: [[19,21], [1,0], null, [5,21], [7,19], [7,17], [6,15], [4,14], [2,14], [1,16], [1,18], [2,20], [4,21], [6,21], [8,20], [11,19], [14,19], [17,20], [19,21], null, [16,7], [14,6], [13,4], [13,2], [15,0], [17,0], [19,1], [20,3], [20,5], [18,7], [16,7]]
  },
  '&': {
    width: 22,
    strokes: [[20,13], [19,12], [20,11], [21,12], [21,13], [20,14], [19,14], [17,13], [15,11], [10,3], [8,1], [5,0], [3,0], [1,1], [0,3], [0,5], [1,7], [2,8], [4,9], [9,11], [11,12], [13,14], [14,16], [14,18], [13,20], [11,21], [9,21], [7,20], [6,18], [6,16], [7,13], [9,10], [16,0], [18,0], [20,1], [21,3]]
  },
  "'": {
    width: 6,
    strokes: [[3,21], [2,14]]
  },
  ':': {
    width: 6,
    strokes: [[3,14], [2,13], [3,12], [4,13], [3,14], null, [3,2], [2,1], [3,0], [4,1], [3,2]]
  },
  ';': {
    width: 6,
    strokes: [[3,14], [2,13], [3,12], [4,13], [3,14], null, [3,2], [2,1], [3,0], [4,1], [3,2], [2,-3]]
  },
  '*': {
    width: 14,
    strokes: [[7,21], [7,9], null, [1,18], [13,12], null, [13,18], [1,12]]
  },
  '_': {
    width: 18,
    strokes: [[0,-4], [18,-4]]
  }
};

// Add lowercase as aliases to uppercase
for (const char of 'abcdefghijklmnopqrstuvwxyz') {
  characters[char] = characters[char.toUpperCase()];
}

function getCharacter(char) {
  if (characters[char]) return characters[char];
  console.warn(`[fontHershey] Missing glyph for character: "${char}" (U+${char.charCodeAt(0).toString(16).padStart(4, '0')})`);
  return { width: characters[' '].width, strokes: [] };
}

function getTextWidth(text, fontSize) {
  const scale = fontSize / CHAR_HEIGHT;
  let width = 0;
  for (const char of text) {
    const charData = getCharacter(char);
    width += charData.width * scale;
  }
  return width;
}

// Convert text to path data (array of strokes)
// Returns array of strokes, each stroke is array of {x, y} points
function textToPath(text, fontSize, startX, startY) {
  const scale = fontSize / CHAR_HEIGHT;
  const paths = [];
  let currentX = startX;

  for (const char of text) {
    const charData = getCharacter(char);
    let currentStroke = [];

    for (const point of charData.strokes) {
      if (point === null) {
        if (currentStroke.length > 0) {
          paths.push(currentStroke);
          currentStroke = [];
        }
      } else {
        currentStroke.push({
          x: currentX + point[0] * scale,
          y: startY - point[1] * scale  // Flip Y for CNC coordinates
        });
      }
    }

    if (currentStroke.length > 0) {
      paths.push(currentStroke);
    }

    currentX += charData.width * scale;
  }

  return paths;
}

function getCharAdvance(char) {
  return getCharacter(char).width;
}

function renderCharGcode(char, fontSize, offsetX, offsetY, opts = {}) {
  const { decimals = 6, zSafe = 5, zEngrave = -0.125, feedRate = 400 } = opts;
  const scale = fontSize / CHAR_HEIGHT;
  const glyph = getCharacter(char);
  const lines = [];

  if (!glyph.strokes || glyph.strokes.length === 0) return lines;

  // Parse strokes into groups separated by null
  const strokes = [];
  let current = [];
  for (const point of glyph.strokes) {
    if (point === null) {
      if (current.length > 0) { strokes.push(current); current = []; }
    } else {
      current.push(point);
    }
  }
  if (current.length > 0) strokes.push(current);

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    const sx = offsetX + stroke[0][0] * scale;
    const sy = offsetY - stroke[0][1] * scale;

    lines.push(`G0 Z${Number(zSafe).toFixed(decimals)}`);
    lines.push(`G0 X${sx.toFixed(decimals)} Y${sy.toFixed(decimals)}`);
    lines.push(`G1 Z${Number(zEngrave).toFixed(decimals)} F${Number(feedRate).toFixed(decimals)}`);

    for (let i = 1; i < stroke.length; i++) {
      const px = offsetX + stroke[i][0] * scale;
      const py = offsetY - stroke[i][1] * scale;
      lines.push(`G1 X${px.toFixed(decimals)} Y${py.toFixed(decimals)} F${Number(feedRate).toFixed(decimals)}`);
    }
  }

  lines.push(`G0 Z${Number(zSafe).toFixed(decimals)}`);
  return lines;
}

module.exports = {
  CHAR_WIDTH,
  CHAR_HEIGHT,
  getCharacter,
  getCharAdvance,
  getTextWidth,
  renderCharGcode,
  textToPath,
  name: 'hershey'
};
