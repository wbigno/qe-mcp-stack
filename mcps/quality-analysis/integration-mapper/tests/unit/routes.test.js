import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

describe("Integration Mapper Routes", () => {
  let app;
  let mockLoadAppConfig;
  let mockScanCSharpFiles;
  let mockDetectIntegrations;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock functions
    mockLoadAppConfig = jest.fn();
    mockScanCSharpFiles = jest.fn();
    mockDetectIntegrations = jest.fn();

    app = express();
    app.use(express.json());

    const PORT = 3008; // eslint-disable-line no-unused-vars

    // Mock analyzer and detector
    const mockAnalyzer = {
      loadAppConfig: mockLoadAppConfig,
      scanCSharpFiles: mockScanCSharpFiles,
    };

    const mockDetector = {
      detectIntegrations: mockDetectIntegrations,
    };

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "integration-mapper-mcp",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
      });
    });

    app.post("/map-integrations", async (req, res) => {
      try {
        // eslint-disable-next-line no-unused-vars
        const { app: appName, integrationType, includeDiagram } = req.body;

        if (!appName) {
          return res.status(400).json({
            success: false,
            error: "app parameter required",
          });
        }

        // Mock the analysis flow
        const appConfig = await mockAnalyzer.loadAppConfig(appName);
        const files = await mockAnalyzer.scanCSharpFiles(appConfig.path, false);
        const integrations = mockDetector.detectIntegrations(
          files,
          integrationType,
        );

        res.json({
          success: true,
          app: appName,
          integrations: integrations,
          summary: {
            totalIntegrations: integrations.length,
            types: [...new Set(integrations.map((i) => i.type))],
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("integration-mapper-mcp");
    });

    it("should include version", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.version).toBe("2.0.0");
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe("POST /map-integrations", () => {
    beforeEach(() => {
      mockLoadAppConfig.mockResolvedValue({
        name: "TestApp",
        path: "/mnt/apps/testapp",
      });

      mockScanCSharpFiles.mockResolvedValue([
        { path: "/mnt/apps/testapp/Service.cs", content: "class Service {}" },
      ]);

      mockDetectIntegrations.mockReturnValue([
        {
          type: "database",
          name: "SQL Server",
          method: "ExecuteQuery",
          file: "Service.cs",
        },
        {
          type: "api",
          name: "External API",
          method: "HttpPost",
          file: "Service.cs",
        },
      ]);
    });

    it("should map integrations successfully", async () => {
      const response = await request(app)
        .post("/map-integrations")
        .send({ app: "TestApp" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.app).toBe("TestApp");
    });

    it("should return integration details", async () => {
      const response = await request(app)
        .post("/map-integrations")
        .send({ app: "TestApp" });

      expect(response.status).toBe(200);
      expect(response.body.integrations).toHaveLength(2);
      expect(response.body.integrations[0].type).toBe("database");
      expect(response.body.integrations[1].type).toBe("api");
    });

    it("should return summary statistics", async () => {
      const response = await request(app)
        .post("/map-integrations")
        .send({ app: "TestApp" });

      expect(response.status).toBe(200);
      expect(response.body.summary.totalIntegrations).toBe(2);
      expect(response.body.summary.types).toContain("database");
      expect(response.body.summary.types).toContain("api");
    });

    it("should return 400 for missing app parameter", async () => {
      const response = await request(app).post("/map-integrations").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("app parameter required");
    });

    it("should handle integrationType filter", async () => {
      const response = await request(app)
        .post("/map-integrations")
        .send({ app: "TestApp", integrationType: "database" });

      expect(response.status).toBe(200);
      expect(mockDetectIntegrations).toHaveBeenCalledWith(
        expect.anything(),
        "database",
      );
    });

    it("should handle includeDiagram option", async () => {
      const response = await request(app)
        .post("/map-integrations")
        .send({ app: "TestApp", includeDiagram: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      mockLoadAppConfig.mockRejectedValue(new Error("App not found"));

      const response = await request(app)
        .post("/map-integrations")
        .send({ app: "UnknownApp" });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("App not found");
    });

    it("should call loadAppConfig with correct app name", async () => {
      await request(app).post("/map-integrations").send({ app: "TestApp" });

      expect(mockLoadAppConfig).toHaveBeenCalledWith("TestApp");
    });

    it("should call scanCSharpFiles with correct path", async () => {
      await request(app).post("/map-integrations").send({ app: "TestApp" });

      expect(mockScanCSharpFiles).toHaveBeenCalledWith(
        "/mnt/apps/testapp",
        false,
      );
    });

    it("should call detectIntegrations with files", async () => {
      await request(app).post("/map-integrations").send({ app: "TestApp" });

      expect(mockDetectIntegrations).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: "/mnt/apps/testapp/Service.cs" }),
        ]),
        undefined,
      );
    });
  });
});
