/**
 * Base class for all MCP services
 */

import express, { Express, Request, Response, NextFunction } from "express";
import {
  MCPConfig,
  MCPHealth,
  APIResponse,
  ServiceError,
  httpLogger,
  requestId,
  logError,
  logInfo,
} from "@qe-mcp-stack/shared";

export abstract class BaseMCP {
  protected app: Express;
  protected config: MCPConfig;
  private startTime: number;

  private routesSetup = false;

  constructor(config: MCPConfig) {
    this.config = config;
    this.app = express();
    this.startTime = Date.now();
    this.setupMiddleware();
    this.setupBaseRoutes();
    // Note: setupRoutes() and setupSwagger() are called in start()
    // to ensure subclass constructors complete first
  }

  protected setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(requestId());
    this.app.use(httpLogger());

    this.app.use((_req, res, next) => {
      res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (_req.method === "OPTIONS") {
        res.sendStatus(200);
        return;
      }
      next();
    });
  }

  protected setupBaseRoutes(): void {
    this.app.get("/health", this.healthCheck.bind(this));
    this.app.get("/", (_req, res) => {
      res.json({
        name: this.config.name,
        version: this.config.version,
        description: this.config.description,
        docs: `http://${this.config.host || "localhost"}:${this.config.port}/api-docs`,
      });
    });
  }

  protected async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const dependencies = await this.checkDependencies();
      const health: MCPHealth = {
        status: dependencies.every((d) => d.status === "up")
          ? "healthy"
          : "degraded",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        version: this.config.version,
        dependencies,
      };

      res.status(health.status === "healthy" ? 200 : 503).json(health);
    } catch (error) {
      logError("Health check failed", { error });
      res.status(503).json({
        status: "unhealthy",
        error: (error as Error).message,
      });
    }
  }

  protected async checkDependencies(): Promise<
    Array<{ name: string; status: "up" | "down" }>
  > {
    return [];
  }

  protected handleError(
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    logError("Request error", {
      error: error.message,
      stack: error.stack,
      path: _req.path,
      method: _req.method,
    });

    const statusCode = (error as ServiceError).statusCode || 500;
    const response: APIResponse = {
      success: false,
      error: {
        code: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    };

    res.status(statusCode).json(response);
  }

  public async start(): Promise<void> {
    // Setup routes and swagger now that subclass constructor has completed
    if (!this.routesSetup) {
      if (typeof (this as any).setupRoutes === "function") {
        (this as any).setupRoutes();
      }
      if (typeof (this as any).setupSwagger === "function") {
        (this as any).setupSwagger();
      }
      this.routesSetup = true;
    }

    this.app.use(this.handleError.bind(this));

    const port = this.config.port;
    const host = this.config.host || "0.0.0.0";

    this.app.listen(port, host, () => {
      logInfo(`${this.config.name} started`, {
        port,
        host,
        environment: this.config.environment || process.env.NODE_ENV,
      });
    });

    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  protected async shutdown(): Promise<void> {
    logInfo(`${this.config.name} shutting down`);
    process.exit(0);
  }
}
