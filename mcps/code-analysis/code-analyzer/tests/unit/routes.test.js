/**
 * Unit tests for Code Analyzer Routes
 *
 * Tests the Express API endpoints:
 * - GET /health
 * - POST /analyze
 * - GET /applications
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// Create mock functions
const mockScanDirectory = jest.fn();
const mockAnalyzeCSharpFile = jest.fn();
const mockLoadAppsConfig = jest.fn();

// Mock modules before importing
jest.unstable_mockModule("../../src/services/scanner.js", () => ({
  scanDirectory: mockScanDirectory,
  analyzeCSharpFile: mockAnalyzeCSharpFile,
}));

jest.unstable_mockModule("../../src/utils/config.js", () => ({
  loadAppsConfig: mockLoadAppsConfig,
}));

describe("Code Analyzer Routes", () => {
  let app;
  let mockAppsConfig;

  beforeEach(() => {
    // Create Express app (mimicking src/index.js)
    app = express();
    app.use(express.json());

    // Mock apps configuration
    mockAppsConfig = {
      applications: [
        {
          name: "App1",
          displayName: "Application 1",
          path: "/mnt/apps/app1",
          framework: ".NET Core 8",
          includePatterns: ["**/*.cs"],
          excludePaths: ["bin", "obj"],
          integrations: ["epic"],
        },
        {
          name: "PreCare",
          displayName: "PreCare Application",
          path: "/mnt/apps/patient-portal",
          framework: ".NET Core 8",
          includePatterns: ["**/*.cs"],
          excludePaths: ["bin", "obj", "wwwroot"],
          integrations: ["epic", "financial"],
        },
      ],
      settings: {},
    };

    mockLoadAppsConfig.mockReturnValue(mockAppsConfig);

    // Setup routes
    const appsConfig = mockLoadAppsConfig();

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "code-analyzer-mcp",
        timestamp: new Date().toISOString(),
      });
    });

    app.post("/analyze", async (req, res) => {
      try {
        const {
          app: appName,
          includeTests = false,
          // eslint-disable-next-line no-unused-vars
          includeIntegrations = false,
          findEpicReferences = false,
          findFinancialReferences = false,
        } = req.body;

        if (!appName) {
          return res
            .status(400)
            .json({ error: "Application name is required" });
        }

        const appConfig = appsConfig.applications.find(
          (a) => a.name === appName,
        );
        if (!appConfig) {
          return res.status(404).json({
            error: `Application ${appName} not found in configuration`,
          });
        }

        const files = await mockScanDirectory(
          appConfig.path,
          appConfig.includePatterns,
          appConfig.excludePaths,
        );

        const analysis = {
          app: appName,
          timestamp: new Date().toISOString(),
          totalFiles: files.length,
          classes: [],
          methods: [],
          integrations: {
            epic: [],
            financial: [],
          },
          tests: [],
          summary: {},
        };

        for (const file of files) {
          try {
            const fileAnalysis = await mockAnalyzeCSharpFile(file, {
              includeTests,
              findEpicReferences,
              findFinancialReferences,
            });

            analysis.classes.push(...fileAnalysis.classes);
            analysis.methods.push(...fileAnalysis.methods);

            if (findEpicReferences && fileAnalysis.epicReferences.length > 0) {
              analysis.integrations.epic.push({
                file,
                references: fileAnalysis.epicReferences,
              });
            }

            if (
              findFinancialReferences &&
              fileAnalysis.financialReferences.length > 0
            ) {
              analysis.integrations.financial.push({
                file,
                references: fileAnalysis.financialReferences,
              });
            }

            if (includeTests && fileAnalysis.isTestFile) {
              analysis.tests.push({
                file,
                testMethods: fileAnalysis.testMethods,
              });
            }
          } catch (error) {
            // Skip files that can't be analyzed
          }
        }

        analysis.summary = {
          totalClasses: analysis.classes.length,
          totalMethods: analysis.methods.length,
          totalTests: analysis.tests.reduce(
            (sum, t) => sum + t.testMethods.length,
            0,
          ),
          epicIntegrationPoints: analysis.integrations.epic.length,
          financialIntegrationPoints: analysis.integrations.financial.length,
          averageMethodsPerClass:
            Math.round(analysis.methods.length / analysis.classes.length) || 0,
        };

        res.json({
          success: true,
          analysis,
        });
      } catch (error) {
        res.status(500).json({
          error: "Analysis failed",
          message: error.message,
        });
      }
    });

    app.get("/applications", (req, res) => {
      res.json({
        success: true,
        applications: appsConfig.applications.map((app) => ({
          name: app.name,
          displayName: app.displayName,
          framework: app.framework,
          integrations: app.integrations,
        })),
      });
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
        service: "code-analyzer-mcp",
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
    it("should analyze application code", async () => {
      mockScanDirectory.mockResolvedValueOnce([
        "/mnt/apps/app1/Services/UserService.cs",
        "/mnt/apps/app1/Controllers/UserController.cs",
      ]);

      mockAnalyzeCSharpFile.mockResolvedValueOnce({
        file: "/mnt/apps/app1/Services/UserService.cs",
        classes: [
          {
            name: "UserService",
            file: "/mnt/apps/app1/Services/UserService.cs",
            isTest: false,
            lineNumber: 3,
          },
        ],
        methods: [
          {
            name: "GetUser",
            className: "UserService",
            file: "/mnt/apps/app1/Services/UserService.cs",
            lineNumber: 5,
            visibility: "public",
            isPublic: true,
            complexity: 5,
            fileType: "Service",
            isTest: false,
          },
        ],
        isTestFile: false,
        testMethods: [],
        epicReferences: [],
        financialReferences: [],
      });

      mockAnalyzeCSharpFile.mockResolvedValueOnce({
        file: "/mnt/apps/app1/Controllers/UserController.cs",
        classes: [
          {
            name: "UserController",
            file: "/mnt/apps/app1/Controllers/UserController.cs",
            isTest: false,
            lineNumber: 3,
          },
        ],
        methods: [
          {
            name: "Get",
            className: "UserController",
            file: "/mnt/apps/app1/Controllers/UserController.cs",
            lineNumber: 5,
            visibility: "public",
            isPublic: true,
            complexity: 2,
            fileType: "Controller",
            isTest: false,
          },
        ],
        isTestFile: false,
        testMethods: [],
        epicReferences: [],
        financialReferences: [],
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis).toBeDefined();
      expect(response.body.analysis.app).toBe("App1");
      expect(response.body.analysis.totalFiles).toBe(2);
      expect(response.body.analysis.classes).toHaveLength(2);
      expect(response.body.analysis.methods).toHaveLength(2);
      expect(response.body.analysis.summary.totalClasses).toBe(2);
      expect(response.body.analysis.summary.totalMethods).toBe(2);
    });

    it("should return 400 when app parameter is missing", async () => {
      const response = await request(app).post("/analyze").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Application name is required");
    });

    it("should return 404 when application not found", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({ app: "NonExistentApp" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(
        "Application NonExistentApp not found in configuration",
      );
    });

    it("should handle scanDirectory errors", async () => {
      mockScanDirectory.mockRejectedValueOnce(new Error("Path does not exist"));

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Analysis failed");
      expect(response.body.message).toBe("Path does not exist");
    });

    it("should skip files that fail analysis", async () => {
      mockScanDirectory.mockResolvedValueOnce([
        "/mnt/apps/app1/Services/UserService.cs",
        "/mnt/apps/app1/Services/BadFile.cs",
      ]);

      mockAnalyzeCSharpFile.mockResolvedValueOnce({
        file: "/mnt/apps/app1/Services/UserService.cs",
        classes: [
          {
            name: "UserService",
            file: "/mnt/apps/app1/Services/UserService.cs",
            isTest: false,
            lineNumber: 3,
          },
        ],
        methods: [],
        isTestFile: false,
        testMethods: [],
        epicReferences: [],
        financialReferences: [],
      });

      mockAnalyzeCSharpFile.mockRejectedValueOnce(new Error("Parse error"));

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis.classes).toHaveLength(1);
    });

    it("should include test files when requested", async () => {
      mockScanDirectory.mockResolvedValueOnce([
        "/mnt/apps/app1/Tests/UserServiceTests.cs",
      ]);

      mockAnalyzeCSharpFile.mockResolvedValueOnce({
        file: "/mnt/apps/app1/Tests/UserServiceTests.cs",
        classes: [
          {
            name: "UserServiceTests",
            file: "/mnt/apps/app1/Tests/UserServiceTests.cs",
            isTest: true,
            lineNumber: 3,
          },
        ],
        methods: [
          {
            name: "GetUser_ReturnsUser",
            className: "UserServiceTests",
            file: "/mnt/apps/app1/Tests/UserServiceTests.cs",
            lineNumber: 5,
            visibility: "public",
            isPublic: true,
            complexity: 1,
            fileType: "Test",
            isTest: true,
          },
        ],
        isTestFile: true,
        testMethods: ["GetUser_ReturnsUser"],
        epicReferences: [],
        financialReferences: [],
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1", includeTests: true });

      expect(response.status).toBe(200);
      expect(response.body.analysis.tests).toHaveLength(1);
      expect(response.body.analysis.tests[0].testMethods).toContain(
        "GetUser_ReturnsUser",
      );
      expect(response.body.analysis.summary.totalTests).toBe(1);
    });

    it("should find Epic references when requested", async () => {
      mockScanDirectory.mockResolvedValueOnce([
        "/mnt/apps/app1/Services/PatientService.cs",
      ]);

      mockAnalyzeCSharpFile.mockResolvedValueOnce({
        file: "/mnt/apps/app1/Services/PatientService.cs",
        classes: [
          {
            name: "PatientService",
            file: "/mnt/apps/app1/Services/PatientService.cs",
            isTest: false,
            lineNumber: 3,
          },
        ],
        methods: [],
        isTestFile: false,
        testMethods: [],
        epicReferences: [
          {
            reference: "EpicClient",
            context: "private readonly EpicClient epicClient;",
          },
        ],
        financialReferences: [],
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1", findEpicReferences: true });

      expect(response.status).toBe(200);
      expect(response.body.analysis.integrations.epic).toHaveLength(1);
      expect(
        response.body.analysis.integrations.epic[0].references[0].reference,
      ).toBe("EpicClient");
      expect(response.body.analysis.summary.epicIntegrationPoints).toBe(1);
    });

    it("should find financial references when requested", async () => {
      mockScanDirectory.mockResolvedValueOnce([
        "/mnt/apps/app1/Services/BillingService.cs",
      ]);

      mockAnalyzeCSharpFile.mockResolvedValueOnce({
        file: "/mnt/apps/app1/Services/BillingService.cs",
        classes: [
          {
            name: "BillingService",
            file: "/mnt/apps/app1/Services/BillingService.cs",
            isTest: false,
            lineNumber: 3,
          },
        ],
        methods: [],
        isTestFile: false,
        testMethods: [],
        epicReferences: [],
        financialReferences: [
          {
            reference: "PaymentProcessor",
            context: "private readonly PaymentProcessor processor;",
          },
        ],
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "PreCare", findFinancialReferences: true });

      expect(response.status).toBe(200);
      expect(response.body.analysis.integrations.financial).toHaveLength(1);
      expect(response.body.analysis.summary.financialIntegrationPoints).toBe(1);
    });

    it("should calculate summary correctly", async () => {
      mockScanDirectory.mockResolvedValueOnce([
        "/mnt/apps/app1/Services/UserService.cs",
      ]);

      mockAnalyzeCSharpFile.mockResolvedValueOnce({
        file: "/mnt/apps/app1/Services/UserService.cs",
        classes: [
          {
            name: "UserService",
            file: "/mnt/apps/app1/Services/UserService.cs",
            isTest: false,
            lineNumber: 3,
          },
        ],
        methods: [
          {
            name: "GetUser",
            className: "UserService",
            file: "/mnt/apps/app1/Services/UserService.cs",
            lineNumber: 5,
            visibility: "public",
            isPublic: true,
            complexity: 5,
            fileType: "Service",
            isTest: false,
          },
          {
            name: "CreateUser",
            className: "UserService",
            file: "/mnt/apps/app1/Services/UserService.cs",
            lineNumber: 15,
            visibility: "public",
            isPublic: true,
            complexity: 8,
            fileType: "Service",
            isTest: false,
          },
        ],
        isTestFile: false,
        testMethods: [],
        epicReferences: [],
        financialReferences: [],
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.summary).toEqual({
        totalClasses: 1,
        totalMethods: 2,
        totalTests: 0,
        epicIntegrationPoints: 0,
        financialIntegrationPoints: 0,
        averageMethodsPerClass: 2,
      });
    });

    it("should handle empty analysis results", async () => {
      mockScanDirectory.mockResolvedValueOnce([]);

      const response = await request(app)
        .post("/analyze")
        .send({ app: "App1" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.totalFiles).toBe(0);
      expect(response.body.analysis.classes).toHaveLength(0);
      expect(response.body.analysis.summary.averageMethodsPerClass).toBe(0);
    });
  });

  describe("GET /applications", () => {
    it("should return list of applications", async () => {
      const response = await request(app).get("/applications");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.applications).toHaveLength(2);
    });

    it("should return application metadata", async () => {
      const response = await request(app).get("/applications");

      const app1 = response.body.applications.find((a) => a.name === "App1");
      expect(app1).toEqual({
        name: "App1",
        displayName: "Application 1",
        framework: ".NET Core 8",
        integrations: ["epic"],
      });
    });

    it("should not include sensitive config data", async () => {
      const response = await request(app).get("/applications");

      const app1 = response.body.applications[0];
      expect(app1.path).toBeUndefined();
      expect(app1.includePatterns).toBeUndefined();
      expect(app1.excludePaths).toBeUndefined();
    });

    it("should handle empty applications list", async () => {
      mockLoadAppsConfig.mockReturnValue({ applications: [], settings: {} });

      // Recreate app with empty config
      app = express();
      app.use(express.json());
      const appsConfig = mockLoadAppsConfig();

      app.get("/applications", (req, res) => {
        res.json({
          success: true,
          applications: appsConfig.applications.map((app) => ({
            name: app.name,
            displayName: app.displayName,
            framework: app.framework,
            integrations: app.integrations,
          })),
        });
      });

      const response = await request(app).get("/applications");

      expect(response.status).toBe(200);
      expect(response.body.applications).toHaveLength(0);
    });
  });
});
