// Block Font - Simple geometric block letters for CNC engraving
// Uses only straight lines for clean, modern appearance
// Each character is defined as an array of strokes
// Each stroke is an array of [x, y] coordinates (pen down)
// null separates strokes (pen up between)

const CHAR_WIDTH = 12;
const CHAR_HEIGHT = 16;

// Character definitions - coordinates relative to baseline
const characters = {
  'A': {
    width: 14,
    strokes: [[0,0], [7,16], [14,0], null, [3,5], [11,5]]
  },
  'B': {
    width: 12,
    strokes: [[0,0], [0,16], [8,16], [12,14], [12,10], [8,8], [0,8], null, [8,8], [12,6], [12,2], [8,0], [0,0]]
  },
  'C': {
    width: 12,
    strokes: [[12,14], [10,16], [2,16], [0,14], [0,2], [2,0], [10,0], [12,2]]
  },
  'D': {
    width: 12,
    strokes: [[0,0], [0,16], [8,16], [12,12], [12,4], [8,0], [0,0]]
  },
  'E': {
    width: 10,
    strokes: [[10,0], [0,0], [0,16], [10,16], null, [0,8], [8,8]]
  },
  'F': {
    width: 10,
    strokes: [[0,0], [0,16], [10,16], null, [0,8], [8,8]]
  },
  'G': {
    width: 12,
    strokes: [[12,14], [10,16], [2,16], [0,14], [0,2], [2,0], [10,0], [12,2], [12,8], [7,8]]
  },
  'H': {
    width: 12,
    strokes: [[0,0], [0,16], null, [12,0], [12,16], null, [0,8], [12,8]]
  },
  'I': {
    width: 8,
    strokes: [[0,0], [8,0], null, [4,0], [4,16], null, [0,16], [8,16]]
  },
  'J': {
    width: 10,
    strokes: [[0,2], [2,0], [8,0], [10,2], [10,16]]
  },
  'K': {
    width: 12,
    strokes: [[0,0], [0,16], null, [12,16], [0,6], null, [4,10], [12,0]]
  },
  'L': {
    width: 10,
    strokes: [[0,16], [0,0], [10,0]]
  },
  'M': {
    width: 14,
    strokes: [[0,0], [0,16], [7,8], [14,16], [14,0]]
  },
  'N': {
    width: 12,
    strokes: [[0,0], [0,16], [12,0], [12,16]]
  },
  'O': {
    width: 12,
    strokes: [[2,0], [0,2], [0,14], [2,16], [10,16], [12,14], [12,2], [10,0], [2,0]]
  },
  'P': {
    width: 12,
    strokes: [[0,0], [0,16], [8,16], [12,14], [12,10], [8,8], [0,8]]
  },
  'Q': {
    width: 12,
    strokes: [[2,0], [0,2], [0,14], [2,16], [10,16], [12,14], [12,2], [10,0], [2,0], null, [8,4], [12,0]]
  },
  'R': {
    width: 12,
    strokes: [[0,0], [0,16], [8,16], [12,14], [12,10], [8,8], [0,8], null, [6,8], [12,0]]
  },
  'S': {
    width: 12,
    strokes: [[12,14], [10,16], [2,16], [0,14], [0,10], [2,8], [10,8], [12,6], [12,2], [10,0], [2,0], [0,2]]
  },
  'T': {
    width: 12,
    strokes: [[6,0], [6,16], null, [0,16], [12,16]]
  },
  'U': {
    width: 12,
    strokes: [[0,16], [0,2], [2,0], [10,0], [12,2], [12,16]]
  },
  'V': {
    width: 14,
    strokes: [[0,16], [7,0], [14,16]]
  },
  'W': {
    width: 18,
    strokes: [[0,16], [4,0], [9,10], [14,0], [18,16]]
  },
  'X': {
    width: 12,
    strokes: [[0,0], [12,16], null, [0,16], [12,0]]
  },
  'Y': {
    width: 12,
    strokes: [[0,16], [6,8], [12,16], null, [6,8], [6,0]]
  },
  'Z': {
    width: 12,
    strokes: [[0,16], [12,16], [0,0], [12,0]]
  },
  '0': {
    width: 12,
    strokes: [[2,0], [0,2], [0,14], [2,16], [10,16], [12,14], [12,2], [10,0], [2,0], null, [0,2], [12,14]]
  },
  '1': {
    width: 8,
    strokes: [[0,12], [4,16], [4,0], null, [0,0], [8,0]]
  },
  '2': {
    width: 12,
    strokes: [[0,14], [2,16], [10,16], [12,14], [12,10], [0,0], [12,0]]
  },
  '3': {
    width: 12,
    strokes: [[0,14], [2,16], [10,16], [12,14], [12,10], [10,8], [6,8], null, [10,8], [12,6], [12,2], [10,0], [2,0], [0,2]]
  },
  '4': {
    width: 12,
    strokes: [[10,0], [10,16], [0,6], [12,6]]
  },
  '5': {
    width: 12,
    strokes: [[12,16], [0,16], [0,10], [8,10], [12,8], [12,2], [10,0], [2,0], [0,2]]
  },
  '6': {
    width: 12,
    strokes: [[10,16], [2,16], [0,14], [0,2], [2,0], [10,0], [12,2], [12,6], [10,8], [0,8]]
  },
  '7': {
    width: 12,
    strokes: [[0,16], [12,16], [4,0]]
  },
  '8': {
    width: 12,
    strokes: [[2,8], [0,10], [0,14], [2,16], [10,16], [12,14], [12,10], [10,8], [2,8], [0,6], [0,2], [2,0], [10,0], [12,2], [12,6], [10,8]]
  },
  '9': {
    width: 12,
    strokes: [[12,8], [2,8], [0,10], [0,14], [2,16], [10,16], [12,14], [12,2], [10,0], [2,0]]
  },
  ' ': {
    width: 8,
    strokes: []
  },
  '.': {
    width: 4,
    strokes: [[1,0], [3,0], [3,2], [1,2], [1,0]]
  },
  ',': {
    width: 4,
    strokes: [[3,2], [1,2], [1,0], [3,0], [3,2], [1,-2]]
  },
  '!': {
    width: 4,
    strokes: [[2,16], [2,5], null, [1,0], [3,0], [3,2], [1,2], [1,0]]
  },
  '?': {
    width: 10,
    strokes: [[0,14], [2,16], [8,16], [10,14], [10,10], [6,8], [6,5], null, [5,0], [7,0], [7,2], [5,2], [5,0]]
  },
  '-': {
    width: 8,
    strokes: [[1,8], [7,8]]
  },
  '+': {
    width: 10,
    strokes: [[5,12], [5,4], null, [1,8], [9,8]]
  },
  '=': {
    width: 10,
    strokes: [[1,10], [9,10], null, [1,6], [9,6]]
  },
  '/': {
    width: 10,
    strokes: [[0,0], [10,16]]
  },
  '(': {
    width: 6,
    strokes: [[6,18], [2,14], [2,2], [6,-2]]
  },
  ')': {
    width: 6,
    strokes: [[0,18], [4,14], [4,2], [0,-2]]
  },
  '@': {
    width: 16,
    strokes: [[12,6], [10,4], [6,4], [4,6], [4,10], [6,12], [10,12], [12,10], [12,4], [10,2], [6,2], [2,4], [0,8], [0,10], [2,14], [6,16], [10,16], [14,14], [16,10], [16,6], [14,2], [10,0], [6,0], [2,2]]
  },
  '#': {
    width: 14,
    strokes: [[4,18], [2,-2], null, [12,18], [10,-2], null, [0,12], [14,12], null, [0,6], [14,6]]
  },
  '$': {
    width: 12,
    strokes: [[6,18], [6,-2], null, [12,14], [10,16], [2,16], [0,14], [0,10], [2,8], [10,8], [12,6], [12,2], [10,0], [2,0], [0,2]]
  },
  '%': {
    width: 16,
    strokes: [[0,0], [16,16], null, [2,16], [4,16], [4,12], [2,12], [2,16], null, [12,4], [14,4], [14,0], [12,0], [12,4]]
  },
  '&': {
    width: 14,
    strokes: [[14,0], [6,8], [8,10], [8,14], [6,16], [4,16], [2,14], [2,12], [4,10], [0,6], [0,2], [2,0], [6,0], [14,8]]
  },
  "'": {
    width: 4,
    strokes: [[2,16], [2,12]]
  },
  ':': {
    width: 4,
    strokes: [[1,10], [3,10], [3,12], [1,12], [1,10], null, [1,0], [3,0], [3,2], [1,2], [1,0]]
  },
  ';': {
    width: 4,
    strokes: [[1,10], [3,10], [3,12], [1,12], [1,10], null, [3,2], [1,2], [1,0], [3,0], [3,2], [1,-2]]
  },
  '*': {
    width: 10,
    strokes: [[5,14], [5,6], null, [1,12], [9,8], null, [9,12], [1,8]]
  },
  '_': {
    width: 12,
    strokes: [[0,-2], [12,-2]]
  }
};

// Add lowercase as aliases to uppercase
for (const char of 'abcdefghijklmnopqrstuvwxyz') {
  characters[char] = characters[char.toUpperCase()];
}

function getCharacter(char) {
  return characters[char] || characters['?'];
}

function getTextWidth(text, fontSize) {
  const scale = fontSize / CHAR_HEIGHT;
  let width = 0;
  for (const char of text) {
    const charData = getCharacter(char);
    width += (charData.width + 2) * scale; // +2 for letter spacing
  }
  return width - 2 * scale; // Remove trailing spacing
}

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
          y: startY - point[1] * scale
        });
      }
    }

    if (currentStroke.length > 0) {
      paths.push(currentStroke);
    }

    currentX += (charData.width + 2) * scale;
  }

  return paths;
}

module.exports = {
  CHAR_WIDTH,
  CHAR_HEIGHT,
  getCharacter,
  getTextWidth,
  textToPath,
  name: 'block'
};
