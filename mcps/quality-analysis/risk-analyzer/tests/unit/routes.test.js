/**
 * Unit tests for Risk Analyzer Routes
 *
 * Tests the Express API endpoints:
 * - GET /health
 * - POST /analyze-risk
 */

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { RiskScorer } from "../../src/riskScorer.js";

describe("Risk Analyzer Routes", () => {
  let app;
  let mockCalculateRisk;
  let originalCalculateRisk; // eslint-disable-line no-unused-vars

  beforeEach(() => {
    // Setup Express app (mimicking src/index.js)
    app = express();
    app.use(express.json());

    // Create a real RiskScorer instance and spy on its methods
    const riskScorerInstance = new RiskScorer();

    // Store original method and create spy
    originalCalculateRisk = riskScorerInstance.calculateRisk;
    mockCalculateRisk = jest.fn();
    riskScorerInstance.calculateRisk = mockCalculateRisk;

    // Health endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "risk-analyzer-mcp",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
      });
    });

    // Analyze risk endpoint
    app.post("/analyze-risk", async (req, res) => {
      try {
        const { app: appName, story } = req.body;

        if (!appName) {
          return res.status(400).json({
            success: false,
            error: "app parameter required",
          });
        }

        if (!story) {
          return res.status(400).json({
            success: false,
            error:
              "story parameter required (must include: id, title, description, acceptanceCriteria)",
          });
        }

        const riskAnalysis = await riskScorerInstance.calculateRisk(
          appName,
          story,
        );

        res.json({
          success: true,
          app: appName,
          storyId: story.id,
          timestamp: new Date().toISOString(),
          result: {
            risk: riskAnalysis,
            metadata: {
              version: "2.0.0",
              mcpType: "risk-analyzer",
            },
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "healthy",
        service: "risk-analyzer-mcp",
        timestamp: expect.any(String),
        version: "2.0.0",
      });
    });

    it("should include timestamp in ISO format", async () => {
      const response = await request(app).get("/health");

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe("Invalid Date");
    });
  });

  describe("POST /analyze-risk", () => {
    it("should analyze risk for valid story", async () => {
      const mockRiskAnalysis = {
        score: 65,
        level: "high",
        factors: {
          complexity: {
            score: 70,
            details: {},
            description: "High complexity",
          },
          coverage: { score: 60, details: {}, description: "Low coverage" },
          integration: {
            score: 80,
            details: {},
            description: "Many integrations",
          },
          changeFrequency: { score: 40, details: {}, description: "Moderate" },
          businessImpact: {
            score: 75,
            details: {},
            description: "High impact",
          },
          defectHistory: {
            score: 50,
            details: {},
            description: "Some history",
          },
        },
        weights: {
          complexity: 0.2,
          coverage: 0.15,
          integration: 0.25,
          changeFrequency: 0.1,
          businessImpact: 0.2,
          defectHistory: 0.1,
        },
        recommendations: [
          {
            priority: "high",
            category: "testing",
            text: "Comprehensive testing required",
          },
        ],
      };

      mockCalculateRisk.mockResolvedValueOnce(mockRiskAnalysis);

      const story = {
        id: "12345",
        title: "Critical Feature",
        description: "Implement payment gateway",
        acceptanceCriteria: "Must handle all payment types",
      };

      const response = await request(app).post("/analyze-risk").send({
        app: "PatientPortal",
        story,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        app: "PatientPortal",
        storyId: "12345",
        timestamp: expect.any(String),
        result: {
          risk: mockRiskAnalysis,
          metadata: {
            version: "2.0.0",
            mcpType: "risk-analyzer",
          },
        },
      });

      expect(mockCalculateRisk).toHaveBeenCalledWith("PatientPortal", story);
    });

    it("should return 400 when app parameter is missing", async () => {
      const response = await request(app)
        .post("/analyze-risk")
        .send({
          story: {
            id: "12345",
            title: "Test",
            description: "Test",
            acceptanceCriteria: "",
          },
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "app parameter required",
      });

      expect(mockCalculateRisk).not.toHaveBeenCalled();
    });

    it("should return 400 when story parameter is missing", async () => {
      const response = await request(app).post("/analyze-risk").send({
        app: "TestApp",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error:
          "story parameter required (must include: id, title, description, acceptanceCriteria)",
      });

      expect(mockCalculateRisk).not.toHaveBeenCalled();
    });

    it("should return 400 when both parameters are missing", async () => {
      const response = await request(app).post("/analyze-risk").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should handle risk calculation errors", async () => {
      mockCalculateRisk.mockRejectedValueOnce(
        new Error("Code analyzer unavailable"),
      );

      const response = await request(app)
        .post("/analyze-risk")
        .send({
          app: "TestApp",
          story: {
            id: "12345",
            title: "Test",
            description: "Test",
            acceptanceCriteria: "",
          },
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Code analyzer unavailable",
      });
    });

    it("should handle story with minimal fields", async () => {
      const mockRiskAnalysis = {
        score: 40,
        level: "medium",
        factors: {},
        weights: {},
        recommendations: [],
      };

      mockCalculateRisk.mockResolvedValueOnce(mockRiskAnalysis);

      const story = {
        id: "999",
        title: "Simple Story",
        description: "",
        acceptanceCriteria: "",
      };

      const response = await request(app).post("/analyze-risk").send({
        app: "App1",
        story,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.storyId).toBe("999");
    });

    it("should include correct metadata in response", async () => {
      mockCalculateRisk.mockResolvedValueOnce({
        score: 50,
        level: "medium",
        factors: {},
        weights: {},
        recommendations: [],
      });

      const response = await request(app)
        .post("/analyze-risk")
        .send({
          app: "App1",
          story: {
            id: "1",
            title: "Test",
            description: "Test",
            acceptanceCriteria: "",
          },
        });

      expect(response.body.result.metadata).toEqual({
        version: "2.0.0",
        mcpType: "risk-analyzer",
      });
    });

    it("should handle story with complex acceptance criteria", async () => {
      mockCalculateRisk.mockResolvedValueOnce({
        score: 80,
        level: "high",
        factors: {},
        weights: {},
        recommendations: [],
      });

      const story = {
        id: "7890",
        title: "Complex Feature",
        description: "Refactor legacy payment system",
        acceptanceCriteria: `
          - Must handle all payment types
          - Must integrate with Epic EHR
          - Must support PCI compliance
          - Must handle errors gracefully
        `,
      };

      const response = await request(app).post("/analyze-risk").send({
        app: "PreCare",
        story,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockCalculateRisk).toHaveBeenCalledWith("PreCare", story);
    });

    it("should return critical risk level for high-risk story", async () => {
      const mockRiskAnalysis = {
        score: 100,
        level: "critical",
        factors: {
          complexity: { score: 95, details: {}, description: "Very high" },
          coverage: {
            score: 90,
            details: {},
            description: "Very low coverage",
          },
          integration: {
            score: 100,
            details: {},
            description: "Critical integrations",
          },
          changeFrequency: {
            score: 80,
            details: {},
            description: "High churn",
          },
          businessImpact: {
            score: 100,
            details: {},
            description: "Critical impact",
          },
          defectHistory: {
            score: 85,
            details: {},
            description: "Many defects",
          },
        },
        weights: {},
        recommendations: [
          {
            priority: "critical",
            category: "approval",
            text: "Require stakeholder approval",
          },
        ],
      };

      mockCalculateRisk.mockResolvedValueOnce(mockRiskAnalysis);

      const response = await request(app)
        .post("/analyze-risk")
        .send({
          app: "CriticalApp",
          story: {
            id: "999",
            title: "Critical Security Fix",
            description: "Fix security vulnerability in payment processing",
            acceptanceCriteria: "Must be PCI compliant",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.result.risk.level).toBe("critical");
      expect(response.body.result.risk.score).toBe(100);
    });
  });
});
