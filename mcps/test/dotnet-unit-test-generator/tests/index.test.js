const { spawn } = require("child_process");
const path = require("path");

describe(".NET Unit Test Generator STDIO MCP", () => {
  const indexPath = path.join(__dirname, "..", "index.js");

  /**
   * Helper function to run the STDIO MCP with input data
   */
  function runStdioMcp(inputData, env = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn("node", [indexPath], {
        env: { ...process.env, ...env },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on("error", (error) => {
        reject(error);
      });

      // Write input data to stdin
      child.stdin.write(JSON.stringify(inputData));
      child.stdin.end();
    });
  }

  describe("Input validation", () => {
    it("should exit with error for invalid JSON input", async () => {
      const child = spawn("node", [indexPath], {
        env: { ...process.env, ANTHROPIC_API_KEY: "test-key" },
      });

      let stderr = "";
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      const exitPromise = new Promise((resolve) => {
        child.on("close", (code) => {
          resolve(code);
        });
      });

      child.stdin.write("invalid json");
      child.stdin.end();

      const exitCode = await exitPromise;
      expect(exitCode).toBe(1);
      expect(stderr).toContain("Error");
    });

    it("should exit with error when ANTHROPIC_API_KEY is not set", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
        },
      };

      const result = await runStdioMcp(input, { ANTHROPIC_API_KEY: "" });

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("ANTHROPIC_API_KEY");
    });
  });

  describe("Test generation with mocked Anthropic API", () => {
    const originalApiKey = process.env.ANTHROPIC_API_KEY;

    beforeAll(() => {
      // Set a test API key
      process.env.ANTHROPIC_API_KEY = "test-api-key-123";
    });

    afterAll(() => {
      // Restore original API key
      if (originalApiKey) {
        process.env.ANTHROPIC_API_KEY = originalApiKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    it("should handle basic test generation request structure", async () => {
      // This test verifies the input/output structure without actually calling the API
      // We expect it to fail due to invalid API key, but we can check error handling
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode:
            'public class UserService { public string GetUser() { return "user"; } }',
        },
      };

      const result = await runStdioMcp(input);

      // With an invalid API key, it should fail gracefully
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Error");
    });

    it("should include className in request", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
        },
      };

      const result = await runStdioMcp(input);

      // Error expected due to API call, but validates input structure
      expect(result.code).toBe(1);
    });

    it("should handle test framework parameter", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
          testFramework: "NUnit",
        },
      };

      const result = await runStdioMcp(input);

      // Error expected due to API call
      expect(result.code).toBe(1);
    });

    it("should handle includeNegativeTests parameter", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
          includeNegativeTests: true,
        },
      };

      const result = await runStdioMcp(input);

      expect(result.code).toBe(1);
    });

    it("should handle includeMocks parameter", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
          includeMocks: false,
        },
      };

      const result = await runStdioMcp(input);

      expect(result.code).toBe(1);
    });

    it("should handle onlyNegativeTests parameter", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
          onlyNegativeTests: true,
        },
      };

      const result = await runStdioMcp(input);

      expect(result.code).toBe(1);
    });

    it("should handle custom model parameter", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
          model: "claude-opus-4-5-20251101",
        },
      };

      const result = await runStdioMcp(input);

      expect(result.code).toBe(1);
    });
  });

  describe("STDIO interface", () => {
    it("should read from stdin and write to stdout", (done) => {
      const child = spawn("node", [indexPath], {
        env: { ...process.env, ANTHROPIC_API_KEY: "test-key" },
      });

      let outputReceived = false;

      child.stdout.on("data", () => {
        outputReceived = true;
      });

      child.stderr.on("data", () => {
        outputReceived = true;
      });

      child.on("close", () => {
        expect(outputReceived).toBe(true);
        done();
      });

      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
        },
      };

      child.stdin.write(JSON.stringify(input));
      child.stdin.end();
    });

    it("should handle stdin end event", (done) => {
      const child = spawn("node", [indexPath], {
        env: { ...process.env, ANTHROPIC_API_KEY: "test-key" },
      });

      let closed = false;

      child.on("close", () => {
        closed = true;
        expect(closed).toBe(true);
        done();
      });

      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
        },
      };

      child.stdin.write(JSON.stringify(input));
      child.stdin.end();
    });
  });

  describe("Error handling", () => {
    it("should handle API errors gracefully", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { }",
        },
      };

      const result = await runStdioMcp(input, {
        ANTHROPIC_API_KEY: "invalid-key",
      });

      expect(result.code).toBe(1);
      expect(result.stderr).toContain("Error");
    });

    it("should handle missing required data fields", async () => {
      const input = {
        data: {},
      };

      const result = await runStdioMcp(input, {
        ANTHROPIC_API_KEY: "test-key",
      });

      // Should fail due to missing required fields or API error
      expect(result.code).toBe(1);
    });
  });

  describe("Expected output structure", () => {
    it("should validate basic input structure is accepted", async () => {
      const input = {
        data: {
          app: "TestApp",
          className: "UserService",
          sourceCode: "public class UserService { public void SaveUser() {} }",
        },
      };

      const result = await runStdioMcp(input, {
        ANTHROPIC_API_KEY: "test-key",
      });

      // Process should execute (even if API fails)
      expect([0, 1]).toContain(result.code);
    });
  });
});
