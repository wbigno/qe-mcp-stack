/**
 * Unit tests for Browser Control Routes
 * Tests all HTTP endpoints that bridge to WebSocket commands
 */

import express, { Express } from "express";
import request from "supertest";
import { BrowserBridgeServer } from "../../src/websocket-server";

// Mock the WebSocket server
jest.mock("../../src/websocket-server");
jest.mock("@qe-mcp-stack/shared");
jest.mock("@qe-mcp-stack/mcp-sdk");

// Suppress logger output
process.env.LOG_LEVEL = "silent";

describe("Browser Control Routes", () => {
  let app: Express;
  let mockBridge: jest.Mocked<BrowserBridgeServer>;

  beforeEach(() => {
    // Create mock bridge
    mockBridge = {
      sendCommand: jest.fn(),
      isConnected: jest.fn(),
      getStatus: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      on: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Setup Express app
    app = express();
    app.use(express.json());

    // Setup routes manually (mimicking BrowserControlMCP setupRoutes)
    app.get("/bridge/status", async (_req, res) => {
      try {
        const status = mockBridge.getStatus();
        res.json({
          success: true,
          status: {
            ...status,
            wsPort: 8765,
            httpPort: 8103,
          },
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/check-connection", async (_req, res) => {
      try {
        const connected = mockBridge.isConnected();
        res.json({
          success: true,
          connected,
          message: connected
            ? "Extension is connected"
            : "Extension not connected",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/get-page-content", async (_req, res) => {
      try {
        const result = await mockBridge.sendCommand("getPageContent");
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/get-page-html", async (_req, res) => {
      try {
        const result = await mockBridge.sendCommand("getPageHTML");
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/get-selection", async (_req, res) => {
      try {
        const result = await mockBridge.sendCommand("getSelection");
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/execute-script", async (req, res) => {
      try {
        const { script } = req.body;
        if (!script) {
          res.status(400).json({
            success: false,
            error: "script parameter is required",
          });
          return;
        }

        const result = await mockBridge.sendCommand("executeScript", {
          script,
        });
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/click-element", async (req, res) => {
      try {
        const { selector } = req.body;
        if (!selector) {
          res.status(400).json({
            success: false,
            error: "selector parameter is required",
          });
          return;
        }

        const result = await mockBridge.sendCommand("clickElement", {
          selector,
        });
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/type-text", async (req, res) => {
      try {
        const { selector, text } = req.body;
        if (!selector || !text) {
          res.status(400).json({
            success: false,
            error: "selector and text parameters are required",
          });
          return;
        }

        const result = await mockBridge.sendCommand("typeText", {
          selector,
          text,
        });
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/navigate", async (req, res) => {
      try {
        const { url } = req.body;
        if (!url) {
          res.status(400).json({
            success: false,
            error: "url parameter is required",
          });
          return;
        }

        const result = await mockBridge.sendCommand("navigate", { url });
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/take-screenshot", async (req, res) => {
      try {
        const { fullPage } = req.body;
        const result = await mockBridge.sendCommand("takeScreenshot", {
          fullPage: fullPage || false,
        });
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/get-console-logs", async (req, res) => {
      try {
        const options = req.body || {};
        const result = await mockBridge.sendCommand("getConsoleLogs", options);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/clear-console-logs", async (_req, res) => {
      try {
        const result = await mockBridge.sendCommand("clearConsoleLogs");
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/get-network-traffic", async (req, res) => {
      try {
        const options = req.body || {};
        const result = await mockBridge.sendCommand(
          "getNetworkTraffic",
          options,
        );
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });

    app.post("/browser/clear-network-traffic", async (_req, res) => {
      try {
        const result = await mockBridge.sendCommand("clearNetworkTraffic");
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message,
        });
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /bridge/status", () => {
    it("should get bridge status successfully", async () => {
      mockBridge.getStatus.mockReturnValueOnce({
        extensionConnected: true,
        lastActivity: new Date(),
        messageCount: 42,
      });

      const response = await request(app).get("/bridge/status");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        status: {
          extensionConnected: true,
          lastActivity: expect.any(String),
          messageCount: 42,
          wsPort: 8765,
          httpPort: 8103,
        },
      });
    });

    it("should handle errors", async () => {
      mockBridge.getStatus.mockImplementationOnce(() => {
        throw new Error("Bridge error");
      });

      const response = await request(app).get("/bridge/status");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Bridge error",
      });
    });
  });

  describe("POST /browser/check-connection", () => {
    it("should return connected status when extension is connected", async () => {
      mockBridge.isConnected.mockReturnValueOnce(true);

      const response = await request(app).post("/browser/check-connection");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        connected: true,
        message: "Extension is connected",
      });
    });

    it("should return disconnected status when extension is not connected", async () => {
      mockBridge.isConnected.mockReturnValueOnce(false);

      const response = await request(app).post("/browser/check-connection");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        connected: false,
        message: "Extension not connected",
      });
    });

    it("should handle errors", async () => {
      mockBridge.isConnected.mockImplementationOnce(() => {
        throw new Error("Connection check failed");
      });

      const response = await request(app).post("/browser/check-connection");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /browser/get-page-content", () => {
    it("should get page content successfully", async () => {
      const mockContent = {
        url: "https://example.com",
        title: "Example",
        text: "Page content",
      };
      mockBridge.sendCommand.mockResolvedValueOnce(mockContent);

      const response = await request(app).post("/browser/get-page-content");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        result: mockContent,
      });
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("getPageContent");
    });

    it("should handle errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(
        new Error("Extension not connected"),
      );

      const response = await request(app).post("/browser/get-page-content");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: "Extension not connected",
      });
    });
  });

  describe("POST /browser/get-page-html", () => {
    it("should get page HTML successfully", async () => {
      const mockHtml = "<html><body>Test</body></html>";
      mockBridge.sendCommand.mockResolvedValueOnce(mockHtml);

      const response = await request(app).post("/browser/get-page-html");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        result: mockHtml,
      });
    });

    it("should handle errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("Timeout"));

      const response = await request(app).post("/browser/get-page-html");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/get-selection", () => {
    it("should get selected text successfully", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce("Selected text");

      const response = await request(app).post("/browser/get-selection");

      expect(response.status).toBe(200);
      expect(response.body.result).toBe("Selected text");
    });

    it("should handle errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("No selection"));

      const response = await request(app).post("/browser/get-selection");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/execute-script", () => {
    it("should execute script successfully", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce(42);

      const response = await request(app)
        .post("/browser/execute-script")
        .send({ script: "return 40 + 2" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        result: 42,
      });
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("executeScript", {
        script: "return 40 + 2",
      });
    });

    it("should return 400 when script is missing", async () => {
      const response = await request(app)
        .post("/browser/execute-script")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "script parameter is required",
      });
    });

    it("should handle execution errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(
        new Error("Script execution failed"),
      );

      const response = await request(app)
        .post("/browser/execute-script")
        .send({ script: "invalid.syntax" });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/click-element", () => {
    it("should click element successfully", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce({ clicked: true });

      const response = await request(app)
        .post("/browser/click-element")
        .send({ selector: "#button" });

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("clickElement", {
        selector: "#button",
      });
    });

    it("should return 400 when selector is missing", async () => {
      const response = await request(app)
        .post("/browser/click-element")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("selector parameter is required");
    });

    it("should handle click errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(
        new Error("Element not found"),
      );

      const response = await request(app)
        .post("/browser/click-element")
        .send({ selector: "#nonexistent" });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/type-text", () => {
    it("should type text successfully", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce({ typed: true });

      const response = await request(app)
        .post("/browser/type-text")
        .send({ selector: "#input", text: "Hello" });

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("typeText", {
        selector: "#input",
        text: "Hello",
      });
    });

    it("should return 400 when selector is missing", async () => {
      const response = await request(app)
        .post("/browser/type-text")
        .send({ text: "Hello" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "selector and text parameters are required",
      );
    });

    it("should return 400 when text is missing", async () => {
      const response = await request(app)
        .post("/browser/type-text")
        .send({ selector: "#input" });

      expect(response.status).toBe(400);
    });

    it("should handle type errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("Input disabled"));

      const response = await request(app)
        .post("/browser/type-text")
        .send({ selector: "#input", text: "Test" });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/navigate", () => {
    it("should navigate successfully", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce({ navigated: true });

      const response = await request(app)
        .post("/browser/navigate")
        .send({ url: "https://example.com" });

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("navigate", {
        url: "https://example.com",
      });
    });

    it("should return 400 when URL is missing", async () => {
      const response = await request(app).post("/browser/navigate").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("url parameter is required");
    });

    it("should handle navigation errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("Invalid URL"));

      const response = await request(app)
        .post("/browser/navigate")
        .send({ url: "invalid-url" });

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/take-screenshot", () => {
    it("should take screenshot with fullPage false", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce("data:image/png;base64...");

      const response = await request(app)
        .post("/browser/take-screenshot")
        .send({ fullPage: false });

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("takeScreenshot", {
        fullPage: false,
      });
    });

    it("should take screenshot with fullPage true", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce("data:image/png;base64...");

      const response = await request(app)
        .post("/browser/take-screenshot")
        .send({ fullPage: true });

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("takeScreenshot", {
        fullPage: true,
      });
    });

    it("should use default fullPage value when not provided", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce("data:image/png;base64...");

      const response = await request(app)
        .post("/browser/take-screenshot")
        .send({});

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("takeScreenshot", {
        fullPage: false,
      });
    });

    it("should handle screenshot errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(
        new Error("Screenshot failed"),
      );

      const response = await request(app)
        .post("/browser/take-screenshot")
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/get-console-logs", () => {
    it("should get console logs successfully", async () => {
      const mockLogs = [{ level: "log", message: "Test" }];
      mockBridge.sendCommand.mockResolvedValueOnce(mockLogs);

      const response = await request(app).post("/browser/get-console-logs");

      expect(response.status).toBe(200);
      expect(response.body.result).toEqual(mockLogs);
    });

    it("should pass options to command", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce([]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await request(app)
        .post("/browser/get-console-logs")
        .send({ level: "error" });

      expect(mockBridge.sendCommand).toHaveBeenCalledWith("getConsoleLogs", {
        level: "error",
      });
    });

    it("should handle errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("Logs failed"));

      const response = await request(app).post("/browser/get-console-logs");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/clear-console-logs", () => {
    it("should clear console logs successfully", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce({ cleared: true });

      const response = await request(app).post("/browser/clear-console-logs");

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith("clearConsoleLogs");
    });

    it("should handle errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("Clear failed"));

      const response = await request(app).post("/browser/clear-console-logs");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/get-network-traffic", () => {
    it("should get network traffic successfully", async () => {
      const mockTraffic = [{ url: "https://api.example.com", status: 200 }];
      mockBridge.sendCommand.mockResolvedValueOnce(mockTraffic);

      const response = await request(app).post("/browser/get-network-traffic");

      expect(response.status).toBe(200);
      expect(response.body.result).toEqual(mockTraffic);
    });

    it("should pass options to command", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce([]);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await request(app)
        .post("/browser/get-network-traffic")
        .send({ method: "GET" });

      expect(mockBridge.sendCommand).toHaveBeenCalledWith("getNetworkTraffic", {
        method: "GET",
      });
    });

    it("should handle errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("Traffic failed"));

      const response = await request(app).post("/browser/get-network-traffic");

      expect(response.status).toBe(500);
    });
  });

  describe("POST /browser/clear-network-traffic", () => {
    it("should clear network traffic successfully", async () => {
      mockBridge.sendCommand.mockResolvedValueOnce({ cleared: true });

      const response = await request(app).post(
        "/browser/clear-network-traffic",
      );

      expect(response.status).toBe(200);
      expect(mockBridge.sendCommand).toHaveBeenCalledWith(
        "clearNetworkTraffic",
      );
    });

    it("should handle errors", async () => {
      mockBridge.sendCommand.mockRejectedValueOnce(new Error("Clear failed"));

      const response = await request(app).post(
        "/browser/clear-network-traffic",
      );

      expect(response.status).toBe(500);
    });
  });
});
