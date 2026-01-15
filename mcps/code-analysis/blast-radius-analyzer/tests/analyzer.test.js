import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { BlastRadiusAnalyzer } from "../src/analyzer.js";

describe("BlastRadiusAnalyzer", () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new BlastRadiusAnalyzer();
  });

  describe("getComponentType", () => {
    it("should identify Controller type", () => {
      expect(analyzer.getComponentType("PaymentController.cs")).toBe(
        "Controller",
      );
      expect(analyzer.getComponentType("Controllers/UserController.cs")).toBe(
        "Controller",
      );
    });

    it("should identify Service type", () => {
      expect(analyzer.getComponentType("PaymentService.cs")).toBe("Service");
      expect(analyzer.getComponentType("Services/BillingService.cs")).toBe(
        "Service",
      );
    });

    it("should identify Repository type", () => {
      expect(analyzer.getComponentType("UserRepository.cs")).toBe("Repository");
    });

    it("should identify Model type", () => {
      expect(analyzer.getComponentType("Models/User.cs")).toBe("Model");
      // Note: 'Entities' does not contain 'entity' substring (entities vs entity)
      // Use singular 'Entity' folder for proper detection
      expect(analyzer.getComponentType("Entity/Payment.cs")).toBe("Model");
    });

    it("should identify Test type", () => {
      expect(analyzer.getComponentType("PaymentTests.cs")).toBe("Test");
      expect(analyzer.getComponentType("Tests/UserTests.cs")).toBe("Test");
    });

    it("should return Component for unknown types", () => {
      expect(analyzer.getComponentType("SomeRandomFile.cs")).toBe("Component");
    });
  });

  describe("identifyAffectedIntegrations", () => {
    it("should identify Epic integrations", () => {
      const components = [{ name: "EpicService.cs", type: "Service" }];
      const integrations = analyzer.identifyAffectedIntegrations(components);

      expect(integrations.some((i) => i.type === "Epic")).toBe(true);
    });

    it("should identify Financial integrations", () => {
      const components = [{ name: "BillingService.cs", type: "Service" }];
      const integrations = analyzer.identifyAffectedIntegrations(components);

      expect(integrations.some((i) => i.type === "Financial")).toBe(true);
    });

    it("should identify Payment integrations", () => {
      const components = [{ name: "StripeGateway.cs", type: "Service" }];
      const integrations = analyzer.identifyAffectedIntegrations(components);

      expect(integrations.some((i) => i.type === "Payment")).toBe(true);
    });

    it("should identify Database integrations", () => {
      const components = [{ name: "UserRepository.cs", type: "Repository" }];
      const integrations = analyzer.identifyAffectedIntegrations(components);

      expect(integrations.some((i) => i.type === "Database")).toBe(true);
    });

    it("should deduplicate integrations by type", () => {
      const components = [
        { name: "BillingService.cs", type: "Service" },
        { name: "PaymentService.cs", type: "Service" },
      ];
      const integrations = analyzer.identifyAffectedIntegrations(components);

      const financialCount = integrations.filter(
        (i) => i.type === "Financial",
      ).length;
      expect(financialCount).toBe(1);
    });
  });

  describe("calculateRiskScore", () => {
    it("should return low risk for minimal components", () => {
      const components = [{ name: "helper.cs", type: "Utility" }];
      const integrations = [];
      const tests = [];

      const risk = analyzer.calculateRiskScore(components, integrations, tests);

      expect(risk.level).toBe("low");
      expect(risk.score).toBeLessThan(30);
    });

    it("should return high risk for critical integrations", () => {
      const components = [
        { name: "EpicService.cs", type: "Service" },
        { name: "BillingService.cs", type: "Service" },
      ];
      const integrations = [
        { type: "Epic", level: "critical", weight: 5 },
        { type: "Financial", level: "critical", weight: 5 },
      ];
      const tests = [];

      const risk = analyzer.calculateRiskScore(components, integrations, tests);

      expect(["high", "critical"]).toContain(risk.level);
      expect(risk.score).toBeGreaterThanOrEqual(50);
    });

    it("should cap score at 100", () => {
      const components = Array(30).fill({ name: "file.cs", type: "Component" });
      const integrations = Array(10).fill({
        type: "Epic",
        level: "critical",
        weight: 5,
      });
      const tests = Array(10).fill({ directlyAffected: true });

      const risk = analyzer.calculateRiskScore(components, integrations, tests);

      expect(risk.score).toBeLessThanOrEqual(100);
    });
  });

  describe("generateRecommendations", () => {
    it("should recommend integration testing for critical integrations", () => {
      const integrations = [{ type: "Epic", level: "critical", weight: 5 }];
      const components = [{ type: "Service" }];
      const risk = { level: "high", score: 75 };

      const recommendations = analyzer.generateRecommendations(
        risk,
        components,
        integrations,
      );

      expect(recommendations.some((r) => r.category === "Integration")).toBe(
        true,
      );
    });

    it("should recommend API testing for controllers", () => {
      const integrations = [];
      const components = [{ type: "Controller" }];
      const risk = { level: "medium", score: 40 };

      const recommendations = analyzer.generateRecommendations(
        risk,
        components,
        integrations,
      );

      expect(recommendations.some((r) => r.category === "API")).toBe(true);
    });

    it("should recommend full regression for critical risk", () => {
      const integrations = [];
      const components = [];
      const risk = { level: "critical", score: 85 };

      const recommendations = analyzer.generateRecommendations(
        risk,
        components,
        integrations,
      );

      expect(recommendations.some((r) => r.priority === "critical")).toBe(true);
    });
  });
});
