/**
 * Unit tests for BrowserBridgeServer - WebSocket connection and command handling
 */

import { BrowserBridgeServer } from "../../src/websocket-server";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { WebSocketServer, WebSocket } from "ws";
import { EventEmitter } from "events";

// Mock ws package
jest.mock("ws");

// Suppress logger output during tests
process.env.LOG_LEVEL = "silent";

describe("BrowserBridgeServer", () => {
  let server: BrowserBridgeServer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWss: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClient: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let connectionHandler: (ws: unknown) => void;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Create mock WebSocket client
    mockClient = {
      readyState: 1, // WebSocket.OPEN
      send: jest.fn(),
      close: jest.fn(),
      ping: jest.fn(),
      on: jest.fn(),
    };

    // Create mock WebSocketServer
    mockWss = new EventEmitter();
    mockWss.close = jest.fn((callback) => callback && callback());

    // Mock WebSocketServer constructor
    (
      WebSocketServer as jest.MockedClass<typeof WebSocketServer>
    ).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => mockWss as any,
    );

    // Create server instance
    server = new BrowserBridgeServer(8765);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create server with default port", () => {
      const defaultServer = new BrowserBridgeServer();
      expect(defaultServer).toBeInstanceOf(BrowserBridgeServer);
    });

    it("should create server with custom port", () => {
      expect(server).toBeInstanceOf(BrowserBridgeServer);
    });
  });

  describe("start", () => {
    it("should create WebSocket server with correct configuration", () => {
      server.start();

      expect(WebSocketServer).toHaveBeenCalledWith({
        port: 8765,
        host: "0.0.0.0",
      });
    });

    it("should set up connection event handler", () => {
      server.start();

      // Verify 'on' was called for connection event
      expect(mockWss.listenerCount("connection")).toBe(1);
    });
  });

  describe("connection handling", () => {
    beforeEach(() => {
      server.start();
    });

    it("should handle extension connection", (done) => {
      server.on("connected", () => {
        // Give a tiny delay for setup to complete
        setImmediate(() => {
          expect(mockClient.on).toHaveBeenCalledWith(
            "message",
            expect.any(Function),
          );
          expect(mockClient.on).toHaveBeenCalledWith(
            "close",
            expect.any(Function),
          );
          expect(mockClient.on).toHaveBeenCalledWith(
            "error",
            expect.any(Function),
          );
          expect(mockClient.on).toHaveBeenCalledWith(
            "pong",
            expect.any(Function),
          );
          done();
        });
      });

      // Simulate extension connection
      mockWss.emit("connection", mockClient);
    });

    it("should emit connected event when extension connects", (done) => {
      server.on("connected", () => {
        done();
      });

      mockWss.emit("connection", mockClient);
    });

    it("should handle extension disconnection", (done) => {
      // First connect
      mockWss.emit("connection", mockClient);

      server.on("disconnected", () => {
        done();
      });

      // Get the close handler and call it
      const closeHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1];
      closeHandler();
    });

    it("should emit disconnected event when extension disconnects", (done) => {
      mockWss.emit("connection", mockClient);

      server.on("disconnected", () => {
        done();
      });

      const closeHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1];
      closeHandler();
    });
  });

  describe("isConnected", () => {
    it("should return false when no client connected", () => {
      server.start();
      expect(server.isConnected()).toBe(false);
    });

    it("should return true when client is connected", () => {
      server.start();
      mockWss.emit("connection", mockClient);

      expect(server.isConnected()).toBe(true);
    });

    it("should return false when client is not in OPEN state", () => {
      server.start();
      mockWss.emit("connection", mockClient);

      // Change readyState to CLOSED
      mockClient.readyState = 3;

      expect(server.isConnected()).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("should return status with no connection", () => {
      server.start();
      const status = server.getStatus();

      expect(status).toEqual({
        extensionConnected: false,
        lastActivity: undefined,
        messageCount: 0,
      });
    });

    it("should return status with active connection", () => {
      server.start();
      mockWss.emit("connection", mockClient);

      const status = server.getStatus();

      expect(status).toEqual({
        extensionConnected: true,
        lastActivity: expect.any(Date),
        messageCount: 0,
      });
    });

    it("should increment message count", () => {
      server.start();
      mockWss.emit("connection", mockClient);

      // Simulate incoming message
      const messageHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "message",
      )?.[1];

      const mockResponse = {
        requestId: "req_123",
        result: { success: true },
      };

      messageHandler(Buffer.from(JSON.stringify(mockResponse)));

      const status = server.getStatus();
      expect(status.messageCount).toBe(1);
    });
  });

  describe("sendCommand", () => {
    beforeEach(() => {
      server.start();
      mockWss.emit("connection", mockClient);
    });

    it("should throw error when not connected", async () => {
      const disconnectedServer = new BrowserBridgeServer();
      disconnectedServer.start();

      await expect(
        disconnectedServer.sendCommand("getPageContent"),
      ).rejects.toThrow("Extension not connected");
    });

    it("should send command to extension", async () => {
      const commandPromise = server.sendCommand("getPageContent", {
        param: "value",
      });

      // Verify command was sent
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.stringContaining('"command":"getPageContent"'),
      );
      expect(mockClient.send).toHaveBeenCalledWith(
        expect.stringContaining('"params":{"param":"value"}'),
      );

      // Get the sent message
      const sentMessage = JSON.parse(mockClient.send.mock.calls[0][0]);
      expect(sentMessage).toHaveProperty("requestId");
      expect(sentMessage).toHaveProperty("command", "getPageContent");
      expect(sentMessage).toHaveProperty("params", { param: "value" });

      // Simulate response
      const messageHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "message",
      )?.[1];

      const mockResponse = {
        requestId: sentMessage.requestId,
        result: { content: "page content" },
      };

      messageHandler(Buffer.from(JSON.stringify(mockResponse)));

      const result = await commandPromise;
      expect(result).toEqual({ content: "page content" });
    });

    it("should handle successful response", async () => {
      const commandPromise = server.sendCommand("executeScript", {
        script: "return 42",
      });

      const sentMessage = JSON.parse(mockClient.send.mock.calls[0][0]);

      const messageHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "message",
      )?.[1];

      messageHandler(
        Buffer.from(
          JSON.stringify({
            requestId: sentMessage.requestId,
            result: 42,
          }),
        ),
      );

      const result = await commandPromise;
      expect(result).toBe(42);
    });

    it("should handle error response", async () => {
      const commandPromise = server.sendCommand("clickElement", {
        selector: "#invalid",
      });

      const sentMessage = JSON.parse(mockClient.send.mock.calls[0][0]);

      const messageHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "message",
      )?.[1];

      messageHandler(
        Buffer.from(
          JSON.stringify({
            requestId: sentMessage.requestId,
            error: "Element not found",
          }),
        ),
      );

      await expect(commandPromise).rejects.toThrow("Element not found");
    });

    it("should timeout if no response received", async () => {
      jest.useFakeTimers();

      const commandPromise = server.sendCommand("getPageContent", {}, 1000);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      await expect(commandPromise).rejects.toThrow(
        "Command timeout after 1000ms",
      );

      jest.useRealTimers();
    });

    it("should generate unique request IDs", () => {
      server.sendCommand("cmd1");
      server.sendCommand("cmd2");

      const msg1 = JSON.parse(mockClient.send.mock.calls[0][0]);
      const msg2 = JSON.parse(mockClient.send.mock.calls[1][0]);

      expect(msg1.requestId).not.toBe(msg2.requestId);
    });
  });

  describe("message handling", () => {
    beforeEach(() => {
      server.start();
      mockWss.emit("connection", mockClient);
    });

    it("should update last activity on message", async () => {
      const statusBefore = server.getStatus();

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const messageHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "message",
      )?.[1];

      messageHandler(
        Buffer.from(
          JSON.stringify({
            requestId: "req_123",
            result: {},
          }),
        ),
      );

      const statusAfter = server.getStatus();
      expect(statusAfter.lastActivity!.getTime()).toBeGreaterThan(
        statusBefore.lastActivity!.getTime(),
      );
    });

    it("should handle malformed messages gracefully", () => {
      const messageHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "message",
      )?.[1];

      // Should not throw
      expect(() => {
        messageHandler(Buffer.from("invalid json"));
      }).not.toThrow();
    });

    it("should ignore messages with unknown request IDs", () => {
      const messageHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "message",
      )?.[1];

      // Should not throw
      expect(() => {
        messageHandler(
          Buffer.from(
            JSON.stringify({
              requestId: "unknown_id",
              result: {},
            }),
          ),
        );
      }).not.toThrow();
    });
  });

  describe("disconnect handling", () => {
    it("should reject all pending requests on disconnect", async () => {
      server.start();
      mockWss.emit("connection", mockClient);

      // Start multiple commands
      const promise1 = server.sendCommand("cmd1");
      const promise2 = server.sendCommand("cmd2");

      // Get close handler and trigger disconnect
      const closeHandler = mockClient.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1];
      closeHandler();

      // All promises should reject
      await expect(promise1).rejects.toThrow("Extension disconnected");
      await expect(promise2).rejects.toThrow("Extension disconnected");
    });
  });

  describe("stop", () => {
    it("should close client connection", async () => {
      server.start();
      mockWss.emit("connection", mockClient);

      await server.stop();

      expect(mockClient.close).toHaveBeenCalled();
    });

    it("should close WebSocket server", async () => {
      server.start();

      await server.stop();

      expect(mockWss.close).toHaveBeenCalled();
    });

    it("should handle stop when no client connected", async () => {
      server.start();

      await expect(server.stop()).resolves.not.toThrow();
    });
  });
});
