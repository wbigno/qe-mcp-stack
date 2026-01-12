import { jest } from "@jest/globals";

// Mock the SDK modules BEFORE importing aiClient
const mockAnthropicCreate = jest.fn();
const mockOpenAICreate = jest.fn();

jest.unstable_mockModule("@anthropic-ai/sdk", () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockAnthropicCreate,
    },
  })),
}));

jest.unstable_mockModule("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}));

// Import aiClient AFTER mocking
const { generateCompletion, validateApiKeys } = await import("../aiClient.js");

describe("AI Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.OPENAI_API_KEY = "test-openai-key";

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockAnthropicCreate.mockResolvedValue({
      content: [{ text: "Anthropic response" }],
      usage: {
        input_tokens: 100,
        output_tokens: 200,
      },
    });

    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: "OpenAI response" } }],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 250,
        total_tokens: 400,
      },
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================
  // generateCompletion() - Anthropic (Claude)
  // ============================================

  describe("generateCompletion() with Anthropic", () => {
    it("should generate completion using Claude model", async () => {
      const result = await generateCompletion({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Test prompt" }],
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        temperature: 0.4,
        messages: [{ role: "user", content: "Test prompt" }],
      });

      expect(result).toEqual({
        text: "Anthropic response",
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      });
    });

    it("should use default Anthropic model when no model specified", async () => {
      delete process.env.CLAUDE_MODEL;

      await generateCompletion({
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-3-haiku-20240307",
        }),
      );
    });

    it("should use CLAUDE_MODEL env var when set", async () => {
      process.env.CLAUDE_MODEL = "claude-opus-4-5-20251101";

      await generateCompletion({
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-opus-4-5-20251101",
        }),
      );
    });

    it("should support custom maxTokens", async () => {
      await generateCompletion({
        model: "claude-haiku-4-20250610",
        messages: [{ role: "user", content: "Test" }],
        maxTokens: 8000,
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 8000,
        }),
      );
    });

    it("should support custom temperature", async () => {
      await generateCompletion({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0.8,
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
        }),
      );
    });

    it("should pass additional options to Anthropic", async () => {
      await generateCompletion({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Test" }],
        options: {
          system: "You are a helpful assistant",
          top_p: 0.9,
        },
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are a helpful assistant",
          top_p: 0.9,
        }),
      );
    });

    it("should throw error when ANTHROPIC_API_KEY not set", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(
        generateCompletion({
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "user", content: "Test" }],
        }),
      ).rejects.toThrow("ANTHROPIC_API_KEY not configured");
    });

    it("should handle Anthropic API errors", async () => {
      mockAnthropicCreate.mockRejectedValueOnce(
        new Error("rate_limit_exceeded"),
      );

      await expect(
        generateCompletion({
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "user", content: "Test" }],
        }),
      ).rejects.toThrow("AI API error (anthropic/claude-sonnet-4-20250514)");
    });
  });

  // ============================================
  // generateCompletion() - OpenAI
  // ============================================

  describe("generateCompletion() with OpenAI", () => {
    it("should generate completion using GPT model", async () => {
      const result = await generateCompletion({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test prompt" }],
      });

      expect(mockOpenAICreate).toHaveBeenCalledWith({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test prompt" }],
        max_tokens: 4096,
        temperature: 0.4,
      });

      expect(result).toEqual({
        text: "OpenAI response",
        usage: {
          promptTokens: 150,
          completionTokens: 250,
          totalTokens: 400,
        },
        provider: "openai",
        model: "gpt-4o",
      });
    });

    it("should detect gpt-4o-mini as OpenAI", async () => {
      await generateCompletion({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(mockAnthropicCreate).not.toHaveBeenCalled();
    });

    it("should detect o1 model as OpenAI", async () => {
      await generateCompletion({
        model: "o1",
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "o1",
        }),
      );
    });

    it("should detect o1-mini model as OpenAI", async () => {
      await generateCompletion({
        model: "o1-mini",
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockOpenAICreate).toHaveBeenCalled();
    });

    it("should support custom maxTokens for OpenAI", async () => {
      await generateCompletion({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        maxTokens: 16000,
      });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 16000,
        }),
      );
    });

    it("should support custom temperature for OpenAI", async () => {
      await generateCompletion({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        temperature: 1.0,
      });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 1.0,
        }),
      );
    });

    it("should pass additional options to OpenAI", async () => {
      await generateCompletion({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        options: {
          top_p: 0.95,
          frequency_penalty: 0.5,
        },
      });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          top_p: 0.95,
          frequency_penalty: 0.5,
        }),
      );
    });

    it("should throw error when OPENAI_API_KEY not set", async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(
        generateCompletion({
          model: "gpt-4o",
          messages: [{ role: "user", content: "Test" }],
        }),
      ).rejects.toThrow("OPENAI_API_KEY not configured");
    });

    it("should handle OpenAI API errors", async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error("insufficient_quota"));

      await expect(
        generateCompletion({
          model: "gpt-4o",
          messages: [{ role: "user", content: "Test" }],
        }),
      ).rejects.toThrow("AI API error (openai/gpt-4o)");
    });
  });

  // ============================================
  // Provider Detection
  // ============================================

  describe("Provider detection", () => {
    it("should detect claude- prefix as Anthropic", async () => {
      await generateCompletion({
        model: "claude-custom-model",
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockAnthropicCreate).toHaveBeenCalled();
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });

    it("should detect gpt- prefix as OpenAI", async () => {
      await generateCompletion({
        model: "gpt-5-turbo",
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockOpenAICreate).toHaveBeenCalled();
      expect(mockAnthropicCreate).not.toHaveBeenCalled();
    });

    it("should throw error for unknown model format", async () => {
      await expect(
        generateCompletion({
          model: "unknown-model-123",
          messages: [{ role: "user", content: "Test" }],
        }),
      ).rejects.toThrow("Unknown model format: unknown-model-123");
    });

    it("should default to Anthropic when no model specified", async () => {
      delete process.env.CLAUDE_MODEL;

      await generateCompletion({
        messages: [{ role: "user", content: "Test" }],
      });

      expect(mockAnthropicCreate).toHaveBeenCalled();
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // validateApiKeys()
  // ============================================

  describe("validateApiKeys()", () => {
    it("should return valid when both API keys are set", () => {
      process.env.ANTHROPIC_API_KEY = "test-key-1";
      process.env.OPENAI_API_KEY = "test-key-2";

      const result = validateApiKeys();

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it("should return error when ANTHROPIC_API_KEY is missing", () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      const result = validateApiKeys();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("ANTHROPIC_API_KEY not configured");
      expect(result.errors.length).toBe(1);
    });

    it("should return error when OPENAI_API_KEY is missing", () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      delete process.env.OPENAI_API_KEY;

      const result = validateApiKeys();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OPENAI_API_KEY not configured");
      expect(result.errors.length).toBe(1);
    });

    it("should return both errors when both API keys are missing", () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = validateApiKeys();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("ANTHROPIC_API_KEY not configured");
      expect(result.errors).toContain("OPENAI_API_KEY not configured");
      expect(result.errors.length).toBe(2);
    });

    it("should handle empty string API keys as missing", () => {
      process.env.ANTHROPIC_API_KEY = "";
      process.env.OPENAI_API_KEY = "";

      const result = validateApiKeys();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  // ============================================
  // Message Format
  // ============================================

  describe("Message format handling", () => {
    it("should handle single message", async () => {
      await generateCompletion({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Hello" }],
        }),
      );
    });

    it("should handle conversation with multiple messages", async () => {
      const messages = [
        { role: "user", content: "What is 2+2?" },
        { role: "assistant", content: "4" },
        { role: "user", content: "And 3+3?" },
      ];

      await generateCompletion({
        model: "gpt-4o",
        messages,
      });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
        }),
      );
    });

    it("should handle system messages in options for Anthropic", async () => {
      await generateCompletion({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Test" }],
        options: {
          system: "You are a code expert",
        },
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are a code expert",
        }),
      );
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe("Edge cases", () => {
    it("should handle zero maxTokens", async () => {
      await generateCompletion({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Test" }],
        maxTokens: 0,
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 0,
        }),
      );
    });

    it("should handle very large maxTokens", async () => {
      await generateCompletion({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        maxTokens: 128000,
      });

      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 128000,
        }),
      );
    });

    it("should handle temperature of 0", async () => {
      await generateCompletion({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0,
      });

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0,
        }),
      );
    });

    it("should handle empty options object", async () => {
      await generateCompletion({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        options: {},
      });

      expect(mockOpenAICreate).toHaveBeenCalled();
    });

    it("should handle API keys with trailing newlines", () => {
      // The SDK initialization trims API keys, so this should work
      process.env.ANTHROPIC_API_KEY = "test-key\n";
      process.env.OPENAI_API_KEY = "test-key\n  ";

      const result = validateApiKeys();

      // Keys exist (even with whitespace), so validation passes
      expect(result.valid).toBe(true);
    });
  });
});
