import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager } from "../../helpers/mocks.js";

/**
 * API Tests: Swagger Aggregation Routes
 *
 * Tests Swagger/OpenAPI documentation aggregation from all MCPs.
 *
 * Endpoints tested:
 * - GET /api/swagger/docs - List of all available MCP Swagger docs
 * - GET /api/swagger/aggregated.json - Aggregated OpenAPI spec
 * - GET /api/swagger/:mcpName - Swagger docs for specific MCP
 */

describe("Swagger Routes", () => {
  let app;
  let mockMcpManager;
  let swaggerRouter;

  beforeEach(async () => {
    jest.resetModules();

    // Import routes
    const swaggerRouterModule = await import("../../../src/routes/swagger.js");
    swaggerRouter = swaggerRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/swagger", swaggerRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/swagger/docs", () => {
    describe("Successful docs retrieval", () => {
      it("should return list of all Swagger docs", async () => {
        mockMcpManager.getAllSwaggerDocs.mockResolvedValue({
          azureDevOps: {
            basePath: "http://azure-devops:8100",
            docsUrl: "http://azure-devops:8100/docs",
            openapiUrl: "http://azure-devops:8100/openapi.json",
          },
          dotnetCodeAnalyzer: {
            basePath: "http://code-analyzer:8200",
            docsUrl: "http://code-analyzer:8200/docs",
            openapiUrl: "http://code-analyzer:8200/openapi.json",
          },
        });

        const response = await request(app).get("/api/swagger/docs");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("docs");
        expect(response.body.docs.azureDevOps).toBeDefined();
        expect(response.body.docs.dotnetCodeAnalyzer).toBeDefined();
      });

      it("should call mcpManager.getAllSwaggerDocs once", async () => {
        mockMcpManager.getAllSwaggerDocs.mockResolvedValue({});

        await request(app).get("/api/swagger/docs");

        expect(mockMcpManager.getAllSwaggerDocs).toHaveBeenCalledTimes(1);
      });

      it("should return docs with basePath for each MCP", async () => {
        mockMcpManager.getAllSwaggerDocs.mockResolvedValue({
          azureDevOps: {
            basePath: "http://azure-devops:8100",
            docsUrl: "http://azure-devops:8100/docs",
          },
        });

        const response = await request(app).get("/api/swagger/docs");

        expect(response.body.docs.azureDevOps.basePath).toBe(
          "http://azure-devops:8100",
        );
      });

      it("should return empty docs object when no MCPs available", async () => {
        mockMcpManager.getAllSwaggerDocs.mockResolvedValue({});

        const response = await request(app).get("/api/swagger/docs");

        expect(response.status).toBe(200);
        expect(response.body.docs).toEqual({});
      });

      it("should return docs for all healthy MCPs only", async () => {
        mockMcpManager.getAllSwaggerDocs.mockResolvedValue({
          azureDevOps: {
            basePath: "http://azure-devops:8100",
            docsUrl: "http://azure-devops:8100/docs",
          },
          unhealthyMcp: {
            error: "MCP is not healthy",
          },
        });

        const response = await request(app).get("/api/swagger/docs");

        expect(response.body.docs.azureDevOps).toBeDefined();
        expect(response.body.docs.unhealthyMcp.error).toBeDefined();
      });
    });

    describe("Error handling", () => {
      it("should return 500 on mcpManager error", async () => {
        mockMcpManager.getAllSwaggerDocs.mockRejectedValue(
          new Error("Failed to fetch docs"),
        );

        const response = await request(app).get("/api/swagger/docs");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toBe("Failed to fetch docs");
      });

      it("should handle network timeout errors", async () => {
        mockMcpManager.getAllSwaggerDocs.mockRejectedValue(
          new Error("ETIMEDOUT: Network timeout"),
        );

        const response = await request(app).get("/api/swagger/docs");

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("ETIMEDOUT");
      });
    });
  });

  describe("GET /api/swagger/aggregated.json", () => {
    describe("Successful aggregation", () => {
      it("should return aggregated OpenAPI spec", async () => {
        mockMcpManager.getAggregatedSwaggerSpec.mockResolvedValue({
          openapi: "3.0.0",
          info: {
            title: "QE MCP Stack - Aggregated API",
            version: "1.0.0",
          },
          paths: {
            "/api/ado/work-items": {
              get: { summary: "Get work items" },
            },
            "/api/analysis/code-quality": {
              get: { summary: "Get code quality metrics" },
            },
          },
        });

        const response = await request(app).get("/api/swagger/aggregated.json");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("openapi", "3.0.0");
        expect(response.body).toHaveProperty("info");
        expect(response.body).toHaveProperty("paths");
      });

      it("should call mcpManager.getAggregatedSwaggerSpec once", async () => {
        mockMcpManager.getAggregatedSwaggerSpec.mockResolvedValue({
          openapi: "3.0.0",
        });

        await request(app).get("/api/swagger/aggregated.json");

        expect(mockMcpManager.getAggregatedSwaggerSpec).toHaveBeenCalledTimes(
          1,
        );
      });

      it("should include paths from all MCPs", async () => {
        mockMcpManager.getAggregatedSwaggerSpec.mockResolvedValue({
          openapi: "3.0.0",
          paths: {
            "/api/ado/work-items": {},
            "/api/analysis/metrics": {},
            "/api/playwright/tests": {},
          },
        });

        const response = await request(app).get("/api/swagger/aggregated.json");

        expect(Object.keys(response.body.paths).length).toBe(3);
      });

      it("should include info metadata", async () => {
        mockMcpManager.getAggregatedSwaggerSpec.mockResolvedValue({
          openapi: "3.0.0",
          info: {
            title: "Test API",
            version: "2.0.0",
            description: "Aggregated API documentation",
          },
        });

        const response = await request(app).get("/api/swagger/aggregated.json");

        expect(response.body.info.title).toBe("Test API");
        expect(response.body.info.version).toBe("2.0.0");
      });
    });

    describe("Error handling", () => {
      it("should return 500 on aggregation error", async () => {
        mockMcpManager.getAggregatedSwaggerSpec.mockRejectedValue(
          new Error("Failed to aggregate specs"),
        );

        const response = await request(app).get("/api/swagger/aggregated.json");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body.error).toBe("Failed to aggregate specs");
      });

      it("should handle malformed spec errors", async () => {
        mockMcpManager.getAggregatedSwaggerSpec.mockRejectedValue(
          new Error("Invalid OpenAPI spec format"),
        );

        const response = await request(app).get("/api/swagger/aggregated.json");

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("Invalid OpenAPI spec");
      });
    });
  });

  describe("GET /api/swagger/:mcpName", () => {
    describe("Successful docs retrieval", () => {
      it("should return Swagger docs for specific MCP", async () => {
        mockMcpManager.getSwaggerDocs.mockResolvedValue({
          openapi: "3.0.0",
          info: {
            title: "Azure DevOps MCP API",
            version: "1.0.0",
          },
          paths: {
            "/work-items": { get: { summary: "Get work items" } },
          },
        });

        const response = await request(app).get("/api/swagger/azureDevOps");

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe("3.0.0");
        expect(response.body.info.title).toBe("Azure DevOps MCP API");
      });

      it("should call mcpManager.getSwaggerDocs with MCP name", async () => {
        mockMcpManager.getSwaggerDocs.mockResolvedValue({
          openapi: "3.0.0",
        });

        await request(app).get("/api/swagger/dotnetCodeAnalyzer");

        expect(mockMcpManager.getSwaggerDocs).toHaveBeenCalledWith(
          "dotnetCodeAnalyzer",
        );
      });

      it("should handle different MCP names", async () => {
        const mcpNames = ["azureDevOps", "playwrightMcp", "dotnetCodeAnalyzer"];

        for (const mcpName of mcpNames) {
          mockMcpManager.getSwaggerDocs.mockResolvedValue({
            openapi: "3.0.0",
            info: { title: `${mcpName} API` },
          });

          const response = await request(app).get(`/api/swagger/${mcpName}`);

          expect(response.status).toBe(200);
          expect(response.body.info.title).toBe(`${mcpName} API`);
        }
      });

      it("should return complete OpenAPI spec", async () => {
        mockMcpManager.getSwaggerDocs.mockResolvedValue({
          openapi: "3.0.0",
          info: { title: "Test API", version: "1.0.0" },
          paths: {
            "/test": {
              get: {
                summary: "Test endpoint",
                responses: { 200: { description: "Success" } },
              },
            },
          },
          components: {
            schemas: {
              TestSchema: { type: "object" },
            },
          },
        });

        const response = await request(app).get("/api/swagger/testMcp");

        expect(response.body.paths).toBeDefined();
        expect(response.body.components).toBeDefined();
      });
    });

    describe("Error handling", () => {
      it("should return 404 for unknown MCP", async () => {
        mockMcpManager.getSwaggerDocs.mockRejectedValue(
          new Error("Unknown MCP: unknownMcp"),
        );

        const response = await request(app).get("/api/swagger/unknownMcp");

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body.error).toContain("Unknown MCP");
      });

      it("should return 500 for unhealthy MCP", async () => {
        mockMcpManager.getSwaggerDocs.mockRejectedValue(
          new Error("MCP azureDevOps is not healthy"),
        );

        const response = await request(app).get("/api/swagger/azureDevOps");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body.error).toContain("not healthy");
      });

      it("should return 500 on network error", async () => {
        mockMcpManager.getSwaggerDocs.mockRejectedValue(
          new Error("ECONNREFUSED: Connection refused"),
        );

        const response = await request(app).get("/api/swagger/testMcp");

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("ECONNREFUSED");
      });

      it("should return 500 on timeout", async () => {
        mockMcpManager.getSwaggerDocs.mockRejectedValue(
          new Error("ETIMEDOUT: Request timeout"),
        );

        const response = await request(app).get("/api/swagger/slowMcp");

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("ETIMEDOUT");
      });
    });

    describe("Edge cases", () => {
      it("should handle MCP names with hyphens", async () => {
        mockMcpManager.getSwaggerDocs.mockResolvedValue({
          openapi: "3.0.0",
        });

        const response = await request(app).get(
          "/api/swagger/dotnet-code-analyzer",
        );

        expect(response.status).toBe(200);
        expect(mockMcpManager.getSwaggerDocs).toHaveBeenCalledWith(
          "dotnet-code-analyzer",
        );
      });

      it('should not match "aggregated.json" as MCP name', async () => {
        // This should hit the /aggregated.json route, not /:mcpName
        mockMcpManager.getAggregatedSwaggerSpec.mockResolvedValue({
          openapi: "3.0.0",
        });

        const response = await request(app).get("/api/swagger/aggregated.json");

        expect(response.status).toBe(200);
        expect(mockMcpManager.getAggregatedSwaggerSpec).toHaveBeenCalled();
        expect(mockMcpManager.getSwaggerDocs).not.toHaveBeenCalled();
      });

      it('should not match "docs" as MCP name', async () => {
        // This should hit the /docs route, not /:mcpName
        mockMcpManager.getAllSwaggerDocs.mockResolvedValue({});

        const response = await request(app).get("/api/swagger/docs");

        expect(response.status).toBe(200);
        expect(mockMcpManager.getAllSwaggerDocs).toHaveBeenCalled();
        expect(mockMcpManager.getSwaggerDocs).not.toHaveBeenCalled();
      });
    });
  });
});
