import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager } from "../../helpers/mocks.js";

/**
 * API Tests: Analysis Routes
 *
 * Tests code quality analysis, risk analysis, and integration mapping endpoints.
 *
 * Endpoints tested:
 * - POST /api/analysis/coverage - Analyze code coverage
 * - POST /api/analysis/code-scan - Scan code structure
 * - POST /api/analysis/test-gaps - Identify test coverage gaps
 * - POST /api/analysis/risk/analyze-story - Analyze story risk
 * - POST /api/analysis/integrations/map - Map application integrations
 * - POST /api/analysis/blast-radius/analyze - Analyze change impact
 */

describe("Analysis Routes", () => {
  let app;
  let mockMcpManager;
  let analysisRouter;
  let mockIo;

  beforeEach(async () => {
    jest.resetModules();

    // Mock socket.io
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Import routes AFTER mocking
    const analysisRouterModule =
      await import("../../../src/routes/analysis.js");
    analysisRouter = analysisRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager and socket.io middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      req.io = mockIo;
      next();
    });

    app.use("/api/analysis", analysisRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/analysis/coverage", () => {
    describe("Successful coverage analysis", () => {
      it("should analyze code coverage for application", async () => {
        const mockCodeStructure = {
          classes: ["UserService", "OrderService"],
          methods: ["GetUser", "CreateOrder"],
        };
        const mockCoverageReport = {
          overallPercentage: 75.5,
          methods: [
            { name: "GetUser", coverage: 100 },
            { name: "CreateOrder", coverage: 50 },
          ],
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockCodeStructure)
          .mockResolvedValueOnce(mockCoverageReport);

        const response = await request(app)
          .post("/api/analysis/coverage")
          .send({ app: "App1", detailed: true });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("app", "App1");
        expect(response.body.data.structure).toEqual(mockCodeStructure);
        expect(response.body.data.coverage).toEqual(mockCoverageReport);
      });

      it("should call dotnetCodeAnalyzer MCP with correct parameters", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({});

        await request(app).post("/api/analysis/coverage").send({ app: "Core" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCodeAnalyzer",
          "/analyze",
          { app: "Core", includeTests: true },
        );
      });

      it("should call dotnetCoverageAnalyzer MCP with code structure", async () => {
        const mockCodeStructure = { classes: ["TestClass"] };
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockCodeStructure)
          .mockResolvedValueOnce({});

        await request(app)
          .post("/api/analysis/coverage")
          .send({ app: "Payments", detailed: false });

        expect(mockMcpManager.callDockerMcp).toHaveBeenNthCalledWith(
          2,
          "dotnetCoverageAnalyzer",
          "/analyze",
          {
            app: "Payments",
            codeStructure: mockCodeStructure,
            detailed: false,
          },
        );
      });

      it("should emit real-time socket.io event", async () => {
        const mockCoverageReport = { overallPercentage: 80 };
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce(mockCoverageReport);

        await request(app).post("/api/analysis/coverage").send({ app: "App1" });

        expect(mockIo.to).toHaveBeenCalledWith("analysis");
        expect(mockIo.emit).toHaveBeenCalledWith("coverage-complete", {
          app: "App1",
          coverageReport: mockCoverageReport,
        });
      });

      it("should include timestamp in response", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({});

        const response = await request(app)
          .post("/api/analysis/coverage")
          .send({ app: "App1" });

        expect(response.body).toHaveProperty("timestamp");
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when app parameter is missing", async () => {
        const response = await request(app)
          .post("/api/analysis/coverage")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "Application name is required",
        );
      });

      it("should return 400 for null app parameter", async () => {
        const response = await request(app)
          .post("/api/analysis/coverage")
          .send({ app: null });

        expect(response.status).toBe(400);
      });
    });

    describe("MCP errors (500)", () => {
      it("should handle code analyzer MCP failures", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP dotnetCodeAnalyzer is not healthy"),
        );

        const response = await request(app)
          .post("/api/analysis/coverage")
          .send({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "error",
          "Coverage analysis failed",
        );
        expect(response.body.message).toContain("dotnetCodeAnalyzer");
      });

      it("should handle coverage analyzer MCP failures", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error("Coverage analysis timeout"));

        const response = await request(app)
          .post("/api/analysis/coverage")
          .send({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body.message).toContain("timeout");
      });
    });
  });

  describe("POST /api/analysis/code-scan", () => {
    describe("Successful code scanning", () => {
      it("should scan code structure for applications", async () => {
        const mockAnalysis = {
          classes: ["UserService"],
          integrations: ["SQL", "Redis"],
        };
        mockMcpManager.callDockerMcp.mockResolvedValue(mockAnalysis);

        const response = await request(app)
          .post("/api/analysis/code-scan")
          .send({ apps: ["App1", "Core"] });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.results).toHaveProperty("App1", mockAnalysis);
        expect(response.body.results).toHaveProperty("Core", mockAnalysis);
      });

      it("should use default App1 when apps not provided", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({});

        const response = await request(app)
          .post("/api/analysis/code-scan")
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.results).toHaveProperty("App1");
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCodeAnalyzer",
          "/analyze",
          expect.objectContaining({ app: "App1" }),
        );
      });

      it("should call MCP with integration and reference flags", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({});

        await request(app)
          .post("/api/analysis/code-scan")
          .send({ apps: ["Core"] });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "dotnetCodeAnalyzer",
          "/analyze",
          {
            app: "Core",
            includeIntegrations: true,
            findEpicReferences: true,
            findFinancialReferences: true,
          },
        );
      });

      it("should emit real-time event for each scanned app", async () => {
        const mockAnalysis = { classes: ["TestClass"] };
        mockMcpManager.callDockerMcp.mockResolvedValue(mockAnalysis);

        await request(app)
          .post("/api/analysis/code-scan")
          .send({ apps: ["App1", "Core"] });

        expect(mockIo.emit).toHaveBeenCalledTimes(2);
        expect(mockIo.emit).toHaveBeenCalledWith("app-scanned", {
          app: "App1",
          analysis: mockAnalysis,
        });
        expect(mockIo.emit).toHaveBeenCalledWith("app-scanned", {
          app: "Core",
          analysis: mockAnalysis,
        });
      });

      it("should continue scanning other apps if one fails", async () => {
        let callCount = 0;
        mockMcpManager.callDockerMcp.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error("Scan failed for App1"));
          }
          return Promise.resolve({ classes: ["Success"] });
        });

        const response = await request(app)
          .post("/api/analysis/code-scan")
          .send({ apps: ["App1", "Core"] });

        expect(response.status).toBe(200);
        expect(response.body.results.App1).toHaveProperty(
          "error",
          "Scan failed for App1",
        );
        expect(response.body.results.Core).toHaveProperty("classes", [
          "Success",
        ]);
      });
    });

    describe("Error handling", () => {
      it("should include errors for failed apps in results", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP unavailable"),
        );

        const response = await request(app)
          .post("/api/analysis/code-scan")
          .send({ apps: ["App1"] });

        expect(response.status).toBe(200);
        expect(response.body.results.App1).toHaveProperty(
          "error",
          "MCP unavailable",
        );
      });
    });
  });

  describe("POST /api/analysis/test-gaps", () => {
    describe("Successful test gap identification", () => {
      it("should identify test coverage gaps", async () => {
        const mockCodeStructure = {
          analysis: {
            methods: [
              { name: "GetUser", className: "UserService" },
              { name: "CreateOrder", className: "OrderService" },
            ],
          },
        };
        const mockCoverage = {
          coverage: {
            methods: [
              {
                name: "GetUser",
                hasTests: false,
                coverage: 0,
                hasNegativeTests: false,
              },
              {
                name: "CreateOrder",
                hasTests: true,
                coverage: 100,
                hasNegativeTests: true,
              },
            ],
            overallPercentage: 50,
          },
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockCodeStructure)
          .mockResolvedValueOnce(mockCoverage);

        const response = await request(app)
          .post("/api/analysis/test-gaps")
          .send({ app: "App1" });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.gaps).toHaveProperty("untestedMethods");
        expect(response.body.gaps).toHaveProperty("partialCoverage");
        expect(response.body.gaps).toHaveProperty("missingNegativeTests");
        expect(response.body.gaps.untestedMethods.length).toBe(1);
      });

      it("should extract methods array from code structure", async () => {
        const mockMethods = [
          { name: "Method1", className: "Class1" },
          { name: "Method2", className: "Class2" },
        ];
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ analysis: { methods: mockMethods } })
          .mockResolvedValueOnce({
            coverage: { methods: [], overallPercentage: 0 },
          });

        await request(app)
          .post("/api/analysis/test-gaps")
          .send({ app: "Core" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenNthCalledWith(
          2,
          "dotnetCoverageAnalyzer",
          "/analyze",
          { app: "Core", codeStructure: { methods: mockMethods } },
        );
      });

      it("should categorize methods by coverage status", async () => {
        const mockCoverage = {
          coverage: {
            methods: [
              {
                name: "Untested",
                hasTests: false,
                coverage: 0,
                hasNegativeTests: false,
              },
              {
                name: "Partial",
                hasTests: true,
                coverage: 60,
                hasNegativeTests: false,
              },
              {
                name: "NoNegative",
                hasTests: true,
                coverage: 100,
                hasNegativeTests: false,
              },
            ],
            overallPercentage: 60,
          },
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ methods: [] })
          .mockResolvedValueOnce(mockCoverage);

        const response = await request(app)
          .post("/api/analysis/test-gaps")
          .send({ app: "App1" });

        expect(response.body.gaps.untestedMethods.length).toBe(1);
        expect(response.body.gaps.partialCoverage.length).toBe(1);
        expect(response.body.gaps.missingNegativeTests.length).toBe(2);
      });

      it("should include summary statistics", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ methods: [] })
          .mockResolvedValueOnce({
            coverage: {
              methods: [{ hasTests: false, coverage: 0 }],
              overallPercentage: 45.7,
            },
          });

        const response = await request(app)
          .post("/api/analysis/test-gaps")
          .send({ app: "App1" });

        expect(response.body.summary).toEqual({
          totalMethods: 1,
          untestedCount: 1,
          coveragePercentage: 45.7,
        });
      });

      it("should handle alternative coverage data structure", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ methods: [] })
          .mockResolvedValueOnce({
            methods: [
              { hasTests: true, coverage: 100, hasNegativeTests: true },
            ],
            overallPercentage: 100,
          });

        const response = await request(app)
          .post("/api/analysis/test-gaps")
          .send({ app: "App1" });

        expect(response.status).toBe(200);
        expect(response.body.gaps.untestedMethods.length).toBe(0);
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when app parameter is missing", async () => {
        const response = await request(app)
          .post("/api/analysis/test-gaps")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "Application name is required",
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle MCP communication errors", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP connection timeout"),
        );

        const response = await request(app)
          .post("/api/analysis/test-gaps")
          .send({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty(
          "error",
          "Test gaps analysis failed",
        );
      });
    });
  });

  describe("POST /api/analysis/risk/analyze-story", () => {
    describe("Successful risk analysis", () => {
      it("should analyze risk for a story", async () => {
        const mockStory = { id: 12345, title: "User Authentication" };
        const mockRiskResult = {
          riskLevel: "high",
          factors: ["database changes", "security implications"],
          score: 8.5,
        };
        mockMcpManager.callDockerMcp.mockResolvedValue(mockRiskResult);

        const response = await request(app)
          .post("/api/analysis/risk/analyze-story")
          .send({ app: "Core", story: mockStory });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockRiskResult);
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "riskAnalyzer",
          "/analyze-risk",
          { app: "Core", story: mockStory },
        );
      });

      it("should handle complex story objects", async () => {
        const complexStory = {
          id: 54321,
          title: "Payment Integration",
          description: "Integrate with Stripe API",
          changeCount: 15,
          linesChanged: 500,
        };
        mockMcpManager.callDockerMcp.mockResolvedValue({ riskLevel: "medium" });

        const response = await request(app)
          .post("/api/analysis/risk/analyze-story")
          .send({ app: "Payments", story: complexStory });

        expect(response.status).toBe(200);
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when app parameter is missing", async () => {
        const response = await request(app)
          .post("/api/analysis/risk/analyze-story")
          .send({ story: { id: 123 } });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "app parameter required");
      });

      it("should return 400 when story parameter is missing", async () => {
        const response = await request(app)
          .post("/api/analysis/risk/analyze-story")
          .send({ app: "App1" });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "story parameter required",
        );
      });

      it("should return 400 when both parameters are missing", async () => {
        const response = await request(app)
          .post("/api/analysis/risk/analyze-story")
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe("Error handling (500)", () => {
      it("should handle risk analyzer MCP failures", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("Risk analysis service unavailable"),
        );

        const response = await request(app)
          .post("/api/analysis/risk/analyze-story")
          .send({ app: "App1", story: { id: 123 } });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("error", "Risk analysis failed");
        expect(response.body.message).toContain("unavailable");
      });
    });
  });

  describe("POST /api/analysis/integrations/map", () => {
    describe("Successful integration mapping", () => {
      it("should map integrations for application", async () => {
        const mockIntegrations = {
          databases: ["SQL Server", "Redis"],
          apis: ["Stripe API", "SendGrid"],
          diagram: "mermaid-diagram-content",
        };
        mockMcpManager.callDockerMcp.mockResolvedValue(mockIntegrations);

        const response = await request(app)
          .post("/api/analysis/integrations/map")
          .send({ app: "Payments", includeDiagram: true });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockIntegrations);
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "integrationMapper",
          "/map-integrations",
          { app: "Payments", integrationType: undefined, includeDiagram: true },
        );
      });

      it("should filter by integration type", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          databases: ["PostgreSQL"],
        });

        await request(app)
          .post("/api/analysis/integrations/map")
          .send({ app: "Core", integrationType: "database" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "integrationMapper",
          "/map-integrations",
          expect.objectContaining({ integrationType: "database" }),
        );
      });

      it("should handle mapping without diagram", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ apis: ["REST API"] });

        const response = await request(app)
          .post("/api/analysis/integrations/map")
          .send({ app: "App1" });

        expect(response.status).toBe(200);
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when app parameter is missing", async () => {
        const response = await request(app)
          .post("/api/analysis/integrations/map")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "app parameter required");
      });
    });

    describe("Error handling (500)", () => {
      it("should handle integration mapper MCP failures", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("Integration mapper timeout"),
        );

        const response = await request(app)
          .post("/api/analysis/integrations/map")
          .send({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty(
          "error",
          "Integration mapping failed",
        );
      });
    });
  });

  describe("POST /api/analysis/blast-radius/analyze", () => {
    describe("Successful blast radius analysis", () => {
      it("should analyze blast radius for changed files", async () => {
        const mockResult = {
          success: true,
          result: {
            affectedComponents: ["UserService", "OrderService"],
            impactLevel: "high",
            testingRecommendations: ["Full regression", "Integration tests"],
          },
        };
        mockMcpManager.callDockerMcp.mockResolvedValue(mockResult);

        const response = await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({
            app: "Core",
            changedFiles: [
              "/Services/UserService.cs",
              "/Controllers/UserController.cs",
            ],
            depth: 3,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("result");
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "blastRadiusAnalyzer",
          "/analyze",
          {
            app: "Core",
            changedFiles: [
              "/Services/UserService.cs",
              "/Controllers/UserController.cs",
            ],
            depth: 3,
          },
        );
      });

      it("should use default analysis depth when not specified", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          result: {},
        });

        await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({
            app: "App1",
            changedFiles: ["/file1.cs"],
          });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "blastRadiusAnalyzer",
          "/analyze",
          expect.objectContaining({
            app: "App1",
            changedFiles: ["/file1.cs"],
            depth: 2,
          }),
        );
      });

      it("should handle single file change", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          result: { affectedComponents: ["Service1"] },
        });

        const response = await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({
            app: "Payments",
            changedFiles: ["/PaymentProcessor.cs"],
          });

        expect(response.status).toBe(200);
      });

      it("should handle multiple file changes", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          result: { impactLevel: "critical" },
        });

        const changedFiles = [
          "/Services/UserService.cs",
          "/Services/OrderService.cs",
          "/Controllers/UserController.cs",
          "/Models/User.cs",
        ];

        const response = await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({ app: "Core", changedFiles });

        expect(response.status).toBe(200);
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "blastRadiusAnalyzer",
          "/analyze",
          expect.objectContaining({
            app: "Core",
            changedFiles: expect.arrayContaining(changedFiles),
          }),
        );
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when app parameter is missing", async () => {
        const response = await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({ changedFiles: ["/file.cs"] });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "app parameter required");
      });

      it("should return 400 when changedFiles is missing", async () => {
        const response = await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({ app: "App1" });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "changedFiles array required",
        );
      });

      it("should return 400 when changedFiles is empty array", async () => {
        const response = await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({ app: "App1", changedFiles: [] });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "changedFiles array required",
        );
      });
    });

    describe("Error handling (500)", () => {
      it("should handle blast radius analyzer MCP failures", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("Blast radius analyzer crashed"),
        );

        const response = await request(app)
          .post("/api/analysis/blast-radius/analyze")
          .send({
            app: "App1",
            changedFiles: ["/file.cs"],
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty(
          "error",
          "Blast radius analysis failed",
        );
        expect(response.body.message).toContain("crashed");
      });
    });
  });
});
