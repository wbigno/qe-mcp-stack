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

// Dashboard with MCP Status
app.get("/", async (req, res) => {
  // Get MCP status - nested by category
  const mcpStatus = mcpManager.getStatus();

  // Category display order and labels
  const categoryOrder = [
    "integration",
    "codeAnalysis",
    "qualityAnalysis",
    "playwright",
    "dashboards",
  ];
  const categoryLabels = {
    integration: "🔗 Integration",
    codeAnalysis: "💻 Code Analysis",
    qualityAnalysis: "📊 Quality Analysis",
    playwright: "🎭 Playwright",
    dashboards: "📋 Dashboards",
  };

  // Use summary data from mcpManager
  const summary = mcpStatus.summary || {};
  const healthyCount = summary.mcpsHealthy || 0;
  const totalCount = summary.mcpsTotal || 0;
  const uptimeMinutes = Math.floor(process.uptime() / 60);

  // Generate MCP cards HTML grouped by category
  let mcpCardsHtml = "";
  for (const category of categoryOrder) {
    const categoryData = mcpStatus[category];
    if (
      categoryData &&
      typeof categoryData === "object" &&
      !Array.isArray(categoryData)
    ) {
      const mcps = Object.entries(categoryData);
      if (mcps.length > 0) {
        mcpCardsHtml +=
          '<div class="mcp-category"><div class="category-label">' +
          (categoryLabels[category] || category) +
          '</div><div class="mcp-grid-inner">';
        for (const [mcpName, mcpData] of mcps) {
          if (mcpData && mcpData.url) {
            const isHealthy = mcpData.status === "healthy";
            const statusIcon = isHealthy ? "🟢" : "🔴";
            const statusClass = isHealthy ? "healthy" : "unhealthy";
            const portMatch = mcpData.url.match(/:(\d+)/);
            const port = portMatch ? portMatch[1] : "-";
            mcpCardsHtml +=
              '<div class="mcp-card ' +
              statusClass +
              '">' +
              '<div class="mcp-header">' +
              '<span class="status-icon">' +
              statusIcon +
              "</span>" +
              '<span class="mcp-name">' +
              mcpName +
              "</span>" +
              '<span class="mcp-port">:' +
              port +
              "</span>" +
              "</div>" +
              "</div>";
          }
        }
        mcpCardsHtml += "</div></div>";
      }
    }
  }

  res.send(`<!DOCTYPE html>
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
      --success: #22c55e;
      --error: #ef4444;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 0.75rem;
      padding: 2rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.5rem; }
    .subtitle { font-size: 1rem; color: var(--text-secondary); }
    .health-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid var(--success);
      border-radius: 20px;
      color: var(--success);
      font-weight: 600;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 0.75rem;
      padding: 1.5rem;
      text-align: center;
    }
    .stat-value { font-size: 2rem; font-weight: 700; color: var(--accent-primary); }
    .stat-value.success { color: var(--success); }
    .stat-label { font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.5rem; }
    .section {
      background: var(--bg-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
    .quick-links { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
    .quick-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: 0.75rem;
      text-decoration: none;
      transition: all 0.2s;
    }
    .quick-link:hover { border-color: var(--accent-primary); transform: translateY(-2px); }
    .quick-link-icon { font-size: 2rem; margin-bottom: 0.5rem; }
    .quick-link-title { font-weight: 600; color: var(--text-primary); }
    .quick-link-desc { font-size: 0.75rem; color: var(--text-secondary); text-align: center; }
    .mcp-grid { display: flex; flex-direction: column; gap: 1.5rem; }
    .mcp-category { margin-bottom: 0.5rem; }
    .category-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.75rem; padding-left: 0.25rem; }
    .mcp-grid-inner { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
    .mcp-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: 0.5rem;
      padding: 0.75rem 1rem;
      transition: all 0.2s;
    }
    .mcp-card:hover { border-color: var(--accent-primary); }
    .mcp-card.healthy { border-left: 3px solid var(--success); }
    .mcp-card.unhealthy { border-left: 3px solid var(--error); }
    .mcp-header { display: flex; align-items: center; gap: 0.5rem; }
    .status-icon { font-size: 0.65rem; }
    .mcp-name { font-weight: 500; flex: 1; font-size: 0.875rem; }
    .mcp-port { font-family: monospace; font-size: 0.75rem; color: var(--text-secondary); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
    ul { list-style: none; padding: 0; }
    li {
      margin: 0.5rem 0;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-primary);
      border-radius: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    li:hover { background: var(--bg-primary); border-color: var(--accent-primary); }
    a { color: var(--accent-primary); text-decoration: none; font-weight: 500; }
    a:hover { color: var(--accent-primary-hover); }
    .endpoint-desc { color: var(--text-secondary); font-size: 0.8125rem; }
    .refresh-info { text-align: center; padding: 1rem; color: var(--text-secondary); font-size: 0.875rem; }
    .docs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
    .docs-category { background: var(--bg-tertiary); border: 1px solid var(--border-primary); border-radius: 0.75rem; padding: 1.25rem; }
    .docs-category-title { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.75rem; }
    .docs-links { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .doc-link {
      display: inline-block;
      padding: 0.5rem 0.875rem;
      background: var(--bg-primary);
      border: 1px solid var(--border-primary);
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--accent-primary);
      text-decoration: none;
      transition: all 0.2s;
    }
    .doc-link:hover { border-color: var(--accent-primary); background: rgba(59, 130, 246, 0.1); }
    @media (max-width: 768px) {
      .stats-grid, .quick-links { grid-template-columns: repeat(2, 1fr); }
      .grid-2, .docs-grid { grid-template-columns: 1fr; }
      header { flex-direction: column; text-align: center; gap: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-left">
        <h1>🚀 QE MCP Orchestrator</h1>
        <p class="subtitle">Central hub for Quality Engineering automation and MCP services</p>
      </div>
      <div class="health-badge"><span>●</span> System Healthy</div>
    </header>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value success">${healthyCount}</div><div class="stat-label">Healthy MCPs</div></div>
      <div class="stat-card"><div class="stat-value">${totalCount}</div><div class="stat-label">Total MCPs</div></div>
      <div class="stat-card"><div class="stat-value">${uptimeMinutes}m</div><div class="stat-label">Uptime</div></div>
      <div class="stat-card"><div class="stat-value success">●</div><div class="stat-label">Orchestrator</div></div>
    </div>

    <div class="section">
      <h2>⚡ Quick Access</h2>
      <div class="quick-links">
        <a href="http://localhost:5173" class="quick-link" target="_blank">
          <span class="quick-link-icon">📋</span>
          <span class="quick-link-title">ADO Dashboard</span>
          <span class="quick-link-desc">Azure DevOps work items</span>
        </a>
        <a href="http://localhost:8081" class="quick-link" target="_blank">
          <span class="quick-link-icon">💻</span>
          <span class="quick-link-title">Code Dashboard</span>
          <span class="quick-link-desc">Code analysis & coverage</span>
        </a>
        <a href="http://localhost:8082" class="quick-link" target="_blank">
          <span class="quick-link-icon">🏗️</span>
          <span class="quick-link-title">Infrastructure</span>
          <span class="quick-link-desc">Architecture visualization</span>
        </a>
        <a href="/api-docs" class="quick-link">
          <span class="quick-link-icon">📚</span>
          <span class="quick-link-title">API Docs</span>
          <span class="quick-link-desc">Swagger documentation</span>
        </a>
      </div>
    </div>

    <div class="section">
      <h2>🔌 MCP Services Status</h2>
      <div class="mcp-grid">${mcpCardsHtml}</div>
    </div>

    <div class="grid-2">
      <div class="section">
        <h2>🔗 API Endpoints</h2>
        <ul>
          <li><a href="/health">Health Check</a><span class="endpoint-desc">Service status</span></li>
          <li><a href="/api-docs"><strong>Swagger UI</strong></a><span class="endpoint-desc">Interactive docs</span></li>
          <li><a href="/api/mcp/status">/api/mcp/status</a><span class="endpoint-desc">MCP status</span></li>
          <li><a href="/api/analysis">/api/analysis</a><span class="endpoint-desc">Code analysis</span></li>
          <li><a href="/api/ado">/api/ado</a><span class="endpoint-desc">Azure DevOps</span></li>
          <li><a href="/api/infrastructure">/api/infrastructure</a><span class="endpoint-desc">Infrastructure</span></li>
        </ul>
      </div>
      <div class="section">
        <h2>📚 API Documentation</h2>
        <ul>
          <li><a href="/api-docs"><strong>Swagger UI</strong></a><span class="endpoint-desc">Interactive API explorer</span></li>
          <li><a href="/api/swagger/aggregated.json">OpenAPI Spec</a><span class="endpoint-desc">Combined JSON spec</span></li>
          <li><a href="http://localhost:8000" target="_blank">Swagger Hub</a><span class="endpoint-desc">API explorer hub</span></li>
          <li><a href="/docs">Documentation Index</a><span class="endpoint-desc">All MCP docs</span></li>
        </ul>
      </div>
    </div>

    <div class="section">
      <h2>📖 MCP Documentation</h2>
      <div class="docs-grid">
        <div class="docs-category">
          <div class="docs-category-title">🔗 Integration MCPs</div>
          <div class="docs-links">
            <a href="/docs/azure-devops" class="doc-link">Azure DevOps</a>
            <a href="/docs/third-party" class="doc-link">Third Party</a>
            <a href="/docs/test-plan-manager" class="doc-link">Test Plan Manager</a>
            <a href="/docs/browser-control-mcp" class="doc-link">Browser Control</a>
          </div>
        </div>
        <div class="docs-category">
          <div class="docs-category-title">💻 Code Analysis MCPs</div>
          <div class="docs-links">
            <a href="/docs/code-analyzer" class="doc-link">.NET Code Analyzer</a>
            <a href="/docs/coverage-analyzer" class="doc-link">.NET Coverage Analyzer</a>
            <a href="/docs/blast-radius-analyzer" class="doc-link">Blast Radius Analyzer</a>
            <a href="/docs/migration-analyzer" class="doc-link">Migration Analyzer</a>
            <a href="/docs/javascript-code-analyzer" class="doc-link">JS Code Analyzer</a>
            <a href="/docs/javascript-coverage-analyzer" class="doc-link">JS Coverage Analyzer</a>
          </div>
        </div>
        <div class="docs-category">
          <div class="docs-category-title">📊 Quality Analysis MCPs</div>
          <div class="docs-links">
            <a href="/docs/risk-analyzer" class="doc-link">Risk Analyzer</a>
            <a href="/docs/integration-mapper" class="doc-link">Integration Mapper</a>
            <a href="/docs/test-selector" class="doc-link">Test Selector</a>
          </div>
        </div>
        <div class="docs-category">
          <div class="docs-category-title">🎭 Playwright MCPs</div>
          <div class="docs-links">
            <a href="/docs/playwright-generator" class="doc-link">Playwright Generator</a>
            <a href="/docs/playwright-analyzer" class="doc-link">Playwright Analyzer</a>
            <a href="/docs/playwright-healer" class="doc-link">Playwright Healer</a>
          </div>
        </div>
      </div>
    </div>

    <div class="refresh-info">
      Last updated: ${new Date().toLocaleString()} | <a href="/" onclick="location.reload(); return false;">🔄 Refresh</a>
    </div>
  </div>
</body>
</html>`);
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
