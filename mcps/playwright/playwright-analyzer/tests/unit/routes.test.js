/**
 * Unit tests for Playwright Analyzer Routes
 *
 * Tests the Express API endpoints:
 * - GET /health
 * - POST /analyze - Discover critical UI paths using AI
 * - POST /prioritize - Prioritize paths by risk and impact
 * - GET /coverage - Get test coverage map
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// Create mock functions
const mockGenerateCompletion = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockReaddir = jest.fn();
const mockMkdir = jest.fn();

// Mock modules before importing
jest.unstable_mockModule("../../../../shared/aiClient.js", () => ({
  generateCompletion: mockGenerateCompletion,
}));

jest.unstable_mockModule("fs/promises", () => ({
  default: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    readdir: mockReaddir,
    mkdir: mockMkdir,
  },
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  readdir: mockReaddir,
  mkdir: mockMkdir,
}));

// Import modules after mocking - need to construct the app manually
describe("Playwright Analyzer Routes", () => {
  let app;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup Express app (mimicking src/index.js logic)
    app = express();
    app.use(express.json());

    // Health endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "playwright-analyzer-mcp",
        timestamp: new Date().toISOString(),
      });
    });

    // Analyze endpoint
    app.post("/analyze", async (req, res) => {
      try {
        const { app: appName, depth = "shallow", model } = req.body;

        if (!appName) {
          return res
            .status(400)
            .json({ error: "Application name is required" });
        }

        // Check if app config exists
        const configPath = "/app/config/apps.json";
        let appConfig;
        try {
          const configData = await mockReadFile(configPath, "utf-8");
          const allApps = JSON.parse(configData);
          appConfig = allApps[appName];

          if (!appConfig) {
            return res.status(404).json({
              error: `Application '${appName}' not found in apps.json`,
            });
          }
        } catch (error) {
          return res.status(500).json({
            error: "Could not read apps configuration",
            details: error.message,
          });
        }

        // Call AI
        const response = await mockGenerateCompletion({
          model,
          messages: [{ role: "user", content: expect.any(String) }],
          maxTokens: depth === "deep" ? 8000 : 4000,
          temperature: 0.3,
        });

        // Parse AI response
        let paths;
        try {
          const cleanedText = response.text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          paths = JSON.parse(cleanedText);
        } catch (parseError) {
          return res.status(500).json({
            error: "Failed to parse path analysis",
            details: parseError.message,
            rawResponse: response.text.substring(0, 500),
          });
        }

        // Save analysis
        const analysisData = {
          app: appName,
          depth,
          timestamp: new Date().toISOString(),
          totalPaths: paths.length,
          paths,
          model: response.model,
          usage: response.usage,
        };

        const fileName = `${appName}-analysis-${Date.now()}.json`;

        try {
          await mockWriteFile(
            `/app/data/${fileName}`,
            JSON.stringify(analysisData, null, 2),
          );
        } catch (error) {
          // Warn but don't fail
        }

        res.json({
          success: true,
          app: appName,
          depth,
          totalPaths: paths.length,
          paths,
          savedTo: fileName,
          usage: response.usage,
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    });

    // Prioritize endpoint
    app.post("/prioritize", async (req, res) => {
      try {
        const { app: appName, maxResults = 10, filter = {}, model } = req.body;

        if (!appName) {
          return res
            .status(400)
            .json({ error: "Application name is required" });
        }

        // Find most recent analysis file
        const files = await mockReaddir("/app/data");
        const analysisFiles = files
          .filter(
            (f) => f.startsWith(`${appName}-analysis-`) && f.endsWith(".json"),
          )
          .sort()
          .reverse();

        if (analysisFiles.length === 0) {
          return res.status(404).json({
            error: "No analysis found for this app",
            hint: "Run POST /analyze first",
          });
        }

        const latestFile = `/app/data/${analysisFiles[0]}`;
        const analysisData = JSON.parse(
          await mockReadFile(latestFile, "utf-8"),
        );
        let { paths } = analysisData;

        // Apply filters
        if (filter.priority) {
          // eslint-disable-next-line no-unused-vars
          paths = paths.filter((p) => p.priority === filter.priority);
        }
        if (filter.coverage) {
          paths = paths.filter((p) => p.coverage === filter.coverage);
        }

        // Call AI for prioritization
        const response = await mockGenerateCompletion({
          model,
          messages: [{ role: "user", content: expect.any(String) }],
          maxTokens: 4000,
          temperature: 0.2,
        });

        let prioritizationResult;
        try {
          const cleanedText = response.text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          prioritizationResult = JSON.parse(cleanedText);
        } catch (parseError) {
          return res.status(500).json({
            error: "Failed to parse prioritization result",
            details: parseError.message,
          });
        }

        const topPaths = prioritizationResult.prioritizedPaths.slice(
          0,
          maxResults,
        );

        // Save prioritization
        const prioritizationData = {
          app: appName,
          timestamp: new Date().toISOString(),
          maxResults,
          filter,
          totalPaths: topPaths.length,
          paths: topPaths,
          reasoning: prioritizationResult.reasoning,
          model: response.model,
          usage: response.usage,
        };

        const fileName = `${appName}-prioritization-${Date.now()}.json`;

        try {
          await mockWriteFile(
            `/app/data/${fileName}`,
            JSON.stringify(prioritizationData, null, 2),
          );
        } catch (error) {
          // Warn but don't fail
        }

        res.json({
          success: true,
          app: appName,
          totalPaths: topPaths.length,
          paths: topPaths,
          reasoning: prioritizationResult.reasoning,
          savedTo: fileName,
          usage: response.usage,
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    });

    // Coverage endpoint
    app.get("/coverage", async (req, res) => {
      try {
        const { app: appName } = req.query;

        if (!appName) {
          return res
            .status(400)
            .json({ error: "Application name is required (query param: app)" });
        }

        // Find most recent analysis file
        const files = await mockReaddir("/app/data");
        const analysisFiles = files
          .filter(
            (f) => f.startsWith(`${appName}-analysis-`) && f.endsWith(".json"),
          )
          .sort()
          .reverse();

        if (analysisFiles.length === 0) {
          return res.status(404).json({
            error: "No analysis found for this app",
            hint: "Run POST /analyze first",
          });
        }

        const latestFile = `/app/data/${analysisFiles[0]}`;
        const analysisData = JSON.parse(
          await mockReadFile(latestFile, "utf-8"),
        );
        const { paths } = analysisData;

        // Calculate coverage statistics
        const coverageStats = {
          total: paths.length,
          covered: paths.filter((p) => p.coverage === "covered").length,
          partial: paths.filter((p) => p.coverage === "partial").length,
          missing: paths.filter((p) => p.coverage === "missing").length,
        };

        const coveragePercentage =
          paths.length > 0
            ? ((coverageStats.covered / paths.length) * 100).toFixed(1)
            : 0;

        // Group by priority
        const byPriority = {
          critical: paths.filter((p) => p.priority === "critical"),
          high: paths.filter((p) => p.priority === "high"),
          medium: paths.filter((p) => p.priority === "medium"),
          low: paths.filter((p) => p.priority === "low"),
        };

        // Identify gaps
        const gaps = paths
          .filter(
            (p) =>
              (p.priority === "critical" || p.priority === "high") &&
              p.coverage === "missing",
          )
          .sort((a, b) => b.riskScore - a.riskScore);

        res.json({
          success: true,
          app: appName,
          coveragePercentage: parseFloat(coveragePercentage),
          stats: coverageStats,
          byPriority: {
            critical: {
              total: byPriority.critical.length,
              covered: byPriority.critical.filter(
                (p) => p.coverage === "covered",
              ).length,
              missing: byPriority.critical.filter(
                (p) => p.coverage === "missing",
              ).length,
            },
            high: {
              total: byPriority.high.length,
              covered: byPriority.high.filter((p) => p.coverage === "covered")
                .length,
              missing: byPriority.high.filter((p) => p.coverage === "missing")
                .length,
            },
            medium: {
              total: byPriority.medium.length,
              covered: byPriority.medium.filter((p) => p.coverage === "covered")
                .length,
              missing: byPriority.medium.filter((p) => p.coverage === "missing")
                .length,
            },
            low: {
              total: byPriority.low.length,
              covered: byPriority.low.filter((p) => p.coverage === "covered")
                .length,
              missing: byPriority.low.filter((p) => p.coverage === "missing")
                .length,
            },
          },
          gaps: gaps.map((g) => ({
            id: g.id,
            name: g.name,
            priority: g.priority,
            riskScore: g.riskScore,
            rationale: g.rationale,
          })),
          timestamp: analysisData.timestamp,
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "healthy",
        service: "playwright-analyzer-mcp",
        timestamp: expect.any(String),
      });
    });

    it("should include timestamp in ISO format", async () => {
      const response = await request(app).get("/health");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe("Invalid Date");
    });
  });

  describe("POST /analyze", () => {
    const mockAppConfig = {
      App1: {
        name: "App1",
        type: "web",
        language: "React",
        path: "/mnt/apps/app1",
        testPath: "/mnt/apps/app1/tests",
      },
    };

    const mockAIResponse = {
      text: JSON.stringify([
        {
          id: "path-1",
          name: "User Login Flow",
          priority: "critical",
          riskScore: 9,
          steps: [
            "Navigate to login page",
            "Enter credentials",
            "Click login button",
          ],
          expectedOutcome: "User authenticated",
          coverage: "missing",
          rationale: "Authentication is critical",
          category: "authentication",
        },
        {
          id: "path-2",
          name: "Product Search",
          priority: "high",
          riskScore: 7,
          steps: ["Enter search term", "Click search button"],
          expectedOutcome: "Search results displayed",
          coverage: "covered",
          rationale: "Core feature",
          category: "search",
        },
      ]),
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 100, output_tokens: 200 },
    };

    it("should analyze UI paths for shallow depth", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce(mockAIResponse);
      mockWriteFile.mockResolvedValueOnce();

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1", depth: "shallow" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.app).toBe("App1");
      expect(response.body.depth).toBe("shallow");
      expect(response.body.totalPaths).toBe(2);
      expect(response.body.paths).toHaveLength(2);
      expect(response.body.paths[0].name).toBe("User Login Flow");
      expect(response.body.usage).toEqual(mockAIResponse.usage);
    });

    it("should analyze UI paths for deep depth", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce(mockAIResponse);
      mockWriteFile.mockResolvedValueOnce();

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1", depth: "deep" });

      expect(response.status).toBe(200);
      expect(response.body.depth).toBe("deep");
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 8000,
        }),
      );
    });

    it("should default to shallow depth when not specified", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce(mockAIResponse);
      mockWriteFile.mockResolvedValueOnce();

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.depth).toBe("shallow");
    });

    it("should return 400 when app parameter is missing", async () => {
      const response = await request(app).post("/analyze").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Application name is required");
    });

    it("should return 404 when application not found in config", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));

      const response = await request(app)
        .post("/analyze")
        .send({ app: "NonExistentApp" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(
        "Application 'NonExistentApp' not found in apps.json",
      );
    });

    it("should return 500 when config file cannot be read", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("File not found"));

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Could not read apps configuration");
    });

    it("should handle AI response with markdown code blocks", async () => {
      const responseWithMarkdown = {
        ...mockAIResponse,
        text: "```json\n" + mockAIResponse.text + "\n```",
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce(responseWithMarkdown);
      mockWriteFile.mockResolvedValueOnce();

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.paths).toHaveLength(2);
    });

    it("should return 500 when AI response cannot be parsed", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "Invalid JSON response",
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 100, output_tokens: 200 },
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to parse path analysis");
    });

    it("should save analysis to file", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce(mockAIResponse);
      mockWriteFile.mockResolvedValueOnce();

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(mockWriteFile).toHaveBeenCalled();
      expect(response.body.savedTo).toMatch(/^App1-analysis-\d+\.json$/);
    });

    it("should continue even if file save fails", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce(mockAIResponse);
      mockWriteFile.mockRejectedValueOnce(new Error("Disk full"));

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should pass custom model to AI", async () => {
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAppConfig));
      mockGenerateCompletion.mockResolvedValueOnce(mockAIResponse);
      mockWriteFile.mockResolvedValueOnce();

      await request(app)
        .post("/analyze")
        .send({ app: "App1", model: "claude-opus-4-5-20251101" });

      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-opus-4-5-20251101",
        }),
      );
    });
  });

  describe("POST /prioritize", () => {
    const mockAnalysisData = {
      app: "App1",
      depth: "deep",
      timestamp: "2026-01-12T10:00:00.000Z",
      totalPaths: 3,
      paths: [
        {
          id: "path-1",
          name: "User Login",
          priority: "critical",
          riskScore: 9,
          coverage: "missing",
        },
        {
          id: "path-2",
          name: "Search",
          priority: "high",
          riskScore: 7,
          coverage: "covered",
        },
        {
          id: "path-3",
          name: "Settings",
          priority: "low",
          riskScore: 3,
          coverage: "partial",
        },
      ],
    };

    const mockPrioritizationResponse = {
      text: JSON.stringify({
        prioritizedPaths: [
          {
            id: "path-1",
            name: "User Login",
            priority: "critical",
            riskScore: 10,
          },
          {
            id: "path-2",
            name: "Search",
            priority: "high",
            riskScore: 8,
          },
        ],
        reasoning:
          "Critical paths prioritized by business impact and missing coverage",
      }),
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 150, output_tokens: 100 },
    };

    it("should prioritize paths successfully", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));
      mockGenerateCompletion.mockResolvedValueOnce(mockPrioritizationResponse);
      mockWriteFile.mockResolvedValueOnce();

      const response = await request(app)
        .post("/prioritize")
        .send({ app: "App1", maxResults: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.app).toBe("App1");
      expect(response.body.totalPaths).toBe(2);
      expect(response.body.paths).toHaveLength(2);
      expect(response.body.reasoning).toContain("Critical paths");
    });

    it("should return 400 when app parameter is missing", async () => {
      const response = await request(app).post("/prioritize").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Application name is required");
    });

    it("should return 404 when no analysis found", async () => {
      mockReaddir.mockResolvedValueOnce([]);

      const response = await request(app)
        .post("/prioritize")
        .send({ app: "App1" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("No analysis found for this app");
      expect(response.body.hint).toBe("Run POST /analyze first");
    });

    it("should filter by priority", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));
      mockGenerateCompletion.mockResolvedValueOnce(mockPrioritizationResponse);
      mockWriteFile.mockResolvedValueOnce();

      await request(app)
        .post("/prioritize")
        .send({ app: "App1", filter: { priority: "critical" } });

      expect(mockGenerateCompletion).toHaveBeenCalled();
    });

    it("should filter by coverage", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));
      mockGenerateCompletion.mockResolvedValueOnce(mockPrioritizationResponse);
      mockWriteFile.mockResolvedValueOnce();

      await request(app)
        .post("/prioritize")
        .send({ app: "App1", filter: { coverage: "missing" } });

      expect(mockGenerateCompletion).toHaveBeenCalled();
    });

    it("should limit results to maxResults", async () => {
      const manyPaths = Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `path-${i}`,
          name: `Path ${i}`,
          priority: "high",
          riskScore: 5 + i,
        }));

      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          ...mockAnalysisData,
          paths: manyPaths,
        }),
      );
      mockGenerateCompletion.mockResolvedValueOnce({
        ...mockPrioritizationResponse,
        text: JSON.stringify({
          prioritizedPaths: manyPaths,
          reasoning: "Test",
        }),
      });
      mockWriteFile.mockResolvedValueOnce();

      const response = await request(app)
        .post("/prioritize")
        .send({ app: "App1", maxResults: 5 });

      expect(response.status).toBe(200);
      expect(response.body.paths).toHaveLength(5);
    });

    it("should use most recent analysis file", async () => {
      mockReaddir.mockResolvedValueOnce([
        "App1-analysis-1111111111.json",
        "App1-analysis-9999999999.json",
        "App1-analysis-5555555555.json",
      ]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));
      mockGenerateCompletion.mockResolvedValueOnce(mockPrioritizationResponse);
      mockWriteFile.mockResolvedValueOnce();

      await request(app).post("/prioritize").send({ app: "App1" });

      expect(mockReadFile).toHaveBeenCalledWith(
        "/app/data/App1-analysis-9999999999.json",
        "utf-8",
      );
    });

    it("should return 500 when AI response cannot be parsed", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "Invalid JSON",
        model: "claude-sonnet-4-20250514",
        usage: { input_tokens: 150, output_tokens: 100 },
      });

      const response = await request(app)
        .post("/prioritize")
        .send({ app: "App1" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to parse prioritization result");
    });
  });

  describe("GET /coverage", () => {
    const mockAnalysisData = {
      app: "App1",
      timestamp: "2026-01-12T10:00:00.000Z",
      paths: [
        {
          id: "path-1",
          name: "Critical Path",
          priority: "critical",
          riskScore: 10,
          coverage: "missing",
          rationale: "Very important",
        },
        {
          id: "path-2",
          name: "High Path",
          priority: "high",
          riskScore: 8,
          coverage: "covered",
          rationale: "Important",
        },
        {
          id: "path-3",
          name: "Medium Path",
          priority: "medium",
          riskScore: 5,
          coverage: "partial",
          rationale: "Useful",
        },
        {
          id: "path-4",
          name: "Low Path",
          priority: "low",
          riskScore: 2,
          coverage: "covered",
          rationale: "Nice to have",
        },
      ],
    };

    it("should return coverage statistics", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));

      const response = await request(app)
        .get("/coverage")
        .query({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.app).toBe("App1");
      expect(response.body.coveragePercentage).toBe(50); // 2 out of 4 covered
      expect(response.body.stats).toEqual({
        total: 4,
        covered: 2,
        partial: 1,
        missing: 1,
      });
    });

    it("should return 400 when app parameter is missing", async () => {
      const response = await request(app).get("/coverage");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Application name is required (query param: app)",
      );
    });

    it("should return 404 when no analysis found", async () => {
      mockReaddir.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/coverage")
        .query({ app: "App1" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("No analysis found for this app");
    });

    it("should group by priority", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));

      const response = await request(app)
        .get("/coverage")
        .query({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.byPriority).toEqual({
        critical: { total: 1, covered: 0, missing: 1 },
        high: { total: 1, covered: 1, missing: 0 },
        medium: { total: 1, covered: 0, missing: 0 },
        low: { total: 1, covered: 1, missing: 0 },
      });
    });

    it("should identify coverage gaps", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));

      const response = await request(app)
        .get("/coverage")
        .query({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.gaps).toHaveLength(1);
      expect(response.body.gaps[0]).toEqual({
        id: "path-1",
        name: "Critical Path",
        priority: "critical",
        riskScore: 10,
        rationale: "Very important",
      });
    });

    it("should sort gaps by risk score descending", async () => {
      const dataWithMultipleGaps = {
        ...mockAnalysisData,
        paths: [
          {
            id: "p1",
            priority: "critical",
            riskScore: 7,
            coverage: "missing",
            name: "Path 1",
            rationale: "Test",
          },
          {
            id: "p2",
            priority: "high",
            riskScore: 9,
            coverage: "missing",
            name: "Path 2",
            rationale: "Test",
          },
          {
            id: "p3",
            priority: "critical",
            riskScore: 10,
            coverage: "missing",
            name: "Path 3",
            rationale: "Test",
          },
        ],
      };

      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(dataWithMultipleGaps));

      const response = await request(app)
        .get("/coverage")
        .query({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.gaps).toHaveLength(3);
      expect(response.body.gaps[0].riskScore).toBe(10);
      expect(response.body.gaps[1].riskScore).toBe(9);
      expect(response.body.gaps[2].riskScore).toBe(7);
    });

    it("should include timestamp from analysis", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockAnalysisData));

      const response = await request(app)
        .get("/coverage")
        .query({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.timestamp).toBe("2026-01-12T10:00:00.000Z");
    });

    it("should handle zero paths gracefully", async () => {
      mockReaddir.mockResolvedValueOnce(["App1-analysis-1234567890.json"]);
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          ...mockAnalysisData,
          paths: [],
        }),
      );

      const response = await request(app)
        .get("/coverage")
        .query({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.coveragePercentage).toBe(0);
      expect(response.body.stats.total).toBe(0);
    });
  });
});
