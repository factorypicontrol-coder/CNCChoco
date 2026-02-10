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

// Trust proxy (Tailscale HTTPS termination)
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Swagger UI - override swagger-ui-init.js to use window.location.origin
app.get('/api-docs/swagger-ui-init.js', (req, res) => {
  const initJs = `
window.onload = function() {
  var spec = ${JSON.stringify(swaggerSpec)};
  spec.servers = [
    { url: window.location.origin, description: "Current server" }
  ];
  var ui = SwaggerUIBundle({
    spec: spec,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",
    persistAuthorization: true,
    displayRequestDuration: true,
    tryItOutEnabled: true
  });
  window.ui = ui;
};`;
  res.setHeader('Content-Type', 'application/javascript');
  res.send(initJs);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CNC Chocolate Engraver API'
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

    // Start HTTP server (bind to localhost only - Tailscale proxies to it)
    const server = await app.listen(PORT, '127.0.0.1');
    console.log(`CNC Chocolate Engraver running at http://localhost:${PORT}`);
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
