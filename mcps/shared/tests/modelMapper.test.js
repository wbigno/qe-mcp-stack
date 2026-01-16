// eslint-disable-next-line no-unused-vars
import { jest } from "@jest/globals";
import {
  MODEL_TIERS,
  MODEL_CATALOG,
  getTierMapping,
  getModelsByProvider,
  getModelMetadata,
  getDefaultModel,
  isValidModel,
  getAllModelIds,
} from "../modelMapper.js";

describe("Model Mapper", () => {
  describe("MODEL_TIERS constant", () => {
    it("should define three tiers", () => {
      expect(MODEL_TIERS).toHaveProperty("FAST");
      expect(MODEL_TIERS).toHaveProperty("BALANCED");
      expect(MODEL_TIERS).toHaveProperty("ADVANCED");
    });

    it("should have correct tier values", () => {
      expect(MODEL_TIERS.FAST).toBe("fast");
      expect(MODEL_TIERS.BALANCED).toBe("balanced");
      expect(MODEL_TIERS.ADVANCED).toBe("advanced");
    });
  });

  describe("MODEL_CATALOG constant", () => {
    it("should include Anthropic models", () => {
      expect(MODEL_CATALOG).toHaveProperty("claude-haiku-4-20250610");
      expect(MODEL_CATALOG).toHaveProperty("claude-sonnet-4-20250514");
      expect(MODEL_CATALOG).toHaveProperty("claude-opus-4-20250514");
    });

    it("should include OpenAI models", () => {
      expect(MODEL_CATALOG).toHaveProperty("gpt-4o-mini");
      expect(MODEL_CATALOG).toHaveProperty("gpt-4o");
      expect(MODEL_CATALOG).toHaveProperty("o1");
      expect(MODEL_CATALOG).toHaveProperty("o1-mini");
    });

    it("should have correct model structure", () => {
      const model = MODEL_CATALOG["claude-haiku-4-20250610"];
      expect(model).toHaveProperty("provider");
      expect(model).toHaveProperty("tier");
      expect(model).toHaveProperty("displayName");
      expect(model).toHaveProperty("description");
      expect(model).toHaveProperty("costPerMToken");
      expect(model).toHaveProperty("tierMapping");
    });
  });

  describe("getTierMapping()", () => {
    it("should return tier-equivalent model for Claude Haiku", () => {
      const mapping = getTierMapping("claude-haiku-4-20250610");
      expect(mapping).toBe("gpt-4o-mini");
    });

    it("should return tier-equivalent model for GPT-4o", () => {
      const mapping = getTierMapping("gpt-4o");
      expect(mapping).toBe("claude-sonnet-4-20250514");
    });

    it("should return null for invalid model", () => {
      const mapping = getTierMapping("invalid-model");
      expect(mapping).toBeNull();
    });

    it("should return null for undefined model", () => {
      const mapping = getTierMapping(undefined);
      expect(mapping).toBeNull();
    });
  });

  describe("getModelsByProvider()", () => {
    it("should return all Anthropic models", () => {
      const models = getModelsByProvider("anthropic");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === "anthropic")).toBe(true);
    });

    it("should return all OpenAI models", () => {
      const models = getModelsByProvider("openai");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === "openai")).toBe(true);
    });

    it("should include model ID in returned objects", () => {
      const models = getModelsByProvider("anthropic");
      expect(models[0]).toHaveProperty("id");
      expect(models[0]).toHaveProperty("provider");
      expect(models[0]).toHaveProperty("tier");
    });

    it("should return empty array for unknown provider", () => {
      const models = getModelsByProvider("unknown");
      expect(models).toEqual([]);
    });
  });

  describe("getModelMetadata()", () => {
    it("should return metadata for valid model", () => {
      const metadata = getModelMetadata("claude-sonnet-4-20250514");
      expect(metadata).toBeDefined();
      expect(metadata.provider).toBe("anthropic");
      expect(metadata.tier).toBe("balanced");
    });

    it("should return null for invalid model", () => {
      const metadata = getModelMetadata("invalid-model");
      expect(metadata).toBeNull();
    });

    it("should include cost information", () => {
      const metadata = getModelMetadata("gpt-4o");
      expect(metadata.costPerMToken).toBeDefined();
      expect(metadata.costPerMToken).toHaveProperty("input");
      expect(metadata.costPerMToken).toHaveProperty("output");
    });
  });

  describe("getDefaultModel()", () => {
    it("should return default Anthropic model", () => {
      const defaultModel = getDefaultModel("anthropic");
      expect(defaultModel).toBeDefined();
      expect(defaultModel).toBe("claude-haiku-4-20250610");
    });

    it("should return default OpenAI model", () => {
      const defaultModel = getDefaultModel("openai");
      expect(defaultModel).toBeDefined();
      expect(defaultModel).toBe("gpt-4o-mini");
    });

    it("should return null for unknown provider", () => {
      const defaultModel = getDefaultModel("unknown");
      expect(defaultModel).toBeNull();
    });
  });

  describe("isValidModel()", () => {
    it("should return true for valid Claude model", () => {
      expect(isValidModel("claude-sonnet-4-20250514")).toBe(true);
    });

    it("should return true for valid OpenAI model", () => {
      expect(isValidModel("gpt-4o")).toBe(true);
    });

    it("should return false for invalid model", () => {
      expect(isValidModel("invalid-model")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidModel(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(isValidModel(null)).toBe(false);
    });
  });

  describe("getAllModelIds()", () => {
    it("should return array of all model IDs", () => {
      const ids = getAllModelIds();
      expect(Array.isArray(ids)).toBe(true);
      expect(ids.length).toBeGreaterThan(0);
    });

    it("should include both providers", () => {
      const ids = getAllModelIds();
      expect(ids).toContain("claude-haiku-4-20250610");
      expect(ids).toContain("gpt-4o-mini");
    });

    it("should return all models from catalog", () => {
      const ids = getAllModelIds();
      const catalogKeys = Object.keys(MODEL_CATALOG);
      expect(ids.length).toBe(catalogKeys.length);
    });
  });
});
