import { jest } from "@jest/globals";

describe("MCPManager", () => {
  let MCPManager, mockAxios, mockSpawn;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Setup axios mock
    mockAxios = jest.fn();
    mockAxios.get = jest.fn();
    mockAxios.post = jest.fn();

    // Setup spawn mock
    mockSpawn = jest.fn();

    // Mock modules
    await jest.unstable_mockModule("axios", () => ({
      default: mockAxios,
    }));

    await jest.unstable_mockModule("child_process", () => ({
      spawn: mockSpawn,
    }));

    // Import after mocking
    const mcpManagerModule =
      await import("../../../src/services/mcpManager.js");
    MCPManager = mcpManagerModule.MCPManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialize", () => {
    it("should initialize and wait for MCPs", async () => {
      const mcpManager = new MCPManager();

      mockAxios.get = jest.fn().mockResolvedValue({ status: 200 });

      await mcpManager.initialize();

      expect(mcpManager.healthCheckInterval).toBeDefined();

      // Cleanup
      await mcpManager.shutdown();
    });
  });

  describe("constructor", () => {
    it("should initialize all MCP categories", () => {
      const mcpManager = new MCPManager();

      expect(mcpManager.integrationMcps).toBeDefined();
      expect(mcpManager.codeAnalysisMcps).toBeDefined();
      expect(mcpManager.qualityAnalysisMcps).toBeDefined();
      expect(mcpManager.playwrightMcps).toBeDefined();
      expect(Object.keys(mcpManager.dockerMcps).length).toBe(15);
    });

    it("should set all MCPs to unknown status", () => {
      const mcpManager = new MCPManager();

      Object.values(mcpManager.dockerMcps).forEach((mcp) => {
        expect(mcp.status).toBe("unknown");
      });
    });

    it("should initialize integration MCPs with correct ports", () => {
      const mcpManager = new MCPManager();

      expect(mcpManager.integrationMcps.azureDevOps.url).toBe(
        "http://azure-devops:8100",
      );
      expect(mcpManager.integrationMcps.thirdParty.url).toBe(
        "http://third-party:8101",
      );
      expect(mcpManager.integrationMcps.testPlanManager.url).toBe(
        "http://test-plan-manager:8102",
      );
      expect(mcpManager.integrationMcps.browserControl.url).toBe(
        "http://browser-control-mcp:8103",
      );
    });

    it("should initialize code analysis MCPs with correct ports", () => {
      const mcpManager = new MCPManager();

      expect(mcpManager.codeAnalysisMcps.dotnetCodeAnalyzer.url).toBe(
        "http://code-analyzer:8200",
      );
      expect(mcpManager.codeAnalysisMcps.dotnetCoverageAnalyzer.url).toBe(
        "http://coverage-analyzer:8201",
      );
    });

    it("should initialize playwright MCPs with correct ports", () => {
      const mcpManager = new MCPManager();

      expect(mcpManager.playwrightMcps.playwrightGenerator.url).toBe(
        "http://playwright-generator:8400",
      );
      expect(mcpManager.playwrightMcps.playwrightAnalyzer.url).toBe(
        "http://playwright-analyzer:8401",
      );
      expect(mcpManager.playwrightMcps.playwrightHealer.url).toBe(
        "http://playwright-healer:8402",
      );
    });

    it("should initialize dashboards", () => {
      const mcpManager = new MCPManager();

      expect(mcpManager.dashboards.adoDashboard).toBeDefined();
      expect(mcpManager.dashboards.codeDashboard).toBeDefined();
    });

    it("should initialize empty stdioMcps object", () => {
      const mcpManager = new MCPManager();

      expect(mcpManager.stdioMcps).toEqual({});
    });
  });

  describe("callDockerMcp", () => {
    it("should successfully call healthy MCP endpoint with POST", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      const mockResponse = { data: { result: "success" } };
      mockAxios.mockResolvedValueOnce(mockResponse);

      const result = await mcpManager.callDockerMcp(
        "azureDevOps",
        "/api/work-items",
        { query: "test" },
      );

      expect(mockAxios).toHaveBeenCalledWith({
        method: "POST",
        url: "http://azure-devops:8100/api/work-items",
        data: { query: "test" },
        timeout: 30000,
      });
      expect(result).toEqual({ result: "success" });
    });

    it("should successfully call healthy MCP endpoint with GET", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      const mockResponse = { data: { items: [] } };
      mockAxios.mockResolvedValueOnce(mockResponse);

      const result = await mcpManager.callDockerMcp(
        "azureDevOps",
        "/api/health",
        {},
        "GET",
      );

      expect(mockAxios).toHaveBeenCalledWith({
        method: "GET",
        url: "http://azure-devops:8100/api/health",
        timeout: 30000,
      });
      expect(result).toEqual({ items: [] });
    });

    it("should throw error for unknown MCP", async () => {
      const mcpManager = new MCPManager();

      await expect(
        mcpManager.callDockerMcp("unknownMcp", "/endpoint"),
      ).rejects.toThrow("Unknown MCP: unknownMcp");
    });

    it("should throw error for unhealthy MCP", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "unhealthy";

      await expect(
        mcpManager.callDockerMcp("azureDevOps", "/endpoint"),
      ).rejects.toThrow("MCP azureDevOps is not healthy (status: unhealthy)");
    });

    it("should throw error for MCP with unknown status", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "unknown";

      await expect(
        mcpManager.callDockerMcp("azureDevOps", "/endpoint"),
      ).rejects.toThrow("MCP azureDevOps is not healthy (status: unknown)");
    });

    it("should handle axios network errors", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      mockAxios.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        mcpManager.callDockerMcp("azureDevOps", "/endpoint"),
      ).rejects.toThrow("Network timeout");
    });
  });

  describe("waitForDockerMcps", () => {
    it("should wait for all MCPs to become healthy", async () => {
      const mcpManager = new MCPManager();

      mockAxios.get = jest.fn().mockResolvedValue({ status: 200 });

      await mcpManager.waitForDockerMcps(5000);

      Object.values(mcpManager.dockerMcps).forEach((mcp) => {
        expect(mcp.status).toBe("healthy");
      });
    });

    it("should timeout if MCPs do not become ready", async () => {
      const mcpManager = new MCPManager();

      mockAxios.get = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));

      await expect(mcpManager.waitForDockerMcps(1000)).rejects.toThrow(
        "Timeout waiting for Docker MCPs to be ready",
      );
    });
  });

  describe("checkDashboards", () => {
    it("should check all dashboards and mark available", async () => {
      const mcpManager = new MCPManager();

      mockAxios.get = jest.fn().mockResolvedValue({ status: 200 });

      await mcpManager.checkDashboards();

      expect(mcpManager.dashboards.adoDashboard.status).toBe("available");
      expect(mcpManager.dashboards.codeDashboard.status).toBe("available");
    });

    it("should mark dashboards as unavailable on error", async () => {
      const mcpManager = new MCPManager();

      mockAxios.get = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));

      await mcpManager.checkDashboards();

      expect(mcpManager.dashboards.adoDashboard.status).toBe("unavailable");
      expect(mcpManager.dashboards.codeDashboard.status).toBe("unavailable");
    });
  });

  describe("spawnStdioMcp", () => {
    it("should spawn child process with correct arguments", () => {
      const mcpManager = new MCPManager();

      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
      mockSpawn.mockReturnValueOnce(mockChild);

      // Note: command parameter is not actually used in implementation
      const child = mcpManager.spawnStdioMcp("testMcp", "command", [
        "arg1",
        "arg2",
      ]); // eslint-disable-line no-unused-vars

      expect(mockSpawn).toHaveBeenCalledWith(
        "node",
        ["/app/mcps/testMcp/index.js", "arg1", "arg2"],
        expect.objectContaining({
          stdio: ["pipe", "pipe", "pipe"],
          env: process.env,
        }),
      );
      expect(mcpManager.stdioMcps.testMcp).toBe(mockChild);
    });

    it("should setup stdout, stderr, and close listeners", () => {
      const mcpManager = new MCPManager();

      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
      mockSpawn.mockReturnValueOnce(mockChild);

      mcpManager.spawnStdioMcp("testMcp");

      expect(mockChild.stdout.on).toHaveBeenCalledWith(
        "data",
        expect.any(Function),
      );
      expect(mockChild.stderr.on).toHaveBeenCalledWith(
        "data",
        expect.any(Function),
      );
      expect(mockChild.on).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("should remove MCP from stdioMcps on close", () => {
      const mcpManager = new MCPManager();

      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
      mockSpawn.mockReturnValueOnce(mockChild);

      mcpManager.spawnStdioMcp("testMcp");

      // Get the close callback
      const closeCallback = mockChild.on.mock.calls.find(
        (call) => call[0] === "close",
      )[1];

      // Simulate child process closing
      closeCallback(0);

      expect(mcpManager.stdioMcps.testMcp).toBeUndefined();
    });
  });

  describe("callStdioMcp", () => {
    it("should send input and parse JSON output", async () => {
      const mcpManager = new MCPManager();

      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              // Immediately call callback with JSON data
              setImmediate(() =>
                callback(Buffer.from('{"result": "success"}')),
              );
            }
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            // Immediately call callback with exit code 0
            setImmediate(() => callback(0));
          }
        }),
        stdin: { write: jest.fn(), end: jest.fn() },
      };
      mockSpawn.mockReturnValueOnce(mockChild);

      const result = await mcpManager.callStdioMcp("testMcp", {
        command: "test",
      });

      expect(result).toEqual({ result: "success" });
      expect(mockChild.stdin.write).toHaveBeenCalledWith('{"command":"test"}');
      expect(mockChild.stdin.end).toHaveBeenCalled();
    });

    it("should handle non-JSON output", async () => {
      const mcpManager = new MCPManager();

      const mockChild = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              setImmediate(() => callback(Buffer.from("Plain text output")));
            }
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            setImmediate(() => callback(0));
          }
        }),
        stdin: { write: jest.fn(), end: jest.fn() },
      };
      mockSpawn.mockReturnValueOnce(mockChild);

      const result = await mcpManager.callStdioMcp("testMcp", {
        command: "test",
      });

      expect(result).toEqual({ raw: "Plain text output" });
    });

    it("should reject on non-zero exit code", async () => {
      const mcpManager = new MCPManager();

      const mockChild = {
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === "data") {
              setImmediate(() => callback(Buffer.from("Error occurred")));
            }
          }),
        },
        on: jest.fn((event, callback) => {
          if (event === "close") {
            setImmediate(() => callback(1));
          }
        }),
        stdin: { write: jest.fn(), end: jest.fn() },
      };
      mockSpawn.mockReturnValueOnce(mockChild);

      await expect(
        mcpManager.callStdioMcp("testMcp", { command: "test" }),
      ).rejects.toThrow("MCP exited with code 1: Error occurred");
    });
  });

  describe("getStatus", () => {
    it("should return aggregated status for all MCPs", () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";
      mcpManager.dockerMcps.dotnetCodeAnalyzer.status = "healthy";
      mcpManager.dashboards.adoDashboard.status = "available";

      const status = mcpManager.getStatus();

      expect(status).toHaveProperty("integration");
      expect(status).toHaveProperty("codeAnalysis");
      expect(status).toHaveProperty("qualityAnalysis");
      expect(status).toHaveProperty("playwright");
      expect(status).toHaveProperty("dashboards");
      expect(status).toHaveProperty("stdioMcps");
      expect(status).toHaveProperty("summary");
    });

    it("should count healthy MCPs correctly", () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";
      mcpManager.dockerMcps.dotnetCodeAnalyzer.status = "healthy";
      mcpManager.dockerMcps.thirdParty.status = "unhealthy";

      const status = mcpManager.getStatus();

      expect(status.summary.mcpsHealthy).toBe(2);
      expect(status.summary.mcpsTotal).toBe(15);
    });

    it("should count available dashboards correctly", () => {
      const mcpManager = new MCPManager();
      mcpManager.dashboards.adoDashboard.status = "available";
      mcpManager.dashboards.codeDashboard.status = "unavailable";

      const status = mcpManager.getStatus();

      expect(status.summary.dashboardsAvailable).toBe(1);
      expect(status.summary.dashboardsTotal).toBe(2);
    });

    it("should list active STDIO MCPs", () => {
      const mcpManager = new MCPManager();
      mcpManager.stdioMcps.test1 = { pid: 123 };
      mcpManager.stdioMcps.test2 = { pid: 456 };

      const status = mcpManager.getStatus();

      expect(status.stdioMcps).toEqual(["test1", "test2"]);
      expect(status.summary.stdioActive).toBe(2);
    });
  });

  describe("getSwaggerDocs", () => {
    it("should fetch swagger docs from healthy MCP", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      const mockDocs = { openapi: "3.0.0", paths: {} };
      mockAxios.get = jest.fn().mockResolvedValue({ data: mockDocs });

      const docs = await mcpManager.getSwaggerDocs("azureDevOps");

      expect(mockAxios.get).toHaveBeenCalledWith(
        "http://azure-devops:8100/api-docs.json",
        { timeout: 5000 },
      );
      expect(docs).toEqual(mockDocs);
    });

    it("should throw error for unknown MCP", async () => {
      const mcpManager = new MCPManager();

      await expect(mcpManager.getSwaggerDocs("unknownMcp")).rejects.toThrow(
        "Unknown MCP: unknownMcp",
      );
    });

    it("should throw error for unhealthy MCP", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "unhealthy";

      await expect(mcpManager.getSwaggerDocs("azureDevOps")).rejects.toThrow(
        "MCP azureDevOps is not healthy",
      );
    });

    it("should handle errors fetching swagger docs", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      mockAxios.get = jest.fn().mockRejectedValue(new Error("Not found"));

      await expect(mcpManager.getSwaggerDocs("azureDevOps")).rejects.toThrow(
        "Not found",
      );
    });
  });

  describe("getAllSwaggerDocs", () => {
    it("should fetch docs from all healthy MCPs", async () => {
      const mcpManager = new MCPManager();
      // Only mark one MCP as healthy to simplify test
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      const mockDocs = { openapi: "3.0.0", paths: {} };
      mockAxios.get = jest.fn().mockResolvedValue({ data: mockDocs });

      const allDocs = await mcpManager.getAllSwaggerDocs();

      // Check the healthy MCP has docs
      expect(allDocs.azureDevOps).toHaveProperty("openapi");
      expect(allDocs.azureDevOps.basePath).toBe("http://azure-devops:8100");
      expect(allDocs.azureDevOps.category).toBe("integration");

      // Check that unhealthy MCPs have errors
      expect(allDocs.dotnetCodeAnalyzer).toHaveProperty("error");
    });

    it("should return error for unhealthy MCPs", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "unhealthy";

      const allDocs = await mcpManager.getAllSwaggerDocs();

      expect(allDocs.azureDevOps).toHaveProperty("error");
      expect(allDocs.azureDevOps.error).toContain("not healthy");
    });

    it("should handle fetch errors gracefully", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      mockAxios.get = jest
        .fn()
        .mockRejectedValue(new Error("Connection failed"));

      const allDocs = await mcpManager.getAllSwaggerDocs();

      expect(allDocs.azureDevOps).toHaveProperty("error");
    });
  });

  describe("getAggregatedSwaggerSpec", () => {
    it("should return orchestrator API spec", async () => {
      const mcpManager = new MCPManager();

      const spec = await mcpManager.getAggregatedSwaggerSpec();

      expect(spec).toHaveProperty("openapi");
      expect(spec).toHaveProperty("info");
      expect(spec).toHaveProperty("paths");
    });
  });

  describe("startHealthChecks", () => {
    it("should start periodic health checks", () => {
      const mcpManager = new MCPManager();

      mcpManager.startHealthChecks();

      expect(mcpManager.healthCheckInterval).toBeDefined();

      // Cleanup
      clearInterval(mcpManager.healthCheckInterval);
    });

    it("should update MCP status on successful health check", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "unhealthy";

      mockAxios.get = jest.fn().mockResolvedValue({ status: 200 });

      mcpManager.startHealthChecks();

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cleanup
      clearInterval(mcpManager.healthCheckInterval);
    });

    it("should mark MCP as unhealthy on failed health check", async () => {
      const mcpManager = new MCPManager();
      mcpManager.dockerMcps.azureDevOps.status = "healthy";

      mockAxios.get = jest
        .fn()
        .mockRejectedValue(new Error("Connection refused"));

      mcpManager.startHealthChecks();

      // Wait for health check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cleanup
      clearInterval(mcpManager.healthCheckInterval);
    });
  });

  describe("shutdown", () => {
    it("should stop health checks", async () => {
      const mcpManager = new MCPManager();
      mcpManager.healthCheckInterval = setInterval(() => {}, 1000);

      await mcpManager.shutdown();

      expect(mcpManager.healthCheckInterval).toBeDefined();
    });

    it("should kill all stdio MCPs", async () => {
      const mcpManager = new MCPManager();

      const mockChild1 = { kill: jest.fn() };
      const mockChild2 = { kill: jest.fn() };
      mcpManager.stdioMcps.test1 = mockChild1;
      mcpManager.stdioMcps.test2 = mockChild2;

      await mcpManager.shutdown();

      expect(mockChild1.kill).toHaveBeenCalled();
      expect(mockChild2.kill).toHaveBeenCalled();
    });
  });
});
