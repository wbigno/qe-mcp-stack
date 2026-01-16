/**
 * Blast Radius Analyzer
 * Core analysis logic for determining impact of code changes
 */

import { FuzzyMatcher } from "./fuzzyMatcher.js";
import { DependencyGraph } from "./dependencyGraph.js";

// Integration risk levels based on type
const INTEGRATION_RISK = {
  Epic: { level: "critical", weight: 5 },
  EHR: { level: "critical", weight: 5 },
  Financial: { level: "critical", weight: 5 },
  Payment: { level: "critical", weight: 5 },
  ExternalAPI: { level: "high", weight: 4 },
  Database: { level: "high", weight: 4 },
  Messaging: { level: "medium", weight: 3 },
  InternalService: { level: "medium", weight: 2 },
  UI: { level: "low", weight: 1 },
};

export class BlastRadiusAnalyzer {
  constructor() {
    this.fuzzyMatcher = new FuzzyMatcher();
    this.dependencyGraph = new DependencyGraph();
  }

  /**
   * Main analysis method - calculates blast radius for changed files
   */
  async analyzeBlastRadius(app, changedFiles, depth = 2) {
    console.log(
      `[Analyzer] Starting blast radius analysis for ${changedFiles.length} files`,
    );

    // 1. Resolve files with fuzzy matching
    const resolvedFiles = await this.resolveFilesWithFuzzy(app, changedFiles);
    console.log(
      `[Analyzer] Resolved ${resolvedFiles.filter((f) => f.exists).length} of ${changedFiles.length} files`,
    );

    // 2. Build dependency graph
    const depGraph = await this.dependencyGraph.build(
      app,
      resolvedFiles.filter((f) => f.exists).map((f) => f.path),
    );

    // 3. Calculate affected components (2-level transitive)
    const affectedComponents = this.getAffectedComponents(
      depGraph,
      resolvedFiles,
      depth,
    );

    // 4. Identify affected integrations
    const affectedIntegrations =
      this.identifyAffectedIntegrations(affectedComponents);

    // 5. Identify affected tests
    const affectedTests = this.identifyAffectedTests(affectedComponents);

    // 6. Calculate risk score
    const risk = this.calculateRiskScore(
      affectedComponents,
      affectedIntegrations,
      affectedTests,
    );

    // 7. Generate recommendations
    const recommendations = this.generateRecommendations(
      risk,
      affectedComponents,
      affectedIntegrations,
    );

    // Get file insights from dependency graph
    const fileInsights = {};
    for (const file of resolvedFiles.filter((f) => f.exists)) {
      const insights = depGraph.getFileInsights(file.path);
      if (insights) {
        fileInsights[file.path] = insights;
      }
    }

    return {
      risk,
      changedFiles: resolvedFiles,
      impact: {
        affectedComponents: affectedComponents.map((c) => c.name),
        affectedTests: affectedTests.map((t) => t.name),
        affectedIntegrations: affectedIntegrations.map((i) => i.type),
        directDependencies: affectedComponents.filter((c) => c.depth === 1)
          .length,
        transitiveDependencies: affectedComponents.filter((c) => c.depth > 1)
          .length,
      },
      fileInsights,
      recommendations,
    };
  }

  /**
   * Resolve file paths using fuzzy matching
   */
  async resolveFilesWithFuzzy(app, searchPaths) {
    const results = [];

    for (const searchPath of searchPaths) {
      const result = await this.fuzzyMatcher.findSimilarFile(app, searchPath);
      results.push(result);
    }

    return results;
  }

  /**
   * Get file dependencies
   */
  async getFileDependencies(app, file) {
    return await this.dependencyGraph.getDependencies(app, file);
  }

  /**
   * Get components affected by changes up to specified depth
   */
  getAffectedComponents(depGraph, changedFiles, depth) {
    const affected = new Map();
    const queue = [];

    // Initialize with changed files at depth 0
    for (const file of changedFiles.filter((f) => f.exists)) {
      const component = {
        name: file.path,
        type: this.getComponentType(file.path),
        depth: 0,
        changedDirectly: true,
      };
      affected.set(file.path, component);
      queue.push({ path: file.path, currentDepth: 0 });
    }

    // BFS to find affected components up to specified depth
    while (queue.length > 0) {
      const { path, currentDepth } = queue.shift();

      if (currentDepth >= depth) continue;

      const dependents = depGraph.getDependents(path) || [];
      for (const dependent of dependents) {
        if (!affected.has(dependent)) {
          const component = {
            name: dependent,
            type: this.getComponentType(dependent),
            depth: currentDepth + 1,
            changedDirectly: false,
          };
          affected.set(dependent, component);
          queue.push({ path: dependent, currentDepth: currentDepth + 1 });
        }
      }
    }

    return Array.from(affected.values());
  }

  /**
   * Determine component type from file path
   */
  getComponentType(filePath) {
    const lower = filePath.toLowerCase();
    if (lower.includes("controller")) return "Controller";
    if (lower.includes("service")) return "Service";
    if (lower.includes("repository")) return "Repository";
    if (lower.includes("model") || lower.includes("entity")) return "Model";
    if (lower.includes("test")) return "Test";
    if (lower.includes("integration")) return "Integration";
    if (lower.includes("middleware")) return "Middleware";
    if (lower.includes("handler")) return "Handler";
    if (lower.includes("helper") || lower.includes("util")) return "Utility";
    return "Component";
  }

  /**
   * Identify integrations affected by changes
   */
  identifyAffectedIntegrations(affectedComponents) {
    const integrations = [];

    for (const component of affectedComponents) {
      const lower = component.name.toLowerCase();

      // Check for known integration patterns
      if (lower.includes("epic") || lower.includes("ehr")) {
        integrations.push({
          type: "Epic",
          file: component.name,
          ...INTEGRATION_RISK["Epic"],
        });
      }
      if (
        lower.includes("financial") ||
        lower.includes("billing") ||
        lower.includes("payment")
      ) {
        integrations.push({
          type: "Financial",
          file: component.name,
          ...INTEGRATION_RISK["Financial"],
        });
      }
      if (
        lower.includes("stripe") ||
        lower.includes("paypal") ||
        lower.includes("gateway")
      ) {
        integrations.push({
          type: "Payment",
          file: component.name,
          ...INTEGRATION_RISK["Payment"],
        });
      }
      if (lower.includes("api") && lower.includes("client")) {
        integrations.push({
          type: "ExternalAPI",
          file: component.name,
          ...INTEGRATION_RISK["ExternalAPI"],
        });
      }
      if (
        lower.includes("repository") ||
        lower.includes("dbcontext") ||
        lower.includes("database")
      ) {
        integrations.push({
          type: "Database",
          file: component.name,
          ...INTEGRATION_RISK["Database"],
        });
      }
      if (
        lower.includes("message") ||
        lower.includes("queue") ||
        lower.includes("event")
      ) {
        integrations.push({
          type: "Messaging",
          file: component.name,
          ...INTEGRATION_RISK["Messaging"],
        });
      }
    }

    // Deduplicate by type
    const uniqueIntegrations = [];
    const seenTypes = new Set();
    for (const integration of integrations) {
      if (!seenTypes.has(integration.type)) {
        seenTypes.add(integration.type);
        uniqueIntegrations.push(integration);
      }
    }

    return uniqueIntegrations;
  }

  /**
   * Identify tests affected by changes
   */
  identifyAffectedTests(affectedComponents) {
    return affectedComponents
      .filter((c) => c.name.toLowerCase().includes("test"))
      .map((c) => ({
        name: c.name,
        type: this.getTestType(c.name),
        directlyAffected: c.changedDirectly,
      }));
  }

  /**
   * Determine test type from file name
   */
  getTestType(testPath) {
    const lower = testPath.toLowerCase();
    if (lower.includes("integration")) return "Integration";
    if (lower.includes("e2e") || lower.includes("end-to-end")) return "E2E";
    if (lower.includes("unit")) return "Unit";
    if (lower.includes("api")) return "API";
    return "Unit";
  }

  /**
   * Calculate overall risk score
   */
  calculateRiskScore(affectedComponents, affectedIntegrations, affectedTests) {
    let score = 0;
    let maxScore = 100;

    // Base score from number of affected components
    const componentScore = Math.min(affectedComponents.length * 5, 30);
    score += componentScore;

    // Integration risk (highest impact)
    let integrationScore = 0;
    for (const integration of affectedIntegrations) {
      integrationScore += integration.weight * 10;
    }
    score += Math.min(integrationScore, 50);

    // Test coverage risk (if tests are directly affected, higher risk)
    const directlyAffectedTests = affectedTests.filter(
      (t) => t.directlyAffected,
    ).length;
    score += Math.min(directlyAffectedTests * 5, 20);

    // Normalize to 100
    score = Math.min(score, maxScore);

    // Determine level
    let level;
    if (score >= 70) level = "critical";
    else if (score >= 50) level = "high";
    else if (score >= 30) level = "medium";
    else level = "low";

    return {
      score,
      level,
      description: this.getRiskDescription(
        level,
        affectedComponents.length,
        affectedIntegrations.length,
      ),
    };
  }

  /**
   * Get risk description
   */
  getRiskDescription(level, componentCount, integrationCount) {
    const descriptions = {
      critical: `Critical risk: ${componentCount} components affected with ${integrationCount} critical integrations. Comprehensive testing required.`,
      high: `High risk: ${componentCount} components affected. Thorough testing recommended for all affected areas.`,
      medium: `Medium risk: ${componentCount} components affected. Standard regression testing recommended.`,
      low: `Low risk: Limited blast radius with ${componentCount} components. Basic validation sufficient.`,
    };
    return descriptions[level] || descriptions.medium;
  }

  /**
   * Generate testing recommendations
   */
  generateRecommendations(risk, affectedComponents, affectedIntegrations) {
    const recommendations = [];

    // Integration-specific recommendations
    for (const integration of affectedIntegrations) {
      recommendations.push({
        category: "Integration",
        priority: integration.level,
        recommendation: `Test ${integration.type} integration thoroughly - ${integration.level} risk area`,
        testTypes: ["integration", "e2e"],
      });
    }

    // Component-type specific recommendations
    const componentTypes = new Set(affectedComponents.map((c) => c.type));

    if (componentTypes.has("Controller")) {
      recommendations.push({
        category: "API",
        priority: "high",
        recommendation: "Verify all API endpoints in affected controllers",
        testTypes: ["api", "integration"],
      });
    }

    if (componentTypes.has("Repository")) {
      recommendations.push({
        category: "Data",
        priority: "high",
        recommendation:
          "Validate data access layer changes with integration tests",
        testTypes: ["integration", "unit"],
      });
    }

    if (componentTypes.has("Service")) {
      recommendations.push({
        category: "Business Logic",
        priority: "medium",
        recommendation: "Unit test business logic changes in services",
        testTypes: ["unit"],
      });
    }

    // Risk-based general recommendations
    if (risk.level === "critical") {
      recommendations.push({
        category: "General",
        priority: "critical",
        recommendation: "Full regression suite recommended before deployment",
        testTypes: ["regression", "e2e"],
      });
    }

    return recommendations;
  }
}
