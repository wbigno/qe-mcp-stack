/**
 * Swagger Hub Server
 * Central landing page for all QE MCP API documentation
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to fetch MCP status from orchestrator
app.get('/api/mcps', async (req, res) => {
  try {
    const response = await axios.get(`${ORCHESTRATOR_URL}/health`, {
      timeout: 5000
    });

    res.json({
      success: true,
      data: response.data.mcps || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching MCP status:', error.message);
    res.status(503).json({
      success: false,
      error: 'Failed to fetch MCP status from orchestrator',
      message: error.message
    });
  }
});

// Fetch aggregated Swagger spec from orchestrator
app.get('/api/swagger/aggregated.json', async (req, res) => {
  try {
    const response = await axios.get(`${ORCHESTRATOR_URL}/api/swagger/aggregated.json`, {
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching aggregated Swagger spec:', error.message);
    res.status(503).json({
      success: false,
      error: 'Failed to fetch aggregated API documentation',
      message: error.message
    });
  }
});

// Aggregated API Documentation UI - fetch spec once at startup
let cachedSwaggerSpec = null;
let specFetchPromise = null;

async function getSwaggerSpec() {
  if (cachedSwaggerSpec) {
    return cachedSwaggerSpec;
  }

  if (!specFetchPromise) {
    specFetchPromise = axios.get(`${ORCHESTRATOR_URL}/api/swagger/aggregated.json`, {
      timeout: 10000
    }).then(response => {
      cachedSwaggerSpec = response.data;
      cachedSwaggerSpec.servers = [
        {
          url: 'http://localhost:3000',
          description: 'Orchestrator (local development)'
        },
        {
          url: ORCHESTRATOR_URL,
          description: 'Orchestrator'
        }
      ];
      return cachedSwaggerSpec;
    }).catch(error => {
      specFetchPromise = null;
      throw error;
    });
  }

  return specFetchPromise;
}

// Serve Swagger UI with dynamically loaded spec
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', async (req, res) => {
  try {
    const swaggerSpec = await getSwaggerSpec();
    const swaggerUiHandler = swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'QE MCP Stack - Aggregated API Documentation',
      customCssUrl: '/css/swagger-custom.css'
    });
    swaggerUiHandler(req, res);
  } catch (error) {
    console.error('Error loading Swagger UI:', error.message);
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>API Documentation - Error</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 100px auto;
              padding: 20px;
              text-align: center;
            }
            .error {
              background: #fee;
              border: 1px solid #fcc;
              border-radius: 8px;
              padding: 30px;
              color: #c33;
            }
            h1 { color: #c33; }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>⚠️ Unable to Load API Documentation</h1>
            <p>Failed to connect to the orchestrator service.</p>
            <p>Error: ${error.message}</p>
            <a href="/">← Back to Hub</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'swagger-hub',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Swagger Hub running on port ${PORT}`);
  console.log(`📚 Visit http://localhost:${PORT} to view API documentation`);
  console.log(`🔗 Orchestrator: ${ORCHESTRATOR_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
