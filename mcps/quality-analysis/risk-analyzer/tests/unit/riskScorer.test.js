/**
 * Unit tests for RiskScorer - Core risk analysis business logic
 *
 * Tests the weighted scoring system that analyzes 6 risk factors:
 * - Complexity (20%)
 * - Coverage (15%)
 * - Integration (25%)
 * - Change Frequency (10%)
 * - Business Impact (20%)
 * - Defect History (10%)
 */

import { jest } from "@jest/globals";
import { RiskScorer } from "../../src/riskScorer.js";
import axios from "axios";

// Mock axios with proper mock functions
const mockAxiosPost = jest.fn();
const mockAxiosGet = jest.fn();
axios.post = mockAxiosPost;
axios.get = mockAxiosGet;

describe("RiskScorer", () => {
  let scorer;

  beforeEach(() => {
    scorer = new RiskScorer();
    jest.clearAllMocks();

    // Reset mocks to default successful responses
    mockAxiosPost.mockResolvedValue({
      data: { result: { findings: [], overallCoverage: 80 } },
    });
    mockAxiosGet.mockResolvedValue({
      data: { integrations: [] },
    });
  });

  describe("constructor", () => {
    it("should initialize with correct weights", () => {
      expect(scorer.weights).toEqual({
        complexity: 0.2,
        coverage: 0.15,
        integration: 0.25,
        changeFrequency: 0.1,
        businessImpact: 0.2,
        defectHistory: 0.1,
      });
    });

    it("should have weights summing to 1.0", () => {
      const sum = Object.values(scorer.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10); // Allow for floating point precision
    });
  });

  describe("getRiskLevel", () => {
    it('should return "critical" for scores >= 100', () => {
      expect(scorer.getRiskLevel(100)).toBe("critical");
      expect(scorer.getRiskLevel(150)).toBe("critical");
    });

    it('should return "high" for scores 60-99', () => {
      expect(scorer.getRiskLevel(60)).toBe("high");
      expect(scorer.getRiskLevel(80)).toBe("high");
      expect(scorer.getRiskLevel(99)).toBe("high");
    });

    it('should return "medium" for scores 30-59', () => {
      expect(scorer.getRiskLevel(30)).toBe("medium");
      expect(scorer.getRiskLevel(45)).toBe("medium");
      expect(scorer.getRiskLevel(59)).toBe("medium");
    });

    it('should return "low" for scores < 30', () => {
      expect(scorer.getRiskLevel(0)).toBe("low");
      expect(scorer.getRiskLevel(15)).toBe("low");
      expect(scorer.getRiskLevel(29)).toBe("low");
    });
  });

  describe("extractAffectedFiles", () => {
    it("should extract C# file paths from description", () => {
      const story = {
        description:
          "Modify Services/UserService.cs and Controllers/AuthController.cs",
        acceptanceCriteria: "",
      };

      const files = scorer.extractAffectedFiles(story);

      expect(files).toContain("Services/UserService.cs");
      expect(files).toContain("Controllers/AuthController.cs");
    });

    it("should extract files from acceptance criteria", () => {
      const story = {
        description: "",
        acceptanceCriteria: "Update Models/User.cs",
      };

      const files = scorer.extractAffectedFiles(story);

      expect(files).toContain("Models/User.cs");
    });

    it("should remove duplicate file paths", () => {
      const story = {
        description: "Services/UserService.cs",
        acceptanceCriteria: "Services/UserService.cs",
      };

      const files = scorer.extractAffectedFiles(story);

      expect(files).toHaveLength(1);
    });

    it("should return empty array when no files found", () => {
      const story = {
        description: "No file paths here",
        acceptanceCriteria: "Just text",
      };

      const files = scorer.extractAffectedFiles(story);

      expect(files).toEqual([]);
    });
  });

  describe("analyzeComplexity", () => {
    it("should return moderate risk when no affected files specified", async () => {
      const story = {
        description: "Generic story",
        acceptanceCriteria: "No files",
      };

      const result = await scorer.analyzeComplexity("App1", story);

      expect(result.score).toBe(50);
      expect(result.description).toContain("moderate risk assumed");
      expect(result.details.fileCount).toBe(0);
    });

    it("should analyze complexity from code analyzer", async () => {
      const story = {
        description: "Update Services/UserService.cs",
      };

      mockAxiosPost.mockResolvedValueOnce({
        data: {
          result: {
            findings: [
              {
                file: "/app/Services/UserService.cs",
                metrics: { complexity: 20 },
              },
            ],
          },
        },
      });

      const result = await scorer.analyzeComplexity("App1", story);

      expect(result.score).toBeGreaterThan(50);
      expect(result.details.avgComplexity).toBe(20);
      expect(result.details.highComplexityFiles).toHaveLength(1);
    });

    it("should handle code analyzer unavailable", async () => {
      const story = {
        description: "Update Services/UserService.cs",
      };

      mockAxiosPost.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await scorer.analyzeComplexity("App1", story);

      expect(result.score).toBe(50);
      expect(result.details.error).toBe("Code analyzer unavailable");
    });

    it("should calculate avg complexity correctly", async () => {
      const story = {
        description:
          "Update Services/UserService.cs and Services/AuthService.cs",
      };

      mockAxiosPost.mockResolvedValueOnce({
        data: {
          result: {
            findings: [
              {
                file: "/app/Services/UserService.cs",
                metrics: { complexity: 10 },
              },
              {
                file: "/app/Services/AuthService.cs",
                metrics: { complexity: 20 },
              },
            ],
          },
        },
      });

      const result = await scorer.analyzeComplexity("App1", story);

      expect(result.details.avgComplexity).toBe(15);
      expect(result.details.fileCount).toBe(2);
    });
  });

  describe("analyzeCoverage", () => {
    it("should calculate risk score from coverage (inverted)", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          result: {
            overallCoverage: 70,
            uncoveredFiles: [],
          },
        },
      });

      const result = await scorer.analyzeCoverage("App1", {});

      // 100 - 70 = 30 (lower coverage = higher risk)
      expect(result.score).toBe(30);
      expect(result.details.overallCoverage).toBe(70);
      expect(result.description).toContain("Good test coverage");
    });

    it("should handle very low coverage", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          result: {
            overallCoverage: 20,
            uncoveredFiles: [],
          },
        },
      });

      const result = await scorer.analyzeCoverage("App1", {});

      expect(result.score).toBe(80);
      expect(result.description).toContain("Very low test coverage");
    });

    it("should handle coverage analyzer unavailable", async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error("Service down"));

      const result = await scorer.analyzeCoverage("App1", {});

      expect(result.score).toBe(70);
      expect(result.details.error).toBe("Coverage analyzer unavailable");
    });
  });

  describe("analyzeIntegrationRisk", () => {
    it("should calculate risk from integration count", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          result: {
            summary: {
              total: 10,
              byType: {
                epic: 2,
                financial: 1,
                other: 7,
              },
            },
          },
        },
      });

      const result = await scorer.analyzeIntegrationRisk("App1", {});

      // baseScore: min(50, 10*3) = 30
      // criticalBonus: 3 * 15 = 45
      // total: 30 + 45 = 75
      expect(result.score).toBe(75);
      expect(result.details.integrationCount).toBe(10);
      expect(result.details.criticalIntegrations).toBe(3);
    });

    it("should cap integration score at 100", async () => {
      mockAxiosPost.mockResolvedValueOnce({
        data: {
          result: {
            summary: {
              total: 50,
              byType: {
                epic: 10,
                financial: 5,
              },
            },
          },
        },
      });

      const result = await scorer.analyzeIntegrationRisk("App1", {});

      expect(result.score).toBe(100);
    });

    it("should handle integration mapper unavailable", async () => {
      mockAxiosPost.mockRejectedValueOnce(new Error("Timeout"));

      const result = await scorer.analyzeIntegrationRisk("App1", {});

      expect(result.score).toBe(30);
      expect(result.details.error).toBe("Integration mapper unavailable");
    });
  });

  describe("analyzeChangeFrequency", () => {
    it("should return baseline score for simple story", async () => {
      const story = {
        description: "Simple feature",
        acceptanceCriteria: "Add button",
      };

      const result = await scorer.analyzeChangeFrequency("App1", story);

      expect(result.score).toBe(30);
      expect(result.description).toContain("Stable area");
    });

    it("should increase score for refactor keywords", async () => {
      const story = {
        description: "Refactor legacy code",
        acceptanceCriteria: "",
      };

      const result = await scorer.analyzeChangeFrequency("App1", story);

      expect(result.score).toBeGreaterThan(30);
      expect(result.details.indicators.refactor).toBe(true);
      expect(result.details.indicators.legacy).toBe(true);
    });

    it("should increase score for migration keywords", async () => {
      const story = {
        description: "Migration and upgrade",
        acceptanceCriteria: "",
      };

      const result = await scorer.analyzeChangeFrequency("App1", story);

      expect(result.score).toBeGreaterThan(30);
      expect(result.details.indicators.migration).toBe(true);
    });

    it("should cap score at 100", async () => {
      const story = {
        description: "Refactor legacy code migration redesign old code upgrade",
        acceptanceCriteria: "",
      };

      const result = await scorer.analyzeChangeFrequency("App1", story);

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("analyzeBusinessImpact", () => {
    it("should use fallback when AI analysis is not available", async () => {
      // The aiClient.js module doesn't exist, so this will test the fallback behavior
      const story = {
        title: "Payment Gateway",
        description: "Update payment processing",
        acceptanceCriteria: "Critical feature",
      };

      const result = await scorer.analyzeBusinessImpact("App1", story);

      // Should use keyword-based fallback scoring
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.details.fallback).toBe(true);
    });

    it("should use fallback for security keywords", async () => {
      const story = {
        title: "Security Update",
        description: "Fix security vulnerability",
        acceptanceCriteria: "",
      };

      const result = await scorer.analyzeBusinessImpact("App1", story);

      expect(result.score).toBe(90);
      expect(result.details.fallback).toBe(true);
    });

    it("should use fallback for payment keywords", async () => {
      const story = {
        title: "Billing System",
        description: "Update payment processing",
        acceptanceCriteria: "",
      };

      const result = await scorer.analyzeBusinessImpact("App1", story);

      expect(result.score).toBe(85);
    });

    it("should use fallback for internal keywords", async () => {
      const story = {
        title: "Internal Tool",
        description: "Admin panel update",
        acceptanceCriteria: "",
      };

      const result = await scorer.analyzeBusinessImpact("App1", story);

      expect(result.score).toBe(30);
    });
  });

  describe("analyzeDefectHistory", () => {
    it("should return low score for clean story", async () => {
      const story = {
        title: "New Feature",
        description: "Add new functionality",
      };

      const result = await scorer.analyzeDefectHistory("App1", story);

      expect(result.score).toBe(20);
      expect(result.description).toContain("Stable area");
    });

    it("should increase score for bug keywords", async () => {
      const story = {
        title: "Bug Fix",
        description: "Fix defect in checkout",
      };

      const result = await scorer.analyzeDefectHistory("App1", story);

      expect(result.score).toBeGreaterThan(20);
      expect(result.details.keywords.hasBugKeywords).toBe(true);
    });

    it("should increase score for fix keywords", async () => {
      const story = {
        title: "Hotfix",
        description: "Fix broken functionality",
      };

      const result = await scorer.analyzeDefectHistory("App1", story);

      expect(result.score).toBeGreaterThan(20);
      expect(result.details.keywords.isFixRelated).toBe(true);
    });

    it("should increase score for regression keywords", async () => {
      const story = {
        title: "Regression Issue",
        description: "Broken after last release",
      };

      const result = await scorer.analyzeDefectHistory("App1", story);

      expect(result.score).toBeGreaterThan(20);
      expect(result.details.keywords.isRegressionRelated).toBe(true);
    });
  });

  describe("generateRecommendations", () => {
    it("should recommend code review for high complexity", () => {
      const factors = {
        complexity: { score: 80 },
        coverage: { score: 20 },
        integration: { score: 30 },
        changeFrequency: { score: 30 },
        businessImpact: { score: 50 },
        defectHistory: { score: 20 },
      };

      const recommendations = scorer.generateRecommendations(factors, 50);

      const codeReview = recommendations.find(
        (r) => r.category === "code-review",
      );
      expect(codeReview).toBeDefined();
      expect(codeReview.priority).toBe("high");
    });

    it("should recommend testing for low coverage", () => {
      const factors = {
        complexity: { score: 30 },
        coverage: { score: 80 },
        integration: { score: 30 },
        changeFrequency: { score: 30 },
        businessImpact: { score: 50 },
        defectHistory: { score: 20 },
      };

      const recommendations = scorer.generateRecommendations(factors, 50);

      const testing = recommendations.filter((r) => r.category === "testing");
      expect(testing.length).toBeGreaterThan(0);
    });

    it("should recommend integration testing for high integration risk", () => {
      const factors = {
        complexity: { score: 30 },
        coverage: { score: 30 },
        integration: { score: 80 },
        changeFrequency: { score: 30 },
        businessImpact: { score: 50 },
        defectHistory: { score: 20 },
      };

      const recommendations = scorer.generateRecommendations(factors, 60);

      const integration = recommendations.filter(
        (r) => r.category === "testing" && r.text.includes("integration"),
      );
      expect(integration.length).toBeGreaterThan(0);
    });

    it("should require stakeholder approval for critical risk", () => {
      const factors = {
        complexity: { score: 90 },
        coverage: { score: 90 },
        integration: { score: 90 },
        changeFrequency: { score: 80 },
        businessImpact: { score: 90 },
        defectHistory: { score: 70 },
      };

      const recommendations = scorer.generateRecommendations(factors, 100);

      const approval = recommendations.find((r) => r.category === "approval");
      expect(approval).toBeDefined();
      expect(approval.priority).toBe("critical");
    });

    it("should recommend rollback plan for high business impact", () => {
      const factors = {
        complexity: { score: 30 },
        coverage: { score: 30 },
        integration: { score: 30 },
        changeFrequency: { score: 30 },
        businessImpact: { score: 85 },
        defectHistory: { score: 20 },
      };

      const recommendations = scorer.generateRecommendations(factors, 70);

      const rollback = recommendations.find((r) => r.category === "rollback");
      expect(rollback).toBeDefined();
    });
  });

  describe("calculateRisk", () => {
    it("should calculate overall risk score from all factors", async () => {
      const story = {
        id: "12345",
        title: "Test Story",
        description: "Simple test story",
        acceptanceCriteria: "No special requirements",
      };

      // Mock all API calls to return moderate risk
      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            overallCoverage: 50,
            summary: { total: 5, byType: {} },
            findings: [],
          },
        },
      });

      const result = await scorer.calculateRisk("App1", story);

      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("level");
      expect(result).toHaveProperty("factors");
      expect(result).toHaveProperty("weights");
      expect(result).toHaveProperty("recommendations");

      expect(result.factors).toHaveProperty("complexity");
      expect(result.factors).toHaveProperty("coverage");
      expect(result.factors).toHaveProperty("integration");
      expect(result.factors).toHaveProperty("changeFrequency");
      expect(result.factors).toHaveProperty("businessImpact");
      expect(result.factors).toHaveProperty("defectHistory");
    });

    it("should apply weights correctly", async () => {
      const story = {
        id: "12345",
        title: "Test",
        description: "Test",
        acceptanceCriteria: "",
      };

      // Mock factors with known scores
      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            overallCoverage: 0, // 100 risk
            summary: { total: 0, byType: {} }, // 0 risk
            findings: [],
          },
        },
      });

      const result = await scorer.calculateRisk("App1", story);

      // Verify weights were applied
      expect(result.weights).toEqual(scorer.weights);

      // Score should be weighted sum
      const expectedScore =
        result.factors.complexity.score * 0.2 +
        result.factors.coverage.score * 0.15 +
        result.factors.integration.score * 0.25 +
        result.factors.changeFrequency.score * 0.1 +
        result.factors.businessImpact.score * 0.2 +
        result.factors.defectHistory.score * 0.1;

      expect(result.score).toBe(Math.round(expectedScore));
    });

    it("should determine correct risk level", async () => {
      const story = {
        id: "12345",
        title: "Security Fix",
        description: "Fix critical security bug",
        acceptanceCriteria: "",
      };

      // Mock high-risk responses
      mockAxiosPost.mockResolvedValue({
        data: {
          result: {
            overallCoverage: 10, // 90 risk
            summary: { total: 20, byType: { epic: 5, financial: 5 } }, // high risk
            findings: [],
          },
        },
      });

      const result = await scorer.calculateRisk("App1", story);

      expect(result.score).toBeGreaterThan(60);
      expect(["high", "critical"]).toContain(result.level);
    });
  });
});
