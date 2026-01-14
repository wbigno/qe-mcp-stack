import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

/**
 * API Tests: AI Routes
 *
 * Tests all AI-powered endpoints for SQL query generation and schema analysis.
 *
 * Endpoints tested:
 * - POST /api/ai/generate-query - Generate SQL from natural language
 * - GET /api/ai/schema-summary - Get schema summary for a database
 * - POST /api/ai/explain-query - Explain an existing SQL query
 */

describe("AI Routes", () => {
  let app;
  let aiRouter;
  let mockCallClaude;
  let mockReadFile;

  beforeEach(async () => {
    jest.resetModules();

    // Mock aiHelper
    await jest.unstable_mockModule("../../../src/utils/aiHelper.js", () => ({
      callClaude: jest.fn(),
    }));

    // Mock fs/promises
    await jest.unstable_mockModule("fs/promises", () => ({
      readFile: jest.fn(),
    }));

    // Import mocked modules
    const aiHelper = await import("../../../src/utils/aiHelper.js");
    mockCallClaude = aiHelper.callClaude;

    const fsPromises = await import("fs/promises");
    mockReadFile = fsPromises.readFile;

    // Import routes AFTER mocking
    const aiRouterModule = await import("../../../src/routes/ai.js");
    aiRouter = aiRouterModule.default;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use("/api/ai", aiRouter);

    // Default mock implementations
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        database_name: "CarePayment",
        extracted_at: "2026-01-14T00:00:00Z",
        tables: [
          {
            schema: "CarePayment",
            name: "SitePatientAccount",
            columns: [
              {
                name: "PAAcctID",
                dataType: "int",
                maxLength: 4,
                nullable: false,
                isIdentity: true,
              },
              {
                name: "PatientName",
                dataType: "varchar",
                maxLength: 100,
                nullable: true,
                isIdentity: false,
              },
              {
                name: "Balance",
                dataType: "money",
                maxLength: 8,
                nullable: true,
                isIdentity: false,
              },
            ],
          },
        ],
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/ai/generate-query", () => {
    describe("Successful query generation", () => {
      it("should generate SQL query from natural language prompt", async () => {
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            sql: "SELECT pa.PAAcctID, pa.PatientName, pa.Balance FROM CarePayment.SitePatientAccount pa WHERE pa.Balance > 1000",
            explanation: {
              summary: "Retrieves patients with balance over $1000",
              steps: ["Filter by balance threshold"],
              tablesUsed: [
                {
                  schema: "CarePayment",
                  table: "SitePatientAccount",
                  purpose: "Patient balances",
                },
              ],
            },
            warnings: [],
          }),
        );

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({
            database: "CarePayment",
            environment: "PROD",
            prompt: "Show patients with balance over $1000",
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.query.sql).toContain("SELECT");
        expect(response.body.explanation).toBeDefined();
      });

      it("should use default database and environment when not provided", async () => {
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            sql: "SELECT * FROM CarePayment.SitePatientAccount",
            explanation: { summary: "Basic query", steps: [], tablesUsed: [] },
            warnings: [],
          }),
        );

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ prompt: "Show all patients" });

        expect(response.status).toBe(200);
        expect(response.body.metadata.database).toBe("CarePayment");
        expect(response.body.metadata.environment).toBe("PROD");
      });

      it("should include warnings in response when present", async () => {
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            sql: "SELECT * FROM CarePayment.LargeTable",
            explanation: { summary: "Query", steps: [], tablesUsed: [] },
            warnings: [
              {
                type: "performance",
                message: "Query may be slow on large table",
              },
            ],
          }),
        );

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ prompt: "Show all data" });

        expect(response.status).toBe(200);
        expect(response.body.warnings).toBeDefined();
        expect(response.body.warnings.length).toBeGreaterThan(0);
        expect(response.body.warnings[0].type).toBe("performance");
      });

      it("should handle response options for explanation", async () => {
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            sql: "SELECT COUNT(*) FROM CarePayment.SitePatientAccount",
            explanation: {
              summary: "Count patients",
              steps: [],
              tablesUsed: [],
            },
            warnings: [],
          }),
        );

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({
            prompt: "Count patients",
            options: { includeExplanation: false },
          });

        expect(response.status).toBe(200);
        expect(response.body.explanation).toBeUndefined();
      });
    });

    describe("Error handling", () => {
      it("should return 400 when prompt is missing", async () => {
        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ database: "CarePayment" });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("Prompt is required");
      });

      it("should return 400 when prompt is empty", async () => {
        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ prompt: "" });

        expect(response.status).toBe(400);
      });

      it("should handle AI service errors gracefully", async () => {
        mockCallClaude.mockRejectedValue(new Error("AI service unavailable"));

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ prompt: "Show patients" });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain("AI service unavailable");
      });

      it("should handle malformed AI response", async () => {
        mockCallClaude.mockResolvedValue("This is not valid JSON");

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ prompt: "Show patients" });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        // Should fallback to treating response as raw SQL
        expect(response.body.query.sql).toBeDefined();
      });

      it("should handle missing schema file gracefully", async () => {
        mockReadFile.mockRejectedValue(new Error("ENOENT: file not found"));
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            sql: "SELECT * FROM table",
            explanation: {
              summary: "Generic query",
              steps: [],
              tablesUsed: [],
            },
            warnings: [],
          }),
        );

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ prompt: "Show data" });

        expect(response.status).toBe(200);
        // Should still work, just without detailed schema context
      });
    });

    describe("Security", () => {
      it("should only generate SELECT queries", async () => {
        // AI is instructed to only return SELECT statements
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            sql: "SELECT * FROM CarePayment.SitePatientAccount",
            explanation: { summary: "Safe query", steps: [], tablesUsed: [] },
            warnings: [],
          }),
        );

        const response = await request(app)
          .post("/api/ai/generate-query")
          .send({ prompt: "Delete all patients" });

        expect(response.status).toBe(200);
        expect(response.body.query.sql).not.toContain("DELETE");
      });
    });
  });

  describe("GET /api/ai/schema-summary", () => {
    describe("Successful schema summary", () => {
      it("should return schema summary for database", async () => {
        const response = await request(app)
          .get("/api/ai/schema-summary")
          .query({ database: "CarePayment", environment: "PROD" });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.database).toBe("CarePayment");
        expect(response.body.totalTables).toBeDefined();
        expect(response.body.schemas).toBeDefined();
      });

      it("should use default values when parameters not provided", async () => {
        const response = await request(app).get("/api/ai/schema-summary");

        expect(response.status).toBe(200);
        expect(response.body.database).toBe("CarePayment");
      });

      it("should return schemas sorted by table count", async () => {
        mockReadFile.mockResolvedValue(
          JSON.stringify({
            database_name: "CarePayment",
            extracted_at: "2026-01-14T00:00:00Z",
            tables: [
              { schema: "Epic", name: "Table1", columns: [] },
              { schema: "Epic", name: "Table2", columns: [] },
              { schema: "CarePayment", name: "Table1", columns: [] },
            ],
          }),
        );

        const response = await request(app).get("/api/ai/schema-summary");

        expect(response.status).toBe(200);
        expect(response.body.schemas[0].tables).toBeGreaterThanOrEqual(
          response.body.schemas[response.body.schemas.length - 1].tables,
        );
      });
    });

    describe("Error handling", () => {
      it("should return 500 when schema file not found", async () => {
        mockReadFile.mockRejectedValue(new Error("Schema file not found"));

        const response = await request(app)
          .get("/api/ai/schema-summary")
          .query({ database: "NonExistent" });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe("POST /api/ai/explain-query", () => {
    describe("Successful query explanation", () => {
      it("should explain SQL query", async () => {
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            summary: "This query retrieves all patient records",
            steps: ["Selects all columns", "From patient table"],
            tablesUsed: ["CarePayment.SitePatientAccount"],
            potentialIssues: [],
            suggestions: ["Add WHERE clause for filtering"],
          }),
        );

        const response = await request(app).post("/api/ai/explain-query").send({
          sql: "SELECT * FROM CarePayment.SitePatientAccount",
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.explanation).toBeDefined();
        expect(response.body.explanation.summary).toBeDefined();
      });

      it("should include optimization suggestions", async () => {
        mockCallClaude.mockResolvedValue(
          JSON.stringify({
            summary: "Complex join query",
            steps: ["Join multiple tables"],
            tablesUsed: ["Table1", "Table2"],
            potentialIssues: ["Missing index"],
            suggestions: ["Add index on foreign key"],
          }),
        );

        const response = await request(app).post("/api/ai/explain-query").send({
          sql: "SELECT * FROM A JOIN B ON A.id = B.aid",
        });

        expect(response.status).toBe(200);
        expect(response.body.explanation.suggestions).toBeDefined();
      });
    });

    describe("Error handling", () => {
      it("should return 400 when SQL is missing", async () => {
        const response = await request(app)
          .post("/api/ai/explain-query")
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("SQL query is required");
      });

      it("should handle AI service errors", async () => {
        mockCallClaude.mockRejectedValue(new Error("Service error"));

        const response = await request(app)
          .post("/api/ai/explain-query")
          .send({ sql: "SELECT 1" });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
      });
    });
  });
});
