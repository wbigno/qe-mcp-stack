/**
 * MCP Tool Registry
 * Makes our Docker MCPs expose tools using the standard MCP protocol
 * This allows AI agents to discover and use tools automatically
 */

import express from 'express';

export class MCPToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool that can be called by AI agents
   */
  registerTool(name, description, inputSchema, handler) {
    this.tools.set(name, {
      name,
      description,
      inputSchema,
      handler
    });
  }

  /**
   * Get list of all available tools (MCP standard)
   */
  listTools() {
    return {
      tools: Array.from(this.tools.values()).map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema
      }))
    };
  }

  /**
   * Call a specific tool (MCP standard)
   */
  async callTool(name, args) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await tool.handler(args);
  }

  /**
   * Add MCP standard routes to an Express app
   */
  addRoutesToApp(app) {
    // MCP standard: List available tools
    app.post('/mcp/tools/list', (req, res) => {
      res.json(this.listTools());
    });

    // MCP standard: Call a tool
    app.post('/mcp/tools/call', async (req, res) => {
      try {
        const { name, arguments: args } = req.body;
        const result = await this.callTool(name, args);
        res.json({
          jsonrpc: '2.0',
          result
        });
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error.message
          }
        });
      }
    });

    // Also keep traditional HTTP endpoints for direct access
    app.post('/tools/:toolName', async (req, res) => {
      try {
        const { toolName } = req.params;
        const result = await this.callTool(toolName, req.body);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
}

// Example usage in code-analyzer MCP:
import { MCPToolRegistry } from './mcpToolRegistry.js';
import { scanDirectory, analyzeCSharpFile } from './services/scanner.js';

const app = express();
app.use(express.json());

const registry = new MCPToolRegistry();

// Register tools
registry.registerTool(
  'scan_csharp_code',
  'Scans .NET C# code to identify classes, methods, and integration points',
  {
    type: 'object',
    properties: {
      app: {
        type: 'string',
        description: 'Application name (App1, App2, App3, or App4)'
      },
      includeTests: {
        type: 'boolean',
        description: 'Include test files in scan',
        default: false
      },
      findEpicReferences: {
        type: 'boolean',
        description: 'Find Epic API integration points',
        default: true
      }
    },
    required: ['app']
  },
  async (args) => {
    const { app, includeTests, findEpicReferences } = args;
    // ... scanning logic
    return { totalFiles: 145, classes: [...], methods: [...] };
  }
);

registry.registerTool(
  'analyze_integration_points',
  'Analyzes code for Epic and Financial system integration points',
  {
    type: 'object',
    properties: {
      app: { type: 'string' },
      integrationType: {
        type: 'string',
        enum: ['Epic', 'Financial', 'Both']
      }
    },
    required: ['app']
  },
  async (args) => {
    // ... integration analysis logic
    return { epicPoints: 12, financialPoints: 8 };
  }
);

// Add MCP routes
registry.addRoutesToApp(app);

// Now AI agents can discover tools:
// POST /mcp/tools/list → Returns all available tools
// POST /mcp/tools/call → Calls a specific tool

app.listen(3001, () => {
  console.log('Code Analyzer MCP with tool registry on port 3001');
  console.log(`Registered ${registry.tools.size} tools`);
});
