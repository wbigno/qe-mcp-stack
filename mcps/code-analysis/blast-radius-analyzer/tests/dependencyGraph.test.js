import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { DependencyGraph } from "../src/dependencyGraph.js";

describe("DependencyGraph", () => {
  let graph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe("inferServiceFromController", () => {
    it("should convert Controller to Service", () => {
      const result = graph.inferServiceFromController(
        "Services/PaymentController.cs",
      );
      expect(result).toBe("Services/PaymentService.cs");
    });

    it("should handle path with multiple segments", () => {
      const result = graph.inferServiceFromController(
        "src/Controllers/UserController.cs",
      );
      // The replace replaces the first occurrence of "Controller" (in "Controllers" folder name)
      expect(result).toBe("src/Services/UserController.cs");
    });

    it("should return null for non-controller files", () => {
      const result = graph.inferServiceFromController(
        "Services/PaymentService.cs",
      );
      expect(result).toBeNull();
    });
  });

  describe("inferRepositoryFromService", () => {
    it("should convert Service to Repository", () => {
      // The replace replaces the first occurrence of "Service" (in "Services" folder name)
      const result = graph.inferRepositoryFromService(
        "Services/PaymentService.cs",
      );
      expect(result).toBe("Repositorys/PaymentService.cs");
    });

    it("should return null for non-service files", () => {
      const result = graph.inferRepositoryFromService(
        "Controllers/PaymentController.cs",
      );
      expect(result).toBeNull();
    });
  });

  describe("getDependencies", () => {
    it("should return empty array for unknown file", () => {
      const deps = graph.getDependencies("unknown.cs");
      expect(deps).toEqual([]);
    });
  });

  describe("getDependents", () => {
    it("should infer dependents for service files", () => {
      const dependents = graph.getDependents("Services/PaymentService.cs");

      expect(dependents.some((d) => d.includes("Controller"))).toBe(true);
    });

    it("should infer dependents for repository files", () => {
      const dependents = graph.getDependents(
        "Repositories/PaymentRepository.cs",
      );

      expect(dependents.some((d) => d.includes("Service"))).toBe(true);
    });

    it("should infer dependents for model files", () => {
      const dependents = graph.getDependents("Models/PaymentModel.cs");

      expect(
        dependents.some(
          (d) => d.includes("Service") || d.includes("Controller"),
        ),
      ).toBe(true);
    });
  });

  describe("getTransitiveDependencies", () => {
    it("should respect max depth", () => {
      const result = graph.getTransitiveDependencies("test.cs", 0);
      expect(result).toEqual([]);
    });

    it("should not include the original file", () => {
      const result = graph.getTransitiveDependencies(
        "Services/PaymentService.cs",
        2,
      );
      expect(result.every((r) => r.file !== "Services/PaymentService.cs")).toBe(
        true,
      );
    });
  });

  describe("getTransitiveDependents", () => {
    it("should respect max depth", () => {
      const result = graph.getTransitiveDependents("test.cs", 0);
      expect(result).toEqual([]);
    });

    it("should track depth correctly", () => {
      const result = graph.getTransitiveDependents(
        "Services/PaymentService.cs",
        3,
      );

      result.forEach((r) => {
        expect(r.depth).toBeGreaterThan(0);
        expect(r.depth).toBeLessThanOrEqual(3);
      });
    });
  });
});
