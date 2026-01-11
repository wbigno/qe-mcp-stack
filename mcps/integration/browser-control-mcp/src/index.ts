/**
 * Browser Control MCP
 * Bridges Chrome extension to Claude Desktop via WebSocket + HTTP/REST
 */

import { BaseMCP, SwaggerConfig } from '@qe-mcp-stack/mcp-sdk';
import { MCPConfig, getEnvNumber, logInfo, logError } from '@qe-mcp-stack/shared';
import { Request, Response } from 'express';
import { BrowserBridgeServer } from './websocket-server';

class BrowserControlMCP extends BaseMCP {
  private bridge: BrowserBridgeServer;

  constructor() {
    const config: MCPConfig = {
      name: 'browser-control',
      version: '1.0.0',
      description: 'Browser control MCP - bridges Chrome extension to Claude Desktop',
      port: getEnvNumber('PORT', 8103),
      environment: process.env.NODE_ENV || 'development',
    };

    super(config);

    // Initialize WebSocket bridge
    const wsPort = getEnvNumber('WS_PORT', 8765);
    this.bridge = new BrowserBridgeServer(wsPort);

    // Listen for connection events
    this.bridge.on('connected', () => {
      logInfo('Extension connected to bridge');
    });

    this.bridge.on('disconnected', () => {
      logInfo('Extension disconnected from bridge');
    });

    // Setup routes and swagger
    this.setupRoutes();
    this.setupSwagger();
  }

  protected setupRoutes(): void {
    // Status endpoint
    this.app.get('/bridge/status', this.getBridgeStatus.bind(this));

    // Browser control endpoints
    this.app.post('/browser/check-connection', this.checkConnection.bind(this));
    this.app.post('/browser/get-page-content', this.getPageContent.bind(this));
    this.app.post('/browser/get-page-html', this.getPageHTML.bind(this));
    this.app.post('/browser/get-selection', this.getSelection.bind(this));
    this.app.post('/browser/execute-script', this.executeScript.bind(this));
    this.app.post('/browser/click-element', this.clickElement.bind(this));
    this.app.post('/browser/type-text', this.typeText.bind(this));
    this.app.post('/browser/navigate', this.navigate.bind(this));
    this.app.post('/browser/take-screenshot', this.takeScreenshot.bind(this));

    logInfo('Browser control routes configured');
  }

  protected setupSwagger(): void {
    const swaggerConfig = new SwaggerConfig({
      title: 'Browser Control MCP API',
      version: '1.0.0',
      description: `
Browser control MCP providing Chrome browser automation via WebSocket bridge.

## Features
- WebSocket connection to Chrome extension (port 8765)
- Get page content, HTML, and metadata
- Execute JavaScript in page context
- Click elements and type text
- Navigate to URLs
- Take screenshots
- Get selected text

## Architecture
\`\`\`
Chrome Extension ↔ WebSocket (8765) ↔ MCP Server (8103) ↔ Claude Desktop
\`\`\`

## Setup
1. Install Chrome extension from \`chrome-extension/claude-desktop-bridge/\`
2. Start this MCP server
3. Configure Claude Desktop to use this MCP

## Commands
All commands return JSON responses with \`success\` and \`result\` or \`error\`.
      `,
      servers: [
        { url: 'http://localhost:8103', description: 'Local development' },
      ],
    });

    swaggerConfig.setupDocs(this.app, '/api-docs');
  }

  /**
   * Get bridge connection status
   */
  private async getBridgeStatus(_req: Request, res: Response): Promise<void> {
    try {
      const status = this.bridge.getStatus();
      res.json({
        success: true,
        status: {
          ...status,
          wsPort: 8765,
          httpPort: this.config.port,
        },
      });
    } catch (error) {
      logError('Failed to get bridge status', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Check if extension is connected
   */
  private async checkConnection(_req: Request, res: Response): Promise<void> {
    try {
      const connected = this.bridge.isConnected();
      res.json({
        success: true,
        connected,
        message: connected ? 'Extension is connected' : 'Extension not connected',
      });
    } catch (error) {
      logError('Failed to check connection', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get page content
   */
  private async getPageContent(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.bridge.sendCommand('getPageContent');
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to get page content', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get page HTML
   */
  private async getPageHTML(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.bridge.sendCommand('getPageHTML');
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to get page HTML', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get selected text
   */
  private async getSelection(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.bridge.sendCommand('getSelection');
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to get selection', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Execute JavaScript
   */
  private async executeScript(req: Request, res: Response): Promise<void> {
    try {
      const { script } = req.body;
      if (!script) {
        res.status(400).json({
          success: false,
          error: 'script parameter is required',
        });
        return;
      }

      const result = await this.bridge.sendCommand('executeScript', { script });
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to execute script', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Click element
   */
  private async clickElement(req: Request, res: Response): Promise<void> {
    try {
      const { selector } = req.body;
      if (!selector) {
        res.status(400).json({
          success: false,
          error: 'selector parameter is required',
        });
        return;
      }

      const result = await this.bridge.sendCommand('clickElement', { selector });
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to click element', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Type text
   */
  private async typeText(req: Request, res: Response): Promise<void> {
    try {
      const { selector, text } = req.body;
      if (!selector || !text) {
        res.status(400).json({
          success: false,
          error: 'selector and text parameters are required',
        });
        return;
      }

      const result = await this.bridge.sendCommand('typeText', { selector, text });
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to type text', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Navigate to URL
   */
  private async navigate(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;
      if (!url) {
        res.status(400).json({
          success: false,
          error: 'url parameter is required',
        });
        return;
      }

      const result = await this.bridge.sendCommand('navigate', { url });
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to navigate', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Take screenshot
   */
  private async takeScreenshot(req: Request, res: Response): Promise<void> {
    try {
      const { fullPage } = req.body;
      const result = await this.bridge.sendCommand('takeScreenshot', { fullPage: fullPage || false });
      res.json({ success: true, result });
    } catch (error) {
      logError('Failed to take screenshot', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Override start to initialize WebSocket server
   */
  public async start(): Promise<void> {
    // Start WebSocket bridge
    this.bridge.start();

    // Start HTTP server
    await super.start();
  }

  /**
   * Override shutdown to cleanup WebSocket server
   */
  protected async shutdown(): Promise<void> {
    await this.bridge.stop();
    await super.shutdown();
  }
}

// Start the MCP server
const mcp = new BrowserControlMCP();
mcp.start().catch((error) => {
  logError('Failed to start Browser Control MCP', { error });
  process.exit(1);
});
