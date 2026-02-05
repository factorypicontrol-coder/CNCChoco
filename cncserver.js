// CNC Chocolate Engraver - Main Server
// Entry point for the application

const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const database = require('./database');
const api = require('./api');
const engine = require('./engine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CNC Chocolate Engraver API',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true
  }
}));

// Serve swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api', api);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Catch-all for SPA (serve index.html for any non-API route)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
async function start() {
  try {
    // Initialize database
    console.log('Initializing database...');
    await database.init();
    console.log('Database initialized');

    // Try to auto-connect to CNC
    console.log('Scanning for CNC device...');
    const connectResult = await engine.connect();
    if (connectResult.success) {
      console.log('Connected to CNC at', connectResult.path);
    } else {
      console.log('CNC not connected:', connectResult.error);
      console.log('You can connect manually via the web interface');
    }

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`CNC Chocolate Engraver running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  engine.disconnect();
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down...');
  engine.disconnect();
  await database.close();
  process.exit(0);
});

// Start the server
start();
