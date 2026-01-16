import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager } from "../../helpers/mocks.js";

/**
 * API Tests: Dashboard Routes
 *
 * Tests dashboard data aggregation and transformation endpoints.
 *
 * Endpoints tested:
 * - GET /api/dashboard/applications - List available applications
 * - GET /api/dashboard/code-analysis - Get .NET code analysis
 * - GET /api/dashboard/coverage - Get .NET coverage analysis
 * - GET /api/dashboard/javascript-analysis - Get JavaScript code analysis
 * - GET /api/dashboard/javascript-coverage - Get JavaScript coverage
 * - GET /api/dashboard/overview - Get aggregated overview (.NET + JS)
 * - GET /api/dashboard/aod-summary - Get Azure DevOps summary
 * - GET /api/dashboard/config/apps - Get application configuration
 */

// ============================================
// TEST DATA FACTORIES - Avoid hardcoded values
// ============================================

/**
 * Creates a mock ADO work item with realistic structure
 * @param {Object} overrides - Override default values
 */
function createMockAdoWorkItem(overrides = {}) {
  const id = overrides.id ?? Math.floor(Math.random() * 100000);
  const workItemType = overrides.type ?? "Product Backlog Item";
  const state = overrides.state ?? "Active";

  return {
    id,
    fields: {
      "System.Title": overrides.title ?? `Work Item ${id}`,
      "System.WorkItemType": workItemType,
      "System.State": state,
      "System.AssignedTo": overrides.assignedTo ?? { displayName: "Test User" },
      "Microsoft.VSTS.Common.Priority": overrides.priority ?? 2,
      "System.Tags": overrides.tags ?? "",
      "System.IterationPath": overrides.iterationPath ?? "Project\\Sprint 1",
      "System.AreaPath": overrides.areaPath ?? "Project",
      ...overrides.fields,
    },
    relations: overrides.relations ?? [],
  };
}

/**
 * Creates a mock MCP response wrapper
 * @param {Array} data - Array of work items
 */
function createMockMcpResponse(data = []) {
  return {
    success: true,
    data,
  };
}

/**
 * Creates a sprint path with project prefix
 * @param {string} project - Project name
 * @param {string} sprint - Sprint name
 */
function createSprintPath(project, sprint) {
  return `${project}\\${sprint}`;
}

describe("Dashboard Routes", () => {
  let app;
  let mockMcpManager;
  let dashboardRouter;
  let mockReadFile;

  beforeEach(async () => {
    jest.resetModules();

    // Create mock readFile function
    mockReadFile = jest.fn();

    // Mock fs/promises module
    await jest.unstable_mockModule("fs/promises", () => ({
      default: {
        readFile: mockReadFile,
      },
      readFile: mockReadFile,
    }));

    // Import routes AFTER mocking
    const dashboardRouterModule =
      await import("../../../src/routes/dashboard.js");
    dashboardRouter = dashboardRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/dashboard", dashboardRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/dashboard/applications", () => {
    describe("Successful application listing", () => {
      it("should return list of applications", async () => {
        const mockAppsConfig = {
          applications: [
            {
              name: "App1",
              displayName: "Application 1",
              type: "dotnet",
              framework: "xUnit",
              priority: "high",
              integrations: ["SQL", "Redis"],
            },
            {
              name: "Core",
              displayName: "Core Application",
              type: "dotnet",
              framework: "MSTest",
              priority: "critical",
              integrations: ["SQL"],
            },
          ],
        };
        mockReadFile.mockResolvedValue(JSON.stringify(mockAppsConfig));

        const response = await request(app).get("/api/dashboard/applications");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.applications.length).toBe(2);
        expect(response.body.applications[0].name).toBe("App1");
        expect(response.body.applications[1].name).toBe("Core");
      });

      it("should read from correct config path", async () => {
        mockReadFile.mockResolvedValue(JSON.stringify({ applications: [] }));

        await request(app).get("/api/dashboard/applications");

        expect(mockReadFile).toHaveBeenCalledWith(
          "/app/config/apps.json",
          "utf-8",
        );
      });

      it("should return application properties", async () => {
        const mockAppsConfig = {
          applications: [
            {
              name: "TestApp",
              displayName: "Test Application",
              type: "javascript",
              framework: "Jest",
              priority: "medium",
              integrations: ["API", "Database"],
              extraProp: "should not be included",
            },
          ],
        };
        mockReadFile.mockResolvedValue(JSON.stringify(mockAppsConfig));

        const response = await request(app).get("/api/dashboard/applications");

        expect(response.body.applications[0]).toEqual({
          name: "TestApp",
          displayName: "Test Application",
          type: "javascript",
          framework: "Jest",
          priority: "medium",
          integrations: ["API", "Database"],
        });
        expect(response.body.applications[0]).not.toHaveProperty("extraProp");
      });

      it("should handle empty applications list", async () => {
        mockReadFile.mockResolvedValue(JSON.stringify({ applications: [] }));

        const response = await request(app).get("/api/dashboard/applications");

        expect(response.status).toBe(200);
        expect(response.body.applications).toEqual([]);
      });
    });

    describe("Error handling (500)", () => {
      it("should handle file read errors", async () => {
        mockReadFile.mockRejectedValue(new Error("ENOENT: file not found"));

        const response = await request(app).get("/api/dashboard/applications");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "error",
          "Failed to get applications",
        );
        expect(response.body.message).toContain("ENOENT");
      });

      it("should handle invalid JSON", async () => {
        mockReadFile.mockResolvedValue("{ invalid json }");

        const response = await request(app).get("/api/dashboard/applications");

        expect(response.status).toBe(500);
      });
    });
  });

  describe("GET /api/dashboard/code-analysis", () => {
    describe("Successful code analysis", () => {
      it("should return code analysis for application", async () => {
        const mockCodeAnalysis = {
          analysis: {
            totalFiles: 10,
            classes: [{ name: "UserService", file: "UserService.cs" }],
            methods: [{ name: "GetUser", file: "UserService.cs" }],
          },
        };
        const mockCoverage = {
          coverage: { overallPercentage: 75.5 },
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockCodeAnalysis)
          .mockResolvedValueOnce(mockCoverage);

        const response = await request(app)
          .get("/api/dashboard/code-analysis")
          .query({ app: "App1" });

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it("should call dotnetCodeAnalyzer with correct parameters", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          analysis: { classes: [], methods: [] },
        });

        await request(app)
          .get("/api/dashboard/code-analysis")
          .query({ app: "Core" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCodeAnalyzer",
          "/analyze",
          {
            app: "Core",
            includeTests: true,
            includeIntegrations: true,
          },
        );
      });

      it("should call dotnetCoverageAnalyzer", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          analysis: {},
        });

        await request(app)
          .get("/api/dashboard/code-analysis")
          .query({ app: "Payments" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCoverageAnalyzer",
          "/analyze",
          { app: "Payments" },
        );
      });

      it("should use default app when not specified", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          analysis: {},
        });

        await request(app).get("/api/dashboard/code-analysis");

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCodeAnalyzer",
          "/analyze",
          expect.objectContaining({ app: "App1" }),
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle code analyzer MCP errors", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP dotnetCodeAnalyzer unavailable"),
        );

        const response = await request(app)
          .get("/api/dashboard/code-analysis")
          .query({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "error",
          "Failed to get code analysis",
        );
      });

      it("should handle coverage analyzer MCP errors", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ analysis: {} })
          .mockRejectedValueOnce(new Error("Coverage timeout"));

        const response = await request(app)
          .get("/api/dashboard/code-analysis")
          .query({ app: "App1" });

        expect(response.status).toBe(500);
      });
    });
  });

  describe("GET /api/dashboard/coverage", () => {
    describe("Successful coverage retrieval", () => {
      it("should return coverage analysis", async () => {
        const mockCoverage = {
          coverage: {
            overallPercentage: 82.3,
            methods: [
              { name: "GetUser", coverage: 100, hasTests: true },
              { name: "DeleteUser", coverage: 0, hasTests: false },
            ],
          },
        };
        mockMcpManager.callDockerMcp.mockResolvedValue(mockCoverage);

        const response = await request(app)
          .get("/api/dashboard/coverage")
          .query({ app: "Core" });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockCoverage);
      });

      it("should call dotnetCoverageAnalyzer with detailed flag", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ coverage: {} });

        await request(app)
          .get("/api/dashboard/coverage")
          .query({ app: "Payments" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCoverageAnalyzer",
          "/analyze",
          { app: "Payments", detailed: true },
        );
      });

      it("should use default app when not specified", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ coverage: {} });

        await request(app).get("/api/dashboard/coverage");

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCoverageAnalyzer",
          "/analyze",
          { app: "App1", detailed: true },
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle MCP errors", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("Coverage analyzer timeout"),
        );

        const response = await request(app)
          .get("/api/dashboard/coverage")
          .query({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("error", "Failed to get coverage");
      });
    });
  });

  describe("GET /api/dashboard/javascript-analysis", () => {
    describe("Successful JavaScript analysis", () => {
      it("should return JavaScript code analysis", async () => {
        const mockJsCode = {
          analysis: {
            totalFiles: 20,
            components: [{ name: "UserComponent" }],
            functions: [{ name: "handleSubmit" }],
          },
        };
        const mockJsCoverage = {
          coverage: { overallPercentage: 65.0 },
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockJsCode)
          .mockResolvedValueOnce(mockJsCoverage);

        const response = await request(app)
          .get("/api/dashboard/javascript-analysis")
          .query({ app: "PreCare" });

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
      });

      it("should call javascriptCodeAnalyzer with correct parameters", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          analysis: {},
        });

        await request(app)
          .get("/api/dashboard/javascript-analysis")
          .query({ app: "Core" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "javascriptCodeAnalyzer",
          "/analyze",
          {
            app: "Core",
            includeTests: false,
            detailed: true,
          },
        );
      });

      it("should call javascriptCoverageAnalyzer", async () => {
        const mockAnalysis = { analysis: { components: [] } };
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockAnalysis)
          .mockResolvedValueOnce({ coverage: {} });

        await request(app)
          .get("/api/dashboard/javascript-analysis")
          .query({ app: "App1" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenNthCalledWith(
          2,
          "javascriptCoverageAnalyzer",
          "/analyze",
          {
            app: "App1",
            codeStructure: mockAnalysis.analysis,
          },
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle JavaScript analyzer errors", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("JavaScript analyzer unavailable"),
        );

        const response = await request(app)
          .get("/api/dashboard/javascript-analysis")
          .query({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "error",
          "Failed to get JavaScript analysis",
        );
      });
    });
  });

  describe("GET /api/dashboard/javascript-coverage", () => {
    describe("Successful JavaScript coverage", () => {
      it("should return JavaScript coverage analysis", async () => {
        const mockCoverage = {
          coverage: {
            overallPercentage: 70.5,
            functions: [
              { name: "handleClick", hasTests: true },
              { name: "processData", hasTests: false },
            ],
          },
        };
        mockMcpManager.callDockerMcp.mockResolvedValue(mockCoverage);

        const response = await request(app)
          .get("/api/dashboard/javascript-coverage")
          .query({ app: "PreCare" });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockCoverage);
      });

      it("should call javascriptCoverageAnalyzer with detailed flag", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ coverage: {} });

        await request(app)
          .get("/api/dashboard/javascript-coverage")
          .query({ app: "Core" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "javascriptCoverageAnalyzer",
          "/analyze",
          { app: "Core", detailed: true },
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle MCP errors", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("JavaScript coverage analyzer timeout"),
        );

        const response = await request(app)
          .get("/api/dashboard/javascript-coverage")
          .query({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "error",
          "Failed to get JavaScript coverage",
        );
      });
    });
  });

  describe("GET /api/dashboard/overview", () => {
    describe("Successful overview aggregation", () => {
      it("should return aggregated overview of .NET and JavaScript", async () => {
        const mockDotnetCode = {
          analysis: {
            totalFiles: 50,
            classes: [],
            methods: Array(100).fill({}),
          },
        };
        const mockDotnetCoverage = {
          coverage: {
            overallPercentage: 80,
            methods: Array(20).fill({ hasTests: false }),
          },
        };
        const mockJsCode = {
          analysis: {
            totalFiles: 30,
            components: [],
            functions: Array(75).fill({}),
            hooks: [],
          },
        };
        const mockJsCoverage = {
          coverage: {
            overallPercentage: 60,
            functions: Array(15).fill({ hasTests: false }),
          },
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockDotnetCode)
          .mockResolvedValueOnce(mockDotnetCoverage)
          .mockResolvedValueOnce(mockJsCode)
          .mockResolvedValueOnce(mockJsCoverage);

        const response = await request(app)
          .get("/api/dashboard/overview")
          .query({ app: "Core" });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("app", "Core");
        expect(response.body).toHaveProperty("backend");
        expect(response.body).toHaveProperty("frontend");
        expect(response.body).toHaveProperty("combined");
        expect(response.body.backend.methods).toBe(100);
        expect(response.body.frontend.functions).toBe(75);
        expect(response.body.combined.totalFiles).toBe(80);
      });

      it("should run .NET and JavaScript analysis in parallel", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          analysis: { totalFiles: 0, methods: [], functions: [] },
          coverage: { overallPercentage: 0, methods: [], functions: [] },
        });

        await request(app)
          .get("/api/dashboard/overview")
          .query({ app: "App1" });

        // Should have called 4 MCPs (2 for .NET, 2 for JS)
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledTimes(4);
      });

      it("should handle JavaScript analysis failures gracefully", async () => {
        const mockDotnetCode = {
          analysis: { totalFiles: 10, methods: [] },
        };
        const mockDotnetCoverage = {
          coverage: { overallPercentage: 80, methods: [] },
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockDotnetCode)
          .mockResolvedValueOnce(mockDotnetCoverage)
          .mockRejectedValueOnce(new Error("JS analyzer unavailable"))
          .mockRejectedValueOnce(new Error("JS coverage unavailable"));

        const response = await request(app)
          .get("/api/dashboard/overview")
          .query({ app: "App1" });

        expect(response.status).toBe(200);
        expect(response.body.backend.methods).toBe(0);
        expect(response.body.frontend.functions).toBe(0);
      });

      it("should calculate combined averages correctly", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ analysis: { totalFiles: 40, methods: [] } })
          .mockResolvedValueOnce({
            coverage: { overallPercentage: 90, methods: [] },
          })
          .mockResolvedValueOnce({
            analysis: { totalFiles: 20, functions: [] },
          })
          .mockResolvedValueOnce({
            coverage: { overallPercentage: 50, functions: [] },
          });

        const response = await request(app)
          .get("/api/dashboard/overview")
          .query({ app: "App1" });

        expect(response.body.combined.averageCoverage).toBe(70); // (90 + 50) / 2
      });

      it("should include timestamp in response", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          analysis: {},
          coverage: { overallPercentage: 0 },
        });

        const response = await request(app)
          .get("/api/dashboard/overview")
          .query({ app: "App1" });

        expect(response.body).toHaveProperty("timestamp");
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle .NET analysis failures", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error(".NET analyzer unavailable"),
        );

        const response = await request(app)
          .get("/api/dashboard/overview")
          .query({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("error", "Failed to get overview");
      });
    });
  });

  describe("GET /api/dashboard/aod-summary", () => {
    describe("Successful ADO summary", () => {
      it("should return Azure DevOps summary with work items", async () => {
        // Use factories to create test data - avoids hardcoded values
        const testProject = "Test Project";
        const testSprint = "Sprint 1";
        const sprintPath = createSprintPath(testProject, testSprint);

        const pbiItem = createMockAdoWorkItem({
          type: "Product Backlog Item",
          state: "Active",
          iterationPath: sprintPath,
        });
        const bugItem = createMockAdoWorkItem({
          type: "Bug",
          state: "New",
        });

        mockMcpManager.callDockerMcp.mockResolvedValue(
          createMockMcpResponse([pbiItem, bugItem]),
        );

        const response = await request(app).get(
          `/api/dashboard/aod-summary?sprint=${encodeURIComponent(sprintPath)}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Verify workItemDetails is an array with correct structure
        expect(Array.isArray(response.body.workItemDetails)).toBe(true);
        expect(response.body.workItemDetails).toHaveLength(2);
        // Verify work item fields are correctly transformed (using factory data)
        expect(response.body.workItemDetails[0]).toMatchObject({
          id: pbiItem.id,
          title: pbiItem.fields["System.Title"],
          type: pbiItem.fields["System.WorkItemType"],
          state: pbiItem.fields["System.State"],
        });
        // Verify summary counts match what we created
        expect(response.body.summary.total).toBe(2);
        expect(response.body.summary.byType).toHaveProperty(
          "Product Backlog Item",
          1,
        );
        expect(response.body.summary.byType).toHaveProperty("Bug", 1);
      });

      it("should extract project from sprint path and pass to MCP", async () => {
        // Use factory with dynamic project/sprint - tests the fix for project extraction
        const testProject = "Dynamic Test Project";
        const testSprint = "Sprint 5";
        const sprintPath = createSprintPath(testProject, testSprint);

        const testWorkItem = createMockAdoWorkItem({
          state: "Committed",
          iterationPath: sprintPath,
        });
        mockMcpManager.callDockerMcp.mockResolvedValue(
          createMockMcpResponse([testWorkItem]),
        );

        const response = await request(app).get(
          `/api/dashboard/aod-summary?sprint=${encodeURIComponent(sprintPath)}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.workItemDetails).toHaveLength(1);
        expect(response.body.workItemDetails[0].id).toBe(testWorkItem.id);

        // Verify MCP was called with project extracted from sprint path
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "azureDevOps",
          "/work-items/query",
          expect.objectContaining({
            sprint: sprintPath,
            project: testProject,
          }),
        );
      });

      it("should handle empty work items", async () => {
        const testProject = "Empty Project";
        const testSprint = "Empty Sprint";
        const sprintPath = createSprintPath(testProject, testSprint);

        mockMcpManager.callDockerMcp.mockResolvedValue(
          createMockMcpResponse([]),
        );

        const response = await request(app).get(
          `/api/dashboard/aod-summary?sprint=${encodeURIComponent(sprintPath)}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.workItemDetails).toEqual([]);
        expect(response.body.summary.total).toBe(0);
      });
    });

    describe("Error handling", () => {
      it("should handle MCP errors gracefully", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("ADO MCP unavailable"),
        );

        const response = await request(app).get("/api/dashboard/aod-summary");

        // Route catches errors and returns 200 with empty data
        expect(response.status).toBe(200);
        expect(response.body.workItemDetails).toEqual([]);
      });
    });
  });

  describe("GET /api/dashboard/config/apps", () => {
    describe("Successful config retrieval", () => {
      it("should return transformed application configuration", async () => {
        const mockAppsConfig = {
          applications: [
            {
              name: "App1",
              displayName: "Application 1",
              framework: "xUnit",
              path: "/app1",
            },
            {
              name: "Core",
              displayName: "Core App",
              framework: "MSTest",
              path: "/core",
            },
          ],
        };
        mockReadFile.mockResolvedValue(JSON.stringify(mockAppsConfig));

        const response = await request(app).get("/api/dashboard/config/apps");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          apps: [
            {
              name: "App1",
              description: "Application 1",
              displayName: "Application 1",
              framework: "xUnit",
              path: "/app1",
            },
            {
              name: "Core",
              description: "Core App",
              displayName: "Core App",
              framework: "MSTest",
              path: "/core",
            },
          ],
        });
      });

      it("should read from correct config path", async () => {
        mockReadFile.mockResolvedValue(JSON.stringify({ applications: [] }));

        await request(app).get("/api/dashboard/config/apps");

        expect(mockReadFile).toHaveBeenCalledWith(
          "/app/config/apps.json",
          "utf-8",
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle file read errors", async () => {
        mockReadFile.mockRejectedValue(new Error("File not found"));

        const response = await request(app).get("/api/dashboard/config/apps");

        expect(response.status).toBe(500);
      });
    });
  });
});
