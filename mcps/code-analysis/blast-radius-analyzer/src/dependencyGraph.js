/**
 * Dependency Graph
 * Builds and traverses dependency relationships between files
 */

export class DependencyGraph {
  constructor() {
    this.dependencies = new Map(); // file -> [files it depends on]
    this.dependents = new Map(); // file -> [files that depend on it]
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
    // This would integrate with code-analyzer in production
    // For now, build a mock graph based on common patterns

    this.dependencies.clear();
    this.dependents.clear();

    // Analyze each seed file
    for (const file of seedFiles) {
      await this.analyzeFileDependencies(file);
    }

    console.log(
      `[DepGraph] Graph built: ${this.dependencies.size} dependencies, ${this.dependents.size} dependents`,
    );
  }

  /**
   * Analyze dependencies for a single file
   */
  async analyzeFileDependencies(filePath) {
    // In production, this would parse the actual file
    // For now, infer dependencies from naming patterns

    const deps = [];
    const lower = filePath.toLowerCase();

    // Controllers typically depend on services
    if (lower.includes("controller")) {
      const serviceName = this.inferServiceFromController(filePath);
      if (serviceName) deps.push(serviceName);
    }

    // Services typically depend on repositories
    if (lower.includes("service")) {
      const repoName = this.inferRepositoryFromService(filePath);
      if (repoName) deps.push(repoName);
    }

    // Set up bidirectional relationships
    this.dependencies.set(filePath, deps);

    for (const dep of deps) {
      if (!this.dependents.has(dep)) {
        this.dependents.set(dep, []);
      }
      this.dependents.get(dep).push(filePath);
    }
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
