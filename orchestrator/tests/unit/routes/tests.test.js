import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// Mock dependencies BEFORE importing the router
const mockReadFile = jest.fn();
const mockCallClaude = jest.fn();

jest.unstable_mockModule("fs/promises", () => ({
  readFile: mockReadFile,
}));

jest.unstable_mockModule("../../../src/utils/aiHelper.js", () => ({
  callClaude: mockCallClaude,
}));

// Import router after mocking
const { default: testsRouter } = await import("../../../src/routes/tests.js");

describe("Tests Route", () => {
  let app;
  let mockMcpManager;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock MCP manager
    mockMcpManager = {
      callDockerMcp: jest.fn(),
      callStdioMcp: jest.fn(),
    };

    // Add mcpManager to request
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/tests", testsRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock for apps.json
    mockReadFile.mockImplementation((path) => {
      if (path.includes("apps.json")) {
        return Promise.resolve(
          JSON.stringify({
            applications: [
              { name: "App1", testFramework: "xUnit" },
              { name: "PreCare", testFramework: "MSTest" },
              { name: "TestApp", testFramework: "NUnit" },
            ],
          }),
        );
      }
      // Default: return sample C# code
      return Promise.resolve(`
public class UserService
{
    public User GetUser(int id)
    {
        return new User { Id = id };
    }
}
`);
    });

    // Setup default Claude response
    mockCallClaude.mockResolvedValue(`
using Xunit;

public class UserServiceTests
{
    [Fact]
    public void GetUser_ValidId_ReturnsUser()
    {
        // Arrange
        var service = new UserService();

        // Act
        var result = service.GetUser(1);

        // Assert
        Assert.NotNull(result);
    }
}
`);
  });

  // ============================================
  // POST /analyze-file
  // ============================================

  describe("POST /analyze-file", () => {
    beforeEach(() => {
      // Mock code analyzer response
      // eslint-disable-next-line no-unused-vars
      mockMcpManager.callDockerMcp.mockImplementation(
        (mcpName, endpoint, data) => {
          if (mcpName === "dotnetCodeAnalyzer") {
            return Promise.resolve({
              analysis: {
                classes: [
                  {
                    name: "UserService",
                    file: "/Services/UserService.cs",
                    methods: [
                      {
                        name: "GetUser",
                        className: "UserService",
                        complexity: 3,
                        attributes: [],
                        calls: [],
                      },
                    ],
                  },
                ],
                methods: [
                  {
                    name: "GetUser",
                    file: "/Services/UserService.cs",
                    className: "UserService",
                    complexity: 3,
                    calls: [],
                  },
                ],
              },
            });
          }

          if (mcpName === "dotnetCoverageAnalyzer") {
            return Promise.resolve({
              coverage: {
                methods: [
                  {
                    name: "GetUser",
                    file: "/Services/UserService.cs",
                    coverage: 0,
                  },
                ],
              },
            });
          }

          return Promise.resolve({});
        },
      );
    });

    it("should analyze file and return test needs", async () => {
      const response = await request(app).post("/api/tests/analyze-file").send({
        app: "App1",
        file: "/Services/UserService.cs",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.file).toBe("UserService.cs");
      expect(response.body.analysis).toBeDefined();
      expect(response.body.analysis.needsUnitTests).toBe(true);
      expect(response.body.analysis.classCount).toBe(1);
      expect(response.body.analysis.methodCount).toBe(1);
    });

    it("should return 400 if app is missing", async () => {
      const response = await request(app)
        .post("/api/tests/analyze-file")
        .send({ file: "/Services/UserService.cs" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("App and file are required");
    });

    it("should return 400 if file is missing", async () => {
      const response = await request(app)
        .post("/api/tests/analyze-file")
        .send({ app: "App1" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("App and file are required");
    });

    it("should detect controllers", async () => {
      mockMcpManager.callDockerMcp.mockImplementation((mcpName) => {
        if (mcpName === "dotnetCodeAnalyzer") {
          return Promise.resolve({
            analysis: {
              classes: [
                {
                  name: "UsersController",
                  file: "/Controllers/UsersController.cs",
                  methods: [
                    {
                      name: "GetUser",
                      attributes: ["HttpGet", 'Route("api/users/{id}")'],
                    },
                  ],
                },
              ],
              methods: [],
            },
          });
        }
        return Promise.resolve({ coverage: { methods: [] } });
      });

      const response = await request(app).post("/api/tests/analyze-file").send({
        app: "App1",
        file: "/Controllers/UsersController.cs",
      });

      expect(response.status).toBe(200);
      expect(response.body.analysis.isController).toBe(true);
      expect(response.body.analysis.hasApiEndpoints).toBe(true);
      expect(response.body.analysis.needsIntegrationTests).toBe(true);
    });

    it("should detect services", async () => {
      const response = await request(app).post("/api/tests/analyze-file").send({
        app: "App1",
        file: "/Services/UserService.cs",
      });

      expect(response.status).toBe(200);
      expect(response.body.analysis.isService).toBe(true);
    });

    it("should detect integration points", async () => {
      mockMcpManager.callDockerMcp.mockImplementation((mcpName) => {
        if (mcpName === "dotnetCodeAnalyzer") {
          return Promise.resolve({
            analysis: {
              classes: [],
              methods: [
                {
                  name: "SaveUser",
                  file: "/Services/UserService.cs",
                  calls: ["EpicService.CreatePatient", "UserRepository.Save"],
                },
              ],
            },
          });
        }
        return Promise.resolve({ coverage: { methods: [] } });
      });

      const response = await request(app).post("/api/tests/analyze-file").send({
        app: "App1",
        file: "/Services/UserService.cs",
      });

      expect(response.status).toBe(200);
      expect(response.body.analysis.hasIntegrationPoints).toBe(true);
      expect(response.body.analysis.needsIntegrationTests).toBe(true);
    });

    it("should detect test files", async () => {
      mockMcpManager.callDockerMcp.mockImplementation(() => {
        return Promise.resolve({
          analysis: { classes: [], methods: [] },
          coverage: { methods: [] },
        });
      });

      const response = await request(app).post("/api/tests/analyze-file").send({
        app: "App1",
        file: "/Tests/UserServiceTests.cs",
      });

      expect(response.status).toBe(200);
      expect(response.body.analysis.isTestFile).toBe(true);
      expect(response.body.analysis.needsUnitTests).toBe(false);
    });

    it("should handle MCP errors gracefully", async () => {
      mockMcpManager.callDockerMcp.mockRejectedValueOnce(
        new Error("MCP connection failed"),
      );

      const response = await request(app).post("/api/tests/analyze-file").send({
        app: "App1",
        file: "/Services/UserService.cs",
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("File analysis failed");
    });

    it("should extract endpoints from controllers", async () => {
      mockMcpManager.callDockerMcp.mockImplementation((mcpName) => {
        if (mcpName === "dotnetCodeAnalyzer") {
          return Promise.resolve({
            analysis: {
              classes: [
                {
                  name: "UsersController",
                  file: "/Controllers/UsersController.cs",
                  attributes: ['Route("api/users")'],
                  methods: [
                    {
                      name: "GetUser",
                      attributes: ["HttpGet", 'Route("{id}")'],
                    },
                    {
                      name: "CreateUser",
                      attributes: ["HttpPost"],
                    },
                  ],
                },
              ],
              methods: [],
            },
          });
        }
        return Promise.resolve({ coverage: { methods: [] } });
      });

      const response = await request(app).post("/api/tests/analyze-file").send({
        app: "App1",
        file: "/Controllers/UsersController.cs",
      });

      expect(response.status).toBe(200);
      expect(response.body.analysis.endpoints).toBeDefined();
      expect(response.body.analysis.endpoints.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // POST /generate-for-file
  // ============================================

  describe("POST /generate-for-file", () => {
    it("should generate tests for a class successfully", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.className).toBe("UserService");
      expect(response.body.result.testFramework).toBe("xUnit");
      expect(response.body.result.testCode).toBeDefined();
      expect(response.body.result.testCode).toContain("UserServiceTests");

      // Verify file was read
      expect(mockReadFile).toHaveBeenCalledWith(
        "/mnt/apps/core/Services/UserService.cs",
        "utf-8",
      );

      // Verify Claude was called
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.stringContaining("Generate comprehensive unit tests"),
        undefined,
        4096,
      );
    });

    it("should use correct test framework from apps.json", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "PreCare",
          file: "/mnt/apps/patient-portal/PatientPortal/Services/UserService.cs",
          className: "UserService",
        });

      expect(response.status).toBe(200);
      expect(response.body.result.testFramework).toBe("MSTest");

      // Verify Claude prompt includes MSTest
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.stringContaining("MSTest"),
        undefined,
        4096,
      );
    });

    it("should handle absolute Docker paths", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "PreCare",
          file: "/mnt/apps/patient-portal/PatientPortal/Services/UserService.cs",
          className: "UserService",
        });

      expect(response.status).toBe(200);

      // Verify absolute path was used directly
      expect(mockReadFile).toHaveBeenCalledWith(
        "/mnt/apps/patient-portal/PatientPortal/Services/UserService.cs",
        "utf-8",
      );
    });

    it("should return 400 if app is missing", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          file: "/Services/UserService.cs",
          className: "UserService",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("App and className are required");
    });

    it("should return 400 if className is missing", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("App and className are required");
    });

    it("should return 404 if source file not found", async () => {
      mockReadFile.mockImplementation((path) => {
        if (path.includes("apps.json")) {
          return Promise.resolve(
            JSON.stringify({
              applications: [{ name: "App1", testFramework: "xUnit" }],
            }),
          );
        }
        return Promise.reject(new Error("ENOENT: no such file or directory"));
      });

      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/NonExistent.cs",
          className: "NonExistent",
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Source file not found");
      expect(response.body.resolvedPath).toBeDefined();
    });

    it("should handle Claude API errors", async () => {
      mockCallClaude.mockRejectedValueOnce(
        new Error("Claude API error: 429 rate limit exceeded"),
      );

      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Test generation failed");
      expect(response.body.message).toContain("Claude API error");
    });

    it("should support includeNegativeTests option", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
          includeNegativeTests: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.result.metadata.includeNegativeTests).toBe(true);

      // Verify prompt includes negative test instructions
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.stringContaining("Include negative test cases"),
        undefined,
        4096,
      );
    });

    it("should support onlyNegativeTests option", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
          onlyNegativeTests: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.result.metadata.onlyNegativeTests).toBe(true);

      // Verify prompt specifies negative tests only
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.stringContaining("ONLY generate tests for error scenarios"),
        undefined,
        4096,
      );
    });

    it("should support includeMocks option", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
          includeMocks: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.result.metadata.includeMocks).toBe(true);

      // Verify prompt includes mocking instructions
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.stringContaining("Use Moq for mocking"),
        undefined,
        4096,
      );
    });

    it("should support disabling mocks", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
          includeMocks: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.result.metadata.includeMocks).toBe(false);

      // Verify prompt excludes mocking
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.stringContaining("Do not use mocking frameworks"),
        undefined,
        4096,
      );
    });

    it("should support custom model parameter", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "App1",
          file: "/Services/UserService.cs",
          className: "UserService",
          model: "claude-opus-4-5-20251101",
        });

      expect(response.status).toBe(200);
      expect(response.body.result.metadata.model).toBe(
        "claude-opus-4-5-20251101",
      );

      // Verify custom model was passed to Claude
      expect(mockCallClaude).toHaveBeenCalledWith(
        expect.any(String),
        "claude-opus-4-5-20251101",
        4096,
      );
    });

    it("should use default test framework if app not found", async () => {
      const response = await request(app)
        .post("/api/tests/generate-for-file")
        .send({
          app: "UnknownApp",
          file: "/mnt/apps/unknown/Services/UserService.cs",
          className: "UserService",
        });

      expect(response.status).toBe(200);
      expect(response.body.result.testFramework).toBe("xUnit"); // Default
    });
  });

  // ============================================
  // POST /generate-integration-for-file
  // ============================================

  describe("POST /generate-integration-for-file", () => {
    beforeEach(() => {
      mockMcpManager.callStdioMcp.mockResolvedValue({
        result: {
          testCode: `
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public class UserIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task GetUser_ReturnsUser()
    {
        // Integration test
    }
}
`,
          metadata: {
            scenario: "Integration tests for /api/users",
            includeAuth: true,
            includeDatabase: true,
          },
        },
      });
    });

    it("should generate integration tests successfully", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({
          app: "App1",
          file: "/Controllers/UsersController.cs",
          apiEndpoint: "/api/users",
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.testCode).toContain("IntegrationTests");

      // Verify STDIO MCP was called
      expect(mockMcpManager.callStdioMcp).toHaveBeenCalledWith(
        "dotnet-integration-test-generator",
        expect.objectContaining({
          data: expect.objectContaining({
            app: "App1",
            apiEndpoint: "/api/users",
          }),
        }),
      );
    });

    it("should return 400 if app is missing", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({ apiEndpoint: "/api/users" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("App and apiEndpoint are required");
    });

    it("should return 400 if apiEndpoint is missing", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({ app: "App1" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("App and apiEndpoint are required");
    });

    it("should support scenario parameter", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({
          app: "App1",
          apiEndpoint: "/api/users",
          scenario: "Test user authentication flow",
        });

      expect(response.status).toBe(200);

      expect(mockMcpManager.callStdioMcp).toHaveBeenCalledWith(
        "dotnet-integration-test-generator",
        expect.objectContaining({
          data: expect.objectContaining({
            scenario: "Test user authentication flow",
          }),
        }),
      );
    });

    it("should support includeAuth parameter", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({
          app: "App1",
          apiEndpoint: "/api/users",
          includeAuth: true,
        });

      expect(response.status).toBe(200);

      expect(mockMcpManager.callStdioMcp).toHaveBeenCalledWith(
        "dotnet-integration-test-generator",
        expect.objectContaining({
          data: expect.objectContaining({
            includeAuth: true,
          }),
        }),
      );
    });

    it("should support includeDatabase parameter", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({
          app: "App1",
          apiEndpoint: "/api/users",
          includeDatabase: false,
        });

      expect(response.status).toBe(200);

      expect(mockMcpManager.callStdioMcp).toHaveBeenCalledWith(
        "dotnet-integration-test-generator",
        expect.objectContaining({
          data: expect.objectContaining({
            includeDatabase: false,
          }),
        }),
      );
    });

    it("should support custom model parameter", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({
          app: "App1",
          apiEndpoint: "/api/users",
          model: "claude-opus-4-5-20251101",
        });

      expect(response.status).toBe(200);

      expect(mockMcpManager.callStdioMcp).toHaveBeenCalledWith(
        "dotnet-integration-test-generator",
        expect.objectContaining({
          data: expect.objectContaining({
            model: "claude-opus-4-5-20251101",
          }),
        }),
      );
    });

    it("should use default scenario if not provided", async () => {
      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({
          app: "App1",
          apiEndpoint: "/api/users/123",
        });

      expect(response.status).toBe(200);

      expect(mockMcpManager.callStdioMcp).toHaveBeenCalledWith(
        "dotnet-integration-test-generator",
        expect.objectContaining({
          data: expect.objectContaining({
            scenario: "Integration tests for /api/users/123",
          }),
        }),
      );
    });

    it("should handle STDIO MCP errors gracefully", async () => {
      mockMcpManager.callStdioMcp.mockRejectedValueOnce(
        new Error("STDIO MCP timeout"),
      );

      const response = await request(app)
        .post("/api/tests/generate-integration-for-file")
        .send({
          app: "App1",
          apiEndpoint: "/api/users",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Integration test generation failed");
      expect(response.body.message).toContain("STDIO MCP timeout");
    });
  });
});
