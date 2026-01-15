import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager } from "../../helpers/mocks.js";

/**
 * API Tests: MCP Routes
 *
 * Tests all MCP management endpoints for status monitoring and health checks.
 *
 * Endpoints tested:
 * - GET /api/mcp/status - Get status of all MCPs
 * - GET /api/mcp/health/:mcpName - Check health of specific MCP
 */

describe("MCP Routes", () => {
  let app;
  let mockMcpManager;
  let mcpRouter;

  beforeEach(async () => {
    jest.resetModules();

    // Import routes
    const mcpRouterModule = await import("../../../src/routes/mcp.js");
    mcpRouter = mcpRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/mcp", mcpRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/mcp/status", () => {
    describe("Successful status retrieval", () => {
      it("should return status of all MCPs", async () => {
        mockMcpManager.getStatus.mockReturnValue({
          integration: {
            azureDevOps: { status: "healthy", url: "http://azure-devops:8100" },
          },
          codeAnalysis: {
            dotnetCodeAnalyzer: {
              status: "healthy",
              url: "http://code-analyzer:8200",
            },
          },
          summary: {
            mcpsHealthy: 15,
            mcpsTotal: 15,
            dashboardsAvailable: 2,
            dashboardsTotal: 2,
          },
        });

        const response = await request(app).get("/api/mcp/status");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("timestamp");
        expect(response.body).toHaveProperty("status");
        expect(response.body.status.summary.mcpsHealthy).toBe(15);
        expect(response.body.status.summary.mcpsTotal).toBe(15);
      });

      it("should include timestamp in ISO format", async () => {
        const response = await request(app).get("/api/mcp/status");

        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });

      it("should call mcpManager.getStatus once", async () => {
        await request(app).get("/api/mcp/status");

        expect(mockMcpManager.getStatus).toHaveBeenCalledTimes(1);
      });

      it("should return integration MCPs status", async () => {
        mockMcpManager.getStatus.mockReturnValue({
          integration: {
            azureDevOps: { status: "healthy", url: "http://azure-devops:8100" },
            playwrightMcp: { status: "healthy", url: "http://playwright:8300" },
          },
          summary: { mcpsHealthy: 2, mcpsTotal: 2 },
        });

        const response = await request(app).get("/api/mcp/status");

        expect(response.body.status.integration).toBeDefined();
        expect(response.body.status.integration.azureDevOps.status).toBe(
          "healthy",
        );
        expect(response.body.status.integration.playwrightMcp.status).toBe(
          "healthy",
        );
      });

      it("should return code analysis MCPs status", async () => {
        mockMcpManager.getStatus.mockReturnValue({
          codeAnalysis: {
            dotnetCodeAnalyzer: {
              status: "healthy",
              url: "http://code-analyzer:8200",
            },
            javascriptAnalyzer: {
              status: "healthy",
              url: "http://js-analyzer:8201",
            },
          },
          summary: { mcpsHealthy: 2, mcpsTotal: 2 },
        });

        const response = await request(app).get("/api/mcp/status");

        expect(response.body.status.codeAnalysis).toBeDefined();
        expect(
          response.body.status.codeAnalysis.dotnetCodeAnalyzer.status,
        ).toBe("healthy");
      });
    });

    describe("Status with unhealthy MCPs", () => {
      it("should return status when some MCPs are unhealthy", async () => {
        mockMcpManager.getStatus.mockReturnValue({
          integration: {
            azureDevOps: {
              status: "unhealthy",
              url: "http://azure-devops:8100",
              error: "Connection timeout",
            },
          },
          summary: {
            mcpsHealthy: 14,
            mcpsTotal: 15,
          },
        });

        const response = await request(app).get("/api/mcp/status");

        expect(response.status).toBe(200);
        expect(response.body.status.summary.mcpsHealthy).toBe(14);
        expect(response.body.status.summary.mcpsTotal).toBe(15);
        expect(response.body.status.integration.azureDevOps.status).toBe(
          "unhealthy",
        );
      });

      it("should include error details for unhealthy MCPs", async () => {
        mockMcpManager.getStatus.mockReturnValue({
          integration: {
            azureDevOps: { status: "unhealthy", error: "Connection refused" },
          },
          summary: { mcpsHealthy: 0, mcpsTotal: 1 },
        });

        const response = await request(app).get("/api/mcp/status");

        expect(response.body.status.integration.azureDevOps.error).toBe(
          "Connection refused",
        );
      });
    });
  });

  describe("GET /api/mcp/health/:mcpName", () => {
    describe("Successful health check", () => {
      it("should check health of specific MCP", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          status: "healthy",
          version: "1.0.0",
          uptime: 12345,
        });

        const response = await request(app).get("/api/mcp/health/azureDevOps");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("mcp", "azureDevOps");
        expect(response.body).toHaveProperty("health");
        expect(response.body.health.status).toBe("healthy");
      });

      it("should call mcpManager.callDockerMcp with correct parameters", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          status: "healthy",
        });

        await request(app).get("/api/mcp/health/dotnetCodeAnalyzer");

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCodeAnalyzer",
          "/health",
          {},
          "GET",
        );
      });

      it("should return health details for healthy MCP", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          status: "healthy",
          version: "2.1.0",
          uptime: 54321,
          memoryUsage: "128MB",
        });

        const response = await request(app).get(
          "/api/mcp/health/playwrightMcp",
        );

        expect(response.body.health.version).toBe("2.1.0");
        expect(response.body.health.uptime).toBe(54321);
        expect(response.body.health.memoryUsage).toBe("128MB");
      });

      it("should handle health check for different MCPs", async () => {
        const mcpNames = ["azureDevOps", "dotnetCodeAnalyzer", "playwrightMcp"];

        for (const mcpName of mcpNames) {
          mockMcpManager.callDockerMcp.mockResolvedValue({ status: "healthy" });

          const response = await request(app).get(`/api/mcp/health/${mcpName}`);

          expect(response.status).toBe(200);
          expect(response.body.mcp).toBe(mcpName);
        }
      });
    });

    describe("Health check errors", () => {
      it("should return 500 when MCP is not found", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("Unknown MCP: unknownMcp"),
        );

        const response = await request(app).get("/api/mcp/health/unknownMcp");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("mcp", "unknownMcp");
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("Unknown MCP");
      });

      it("should return 500 when MCP is unhealthy", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP azureDevOps is not healthy"),
        );

        const response = await request(app).get("/api/mcp/health/azureDevOps");

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain("not healthy");
      });

      it("should return 500 on network timeout", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("ETIMEDOUT: Connection timeout"),
        );

        const response = await request(app).get("/api/mcp/health/azureDevOps");

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("ETIMEDOUT");
      });

      it("should return 500 on connection refused", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("ECONNREFUSED: Connection refused"),
        );

        const response = await request(app).get(
          "/api/mcp/health/playwrightMcp",
        );

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("ECONNREFUSED");
      });

      it("should include MCP name in error response", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("Health check failed"),
        );

        const response = await request(app).get("/api/mcp/health/testMcp");

        expect(response.body.mcp).toBe("testMcp");
      });
    });

    describe("Edge cases", () => {
      it("should handle MCP names with special characters", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ status: "healthy" });

        const response = await request(app).get(
          "/api/mcp/health/mcp-with-dashes",
        );

        expect(response.status).toBe(200);
        expect(response.body.mcp).toBe("mcp-with-dashes");
      });

      it("should handle MCP names with numbers", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ status: "healthy" });

        const response = await request(app).get("/api/mcp/health/mcp123");

        expect(response.status).toBe(200);
        expect(response.body.mcp).toBe("mcp123");
      });

      it("should handle concurrent health checks", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ status: "healthy" });

        const requests = [
          request(app).get("/api/mcp/health/azureDevOps"),
          request(app).get("/api/mcp/health/dotnetCodeAnalyzer"),
          request(app).get("/api/mcp/health/playwrightMcp"),
        ];

        const responses = await Promise.all(requests);

        responses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledTimes(3);
      });
    });
  });
});
