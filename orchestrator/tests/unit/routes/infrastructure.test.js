import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import { createMockMcpManager } from "../../helpers/mocks.js";

/**
 * API Tests: Infrastructure Routes
 *
 * Tests infrastructure analysis and monitoring endpoints.
 *
 * Endpoints tested:
 * - GET /api/infrastructure/status - Get infrastructure data
 * - GET /api/infrastructure/applications/:appKey - Get specific app details
 * - POST /api/infrastructure/scan - Trigger repository rescan
 * - GET /api/infrastructure/changes - Get infrastructure changes
 */

describe("Infrastructure Routes", () => {
  let app;
  let mockMcpManager;
  let infrastructureRouter;
  let mockFileWatcher;
  let mockInfrastructureData;

  beforeEach(async () => {
    jest.resetModules();

    // Create mock file watcher
    mockFileWatcher = {
      on: jest.fn(),
      updateLastScan: jest.fn(),
      getChanges: jest.fn(() => []),
      getLastScan: jest.fn(() => new Date()),
      isEnabled: jest.fn(() => true),
    };

    // Create mock infrastructure data
    mockInfrastructureData = {
      applications: {
        core: {
          name: "Core",
          repository: "Core",
          description: "Core application",
          integrations: [],
        },
        payments: {
          name: "Payments",
          repository: "Payments",
          description: "Payments application",
          integrations: [],
        },
      },
    };

    // Mock dependencies BEFORE importing routes
    await jest.unstable_mockModule(
      "../../../src/data/carePaymentApps.js",
      () => ({
        infrastructureData: mockInfrastructureData,
      }),
    );

    await jest.unstable_mockModule(
      "../../../src/services/fileWatcher.js",
      () => ({
        fileWatcher: mockFileWatcher,
      }),
    );

    // Import routes AFTER mocking
    const infrastructureRouterModule =
      await import("../../../src/routes/infrastructure.js");
    infrastructureRouter = infrastructureRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add mock MCPManager middleware
    mockMcpManager = createMockMcpManager();
    app.use((req, res, next) => {
      req.mcpManager = mockMcpManager;
      next();
    });

    app.use("/api/infrastructure", infrastructureRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/infrastructure/status", () => {
    describe("Successful status retrieval", () => {
      it("should return infrastructure data", async () => {
        const response = await request(app).get("/api/infrastructure/status");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("data");
        expect(response.body.data).toEqual(mockInfrastructureData);
      });

      it("should return application details", async () => {
        const response = await request(app).get("/api/infrastructure/status");

        expect(response.body.data.applications).toBeDefined();
        expect(response.body.data.applications.core).toBeDefined();
        expect(response.body.data.applications.payments).toBeDefined();
      });

      it("should handle empty infrastructure data", async () => {
        mockInfrastructureData.applications = {};

        const response = await request(app).get("/api/infrastructure/status");

        expect(response.status).toBe(200);
        expect(response.body.data.applications).toEqual({});
      });
    });
  });

  describe("GET /api/infrastructure/applications/:appKey", () => {
    describe("Successful application retrieval", () => {
      it("should return specific application details", async () => {
        const response = await request(app).get(
          "/api/infrastructure/applications/core",
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("data");
        expect(response.body.data.name).toBe("Core");
        expect(response.body.data.repository).toBe("Core");
      });

      it("should return different application details", async () => {
        const response = await request(app).get(
          "/api/infrastructure/applications/payments",
        );

        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe("Payments");
      });

      it("should include application integrations", async () => {
        mockInfrastructureData.applications.core.integrations = [
          { type: "database", name: "SQL Server" },
        ];

        const response = await request(app).get(
          "/api/infrastructure/applications/core",
        );

        expect(response.body.data.integrations).toBeDefined();
        expect(response.body.data.integrations.length).toBe(1);
      });
    });

    describe("Application not found (404)", () => {
      it("should return 404 for unknown application", async () => {
        const response = await request(app).get(
          "/api/infrastructure/applications/unknown",
        );

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("status", "error");
        expect(response.body).toHaveProperty("message");
        expect(response.body.message).toContain("not found");
      });

      it("should include application key in 404 message", async () => {
        const response = await request(app).get(
          "/api/infrastructure/applications/nonexistent",
        );

        expect(response.body.message).toContain("nonexistent");
      });
    });

    describe("Error handling", () => {
      it("should handle null or falsy application as 404", async () => {
        // Set one app to null - should treat as not found
        mockInfrastructureData.applications.nullApp = null;

        const response = await request(app).get(
          "/api/infrastructure/applications/nullApp",
        );

        // Null apps are treated as not found
        expect(response.status).toBe(404);
        expect(response.body.status).toBe("error");
      });

      it("should handle undefined application as 404", async () => {
        const response = await request(app).get(
          "/api/infrastructure/applications/undefined",
        );

        expect(response.status).toBe(404);
        expect(response.body.status).toBe("error");
      });
    });
  });

  describe("POST /api/infrastructure/scan", () => {
    describe("Successful scanning", () => {
      it("should trigger scan for specific repository", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          integrations: [],
        });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "Core" });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("status", "success");
        expect(response.body).toHaveProperty("results");
        expect(response.body.results.length).toBe(1);
        expect(response.body.results[0].repo).toBe("Core");
      });

      it("should call integrationMapper MCP with correct parameters", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "Core" });

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "integrationMapper",
          "/map-integrations",
          {
            app: "Core",
            includeSchemas: true,
          },
        );
      });

      it("should scan all repositories when repo not specified", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.results.length).toBeGreaterThan(1);
        // Should scan Core, Core.Common, Payments, PreCare, ThirdPartyIntegrations
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalled();
      });

      it("should update last scan timestamp", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "Core" });

        expect(mockFileWatcher.updateLastScan).toHaveBeenCalled();
      });

      it("should include timestamp in response", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "Core" });

        expect(response.body).toHaveProperty("timestamp");
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });

      it("should include scan message in response", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "Payments" });

        expect(response.body.message).toContain("Payments");
      });
    });

    describe("Scan errors", () => {
      it("should handle MCP call failures gracefully", async () => {
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP integrationMapper is not healthy"),
        );

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "Core" });

        expect(response.status).toBe(200);
        expect(response.body.results[0].status).toBe("error");
        expect(response.body.results[0].error).toBeDefined();
      });

      it("should continue scanning other repos if one fails", async () => {
        let callCount = 0;
        mockMcpManager.callDockerMcp.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error("Scan failed"));
          }
          return Promise.resolve({ success: true });
        });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.results.some((r) => r.status === "error")).toBe(
          true,
        );
        expect(response.body.results.some((r) => r.status === "success")).toBe(
          true,
        );
      });

      it("should return 500 for unexpected errors", async () => {
        // Simulate error in request handling
        mockFileWatcher.updateLastScan.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "Core" });

        expect(response.status).toBe(500);
        expect(response.body.status).toBe("error");
      });
    });

    describe("Edge cases", () => {
      it("should handle unknown repository name", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({ repo: "UnknownRepo" });

        expect(response.status).toBe(200);
        // Should scan all repos since unknown repo name
        expect(response.body.results.length).toBeGreaterThan(1);
      });

      it("should handle empty request body", async () => {
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        const response = await request(app)
          .post("/api/infrastructure/scan")
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.message).toContain("all repositories");
      });
    });
  });

  describe("GET /api/infrastructure/changes", () => {
    describe("Successful changes retrieval", () => {
      it("should return infrastructure changes", async () => {
        mockFileWatcher.getChanges.mockReturnValue([
          {
            file: "/path/to/file.cs",
            type: "modified",
            repo: "Core",
            timestamp: new Date().toISOString(),
          },
        ]);

        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("changes");
        expect(response.body.changes.length).toBe(1);
        expect(response.body.changes[0].file).toBe("/path/to/file.cs");
      });

      it("should include timestamp in response", async () => {
        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.body).toHaveProperty("timestamp");
        expect(response.body.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      });

      it("should include last scan time", async () => {
        const lastScan = new Date("2025-01-01T00:00:00Z");
        mockFileWatcher.getLastScan.mockReturnValue(lastScan);

        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.body).toHaveProperty("lastScan");
        expect(response.body.lastScan).toBe("2025-01-01T00:00:00.000Z");
      });

      it("should include watch enabled status", async () => {
        mockFileWatcher.isEnabled.mockReturnValue(true);

        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.body).toHaveProperty("watchEnabled", true);
      });

      it("should return empty changes when none exist", async () => {
        mockFileWatcher.getChanges.mockReturnValue([]);

        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.status).toBe(200);
        expect(response.body.changes).toEqual([]);
      });

      it("should handle multiple changes", async () => {
        mockFileWatcher.getChanges.mockReturnValue([
          {
            file: "/file1.cs",
            type: "modified",
            repo: "Core",
            timestamp: "2025-01-01",
          },
          {
            file: "/file2.cs",
            type: "added",
            repo: "Payments",
            timestamp: "2025-01-02",
          },
          {
            file: "/file3.cs",
            type: "deleted",
            repo: "PreCare",
            timestamp: "2025-01-03",
          },
        ]);

        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.body.changes.length).toBe(3);
        expect(response.body.changes[0].type).toBe("modified");
        expect(response.body.changes[1].type).toBe("added");
        expect(response.body.changes[2].type).toBe("deleted");
      });
    });

    describe("Error handling", () => {
      it("should return 500 when fileWatcher fails", async () => {
        mockFileWatcher.getChanges.mockImplementation(() => {
          throw new Error("FileWatcher error");
        });

        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("status", "error");
        expect(response.body.error).toContain("FileWatcher error");
      });

      it("should handle getLastScan errors", async () => {
        mockFileWatcher.getLastScan.mockImplementation(() => {
          throw new Error("Cannot get last scan time");
        });

        const response = await request(app).get("/api/infrastructure/changes");

        expect(response.status).toBe(500);
      });
    });
  });

  describe("Auto-rescan functionality", () => {
    // Helper to get current file change handler
    const getFileChangeHandler = () => {
      return mockFileWatcher.on.mock.calls.find(
        (call) => call[0] === "fileChanged",
      )?.[1];
    };

    describe("File watcher event handling", () => {
      it("should register file change event listener", () => {
        // Verify that fileWatcher.on was called during module initialization
        expect(mockFileWatcher.on).toHaveBeenCalledWith(
          "fileChanged",
          expect.any(Function),
        );
      });

      it("should trigger auto-rescan when file changes", async () => {
        // Get the event listener function that was registered
        const fileChangeHandler = getFileChangeHandler();

        expect(fileChangeHandler).toBeDefined();

        // Setup MCP manager mock
        mockMcpManager.callDockerMcp.mockResolvedValue({
          success: true,
          integrations: [],
        });

        // Make a request to trigger mcpManager reference capture
        await request(app).get("/api/infrastructure/status");

        // Simulate file change event
        await fileChangeHandler({
          repo: "Core",
          path: "/Services/UserService.cs",
          type: "modified",
        });

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify MCP was called for auto-rescan
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "integrationMapper",
          "/map-integrations",
          {
            app: "Core",
            includeSchemas: true,
          },
        );
      });

      it("should handle file changes before mcpManager is available", async () => {
        // Get a fresh handler before any requests
        const handler = getFileChangeHandler();

        // Trigger event without making any requests first
        await handler({
          repo: "Payments",
          path: "/test.cs",
          type: "modified",
        });

        // Should not crash, just skip rescan
        expect(mockMcpManager.callDockerMcp).not.toHaveBeenCalled();
      });
    });

    describe("MCPManager reference capture", () => {
      it("should capture mcpManager on first request", async () => {
        const handler = getFileChangeHandler();

        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await request(app).get("/api/infrastructure/status");
        mockMcpManager.callDockerMcp.mockClear();
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        // MCPManager should now be available for auto-rescan
        // Verify by triggering a file change
        await handler({
          repo: "Core",
          path: "/test.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalled();
      });
    });

    describe("Debounce logic", () => {
      it("should skip rescan if recently scanned (debounce)", async () => {
        const handler = getFileChangeHandler();

        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        // Capture mcpManager reference
        await request(app).get("/api/infrastructure/status");
        mockMcpManager.callDockerMcp.mockClear();
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        // First file change - should trigger rescan
        await handler({
          repo: "Core",
          path: "/test1.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledTimes(1);

        mockMcpManager.callDockerMcp.mockClear();

        // Second file change immediately after - should be debounced
        await handler({
          repo: "Core",
          path: "/test2.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should NOT trigger another scan (debounced)
        expect(mockMcpManager.callDockerMcp).not.toHaveBeenCalled();
      });

      it("should allow rescan for different repositories", async () => {
        const handler = getFileChangeHandler();

        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await request(app).get("/api/infrastructure/status");
        mockMcpManager.callDockerMcp.mockClear();
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        // First scan for Core
        await handler({
          repo: "Core",
          path: "/test.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "integrationMapper",
          "/map-integrations",
          { app: "Core", includeSchemas: true },
        );

        mockMcpManager.callDockerMcp.mockClear();

        // Scan for different repo (Payments) - should work immediately
        await handler({
          repo: "Payments",
          path: "/test.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "integrationMapper",
          "/map-integrations",
          { app: "Payments", includeSchemas: true },
        );
      });
    });

    describe("Repository mapping", () => {
      it("should handle unknown repository in auto-rescan", async () => {
        const handler = getFileChangeHandler();

        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await request(app).get("/api/infrastructure/status");
        mockMcpManager.callDockerMcp.mockClear();

        // Unknown repository - should skip rescan
        await handler({
          repo: "UnknownRepo",
          path: "/test.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should not call MCP for unknown repo
        expect(mockMcpManager.callDockerMcp).not.toHaveBeenCalled();
      });

      it("should handle different repository types", async () => {
        const handler = getFileChangeHandler();

        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await request(app).get("/api/infrastructure/status");
        mockMcpManager.callDockerMcp.mockClear();

        // Test PreCare repository
        await handler({
          repo: "PreCare",
          path: "/Controllers/test.cs",
          type: "added",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalledWith(
          "integrationMapper",
          "/map-integrations",
          {
            app: "PreCare",
            includeSchemas: true,
          },
        );
      });
    });

    describe("Error handling in auto-rescan", () => {
      it("should handle MCP call failures gracefully", async () => {
        const handler = getFileChangeHandler();

        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP connection failed"),
        );

        await request(app).get("/api/infrastructure/status");
        mockMcpManager.callDockerMcp.mockClear();
        mockMcpManager.callDockerMcp.mockRejectedValue(
          new Error("MCP connection failed"),
        );

        // Should not throw error
        await handler({
          repo: "Core",
          path: "/test.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Error should be logged but not thrown
        expect(mockMcpManager.callDockerMcp).toHaveBeenCalled();
      });

      it("should continue working after MCP error", async () => {
        const handler = getFileChangeHandler();

        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await request(app).get("/api/infrastructure/status");
        mockMcpManager.callDockerMcp.mockClear();

        // First call fails
        mockMcpManager.callDockerMcp.mockRejectedValueOnce(
          new Error("Temporary error"),
        );

        await handler({
          repo: "Core",
          path: "/test1.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        mockMcpManager.callDockerMcp.mockClear();

        // Second call succeeds for different repo
        mockMcpManager.callDockerMcp.mockResolvedValue({ success: true });

        await handler({
          repo: "Payments",
          path: "/test2.cs",
          type: "modified",
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(mockMcpManager.callDockerMcp).toHaveBeenCalled();
      });
    });
  });
});
