import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { FuzzyMatcher } from "../src/fuzzyMatcher.js";

describe("FuzzyMatcher", () => {
  let matcher;

  beforeEach(() => {
    matcher = new FuzzyMatcher();
  });

  describe("levenshteinDistance", () => {
    it("should return 0 for identical strings", () => {
      expect(matcher.levenshteinDistance("test", "test")).toBe(0);
    });

    it("should return correct distance for single character difference", () => {
      expect(matcher.levenshteinDistance("test", "text")).toBe(1);
    });

    it("should return correct distance for additions", () => {
      expect(matcher.levenshteinDistance("test", "tests")).toBe(1);
    });

    it("should return correct distance for deletions", () => {
      expect(matcher.levenshteinDistance("tests", "test")).toBe(1);
    });

    it("should handle empty strings", () => {
      expect(matcher.levenshteinDistance("", "test")).toBe(4);
      expect(matcher.levenshteinDistance("test", "")).toBe(4);
    });
  });

  describe("findByLevenshtein", () => {
    it("should find similar files within distance", () => {
      const availableFiles = [
        "PaymentService.cs",
        "PaymentServce.cs",
        "UserService.cs",
      ];

      const matches = matcher.findByLevenshtein(
        "PaymentServic.cs",
        availableFiles,
        3,
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].path).toBe("PaymentService.cs");
    });

    it("should sort by distance", () => {
      const availableFiles = [
        "UserService.cs",
        "PaymentService.cs",
        "PaymentSvc.cs",
      ];

      const matches = matcher.findByLevenshtein(
        "PaymentServ.cs",
        availableFiles,
        10,
      );

      // Should be sorted by distance (closest first)
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i].distance).toBeGreaterThanOrEqual(
          matches[i - 1].distance,
        );
      }
    });
  });

  describe("getSuggestions", () => {
    it("should return suggestions based on partial matches", () => {
      const availableFiles = [
        "PaymentService.cs",
        "PaymentController.cs",
        "UserService.cs",
      ];

      const suggestions = matcher.getSuggestions("Paym", availableFiles);

      expect(suggestions.some((s) => s.includes("Payment"))).toBe(true);
    });

    it("should limit suggestions to 5", () => {
      const availableFiles = Array(10)
        .fill(0)
        .map((_, i) => `TestFile${i}.cs`);

      const suggestions = matcher.getSuggestions("Test", availableFiles);

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });
});
