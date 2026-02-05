// Script Font - Cursive single-stroke font for CNC engraving
// Elegant, flowing style suitable for branding
// Each character is defined as an array of strokes
// Each stroke is an array of [x, y] coordinates (pen down)
// null separates strokes (pen up between)

const CHAR_WIDTH = 14;
const CHAR_HEIGHT = 18;

// Character definitions with flowing cursive style
const characters = {
  'A': {
    width: 16,
    strokes: [[0,0], [2,6], [6,16], [10,18], [14,14], [12,6], [8,0], null, [4,6], [14,6]]
  },
  'B': {
    width: 14,
    strokes: [[0,0], [2,18], null, [2,18], [8,18], [12,16], [12,12], [8,10], [2,10], null, [8,10], [12,8], [12,4], [8,0], [2,0]]
  },
  'C': {
    width: 14,
    strokes: [[14,16], [10,18], [6,18], [2,16], [0,12], [0,6], [2,2], [6,0], [10,0], [14,2]]
  },
  'D': {
    width: 14,
    strokes: [[0,0], [2,18], null, [2,18], [8,18], [12,14], [14,8], [12,2], [8,0], [2,0]]
  },
  'E': {
    width: 12,
    strokes: [[12,0], [2,0], [0,2], [2,18], [10,18], null, [2,10], [8,10]]
  },
  'F': {
    width: 12,
    strokes: [[0,0], [2,18], [10,18], null, [0,10], [8,10]]
  },
  'G': {
    width: 14,
    strokes: [[14,16], [10,18], [6,18], [2,16], [0,12], [0,6], [2,2], [6,0], [10,0], [14,2], [14,8], [10,8]]
  },
  'H': {
    width: 14,
    strokes: [[0,0], [2,18], null, [12,0], [14,18], null, [2,10], [14,10]]
  },
  'I': {
    width: 8,
    strokes: [[2,0], [4,18], null, [0,18], [8,18], null, [0,0], [6,0]]
  },
  'J': {
    width: 12,
    strokes: [[0,4], [2,2], [4,0], [8,0], [10,2], [12,18]]
  },
  'K': {
    width: 14,
    strokes: [[0,0], [2,18], null, [14,18], [2,8], null, [6,12], [14,0]]
  },
  'L': {
    width: 12,
    strokes: [[2,18], [0,0], [10,0], [12,2]]
  },
  'M': {
    width: 18,
    strokes: [[0,0], [2,18], [10,6], [16,18], [18,0]]
  },
  'N': {
    width: 14,
    strokes: [[0,0], [2,18], [12,0], [14,18]]
  },
  'O': {
    width: 14,
    strokes: [[6,0], [2,2], [0,6], [0,12], [2,16], [6,18], [10,18], [14,14], [14,6], [12,2], [8,0], [6,0]]
  },
  'P': {
    width: 12,
    strokes: [[0,0], [2,18], [8,18], [12,16], [12,12], [8,10], [2,10]]
  },
  'Q': {
    width: 14,
    strokes: [[6,0], [2,2], [0,6], [0,12], [2,16], [6,18], [10,18], [14,14], [14,6], [12,2], [8,0], [6,0], null, [10,4], [16,-2]]
  },
  'R': {
    width: 14,
    strokes: [[0,0], [2,18], [8,18], [12,16], [12,12], [8,10], [2,10], null, [8,10], [14,0]]
  },
  'S': {
    width: 12,
    strokes: [[12,16], [8,18], [4,18], [0,16], [0,12], [4,10], [8,10], [12,8], [12,2], [8,0], [4,0], [0,2]]
  },
  'T': {
    width: 14,
    strokes: [[6,0], [8,18], null, [0,18], [14,18]]
  },
  'U': {
    width: 14,
    strokes: [[2,18], [0,4], [2,2], [6,0], [10,0], [14,2], [14,18]]
  },
  'V': {
    width: 14,
    strokes: [[0,18], [6,0], [14,18]]
  },
  'W': {
    width: 20,
    strokes: [[0,18], [4,0], [10,12], [14,0], [20,18]]
  },
  'X': {
    width: 14,
    strokes: [[0,0], [14,18], null, [0,18], [14,0]]
  },
  'Y': {
    width: 14,
    strokes: [[0,18], [6,10], [14,18], null, [6,10], [6,0]]
  },
  'Z': {
    width: 14,
    strokes: [[0,18], [14,18], [0,0], [14,0]]
  },
  '0': {
    width: 12,
    strokes: [[6,0], [2,2], [0,6], [0,12], [2,16], [6,18], [8,18], [12,14], [12,6], [10,2], [6,0]]
  },
  '1': {
    width: 8,
    strokes: [[2,14], [6,18], [6,0]]
  },
  '2': {
    width: 12,
    strokes: [[0,14], [2,16], [6,18], [10,18], [12,16], [12,12], [0,0], [12,0]]
  },
  '3': {
    width: 12,
    strokes: [[0,16], [4,18], [8,18], [12,16], [12,12], [8,10], [4,10], null, [8,10], [12,8], [12,2], [8,0], [4,0], [0,2]]
  },
  '4': {
    width: 12,
    strokes: [[10,0], [10,18], [0,6], [12,6]]
  },
  '5': {
    width: 12,
    strokes: [[12,18], [2,18], [0,10], [6,12], [10,10], [12,6], [10,2], [6,0], [2,0], [0,2]]
  },
  '6': {
    width: 12,
    strokes: [[10,18], [6,18], [2,16], [0,10], [0,4], [2,2], [6,0], [10,0], [12,2], [12,6], [10,8], [6,8], [2,6], [0,4]]
  },
  '7': {
    width: 12,
    strokes: [[0,18], [12,18], [4,0]]
  },
  '8': {
    width: 12,
    strokes: [[4,10], [0,12], [0,16], [4,18], [8,18], [12,16], [12,12], [8,10], [4,10], [0,8], [0,2], [4,0], [8,0], [12,2], [12,8], [8,10]]
  },
  '9': {
    width: 12,
    strokes: [[12,12], [10,10], [6,10], [2,12], [0,16], [2,18], [6,18], [10,16], [12,12], [12,4], [10,2], [6,0], [2,0]]
  },
  ' ': {
    width: 8,
    strokes: []
  },
  '.': {
    width: 4,
    strokes: [[2,2], [2,0], [3,0], [3,2], [2,2]]
  },
  ',': {
    width: 4,
    strokes: [[3,2], [2,2], [2,0], [3,0], [3,2], [1,-3]]
  },
  '!': {
    width: 4,
    strokes: [[2,18], [2,6], null, [2,2], [2,0]]
  },
  '?': {
    width: 10,
    strokes: [[0,14], [2,16], [6,18], [10,16], [10,12], [6,10], [6,6], null, [6,2], [6,0]]
  },
  '-': {
    width: 8,
    strokes: [[1,9], [7,9]]
  },
  '+': {
    width: 10,
    strokes: [[5,14], [5,4], null, [1,9], [9,9]]
  },
  '=': {
    width: 10,
    strokes: [[1,11], [9,11], null, [1,7], [9,7]]
  },
  '/': {
    width: 10,
    strokes: [[0,0], [10,18]]
  },
  '(': {
    width: 6,
    strokes: [[6,20], [2,16], [0,10], [0,8], [2,2], [6,-2]]
  },
  ')': {
    width: 6,
    strokes: [[0,20], [4,16], [6,10], [6,8], [4,2], [0,-2]]
  },
  '@': {
    width: 18,
    strokes: [[14,6], [12,4], [8,4], [6,6], [6,10], [8,12], [12,12], [14,10], [14,4], null, [14,12], [16,14], [16,6], [14,2], [10,0], [6,0], [2,2], [0,6], [0,12], [2,16], [6,18], [12,18], [16,16]]
  },
  '#': {
    width: 14,
    strokes: [[4,20], [2,-2], null, [12,20], [10,-2], null, [0,12], [14,12], null, [0,6], [14,6]]
  },
  '$': {
    width: 12,
    strokes: [[6,20], [6,-2], null, [12,16], [8,18], [4,18], [0,16], [0,12], [4,10], [8,10], [12,8], [12,2], [8,0], [4,0], [0,2]]
  },
  '%': {
    width: 16,
    strokes: [[0,0], [16,18], null, [4,18], [4,14], [2,14], [2,18], [4,18], null, [12,4], [12,0], [14,0], [14,4], [12,4]]
  },
  '&': {
    width: 16,
    strokes: [[16,0], [8,8], [10,12], [10,16], [8,18], [4,18], [2,16], [2,12], [4,10], [0,6], [0,2], [2,0], [6,0], [16,10]]
  },
  "'": {
    width: 4,
    strokes: [[2,18], [2,14]]
  },
  ':': {
    width: 4,
    strokes: [[2,12], [2,10], null, [2,2], [2,0]]
  },
  ';': {
    width: 4,
    strokes: [[2,12], [2,10], null, [2,2], [2,0], [0,-2]]
  },
  '*': {
    width: 10,
    strokes: [[5,16], [5,8], null, [1,14], [9,10], null, [9,14], [1,10]]
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
    width += (charData.width + 2) * scale;
  }
  return width - 2 * scale;
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
  name: 'script'
};
