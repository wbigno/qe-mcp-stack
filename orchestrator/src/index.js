import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import mcpRouter from "./routes/mcp.js";
import analysisRouter from "./routes/analysis.js";
import adoRouter from "./routes/ado.js";
import testsRouter from "./routes/tests.js";
import dashboardRouter from "./routes/dashboard.js";
import swaggerRouter from "./routes/swagger.js";
import playwrightRouter from "./routes/playwright.js";
import infrastructureRouter from "./routes/infrastructure.js";
import docsRouter from "./routes/docs.js";
import proxyRouter from "./routes/proxy.js";
import aiRouter from "./routes/ai.js";
import { logger } from "./utils/logger.js";
import { MCPManager } from "./services/mcpManager.js";
import { fileWatcher } from "./services/fileWatcher.js";
import path from "path";
import { fileURLToPath } from "url";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "../config/.env" });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// Initialize MCP Manager
const mcpManager = new MCPManager();

// Middleware
// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV !== "production";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Add 'unsafe-eval' in development for browser MCP automation
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          ...(isDevelopment ? ["'unsafe-eval'"] : []),
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// Make io and mcpManager available to routes
app.use((req, res, next) => {
  req.io = io;
  req.mcpManager = mcpManager;
  next();
});

// Routes
app.use("/api/mcp", mcpRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/ado", adoRouter);
app.use("/api/tests", testsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/swagger", swaggerRouter);
app.use("/api/playwright", playwrightRouter);
app.use("/api/infrastructure", infrastructureRouter);
app.use("/api/proxy", proxyRouter);
app.use("/api/ai", aiRouter);
app.use("/docs", docsRouter);

// Aggregated Swagger UI
app.use("/api-docs", swaggerUi.serve, async (req, res, next) => {
  try {
    const aggregatedSpec = await mcpManager.getAggregatedSwaggerSpec();
    swaggerUi.setup(aggregatedSpec, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "QE MCP Stack - API Documentation",
    })(req, res, next);
  } catch (error) {
    logger.error("Error loading aggregated Swagger UI:", error);
    res.status(500).json({ error: "Failed to load API documentation" });
  }
});

// Serve dashboard static files
app.use(
  "/code-dashboard",
  express.static(path.join(__dirname, "../code-dashboard")),
);
app.use(
  "/ado-dashboard",
  express.static(path.join(__dirname, "../ado-dashboard")),
);

// Health check (removed duplicate)
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mcps: mcpManager.getStatus(),
  });
});

// Dashboard
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>QE Orchestrator</title>
      <style>
        :root {
          --bg-primary: #0a0a0a;
          --bg-secondary: #141414;
          --bg-tertiary: #1a1a1a;
          --text-primary: #ffffff;
          --text-secondary: #a1a1a1;
          --border-primary: #2a2a2a;
          --accent-primary: #3b82f6;
          --accent-primary-hover: #2563eb;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          line-height: 1.6;
          min-height: 100vh;
          padding: 20px;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
        }

        header {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 0.75rem;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
        }

        .section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        ul {
          list-style: none;
          padding: 0;
        }

        li {
          margin: 0.75rem 0;
          padding: 0.75rem 1rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        li:hover {
          background: var(--bg-primary);
          border-color: var(--accent-primary);
        }

        a {
          color: var(--accent-primary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        a:hover {
          color: var(--accent-primary-hover);
        }

        strong {
          color: var(--text-primary);
        }

        .endpoint-desc {
          color: var(--text-secondary);
          font-size: 0.8125rem;
          margin-left: 0.5rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🚀 QE MCP Orchestrator</h1>
          <p class="subtitle">Central hub for Quality Engineering automation and MCP services</p>
        </header>

        <div class="section">
          <h2>📊 Dashboards</h2>
          <ul>
            <li><a href="/code-dashboard/">Code Analysis Dashboard</a></li>
            <li><a href="/ado-dashboard/">Azure DevOps Dashboard</a></li>
            <li><a href="http://localhost:8082">Infrastructure Dashboard</a></li>
            <li><a href="http://localhost:8000">Swagger API Hub</a></li>
          </ul>
        </div>

        <div class="section">
          <h2>🔌 API Endpoints</h2>
          <ul>
            <li><a href="/health">Health Check</a><span class="endpoint-desc">Service health status</span></li>
            <li><a href="/api-docs"><strong>API Documentation (Swagger)</strong></a></li>
            <li><a href="/api/mcp">/api/mcp</a><span class="endpoint-desc">MCP management</span></li>
            <li><a href="/api/analysis">/api/analysis</a><span class="endpoint-desc">Code analysis</span></li>
            <li><a href="/api/ado">/api/ado</a><span class="endpoint-desc">Azure DevOps</span></li>
            <li><a href="/api/tests">/api/tests</a><span class="endpoint-desc">Test generation</span></li>
            <li><a href="/api/dashboard">/api/dashboard</a><span class="endpoint-desc">Dashboard data</span></li>
            <li><a href="/api/swagger/docs">/api/swagger/docs</a><span class="endpoint-desc">All MCP Swagger docs</span></li>
            <li><a href="/api/swagger/aggregated.json">/api/swagger/aggregated.json</a><span class="endpoint-desc">Aggregated OpenAPI spec</span></li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// WebSocket connections for real-time updates
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on("subscribe", (data) => {
    socket.join(data.channel);
    logger.info(`Client ${socket.id} subscribed to ${data.channel}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((err, req, res, _next) => {
  logger.error("Error:", err);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  await fileWatcher.stop();
  await mcpManager.shutdown();
  httpServer.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
});

// Start server
async function start() {
  try {
    // Initialize all MCPs
    await mcpManager.initialize();

    // Start file watcher for repository monitoring
    fileWatcher.start();
    logger.info("📁 File system watcher started for repository monitoring");

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Orchestrator running on port ${PORT}`);
      logger.info(`📊 Dashboard: http://localhost:${PORT}`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start orchestrator:", error);
    process.exit(1);
  }
}

start();
