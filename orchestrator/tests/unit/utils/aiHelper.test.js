import { jest } from "@jest/globals";

describe("aiHelper", () => {
  let callClaude, mockAnthropicInstance;

  beforeEach(async () => {
    // Reset modules before each test
    jest.resetModules();

    // Setup mock Anthropic instance
    mockAnthropicInstance = {
      messages: {
        create: jest.fn(),
      },
    };

    // Mock the Anthropic SDK module
    await jest.unstable_mockModule("@anthropic-ai/sdk", () => ({
      default: jest.fn(() => mockAnthropicInstance),
    }));

    // Import after mocking
    const aiHelper = await import("../../../src/utils/aiHelper.js");
    callClaude = aiHelper.callClaude;

    // Set test environment
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  afterEach(() => {
    delete process.env.CLAUDE_MODEL;
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe("callClaude", () => {
    it("should call Claude API with default model", async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Test response" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      const result = await callClaude("Test prompt");

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: "Test prompt" }],
      });
      expect(result).toBe("Test response");
    });

    it("should use custom model when provided", async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      await callClaude("Prompt", "claude-opus-4-5-20251101", 8000);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-opus-4-5-20251101",
          max_tokens: 8000,
        }),
      );
    });

    it("should use CLAUDE_MODEL env var when no model provided", async () => {
      process.env.CLAUDE_MODEL = "claude-opus-4-5-20251101";

      // Re-import to pick up env var
      jest.resetModules();
      await jest.unstable_mockModule("@anthropic-ai/sdk", () => ({
        default: jest.fn(() => mockAnthropicInstance),
      }));
      const aiHelper = await import("../../../src/utils/aiHelper.js");

      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      await aiHelper.callClaude("Prompt");

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: "claude-opus-4-5-20251101" }),
      );
    });

    it("should prioritize explicit model over env var", async () => {
      process.env.CLAUDE_MODEL = "claude-opus-4-5-20251101";

      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      await callClaude("Prompt", "claude-sonnet-4-20250514");

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: "claude-sonnet-4-20250514" }),
      );
    });

    it("should use custom max_tokens when provided", async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      await callClaude("Prompt", null, 8192);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 8192 }),
      );
    });

    it("should throw error when API key not configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(callClaude("Prompt")).rejects.toThrow(
        "ANTHROPIC_API_KEY not configured",
      );
    });

    it("should not call API when API key missing", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      try {
        await callClaude("Prompt");
      } catch (error) {
        // Expected error
      }

      expect(mockAnthropicInstance.messages.create).not.toHaveBeenCalled();
    });

    it("should handle API errors correctly", async () => {
      mockAnthropicInstance.messages.create.mockRejectedValueOnce(
        new Error('404 {"error":{"message":"model: invalid-model"}}'),
      );

      await expect(callClaude("Prompt", "invalid-model")).rejects.toThrow(
        "AI API error",
      );
    });

    it("should wrap API error messages", async () => {
      mockAnthropicInstance.messages.create.mockRejectedValueOnce(
        new Error("Rate limit exceeded"),
      );

      try {
        await callClaude("Prompt");
        fail("Should have thrown error");
      } catch (error) {
        expect(error.message).toContain("AI API error");
        expect(error.message).toContain("Rate limit exceeded");
      }
    });

    it("should handle network timeouts", async () => {
      mockAnthropicInstance.messages.create.mockRejectedValueOnce(
        new Error("ETIMEDOUT"),
      );

      await expect(callClaude("Prompt")).rejects.toThrow("AI API error");
    });

    it("should handle response with multiple content blocks", async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "First block" }, { text: "Second block" }],
        usage: { input_tokens: 10, output_tokens: 40 },
      });

      const result = await callClaude("Prompt");

      // Should return first content block
      expect(result).toBe("First block");
    });

    it("should pass prompt correctly", async () => {
      const longPrompt = "A".repeat(1000);

      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 500, output_tokens: 20 },
      });

      await callClaude(longPrompt);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: longPrompt }],
        }),
      );
    });

    it("should handle empty prompt", async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 1, output_tokens: 20 },
      });

      const result = await callClaude("");

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "" }],
        }),
      );
      expect(result).toBe("Response");
    });

    it("should handle model parameter as null", async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      await callClaude("Prompt", null);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: "claude-sonnet-4-20250514" }),
      );
    });

    it("should handle model parameter as undefined", async () => {
      mockAnthropicInstance.messages.create.mockResolvedValueOnce({
        content: [{ text: "Response" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      });

      await callClaude("Prompt", undefined);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: "claude-sonnet-4-20250514" }),
      );
    });

    it("should handle concurrent calls", async () => {
      mockAnthropicInstance.messages.create
        .mockResolvedValueOnce({
          content: [{ text: "Response 1" }],
          usage: { input_tokens: 10, output_tokens: 20 },
        })
        .mockResolvedValueOnce({
          content: [{ text: "Response 2" }],
          usage: { input_tokens: 10, output_tokens: 20 },
        })
        .mockResolvedValueOnce({
          content: [{ text: "Response 3" }],
          usage: { input_tokens: 10, output_tokens: 20 },
        });

      const results = await Promise.all([
        callClaude("Prompt 1"),
        callClaude("Prompt 2"),
        callClaude("Prompt 3"),
      ]);

      expect(results).toEqual(["Response 1", "Response 2", "Response 3"]);
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(3);
    });
  });
});
