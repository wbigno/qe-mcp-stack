import { jest } from "@jest/globals";

/**
 * Mock factories for common dependencies
 */

// Mock MCPManager
export const createMockMcpManager = () => ({
  callDockerMcp: jest.fn(),
  callStdioMcp: jest.fn(),
  spawnStdioMcp: jest.fn(),
  getStatus: jest.fn(() => ({
    summary: { mcpsHealthy: 15, mcpsTotal: 15 },
  })),
  dockerMcps: {
    azureDevOps: { status: "healthy", url: "http://azure-devops:8100" },
    dotnetCodeAnalyzer: { status: "healthy", url: "http://code-analyzer:8200" },
  },
  waitForDockerMcps: jest.fn(),
  startHealthChecks: jest.fn(),
  checkDashboards: jest.fn(),
  initialize: jest.fn(),
  // Swagger documentation methods
  getSwaggerDocs: jest.fn(),
  getAllSwaggerDocs: jest.fn(),
  getAggregatedSwaggerSpec: jest.fn(),
});

// Mock Express request
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  mcpManager: createMockMcpManager(),
  ...overrides,
});

// Mock Express response
export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  return res;
};

// Mock Claude AI responses
export const mockClaudeResponse = (text) => text;

// eslint-disable-next-line no-unused-vars
export const mockClaudeTestCode = (framework = "MSTest") => `
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class GeneratedTests
{
    [TestMethod]
    public void TestMethod1()
    {
        // Generated test
        Assert.IsTrue(true);
    }
}
`;

// Mock file system responses
export const mockCodeFile = (type = "csharp") => {
  if (type === "csharp") {
    return `
public class UserService
{
    public User GetUser(int id)
    {
        // Implementation
    }
}
`;
  }
  return "function test() { return true; }";
};

// Mock axios responses for MCP calls
export const mockMcpResponse = (data) => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
});
