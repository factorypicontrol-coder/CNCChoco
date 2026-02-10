const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { default: GCodeTextRenderer } = require('./gcodeconverter.js');
const renderer = new GCodeTextRenderer({ charWidth:17,lineHeight:15});

const app = express();
const cors = require("cors");//Delete this later - for testing only
app.use(cors({ origin: 'http://localhost:3000' }));//Delete this later - for testing only
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

// Testing
//Preset 1
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
//Preset 2
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
//Preset 3
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
//Preset 4
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
//Test POST endpoint
app.post('/testPost', (req, res) => {
  renderer.addText(req.body.data)
  if (req.body.data) {
    console.log(renderer.getGcode())
  } else {
    res.status(500).json({ error: 'Not connected' });
  }
});
//gcodeconverter test helper
app.get('/test', (req, res) => {
  renderer.addText("W")
  if (true) {
    console.log(renderer.getGcode())
    res.send("Nice");
  } else {
    res.status(500).json({ error: 'Not connected' });
  }
});

//Printing endpoint
app.post('/cnc/command', (req, res) => {
  renderer.addText(req.body.data)
  if (port && req.body.data) {
    port.write(renderer.getGcode(), (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ status: 'sent' });
    });
  } else {
    res.status(500).json({ error: 'Not connected' });
  }
});


//Utility Endpoints
// Status check
app.get('/cnc/status', (req, res) => {
  port.write('?', (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ status: 'query sent' });
  });
});


//Stops the machine
app.get('/cnc/pause', (req, res) => {
  port.write('!\n', (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ status: 'homing' });
  });
});



//Resume the machine
app.get('/cnc/pause', (req, res) => {
  port.write('~\n', (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ status: 'homing' });
  });
});

//Soft Rest
app.get('/cnc/reset', (req, res) => {
  port.write(Buffer.from([0x18]), (err) => {
    if (err) res.status(500).json({ error: err.message });
    else res.json({ status: 'homing' });
  });
});


//connectGRBL();
app.listen(3000, () => console.log('CNC server on http://localhost:3000'));

