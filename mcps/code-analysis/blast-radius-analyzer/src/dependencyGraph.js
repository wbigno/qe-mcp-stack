/**
 * Dependency Graph
 * Builds and traverses dependency relationships between files
 */

import fs from "fs";
import path from "path";

export class DependencyGraph {
  constructor() {
    this.dependencies = new Map(); // file -> [files it depends on]
    this.dependents = new Map(); // file -> [files that depend on it]
    this.fileInsights = new Map(); // file -> { imports, exports, apiCalls, events, storeActions }
    this.graphCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minute cache
  }

  /**
   * Build dependency graph for changed files
   */
  async build(app, changedFiles) {
    console.log(
      `[DepGraph] Building dependency graph for ${changedFiles.length} files`,
    );

    // Check cache
    const cacheKey = `graph-${app}`;
    const cached = this.graphCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log("[DepGraph] Using cached graph");
      this.dependencies = cached.dependencies;
      this.dependents = cached.dependents;
      return this;
    }

    // Build graph from code analysis
    // In production, this would call the code-analyzer MCP
    await this.analyzeAndBuildGraph(app, changedFiles);

    // Cache the graph
    this.graphCache.set(cacheKey, {
      dependencies: new Map(this.dependencies),
      dependents: new Map(this.dependents),
      timestamp: Date.now(),
    });

    return this;
  }

  /**
   * Analyze code and build dependency relationships
   */
  async analyzeAndBuildGraph(app, seedFiles) {
    this.dependencies.clear();
    this.dependents.clear();
    this.fileInsights.clear();
    this.currentApp = app;

    // Analyze each seed file
    for (const file of seedFiles) {
      await this.analyzeFileDependencies(file, app);
    }

    console.log(
      `[DepGraph] Graph built: ${this.dependencies.size} dependencies, ${this.dependents.size} dependents, ${this.fileInsights.size} file insights`,
    );
  }

  /**
   * Get insights for a specific file
   */
  getFileInsights(filePath) {
    return this.fileInsights.get(filePath) || null;
  }

  /**
   * Get all file insights
   */
  getAllInsights() {
    return Object.fromEntries(this.fileInsights);
  }

  /**
   * Analyze dependencies for a single file by reading its contents
   */
  async analyzeFileDependencies(filePath, app) {
    const deps = [];
    const insights = {
      imports: [],
      exports: [],
      apiCalls: [],
      events: [],
      storeActions: [],
      componentType: null,
      functionality: [],
    };

    // Try to read the actual file
    const basePath = `/mnt/apps/${app}`;
    const fullPath = path.join(basePath, filePath);

    try {
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        console.log(
          `[DepGraph] Analyzing file content: ${filePath} (${content.length} chars)`,
        );

        // Parse based on file extension
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".vue") {
          this.parseVueFile(content, insights);
        } else if ([".js", ".ts", ".jsx", ".tsx"].includes(ext)) {
          this.parseJsFile(content, insights);
        } else if (ext === ".cs") {
          this.parseCsFile(content, insights);
        }

        // Extract imports as dependencies
        deps.push(
          ...insights.imports.filter((i) => i.source).map((i) => i.source),
        );
      } else {
        console.log(`[DepGraph] File not found: ${fullPath}`);
      }
    } catch (error) {
      console.log(`[DepGraph] Error reading file ${fullPath}:`, error.message);
    }

    // Fallback: infer dependencies from naming patterns
    const lower = filePath.toLowerCase();
    if (lower.includes("controller")) {
      const serviceName = this.inferServiceFromController(filePath);
      if (serviceName) deps.push(serviceName);
    }
    if (lower.includes("service")) {
      const repoName = this.inferRepositoryFromService(filePath);
      if (repoName) deps.push(repoName);
    }

    // Store insights
    this.fileInsights.set(filePath, insights);

    // Set up bidirectional relationships
    this.dependencies.set(filePath, [...new Set(deps)]);

    for (const dep of deps) {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, []);
      }
      this.dependents.get(dep).push(filePath);
    }
  }

  /**
   * Parse Vue single file component
   */
  parseVueFile(content, insights) {
    insights.componentType = "Vue Component";

    // Extract script section
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const templateMatch = content.match(
      /<template[^>]*>([\s\S]*?)<\/template>/i,
    );

    if (scriptMatch) {
      const scriptContent = scriptMatch[1];
      this.parseJsFile(scriptContent, insights);
    }

    // Analyze template for component usage and events
    if (templateMatch) {
      const templateContent = templateMatch[1];

      // Find child components used
      const componentUsage = templateContent.match(/<([A-Z][a-zA-Z]+)/g) || [];
      componentUsage.forEach((comp) => {
        const name = comp.substring(1);
        if (!insights.imports.find((i) => i.name === name)) {
          insights.imports.push({ name, type: "component", source: null });
        }
      });

      // Find event emissions (@click, @submit, etc.)
      const events = templateContent.match(/@(\w+)(?:\.[\w.]+)?=/g) || [];
      events.forEach((e) => {
        insights.events.push({ type: "listener", name: e.replace(/@|=/g, "") });
      });

      // Find v-model bindings
      const vModels =
        templateContent.match(/v-model(?::[a-z]+)?="([^"]+)"/g) || [];
      vModels.forEach((v) => {
        insights.functionality.push(`Two-way binding: ${v}`);
      });
    }

    // Determine component functionality from content patterns
    const lower = content.toLowerCase();
    if (lower.includes("modal") || lower.includes("dialog")) {
      insights.functionality.push("Modal/Dialog component");
    }
    if (
      lower.includes("form") ||
      lower.includes("input") ||
      lower.includes("v-model")
    ) {
      insights.functionality.push("Form handling");
    }
    if (
      lower.includes("fetch") ||
      lower.includes("axios") ||
      lower.includes("api")
    ) {
      insights.functionality.push("API integration");
    }
    if (lower.includes("router") || lower.includes("$route")) {
      insights.functionality.push("Navigation/Routing");
    }
    if (
      lower.includes("store") ||
      lower.includes("vuex") ||
      lower.includes("pinia")
    ) {
      insights.functionality.push("State management");
    }
    if (lower.includes("emit") || lower.includes("$emit")) {
      insights.functionality.push("Event emission");
    }
    if (lower.includes("props")) {
      insights.functionality.push("Receives props from parent");
    }
    if (lower.includes("slot")) {
      insights.functionality.push("Uses slots for content injection");
    }
    if (lower.includes("error") || lower.includes("catch")) {
      insights.functionality.push("Error handling");
    }
    if (lower.includes("loading") || lower.includes("spinner")) {
      insights.functionality.push("Loading states");
    }
    if (lower.includes("validation") || lower.includes("validate")) {
      insights.functionality.push("Form validation");
    }
  }

  /**
   * Parse JavaScript/TypeScript file
   */
  parseJsFile(content, insights) {
    // Extract imports
    const importMatches = content.matchAll(
      /import\s+(?:(\{[^}]+\})|(\w+))\s+from\s+['"]([^'"]+)['"]/g,
    );
    for (const match of importMatches) {
      const names = (match[1] || match[2])
        .replace(/[{}]/g, "")
        .split(",")
        .map((n) => n.trim());
      names.forEach((name) => {
        insights.imports.push({ name, source: match[3], type: "import" });
      });
    }

    // Extract API calls
    const apiPatterns = [
      /(?:fetch|axios|http)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /\$(?:get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /api\s*\.\s*\w+\s*\(\s*['"`]?([^'"`\s,)]+)/gi,
    ];
    apiPatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !insights.apiCalls.includes(match[1])) {
          insights.apiCalls.push(match[1]);
        }
      }
    });

    // Extract $emit events
    const emitMatches = content.matchAll(/\$emit\s*\(\s*['"]([^'"]+)['"]/g);
    for (const match of emitMatches) {
      insights.events.push({ type: "emit", name: match[1] });
    }

    // Extract store actions/mutations
    const storePatterns = [
      /(?:dispatch|commit)\s*\(\s*['"]([^'"]+)['"]/g,
      /store\s*\.\s*(?:dispatch|commit)\s*\(\s*['"]([^'"]+)['"]/g,
    ];
    storePatterns.forEach((pattern) => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        insights.storeActions.push(match[1]);
      }
    });

    // Extract exports
    const exportMatches = content.matchAll(
      /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)/g,
    );
    for (const match of exportMatches) {
      insights.exports.push(match[1]);
    }
  }

  /**
   * Parse C# file
   */
  parseCsFile(content, insights) {
    // Extract using statements
    const usingMatches = content.matchAll(/using\s+([\w.]+);/g);
    for (const match of usingMatches) {
      insights.imports.push({ name: match[1], type: "using" });
    }

    // Extract class inheritance/interfaces
    const classMatch = content.match(/class\s+(\w+)\s*(?::\s*([^{]+))?/);
    if (classMatch) {
      insights.exports.push(classMatch[1]);
      if (classMatch[2]) {
        const inherited = classMatch[2].split(",").map((i) => i.trim());
        inherited.forEach((i) => {
          insights.imports.push({ name: i, type: "inherits" });
        });
      }
    }

    // Extract HTTP endpoint attributes
    const httpMethods = content.matchAll(
      /\[Http(Get|Post|Put|Delete|Patch)\s*(?:\("([^"]+)"\))?\]/g,
    );
    for (const match of httpMethods) {
      insights.apiCalls.push(`${match[1].toUpperCase()} ${match[2] || "/"}`);
    }

    // Determine service type
    const lower = content.toLowerCase();
    if (lower.includes("controller")) insights.componentType = "API Controller";
    else if (lower.includes("service")) insights.componentType = "Service";
    else if (lower.includes("repository"))
      insights.componentType = "Repository";
    else if (lower.includes("handler")) insights.componentType = "Handler";
  }

  /**
   * Infer service name from controller
   */
  inferServiceFromController(controllerPath) {
    const filename = controllerPath.split(/[/\\]/).pop();
    if (!filename) return null;

    // PaymentController -> PaymentService
    const match = filename.match(/(.+)Controller/i);
    if (match) {
      return controllerPath.replace(/Controller/i, "Service");
    }
    return null;
  }

  /**
   * Infer repository name from service
   */
  inferRepositoryFromService(servicePath) {
    const filename = servicePath.split(/[/\\]/).pop();
    if (!filename) return null;

    // PaymentService -> PaymentRepository
    const match = filename.match(/(.+)Service/i);
    if (match) {
      return servicePath.replace(/Service/i, "Repository");
    }
    return null;
  }

  /**
   * Get files that the given file depends on
   */
  getDependencies(file) {
    return this.dependencies.get(file) || [];
  }

  /**
   * Get files that depend on the given file
   */
  getDependents(file) {
    // Also check for pattern-based dependents
    const direct = this.dependents.get(file) || [];
    const inferred = this.inferDependents(file);

    return [...new Set([...direct, ...inferred])];
  }

  /**
   * Infer dependents based on naming patterns
   */
  inferDependents(file) {
    const dependents = [];
    const lower = file.toLowerCase();

    // If it's a model, entities might depend on it
    if (lower.includes("model") || lower.includes("entity")) {
      // Controllers, services might use this model
      dependents.push(
        file.replace(/Model|Entity/i, "Service"),
        file.replace(/Model|Entity/i, "Controller"),
      );
    }

    // If it's a service, controllers depend on it
    if (lower.includes("service") && !lower.includes("interface")) {
      dependents.push(file.replace(/Service/i, "Controller"));
    }

    // If it's a repository, services depend on it
    if (lower.includes("repository")) {
      dependents.push(file.replace(/Repository/i, "Service"));
    }

    // Filter to only paths that follow the pattern
    return dependents.filter((d) => d !== file);
  }

  /**
   * Get transitive dependencies up to specified depth
   */
  getTransitiveDependencies(file, maxDepth = 2) {
    const visited = new Set();
    const result = [];
    const queue = [{ file, depth: 0 }];

    while (queue.length > 0) {
      const { file: currentFile, depth } = queue.shift();

      if (visited.has(currentFile) || depth > maxDepth) continue;
      visited.add(currentFile);

      if (depth > 0) {
        result.push({ file: currentFile, depth });
      }

      const deps = this.getDependencies(currentFile);
      for (const dep of deps) {
        queue.push({ file: dep, depth: depth + 1 });
      }
    }

    return result;
  }

  /**
   * Get transitive dependents up to specified depth
   */
  getTransitiveDependents(file, maxDepth = 2) {
    const visited = new Set();
    const result = [];
    const queue = [{ file, depth: 0 }];

    while (queue.length > 0) {
      const { file: currentFile, depth } = queue.shift();

      if (visited.has(currentFile) || depth > maxDepth) continue;
      visited.add(currentFile);

      if (depth > 0) {
        result.push({ file: currentFile, depth });
      }

      const dependents = this.getDependents(currentFile);
      for (const dep of dependents) {
        queue.push({ file: dep, depth: depth + 1 });
      }
    }

    return result;
  }
}
