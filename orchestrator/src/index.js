import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mcpRouter from './routes/mcp.js';
import analysisRouter from './routes/analysis.js';
import adoRouter from './routes/ado.js';
import testsRouter from './routes/tests.js';
import dashboardRouter from './routes/dashboard.js';  // ← Moved up with other imports
import { logger } from './utils/logger.js';
import { MCPManager } from './services/mcpManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../config/.env' });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Initialize MCP Manager
const mcpManager = new MCPManager();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Make io and mcpManager available to routes
app.use((req, res, next) => {
  req.io = io;
  req.mcpManager = mcpManager;
  next();
});

// Routes
app.use('/api/mcp', mcpRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/ado', adoRouter);
app.use('/api/tests', testsRouter);
app.use('/api/dashboard', dashboardRouter);  // ← Only once!

// Serve dashboard static files
app.use('/code-dashboard', express.static(path.join(__dirname, '../code-dashboard')));
app.use('/ado-dashboard', express.static(path.join(__dirname, '../ado-dashboard')));

// Health check (removed duplicate)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mcps: mcpManager.getStatus()
  });
});

// Dashboard
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QE Orchestrator</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #667eea; }
        ul { list-style: none; padding: 0; }
        li { margin: 10px 0; }
        a { color: #667eea; text-decoration: none; font-size: 18px; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🚀 QE MCP Orchestrator</h1>
      <h2>Dashboards</h2>
      <ul>
        <li>📊 <a href="/code-dashboard/">Code Analysis Dashboard</a></li>
        <li>📋 <a href="/ado-dashboard/">Azure DevOps Dashboard</a></li>
      </ul>
      <h2>API Endpoints</h2>
      <ul>
        <li><a href="/health">Health Check</a></li>
        <li><a href="/api/mcp">/api/mcp</a> - MCP management</li>
        <li><a href="/api/analysis">/api/analysis</a> - Code analysis</li>
        <li><a href="/api/ado">/api/ado</a> - Azure DevOps</li>
        <li><a href="/api/tests">/api/tests</a> - Test generation</li>
        <li><a href="/api/dashboard">/api/dashboard</a> - Dashboard data</li>
      </ul>
    </body>
    </html>
  `);
});

// WebSocket connections for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('subscribe', (data) => {
    socket.join(data.channel);
    logger.info(`Client ${socket.id} subscribed to ${data.channel}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await mcpManager.shutdown();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
async function start() {
  try {
    // Initialize all MCPs
    await mcpManager.initialize();
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Orchestrator running on port ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start orchestrator:', error);
    process.exit(1);
  }
}

start();