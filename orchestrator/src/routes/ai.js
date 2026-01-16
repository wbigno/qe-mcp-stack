/**
 * AI Routes - Query Generation and Schema Analysis
 */

import express from "express";
import { callClaude } from "../utils/aiHelper.js";
import { logger } from "../utils/logger.js";
import fs from "fs/promises";
import path from "path";

const router = express.Router();

// Schema cache to avoid reloading
const schemaCache = new Map();

/**
 * Load schema from file
 */
async function loadSchema(database, environment = "PROD") {
  const cacheKey = `${database}_${environment}`;

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey);
  }

  try {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(process.cwd(), "schemas", `${database}_${environment}.json`),
      path.join(
        process.cwd(),
        "..",
        "schemas",
        `${database}_${environment}.json`,
      ),
      `/app/schemas/${database}_${environment}.json`,
    ];

    for (const schemaPath of possiblePaths) {
      try {
        const data = await fs.readFile(schemaPath, "utf-8");
        const schema = JSON.parse(data);
        schemaCache.set(cacheKey, schema);
        logger.info(`Loaded schema from ${schemaPath}`);
        return schema;
      } catch (e) {
        // Try next path
      }
    }

    throw new Error(`Schema file not found for ${database}_${environment}`);
  } catch (error) {
    logger.error(`Failed to load schema: ${error.message}`);
    throw error;
  }
}

/**
 * Build schema context for AI prompt
 */
function buildSchemaContext(schema, maxTables = 100) {
  if (!schema?.tables) return "";

  // Group by schema
  const schemaGroups = {};
  schema.tables.forEach((table) => {
    if (!schemaGroups[table.schema]) {
      schemaGroups[table.schema] = [];
    }
    schemaGroups[table.schema].push(table);
  });

  // Build context string
  let context = `Database: ${schema.database_name}\n`;
  context += `Total Tables: ${schema.tables.length}\n`;
  context += `Schemas: ${Object.keys(schemaGroups).join(", ")}\n\n`;

  // Add key tables (limit to avoid token limits)
  const keySchemas = [
    "CarePayment",
    "Accounting",
    "Epic",
    "FiServ",
    "ClientData",
  ];
  let tableCount = 0;

  for (const schemaName of keySchemas) {
    const tables = schemaGroups[schemaName] || [];
    if (tables.length === 0) continue;

    context += `\n=== Schema: ${schemaName} (${tables.length} tables) ===\n`;

    for (const table of tables.slice(0, 20)) {
      if (tableCount >= maxTables) break;

      context += `\nTable: ${schemaName}.${table.name}\n`;
      context += `Columns:\n`;

      table.columns?.slice(0, 15).forEach((col) => {
        const pk = col.isIdentity ? " (PK)" : "";
        const nullable = col.nullable ? "" : " NOT NULL";
        context += `  - ${col.name}: ${col.dataType}${nullable}${pk}\n`;
      });

      if (table.columns?.length > 15) {
        context += `  ... and ${table.columns.length - 15} more columns\n`;
      }

      tableCount++;
    }

    if (tables.length > 20) {
      context += `\n... and ${tables.length - 20} more tables in ${schemaName}\n`;
    }
  }

  // Add other schemas summary
  const otherSchemas = Object.keys(schemaGroups).filter(
    (s) => !keySchemas.includes(s),
  );
  if (otherSchemas.length > 0) {
    context += `\n=== Other Schemas ===\n`;
    otherSchemas.forEach((s) => {
      context += `- ${s}: ${schemaGroups[s].length} tables\n`;
    });
  }

  return context;
}

/**
 * POST /api/ai/generate-query
 * Generate SQL query from natural language
 */
router.post("/generate-query", async (req, res) => {
  try {
    const { database, environment, prompt, options } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const db = database || "CarePayment";
    const env = environment || "PROD";

    logger.info(`Generating query for: ${db} (${env}) - "${prompt}"`);

    // Load schema
    let schemaContext = "";
    try {
      const schema = await loadSchema(db, env);
      schemaContext = buildSchemaContext(schema);
    } catch (error) {
      logger.warn(
        `Could not load schema: ${error.message}. Using generic context.`,
      );
      schemaContext = `Database: ${db}\nNote: Detailed schema not available. Generate best-effort query.`;
    }

    // Build AI prompt
    const systemPrompt = `You are a SQL Server expert assistant. Generate optimized T-SQL queries based on user requests.

RULES:
1. Generate ONLY SELECT statements - never INSERT, UPDATE, DELETE, DROP, or any data modification
2. Always use fully qualified table names (Schema.TableName)
3. Use appropriate JOINs based on likely relationships
4. Include helpful column aliases for clarity
5. Add ORDER BY for meaningful result ordering
6. Consider performance - avoid SELECT * on large tables, use TOP when appropriate
7. For date filters, use DATEADD and GETDATE() functions
8. Format the SQL nicely with proper indentation

DATABASE SCHEMA:
${schemaContext}

RESPONSE FORMAT:
Return your response as JSON with this structure:
{
  "sql": "YOUR SQL QUERY HERE",
  "explanation": {
    "summary": "Brief description of what the query does",
    "steps": ["Step 1 explanation", "Step 2 explanation"],
    "tablesUsed": [
      {"schema": "SchemaName", "table": "TableName", "purpose": "Why this table is used"}
    ]
  },
  "warnings": [
    {"type": "performance|logic|safety", "message": "Warning description"}
  ]
}`;

    const userPrompt = `Generate a SQL query for this request: ${prompt}`;

    // Call Claude
    const aiResponse = await callClaude(
      `${systemPrompt}\n\n${userPrompt}`,
      null,
      4096,
    );

    // Parse response
    let result;
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: treat entire response as SQL
        result = {
          sql: aiResponse,
          explanation: {
            summary: "Query generated",
            steps: [],
            tablesUsed: [],
          },
          warnings: [],
        };
      }
    } catch (parseError) {
      logger.warn(`Could not parse AI response as JSON: ${parseError.message}`);
      result = {
        sql: aiResponse,
        explanation: { summary: "Query generated", steps: [], tablesUsed: [] },
        warnings: [
          { type: "logic", message: "Response format was non-standard" },
        ],
      };
    }

    res.json({
      success: true,
      query: {
        sql: result.sql,
        formatted: true,
      },
      explanation:
        options?.includeExplanation !== false ? result.explanation : undefined,
      warnings:
        options?.includeWarnings !== false ? result.warnings : undefined,
      metadata: {
        database: db,
        environment: env,
        prompt: prompt,
      },
    });
  } catch (error) {
    logger.error(`Query generation error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/schema-summary
 * Get schema summary for a database
 */
router.get("/schema-summary", async (req, res) => {
  try {
    const { database, environment } = req.query;
    const db = database || "CarePayment";
    const env = environment || "PROD";

    const schema = await loadSchema(db, env);

    // Build summary
    const schemaGroups = {};
    schema.tables.forEach((table) => {
      if (!schemaGroups[table.schema]) {
        schemaGroups[table.schema] = { tables: 0, columns: 0 };
      }
      schemaGroups[table.schema].tables++;
      schemaGroups[table.schema].columns += table.columns?.length || 0;
    });

    res.json({
      success: true,
      database: schema.database_name,
      environment: env,
      extractedAt: schema.extracted_at,
      totalTables: schema.tables.length,
      totalColumns: schema.tables.reduce(
        (sum, t) => sum + (t.columns?.length || 0),
        0,
      ),
      schemas: Object.entries(schemaGroups)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.tables - a.tables),
    });
  } catch (error) {
    logger.error(`Schema summary error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/explain-query
 * Explain an existing SQL query
 */
router.post("/explain-query", async (req, res) => {
  try {
    const { sql, database } = req.body;

    if (!sql) {
      return res.status(400).json({ error: "SQL query is required" });
    }

    const prompt = `Explain this SQL Server query in simple terms. Describe what it does, which tables it uses, and any potential issues.

SQL Query:
${sql}

Respond with JSON:
{
  "summary": "Brief description",
  "steps": ["What each part does"],
  "tablesUsed": ["List of tables"],
  "potentialIssues": ["Any concerns"],
  "suggestions": ["Optimization suggestions"]
}`;

    const aiResponse = await callClaude(prompt, null, 2048);

    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: aiResponse };
    } catch {
      result = { summary: aiResponse };
    }

    res.json({
      success: true,
      explanation: result,
    });
  } catch (error) {
    logger.error(`Query explanation error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
