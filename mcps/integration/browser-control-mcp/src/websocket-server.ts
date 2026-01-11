/**
 * WebSocket Server - Manages connection to Chrome extension
 */

import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { ExtensionMessage, ExtensionResponse, BridgeStatus } from './types';
import { logInfo, logError } from '@qe-mcp-stack/shared';

export class BrowserBridgeServer extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private extensionClient: WebSocket | null = null;
  private port: number;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
  }>();
  private messageCount = 0;
  private lastActivity?: Date;

  constructor(port = 8765) {
    super();
    this.port = port;
  }

  /**
   * Start WebSocket server
   */
  start(): void {
    this.wss = new WebSocketServer({
      port: this.port,
      host: '0.0.0.0', // Listen on all interfaces for Docker port forwarding
    });

    this.wss.on('connection', (ws: WebSocket) => {
      logInfo('Chrome extension connected', { port: this.port });

      // Store the connection
      this.extensionClient = ws;
      this.lastActivity = new Date();
      this.emit('connected');

      ws.on('message', (data: Buffer) => {
        try {
          const message: ExtensionResponse = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          logError('Failed to parse message from extension', { error });
        }
      });

      ws.on('close', () => {
        logInfo('Chrome extension disconnected');
        this.extensionClient = null;
        this.emit('disconnected');

        // Reject all pending requests
        for (const [, { reject, timeoutId }] of this.pendingRequests) {
          clearTimeout(timeoutId);
          reject(new Error('Extension disconnected'));
        }
        this.pendingRequests.clear();
      });

      ws.on('error', (error: Error) => {
        logError('WebSocket error', { error: error.message });
      });

      ws.on('pong', () => {
        this.lastActivity = new Date();
      });
    });

    // Keep-alive ping
    setInterval(() => {
      if (this.extensionClient && this.extensionClient.readyState === WebSocket.OPEN) {
        this.extensionClient.ping();
      }
    }, 30000);

    logInfo('WebSocket server started', {
      port: this.port,
      host: '0.0.0.0',
    });
  }

  /**
   * Handle message from extension
   */
  private handleMessage(message: ExtensionResponse): void {
    this.lastActivity = new Date();
    this.messageCount++;

    if (message.requestId && this.pendingRequests.has(message.requestId)) {
      const pending = this.pendingRequests.get(message.requestId)!;
      clearTimeout(pending.timeoutId);
      this.pendingRequests.delete(message.requestId);

      if (message.error) {
        pending.reject(new Error(message.error));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  /**
   * Send command to extension and wait for response
   */
  async sendCommand(command: string, params: Record<string, any> = {}, timeout = 30000): Promise<any> {
    if (!this.extensionClient || this.extensionClient.readyState !== WebSocket.OPEN) {
      throw new Error('Extension not connected');
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeoutId });

      const message: ExtensionMessage = {
        requestId,
        command,
        params,
      };

      this.extensionClient!.send(JSON.stringify(message));
      logInfo('Command sent to extension', { command, requestId });
    });
  }

  /**
   * Check if extension is connected
   */
  isConnected(): boolean {
    return this.extensionClient !== null && this.extensionClient.readyState === WebSocket.OPEN;
  }

  /**
   * Get bridge status
   */
  getStatus(): BridgeStatus {
    return {
      extensionConnected: this.isConnected(),
      lastActivity: this.lastActivity,
      messageCount: this.messageCount,
    };
  }

  /**
   * Stop WebSocket server
   */
  async stop(): Promise<void> {
    if (this.extensionClient) {
      this.extensionClient.close();
      this.extensionClient = null;
    }

    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          logInfo('WebSocket server stopped');
          resolve();
        });
      });
      this.wss = null;
    }
  }
}
