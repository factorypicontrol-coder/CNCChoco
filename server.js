const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const app = express();
app.use(express.json());
app.use(express.static('public')); // For web interface

let port;
let parser;

// Connect to GRBL
function connectGRBL() {
  port = new SerialPort({ 
    path: '/dev/ttyUSB0',  // Check with `ls /dev/ttyUSB*`
    baudRate: 115200 
  });
  
  parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
  parser.on('data', (data) => {
    console.log('GRBL:', data);
    // Broadcast to WebSocket clients here if needed
  });

  port.on('open', () => console.log('Connected to GRBL'));
  port.on('error', (err) => console.log('Serial error:', err));
}

// Send G-code command

// Status check
app.get('/1', (req, res) => {
  const squareGcode = 'G1 X0 Y0 F200'
  if (port) {
    port.write(squareGcode + '\n', (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        status: 'sent', 
        command: squareGcode,
        note: 'Watch GRBL parser output above for <Idle|MPos:...|FS:...>'
      });
    });
  } else {
    res.status(500).json({ error: 'GRBL not connected' });
  }
});

app.get('/2', (req, res) => {
  const squareGcode = 'G1 X0 Y30 F200'
  if (port) {
    port.write(squareGcode + '\n', (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        status: 'sent', 
        command: squareGcode,
        note: 'Watch GRBL parser output above for <Idle|MPos:...|FS:...>'
      });
    });
  } else {
    res.status(500).json({ error: 'GRBL not connected' });
  }
});

app.get('/3', (req, res) => {
  const squareGcode = 'G1 X30 Y0 F200'
  if (port) {
    port.write(squareGcode + '\n', (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        status: 'sent', 
        command: squareGcode,
        note: 'Watch GRBL parser output above for <Idle|MPos:...|FS:...>'
      });
    });
  } else {
    res.status(500).json({ error: 'GRBL not connected' });
  }
});

app.get('/4', (req, res) => {
  const squareGcode = 'G1 X30 Y30 F200'
  if (port) {
    port.write(squareGcode + '\n', (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        status: 'sent', 
        command: squareGcode,
        note: 'Watch GRBL parser output above for <Idle|MPos:...|FS:...>'
      });
    });
  } else {
    res.status(500).json({ error: 'GRBL not connected' });
  }
});

app.post('/cnc/command', (req, res) => {
  const { gcode } = req.body;
  if (port && gcode) {
    port.write(gcode + '\n', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ status: 'sent' });
    });
  } else {
    res.status(500).json({ error: 'Not connected' });
  }
});

// Status check
app.get('/cnc/status', (req, res) => {
  port.write('?', (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ status: 'query sent' });
  });
});

// Home machine
app.post('/cnc/home', (req, res) => {
  port.write('$H\n', (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ status: 'homing' });
  });
});

connectGRBL();
app.listen(3000, () => console.log('CNC server on http://localhost:3000'));
