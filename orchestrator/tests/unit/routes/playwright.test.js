import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager } from "../../helpers/mocks.js";

/**
 * API Tests: Playwright Routes
 *
 * Tests Playwright test automation and test healing endpoints.
 *
 * Endpoints tested:
 * - POST /api/playwright/full-automation - Complete test generation workflow
 * - POST /api/playwright/heal-tests - Test healing workflow
 * - POST /api/playwright/detect-flaky - Flaky test detection
 */

describe("Playwright Routes", () => {
  let app;
  let mockMcpManager;
  let playwrightRouter;

  beforeEach(async () => {
    jest.resetModules();

    // Import routes AFTER mocking
    const playwrightRouterModule =
      await import("../../../src/routes/playwright.js");
    playwrightRouter = playwrightRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/playwright", playwrightRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/playwright/full-automation", () => {
    describe("Successful automation workflow", () => {
      it("should complete full automation workflow", async () => {
        const mockPathsResult = {
          totalPaths: 10,
          paths: Array.from({ length: 10 }, (_, i) => ({
            name: `Path ${i + 1}`,
            priority: "high",
          })),
        };
        const mockPrioritizedPaths = mockPathsResult.paths.slice(0, 5);
        const mockTestsResult = {
          generated: 5,
          files: ["test1.spec.ts", "test2.spec.ts"],
          defaultPath: "./e2e/tests",
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockPathsResult)
          .mockResolvedValueOnce({
            paths: mockPrioritizedPaths,
            reasoning: "Selected critical paths",
          })
          .mockResolvedValueOnce(mockTestsResult);

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1", maxPaths: 5, depth: "deep" });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.app).toBe("App1");
        expect(response.body.pathsAnalyzed).toBe(10);
        expect(response.body.pathsPrioritized).toBe(5);
        expect(response.body.testsGenerated).toBe(5);
        expect(response.body.workflow.steps.length).toBe(3);
      });

      it("should call playwrightAnalyzer for path analysis", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ totalPaths: 5, paths: [] })
          .mockResolvedValueOnce({ paths: [], reasoning: "No paths" })
          .mockResolvedValueOnce({ generated: 0, files: [], defaultPath: "" });

        await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "Core", depth: "shallow", model: "claude-opus-4-5" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "playwrightAnalyzer",
          "/analyze",
          { app: "Core", depth: "shallow", model: "claude-opus-4-5" },
        );
      });

      it("should call playwrightAnalyzer for prioritization", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ totalPaths: 10, paths: [] })
          .mockResolvedValueOnce({ paths: [], reasoning: "" })
          .mockResolvedValueOnce({ generated: 0, files: [], defaultPath: "" });

        await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "Payments", maxPaths: 3 });

        expect(mockMcpManager.callDockerMcp).toHaveBeenNthCalledWith(
          2,
          "playwrightAnalyzer",
          "/prioritize",
          { app: "Payments", maxResults: 3, model: undefined },
        );
      });

      it("should call playwrightGenerator for test generation", async () => {
        const mockPaths = [{ name: "Login", priority: "high" }];
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ totalPaths: 1, paths: mockPaths })
          .mockResolvedValueOnce({ paths: mockPaths, reasoning: "" })
          .mockResolvedValueOnce({
            generated: 1,
            files: ["login.spec.ts"],
            defaultPath: "./e2e",
          });

        await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenNthCalledWith(
          3,
          "playwrightGenerator",
          "/generate",
          {
            app: "App1",
            paths: mockPaths,
            includePageObjects: true,
            includeFixtures: true,
            model: undefined,
          },
        );
      });

      it("should use default values for optional parameters", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ totalPaths: 3, paths: [] })
          .mockResolvedValueOnce({ paths: [], reasoning: "" })
          .mockResolvedValueOnce({ generated: 0, files: [], defaultPath: "" });

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1" });

        expect(response.status).toBe(200);
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "playwrightAnalyzer",
          "/analyze",
          expect.objectContaining({ app: "App1", depth: "deep" }),
        );
      });

      it("should include workflow steps in response", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ totalPaths: 5, paths: [] })
          .mockResolvedValueOnce({ paths: [], reasoning: "Test" })
          .mockResolvedValueOnce({ generated: 1, files: [], defaultPath: "" });

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1" });

        expect(response.body.workflow.steps).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              step: 1,
              name: "analyze",
              status: "success",
            }),
            expect.objectContaining({
              step: 2,
              name: "prioritize",
              status: "success",
            }),
            expect.objectContaining({
              step: 3,
              name: "generate",
              status: "success",
            }),
          ]),
        );
      });

      it("should handle no paths found scenario", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValueOnce({
          totalPaths: 0,
          paths: [],
        });

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "EmptyApp" });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.message).toContain("No UI paths found");
      });

      it("should fall back to first N paths if prioritization fails", async () => {
        const mockPaths = Array.from({ length: 10 }, (_, i) => ({
          name: `Path ${i}`,
        }));
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ totalPaths: 10, paths: mockPaths })
          .mockRejectedValueOnce(
            new Error("Prioritization service unavailable"),
          )
          .mockResolvedValueOnce({ generated: 5, files: [], defaultPath: "" });

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1", maxPaths: 5 });

        expect(response.status).toBe(200);
        expect(response.body.workflow.steps[1].status).toBe("failed");
        expect(response.body.workflow.steps[2].status).toBe("success");
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when app parameter is missing", async () => {
        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          "error",
          "Application name is required",
        );
        expect(response.body).toHaveProperty("usage");
      });

      it("should return 400 for null app parameter", async () => {
        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: null });

        expect(response.status).toBe(400);
      });
    });

    describe("Workflow errors (500)", () => {
      it("should return 500 when analyzer fails", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValueOnce(
          new Error("MCP playwrightAnalyzer is not healthy"),
        );

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("error", "Path analysis failed");
        expect(response.body.workflow.steps[0].status).toBe("failed");
      });

      it("should return 500 when generator fails", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({ totalPaths: 5, paths: [{ name: "Path1" }] })
          .mockResolvedValueOnce({ paths: [{ name: "Path1" }], reasoning: "" })
          .mockRejectedValueOnce(new Error("Generator timeout"));

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("error", "Test generation failed");
        expect(response.body.workflow.steps[2].status).toBe("failed");
      });

      it("should handle unexpected errors", async () => {
        mockMcpManager.callDockerMcp.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        const response = await request(app)
          .post("/api/playwright/full-automation")
          .send({ app: "App1" });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
      });
    });
  });

  describe("POST /api/playwright/heal-tests", () => {
    describe("Successful healing workflow", () => {
      it("should complete test healing workflow", async () => {
        const mockAnalysis = {
          failureAnalysis: {
            failureType: "selector-changed",
            rootCause: "Button selector outdated",
            confidence: "high",
            isFlaky: false,
            suggestedFix: "Update selector",
          },
        };
        const mockHealResult = {
          fixedCode: 'await page.click(".new-selector");',
          changes: [
            { line: 10, oldCode: ".old-selector", newCode: ".new-selector" },
          ],
          confidence: "high",
          additionalNotes: "Updated selector",
          testabilityImprovements: [],
        };

        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockAnalysis)
          .mockResolvedValueOnce(mockHealResult);

        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "login.spec.ts",
            testCode: 'await page.click(".old-selector");',
            errorLog: "TimeoutError: Selector not found",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.testFile).toBe("login.spec.ts");
        expect(response.body.analysis.failureType).toBe("selector-changed");
        expect(response.body.fix.fixedCode).toBe(mockHealResult.fixedCode);
        expect(response.body.workflow.steps.length).toBe(2);
      });

      it("should call playwrightHealer for failure analysis", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({
            failureAnalysis: { failureType: "timeout", confidence: "medium" },
          })
          .mockResolvedValueOnce({
            fixedCode: "fixed",
            changes: [],
            confidence: "medium",
          });

        await request(app).post("/api/playwright/heal-tests").send({
          testFile: "test.spec.ts",
          testCode: "test code",
          errorLog: "error",
          screenshot: "screenshot.png",
          model: "claude-opus-4-5",
        });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "playwrightHealer",
          "/analyze-failures",
          {
            testFile: "test.spec.ts",
            errorLog: "error",
            screenshot: "screenshot.png",
            model: "claude-opus-4-5",
          },
        );
      });

      it("should call playwrightHealer for fix generation", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({
            failureAnalysis: { failureType: "flaky", confidence: "low" },
          })
          .mockResolvedValueOnce({
            fixedCode: "await page.waitForSelector();",
            changes: [],
            confidence: "high",
          });

        await request(app).post("/api/playwright/heal-tests").send({
          testFile: "checkout.spec.ts",
          testCode: "original code",
          errorLog: "intermittent failure",
        });

        expect(mockMcpManager.callDockerMcp).toHaveBeenNthCalledWith(
          2,
          "playwrightHealer",
          "/heal",
          {
            testFile: "checkout.spec.ts",
            testCode: "original code",
            errorLog: "intermittent failure",
            model: undefined,
          },
        );
      });

      it("should include detailed analysis in response", async () => {
        const mockAnalysis = {
          failureAnalysis: {
            failureType: "assertion-failed",
            rootCause: "Expected value changed",
            confidence: "high",
            isFlaky: false,
            suggestedFix: "Update assertion",
          },
        };
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce(mockAnalysis)
          .mockResolvedValueOnce({
            fixedCode: "fixed",
            changes: [],
            confidence: "high",
          });

        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "test.spec.ts",
            testCode: "code",
            errorLog: "error",
          });

        expect(response.body.analysis).toEqual({
          failureType: "assertion-failed",
          rootCause: "Expected value changed",
          confidence: "high",
          isFlaky: false,
          suggestedFix: "Update assertion",
        });
      });

      it("should include fix details in response", async () => {
        const mockHealResult = {
          fixedCode: "new code",
          changes: [{ line: 5, oldCode: "old", newCode: "new" }],
          confidence: "medium",
          additionalNotes: "Test notes",
          testabilityImprovements: ["Added wait"],
        };
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({
            failureAnalysis: { failureType: "timeout", confidence: "high" },
          })
          .mockResolvedValueOnce(mockHealResult);

        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "test.spec.ts",
            testCode: "code",
            errorLog: "error",
          });

        expect(response.body.fix).toEqual({
          fixedCode: "new code",
          changes: mockHealResult.changes,
          confidence: "medium",
          additionalNotes: "Test notes",
          testabilityImprovements: ["Added wait"],
        });
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when testFile is missing", async () => {
        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testCode: "code",
            errorLog: "error",
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain(
          "testFile, testCode, and errorLog are required",
        );
        expect(response.body).toHaveProperty("usage");
      });

      it("should return 400 when testCode is missing", async () => {
        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "test.spec.ts",
            errorLog: "error",
          });

        expect(response.status).toBe(400);
      });

      it("should return 400 when errorLog is missing", async () => {
        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "test.spec.ts",
            testCode: "code",
          });

        expect(response.status).toBe(400);
      });

      it("should return 400 when all required fields are missing", async () => {
        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe("Workflow errors (500)", () => {
      it("should return 500 when failure analysis fails", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValueOnce(
          new Error("Healer MCP unavailable"),
        );

        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "test.spec.ts",
            testCode: "code",
            errorLog: "error",
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty(
          "error",
          "Failure analysis failed",
        );
        expect(response.body.workflow.steps[0].status).toBe("failed");
      });

      it("should return 500 when fix generation fails", async () => {
        mockMcpManager.callDockerMcp
          .mockResolvedValueOnce({
            failureAnalysis: { failureType: "timeout", confidence: "high" },
          })
          .mockRejectedValueOnce(new Error("Fix generation timeout"));

        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "test.spec.ts",
            testCode: "code",
            errorLog: "error",
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("error", "Fix generation failed");
        expect(response.body.workflow.steps[1].status).toBe("failed");
        expect(response.body).toHaveProperty("analysis"); // Include analysis even if fix failed
      });

      it("should handle unexpected errors", async () => {
        mockMcpManager.callDockerMcp.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        const response = await request(app)
          .post("/api/playwright/heal-tests")
          .send({
            testFile: "test.spec.ts",
            testCode: "code",
            errorLog: "error",
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
      });
    });
  });

  describe("POST /api/playwright/detect-flaky", () => {
    describe("Successful flaky detection", () => {
      it("should detect flaky tests from results", async () => {
        const mockTestResults = [
          {
            testName: "Login test",
            testFile: "login.spec.ts",
            status: "passed",
          },
          {
            testName: "Checkout test",
            testFile: "checkout.spec.ts",
            status: "failed",
          },
        ];
        const mockDetectionResult = {
          flakyTests: [
            {
              testName: "Checkout test",
              testFile: "checkout.spec.ts",
              flakinessScore: 0.75,
              reason: "Intermittent failures detected",
            },
          ],
          summary: {
            totalTests: 2,
            flakyCount: 1,
            flakinessRate: 0.5,
          },
        };

        mockMcpManager.callDockerMcp.mockResolvedValueOnce(mockDetectionResult);

        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: mockTestResults });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.flakyTests.length).toBe(1);
        expect(response.body.summary.flakyCount).toBe(1);
      });

      it("should call playwrightHealer with test results", async () => {
        const mockTestResults = [
          { testName: "Test 1", status: "passed" },
          { testName: "Test 2", status: "failed" },
        ];
        mockMcpManager.callDockerMcp.mockResolvedValueOnce({
          flakyTests: [],
          summary: { totalTests: 2, flakyCount: 0 },
        });

        await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: mockTestResults, model: "claude-opus-4-5" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "playwrightHealer",
          "/detect-flaky",
          { testResults: mockTestResults, model: "claude-opus-4-5" },
        );
      });

      it("should handle empty test results", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValueOnce({
          flakyTests: [],
          summary: { totalTests: 0, flakyCount: 0 },
        });

        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: [] });

        expect(response.status).toBe(200);
        expect(response.body.flakyTests).toEqual([]);
      });

      it("should handle no flaky tests found", async () => {
        const mockTestResults = [
          { testName: "Test 1", status: "passed" },
          { testName: "Test 2", status: "passed" },
        ];
        mockMcpManager.callDockerMcp.mockResolvedValueOnce({
          flakyTests: [],
          summary: { totalTests: 2, flakyCount: 0, flakinessRate: 0 },
        });

        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: mockTestResults });

        expect(response.status).toBe(200);
        expect(response.body.flakyTests.length).toBe(0);
        expect(response.body.summary.flakyCount).toBe(0);
      });

      it("should handle multiple flaky tests", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValueOnce({
          flakyTests: [
            { testName: "Flaky 1", flakinessScore: 0.8 },
            { testName: "Flaky 2", flakinessScore: 0.6 },
            { testName: "Flaky 3", flakinessScore: 0.9 },
          ],
          summary: { totalTests: 10, flakyCount: 3, flakinessRate: 0.3 },
        });

        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: Array(10).fill({ status: "passed" }) });

        expect(response.status).toBe(200);
        expect(response.body.flakyTests.length).toBe(3);
      });
    });

    describe("Validation errors (400)", () => {
      it("should return 400 when testResults is missing", async () => {
        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("testResults array is required");
        expect(response.body).toHaveProperty("usage");
      });

      it("should return 400 when testResults is not an array", async () => {
        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: "not an array" });

        expect(response.status).toBe(400);
      });

      it("should return 400 when testResults is null", async () => {
        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: null });

        expect(response.status).toBe(400);
      });
    });

    describe("Error handling (500)", () => {
      it("should handle MCP communication errors", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValueOnce(
          new Error("MCP playwrightHealer timeout"),
        );

        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: [{ testName: "Test 1", status: "passed" }] });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body.error).toContain("timeout");
      });

      it("should handle unexpected errors", async () => {
        mockMcpManager.callDockerMcp.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        const response = await request(app)
          .post("/api/playwright/detect-flaky")
          .send({ testResults: [] });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
      });
    });
  });
});
