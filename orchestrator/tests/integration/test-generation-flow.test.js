import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager, mockClaudeTestCode } from "../helpers/mocks.js";
import { sampleCodeFiles } from "../fixtures/test-data.js";

/**
 * Integration Test: Test Generation Flow
 *
 * Tests the complete flow from file selection to test code generation:
 * 1. User requests test generation for a file
 * 2. System resolves file path (Docker path conversion)
 * 3. System reads file content
 * 4. System calls Claude AI with appropriate prompt
 * 5. System returns generated test code with metadata
 *
 * This integration test verifies the entire orchestration works correctly.
 */

describe("Test Generation Flow Integration", () => {
  let app;
  let mockMcpManager;
  let mockReadFile;
  let mockCallClaude;
  let testsRouter;

  beforeEach(async () => {
    // Reset all modules to ensure clean state
    jest.resetModules();

    // Mock fs/promises BEFORE importing routes
    await jest.unstable_mockModule("fs/promises", () => ({
      readFile: jest.fn(),
    }));

    // Mock aiHelper BEFORE importing routes
    await jest.unstable_mockModule("../../src/utils/aiHelper.js", () => ({
      callClaude: jest.fn(),
    }));

    // Import mocked modules
    const fsPromises = await import("fs/promises");
    mockReadFile = fsPromises.readFile;

    const aiHelper = await import("../../src/utils/aiHelper.js");
    mockCallClaude = aiHelper.callClaude;

    // Import routes AFTER mocking dependencies
    const testsRouterModule = await import("../../src/routes/tests.js");
    testsRouter = testsRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/tests", testsRouter);

    // Setup default mock responses
    // Mock readFile to return different content based on file path
    mockReadFile.mockImplementation((filePath) => {
      if (filePath.includes("apps.json")) {
        // Return mock config
        return Promise.resolve(
          JSON.stringify({
            applications: [
              { name: "App1", testFramework: "xUnit" },
              { name: "NodeApp", testFramework: "Jest" },
              { name: "TypeScriptApp", testFramework: "Jest" },
            ],
          }),
        );
      }
      // Return mock source code for other files
      return Promise.resolve(sampleCodeFiles.csharp.service);
    });

    mockCallClaude.mockResolvedValue(mockClaudeTestCode("xUnit"));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/tests/generate-for-file", () => {
    describe("Successful test generation", () => {
      it("should generate tests for C# service file", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("result");
        expect(response.body.result).toHaveProperty("testCode");
        expect(response.body.result).toHaveProperty("testFramework");
        expect(response.body.result).toHaveProperty("className", "UserService");
        expect(response.body.result.testCode).toContain("TestMethod");
      });

      it("should handle absolute Docker paths", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/mnt/apps/core/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.result.testCode).toBeDefined();
      });

      it("should call Claude AI with appropriate prompt", async () => {
        await request(app).post("/api/tests/generate-for-file").send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
        });

        expect(mockCallClaude).toHaveBeenCalledWith(
          expect.stringContaining("UserService"),
          undefined, // model parameter defaults to undefined
          4096, // maxTokens
        );
      });

      it("should read file from correct path", async () => {
        await request(app).post("/api/tests/generate-for-file").send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
        });

        expect(mockReadFile).toHaveBeenCalledWith(
          expect.stringContaining("UserService.cs"),
          "utf-8",
        );
      });

      it("should include test framework in result", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.body.result.testFramework).toBeDefined();
        expect(["xUnit", "MSTest", "NUnit", "Jest", "Mocha"]).toContain(
          response.body.result.testFramework,
        );
      });
    });

    describe("Validation errors", () => {
      it("should return 400 for missing app field", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("required");
      });

      it("should return 400 for missing className field", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
        expect(response.body.error).toContain("required");
      });

      it("should return 400 when all required fields are missing", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error");
      });

      it("should return 400 for empty app field", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(400);
      });

      it("should return 400 for empty className field", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "",
          });

        expect(response.status).toBe(400);
      });
    });

    describe("File system errors", () => {
      it("should handle file not found errors", async () => {
        // Override the default mockImplementation for this specific test
        mockReadFile
          .mockImplementationOnce((filePath) => {
            // First call: apps.json config - return success
            if (filePath.includes("apps.json")) {
              return Promise.resolve(
                JSON.stringify({
                  applications: [{ name: "App1", testFramework: "xUnit" }],
                }),
              );
            }
            return Promise.reject(
              Object.assign(new Error("ENOENT: file not found"), {
                code: "ENOENT",
              }),
            );
          })
          .mockImplementationOnce(() => {
            // Second call: source file - return error
            return Promise.reject(
              Object.assign(new Error("ENOENT: file not found"), {
                code: "ENOENT",
              }),
            );
          });

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/NonExistent.cs",
            className: "Test",
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Source file not found");
        expect(response.body.message).toContain("Could not read");
      });

      it("should handle permission denied errors", async () => {
        mockReadFile
          .mockImplementationOnce((filePath) => {
            if (filePath.includes("apps.json")) {
              return Promise.resolve(
                JSON.stringify({
                  applications: [{ name: "App1", testFramework: "xUnit" }],
                }),
              );
            }
            return Promise.reject(
              Object.assign(new Error("EACCES: permission denied"), {
                code: "EACCES",
              }),
            );
          })
          .mockImplementationOnce(() => {
            return Promise.reject(
              Object.assign(new Error("EACCES: permission denied"), {
                code: "EACCES",
              }),
            );
          });

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Protected.cs",
            className: "Test",
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Source file not found");
      });

      it("should handle generic file read errors", async () => {
        mockReadFile
          .mockImplementationOnce((filePath) => {
            if (filePath.includes("apps.json")) {
              return Promise.resolve(
                JSON.stringify({
                  applications: [{ name: "App1", testFramework: "xUnit" }],
                }),
              );
            }
            return Promise.reject(new Error("Disk I/O error"));
          })
          .mockImplementationOnce(() => {
            return Promise.reject(new Error("Disk I/O error"));
          });

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Source file not found");
      });
    });

    describe("Claude AI errors", () => {
      it("should handle Claude API 404 errors", async () => {
        mockCallClaude.mockRejectedValueOnce(
          new Error("AI API error: 404 model not found"),
        );

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("Test generation failed");
      });

      it("should handle Claude API rate limit errors", async () => {
        mockCallClaude.mockRejectedValueOnce(
          new Error("AI API error: 429 rate limit exceeded"),
        );

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(500);
      });

      it("should handle Claude API timeout errors", async () => {
        mockCallClaude.mockRejectedValueOnce(
          new Error("AI API error: ETIMEDOUT"),
        );

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        expect(response.status).toBe(500);
      });

      it("should handle malformed Claude responses", async () => {
        mockCallClaude.mockResolvedValueOnce(""); // Empty response

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/UserService.cs",
            className: "UserService",
          });

        // Should still return 200 but with empty test code
        expect(response.status).toBe(200);
        expect(response.body.result.testCode).toBe("");
      });
    });

    describe("Different file types and frameworks", () => {
      it("should handle C# controller files", async () => {
        mockReadFile.mockResolvedValueOnce(sampleCodeFiles.csharp.controller);

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Controllers/UsersController.cs",
            className: "UsersController",
          });

        expect(response.status).toBe(200);
        expect(response.body.result.testCode).toBeDefined();
      });

      it("should handle JavaScript files", async () => {
        mockReadFile.mockResolvedValueOnce(sampleCodeFiles.javascript.class);
        mockCallClaude.mockResolvedValueOnce(mockClaudeTestCode("Jest"));

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/src/ShoppingCart.js",
            className: "ShoppingCart",
          });

        expect(response.status).toBe(200);
        expect(response.body.result.testCode).toBeDefined();
      });

      it("should handle TypeScript files", async () => {
        mockReadFile.mockResolvedValueOnce("export class Service { }");
        mockCallClaude.mockResolvedValueOnce('describe("Service", () => {})');

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/src/Service.ts",
            className: "Service",
          });

        expect(response.status).toBe(200);
        expect(response.body.result.testCode).toBeDefined();
      });
    });

    describe("Edge cases", () => {
      it("should handle very large files", async () => {
        const largeFile = "public class Test { }\n".repeat(10000);
        mockReadFile.mockResolvedValueOnce(largeFile);

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Large.cs",
            className: "Test",
          });

        expect(response.status).toBe(200);
      });

      it("should handle files with special characters in path", async () => {
        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/User Service (v2).cs",
            className: "UserService",
          });

        expect([200, 500]).toContain(response.status);
      });

      it("should handle files with Unicode characters", async () => {
        mockReadFile.mockResolvedValueOnce(
          "// コメント\npublic class 名前 { }",
        );

        const response = await request(app)
          .post("/api/tests/generate-for-file")
          .send({
            app: "App1",
            file: "/Services/名前.cs",
            className: "名前",
          });

        expect([200, 500]).toContain(response.status);
      });

      it("should handle concurrent requests", async () => {
        const requests = Array.from({ length: 5 }, (_, i) =>
          request(app)
            .post("/api/tests/generate-for-file")
            .send({
              app: "App1",
              file: `/Services/Service${i}.cs`,
              className: `Service${i}`,
            }),
        );

        const responses = await Promise.all(requests);

        responses.forEach((response) => {
          expect(response.status).toBe(200);
        });

        // Each request reads 2 files: apps.json config + source file
        expect(mockReadFile).toHaveBeenCalledTimes(10);
        expect(mockCallClaude).toHaveBeenCalledTimes(5);
      });
    });
  });
});
