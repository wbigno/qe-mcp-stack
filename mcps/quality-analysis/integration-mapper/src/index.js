import express from "express";
import { DotNetAnalyzer } from "../../../shared/dotnet-analyzer.js";
import { IntegrationDetector } from "./integrationDetector.js";

const app = express();
const PORT = process.env.PORT || 3008;

app.use(express.json());

const analyzer = new DotNetAnalyzer();
const detector = new IntegrationDetector();

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "integration-mapper-mcp",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

app.post("/map-integrations", async (req, res) => {
  try {
    const { app: appName, integrationType, includeDiagram } = req.body;

    if (!appName) {
      return res.status(400).json({
        success: false,
        error: "app parameter required",
      });
    }

    console.log(`[integration-mapper] Mapping integrations for ${appName}...`);
    console.log(
      `[integration-mapper] Integration type filter: ${integrationType || "all"}`,
    );
    console.log(
      `[integration-mapper] Include diagram: ${includeDiagram || false}`,
    );

    // Load app configuration
    const appConfig = await analyzer.loadAppConfig(appName);
    console.log(`[integration-mapper] App path: ${appConfig.path}`);

    // Scan and parse C# files
    const files = await analyzer.scanCSharpFiles(appConfig.path, false);
    console.log(
      `[integration-mapper] Found ${files.length} C# files to analyze`,
    );

    const parsedFiles = [];
    for (const file of files) {
      const parsed = await analyzer.parseFile(file.fullPath);
      if (parsed) {
        parsedFiles.push(parsed);
      }
    }

    console.log(
      `[integration-mapper] Successfully parsed ${parsedFiles.length} files`,
    );

    // Discover integrations using IntegrationDetector
    const discoveryResult = await detector.discoverIntegrations(
      appConfig,
      parsedFiles,
    );

    // Filter by integration type if specified
    let filteredIntegrations = discoveryResult.integrations;
    let filteredByType = discoveryResult.integrationsByType;

    if (integrationType && integrationType !== "all") {
      console.log(`[integration-mapper] Filtering by type: ${integrationType}`);
      filteredIntegrations = discoveryResult.integrations.filter(
        (i) => i.type === integrationType,
      );
      filteredByType = {
        [integrationType]: filteredByType[integrationType] || [],
      };
    }

    // Build response
    const response = {
      success: true,
      app: appName,
      timestamp: new Date().toISOString(),
      result: {
        integrations: filteredIntegrations,
        integrationsByType: filteredByType,
        summary: {
          total: filteredIntegrations.length,
          byType: {},
        },
        metadata: {
          version: "2.0.0",
          mcpType: "integration-mapper",
          totalFilesScanned: parsedFiles.length,
        },
      },
    };

    // Recalculate summary for filtered results
    for (const [type, items] of Object.entries(filteredByType)) {
      response.result.summary.byType[type] = items.length;
    }

    // Generate diagram if requested
    if (includeDiagram) {
      console.log(`[integration-mapper] Generating Mermaid diagram...`);
      const diagram = await detector.generateDiagram(
        filteredIntegrations,
        appName,
      );
      response.result.diagram = diagram;
    }

    console.log(
      `[integration-mapper] Analysis complete: ${filteredIntegrations.length} integrations found`,
    );
    console.log(
      `[integration-mapper] Integration summary:`,
      response.result.summary.byType,
    );

    res.json(response);
  } catch (error) {
    console.error(`[integration-mapper] Error:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

app.listen(PORT, () => {
  console.log(`integration-mapper MCP running on port ${PORT}`);
  console.log("Endpoints:");
  console.log("  POST /map-integrations");
  console.log("  GET  /health");
});
