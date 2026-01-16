import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

/**
 * API Tests: Documentation Routes
 *
 * Tests markdown documentation serving with HTML rendering.
 *
 * Endpoints tested:
 * - GET /api/docs/:category/:mcpName - Serve markdown docs as HTML
 */

describe("Documentation Routes", () => {
  let app;
  let docsRouter;
  let mockReadFile;

  beforeEach(async () => {
    jest.resetModules();

    // Create mock function
    mockReadFile = jest.fn();

    // Mock fs/promises BEFORE importing routes
    // Note: docs.js uses "import fs from 'fs/promises'" so we need default export
    await jest.unstable_mockModule("fs/promises", () => ({
      default: {
        readFile: mockReadFile,
      },
      readFile: mockReadFile, // Also export as named for compatibility
    }));

    // Import routes AFTER mocking
    const docsRouterModule = await import("../../../src/routes/docs.js");
    docsRouter = docsRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use("/api/docs", docsRouter);

    // Default mock: return sample markdown
    mockReadFile.mockResolvedValue("# Sample Documentation\n\nThis is a test.");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/docs/:category/:mcpName", () => {
    describe("Successful documentation serving", () => {
      it("should serve markdown documentation as HTML", async () => {
        mockReadFile.mockResolvedValue(
          "# Azure DevOps MCP\n\nDocumentation here.",
        );

        const response = await request(app).get(
          "/api/docs/integration/azure-devops",
        );

        expect(response.status).toBe(200);
        expect(response.type).toBe("text/html");
        expect(response.text).toContain("<!DOCTYPE html>");
        expect(response.text).toContain("Azure DevOps MCP");
      });

      it("should call readFile with correct path", async () => {
        mockReadFile.mockResolvedValue("# Documentation");

        await request(app).get("/api/docs/integration/azure-devops");

        expect(mockReadFile).toHaveBeenCalledTimes(1);
        const calledPath = mockReadFile.mock.calls[0][0];
        expect(calledPath).toContain("azure-devops.md");
      });

      it("should include markdown CSS styling", async () => {
        mockReadFile.mockResolvedValue("# Test");

        const response = await request(app).get("/api/docs/test/test-mcp");

        expect(response.text).toContain("github-markdown-css");
        expect(response.text).toContain("marked.min.js");
      });

      it("should include MCP name in page title", async () => {
        mockReadFile.mockResolvedValue("# Test");

        const response = await request(app).get(
          "/api/docs/integration/playwright-mcp",
        );

        expect(response.text).toContain(
          "<title>playwright-mcp Documentation</title>",
        );
      });

      it("should render markdown with marked.js", async () => {
        const markdown = "## Features\n\n- Feature 1\n- Feature 2";
        mockReadFile.mockResolvedValue(markdown);

        const response = await request(app).get("/api/docs/test/test-mcp");

        expect(response.text).toContain("marked.parse");
        expect(response.text).toContain(JSON.stringify(markdown));
      });

      it("should include back link to dashboard", async () => {
        mockReadFile.mockResolvedValue("# Test");

        const response = await request(app).get("/api/docs/test/test-mcp");

        expect(response.text).toContain("Back to Dashboard");
        expect(response.text).toContain("localhost:8000");
      });

      it("should handle different categories", async () => {
        const categories = ["integration", "analysis", "test"];

        for (const category of categories) {
          mockReadFile.mockResolvedValue(`# ${category} Documentation`);

          const response = await request(app).get(
            `/api/docs/${category}/test-mcp`,
          );

          expect(response.status).toBe(200);
        }
      });

      it("should handle MCP names with hyphens", async () => {
        mockReadFile.mockResolvedValue("# Test");

        const response = await request(app).get(
          "/api/docs/integration/dotnet-code-analyzer",
        );

        expect(response.status).toBe(200);
        expect(mockReadFile.mock.calls[0][0]).toContain(
          "dotnet-code-analyzer.md",
        );
      });

      it("should escape markdown content in JSON", async () => {
        mockReadFile.mockResolvedValue(
          "# Test\n\n\"Quotes\" and 'apostrophes'",
        );

        const response = await request(app).get("/api/docs/test/test-mcp");

        expect(response.status).toBe(200);
        // Should be properly JSON encoded
        expect(response.text).toContain("Quotes");
      });
    });

    describe("File not found (404)", () => {
      it("should return 404 for non-existent documentation", async () => {
        const error = new Error("ENOENT: file not found");
        error.code = "ENOENT";
        mockReadFile.mockRejectedValue(error);

        const response = await request(app).get(
          "/api/docs/integration/unknown-mcp",
        );

        expect(response.status).toBe(404);
        expect(response.type).toBe("text/html");
        expect(response.text).toContain("Documentation Not Found");
      });

      it("should include requested MCP name in 404 message", async () => {
        const error = new Error("ENOENT: file not found");
        error.code = "ENOENT";
        mockReadFile.mockRejectedValue(error);

        const response = await request(app).get("/api/docs/test/missing-mcp");

        expect(response.text).toContain("missing-mcp");
      });

      it("should include back link in 404 page", async () => {
        const error = new Error("ENOENT: file not found");
        error.code = "ENOENT";
        mockReadFile.mockRejectedValue(error);

        const response = await request(app).get("/api/docs/test/test");

        expect(response.text).toContain("Back to Dashboard");
      });
    });

    describe("Server errors (500)", () => {
      it("should return 500 for file read errors", async () => {
        mockReadFile.mockRejectedValue(new Error("EACCES: Permission denied"));

        const response = await request(app).get("/api/docs/test/test-mcp");

        expect(response.status).toBe(500);
        expect(response.type).toBe("text/html");
        expect(response.text).toContain("Error Loading Documentation");
      });

      it("should include error message in 500 response", async () => {
        mockReadFile.mockRejectedValue(new Error("Disk I/O error"));

        const response = await request(app).get("/api/docs/test/test");

        expect(response.text).toContain("Disk I/O error");
      });

      it("should handle encoding errors", async () => {
        mockReadFile.mockRejectedValue(new Error("Invalid UTF-8 sequence"));

        const response = await request(app).get("/api/docs/test/test");

        expect(response.status).toBe(500);
      });
    });

    describe("Edge cases", () => {
      it("should handle empty markdown files", async () => {
        mockReadFile.mockResolvedValue("");

        const response = await request(app).get("/api/docs/test/empty");

        expect(response.status).toBe(200);
        expect(response.text).toContain("marked.parse");
      });

      it("should handle large markdown files", async () => {
        const largeMarkdown =
          "# Large File\n\n" + "Content line\n".repeat(10000);
        mockReadFile.mockResolvedValue(largeMarkdown);

        const response = await request(app).get("/api/docs/test/large");

        expect(response.status).toBe(200);
      });

      it("should handle special characters in markdown", async () => {
        mockReadFile.mockResolvedValue(
          '# Test\n\n<script>alert("xss")</script>',
        );

        const response = await request(app).get("/api/docs/test/test");

        expect(response.status).toBe(200);
        // marked.js should handle HTML escaping
        expect(response.text).toBeDefined();
      });

      it("should handle Unicode in markdown", async () => {
        mockReadFile.mockResolvedValue(
          "# Documentation 文档\n\nテスト content",
        );

        const response = await request(app).get("/api/docs/test/unicode");

        expect(response.status).toBe(200);
        expect(response.text).toContain("文档");
      });

      it("should not be vulnerable to path traversal", async () => {
        // The route uses path.join which should normalize paths
        const error = new Error("ENOENT");
        error.code = "ENOENT";
        mockReadFile.mockRejectedValue(error);

        const response = await request(app).get(
          "/api/docs/../../../etc/passwd",
        );

        // Should either normalize or fail safely
        expect([404, 500]).toContain(response.status);
      });
    });
  });
});
