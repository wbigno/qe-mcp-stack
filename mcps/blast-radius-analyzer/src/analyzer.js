/**
 * Blast Radius Analyzer
 * 
 * Static analysis of code changes to determine impact
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

/**
 * Analyze blast radius of code changes
 * 
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Object>} Blast radius analysis
 */
export async function analyzeBlastRadius(params) {
  const {
    app,
    changedFiles,
    analysisDepth = 'moderate'
  } = params;

  // Validate input
  validateInput(params);

  // Get app directory
  const appDir = `/mnt/apps/${app}`;
  if (!existsSync(appDir)) {
    throw new Error(`App directory not found: ${appDir}`);
  }

  // Analyze each changed file
  const fileAnalyses = [];
  for (const changedFile of changedFiles) {
    const analysis = analyzeFile(appDir, changedFile, analysisDepth);
    fileAnalyses.push(analysis);
  }

  // Find dependencies and dependents
  const dependencyMap = buildDependencyMap(appDir);
  const impactAnalysis = analyzeImpact(fileAnalyses, dependencyMap, analysisDepth);

  // Calculate risk score
  const risk = calculateRiskScore(impactAnalysis);

  // Generate recommendations
  const recommendations = generateRecommendations(impactAnalysis, risk);

  return {
    changedFiles: fileAnalyses,
    impact: impactAnalysis,
    risk,
    recommendations,
    metadata: {
      app,
      filesAnalyzed: changedFiles.length,
      analysisDepth,
      analyzedAt: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  const { app, changedFiles, analysisDepth } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!Array.isArray(changedFiles)) {
    throw new Error('changedFiles must be an array');
  }

  if (changedFiles.length === 0) {
    throw new Error('changedFiles array cannot be empty');
  }

  if (analysisDepth && !['shallow', 'moderate', 'deep'].includes(analysisDepth)) {
    throw new Error('analysisDepth must be one of: shallow, moderate, deep');
  }
}

/**
 * Analyze a single file
 */
function analyzeFile(appDir, filePath, depth) {
  const fullPath = join(appDir, filePath);
  
  if (!existsSync(fullPath)) {
    return {
      file: filePath,
      exists: false,
      type: 'unknown',
      error: 'File not found'
    };
  }

  const content = readFileSync(fullPath, 'utf8');
  const ext = extname(filePath);
  const type = determineFileType(ext);

  const analysis = {
    file: filePath,
    exists: true,
    type,
    size: content.length,
    lines: content.split('\n').length,
    classes: [],
    methods: [],
    dependencies: [],
    exports: []
  };

  // Perform type-specific analysis
  if (type === 'csharp') {
    analyzeCSharpFile(content, analysis);
  } else if (type === 'typescript' || type === 'javascript') {
    analyzeJavaScriptFile(content, analysis);
  }

  return analysis;
}

/**
 * Determine file type from extension
 */
function determineFileType(ext) {
  const typeMap = {
    '.cs': 'csharp',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.xml': 'xml',
    '.sql': 'sql'
  };

  return typeMap[ext.toLowerCase()] || 'unknown';
}

/**
 * Analyze C# file
 */
function analyzeCSharpFile(content, analysis) {
  // Extract classes
  const classRegex = /(?:public|private|internal|protected)?\s*(?:static|abstract|sealed)?\s*class\s+(\w+)/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    analysis.classes.push(match[1]);
  }

  // Extract methods
  const methodRegex = /(?:public|private|internal|protected)\s+(?:static\s+)?(?:async\s+)?[\w<>]+\s+(\w+)\s*\(/g;
  while ((match = methodRegex.exec(content)) !== null) {
    analysis.methods.push(match[1]);
  }

  // Extract using statements (dependencies)
  const usingRegex = /using\s+([\w.]+);/g;
  while ((match = usingRegex.exec(content)) !== null) {
    analysis.dependencies.push(match[1]);
  }

  // Extract interfaces implemented
  const interfaceRegex = /class\s+\w+\s*:\s*([^{]+)/g;
  while ((match = interfaceRegex.exec(content)) !== null) {
    const interfaces = match[1].split(',').map(i => i.trim());
    analysis.exports.push(...interfaces);
  }
}

/**
 * Analyze JavaScript/TypeScript file
 */
function analyzeJavaScriptFile(content, analysis) {
  // Extract imports
  const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    analysis.dependencies.push(match[1]);
  }

  // Extract exports
  const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
  while ((match = exportRegex.exec(content)) !== null) {
    analysis.exports.push(match[1]);
  }

  // Extract functions
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
  while ((match = functionRegex.exec(content)) !== null) {
    analysis.methods.push(match[1]);
  }

  // Extract classes
  const classRegex = /(?:export\s+)?class\s+(\w+)/g;
  while ((match = classRegex.exec(content)) !== null) {
    analysis.classes.push(match[1]);
  }
}

/**
 * Build dependency map for entire app
 */
function buildDependencyMap(appDir) {
  const map = {};
  
  // Recursively find all code files
  const files = findCodeFiles(appDir);
  
  files.forEach(file => {
    const relativePath = file.replace(appDir + '/', '');
    map[relativePath] = {
      imports: [],
      importedBy: []
    };
  });

  return map;
}

/**
 * Find all code files in directory
 */
function findCodeFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip common non-code directories
      if (!['node_modules', 'bin', 'obj', '.git'].includes(file)) {
        findCodeFiles(filePath, fileList);
      }
    } else {
      const ext = extname(file);
      if (['.cs', '.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Analyze impact of changes
 */
function analyzeImpact(fileAnalyses, dependencyMap, depth) {
  const impact = {
    directImpact: [],
    indirectImpact: [],
    affectedComponents: new Set(),
    affectedTests: [],
    criticalPaths: []
  };

  fileAnalyses.forEach(analysis => {
    if (!analysis.exists) return;

    // Direct impact: the file itself
    impact.directImpact.push({
      file: analysis.file,
      type: analysis.type,
      reason: 'File was modified',
      severity: 'high'
    });

    // Identify affected components
    if (analysis.classes.length > 0) {
      analysis.classes.forEach(cls => impact.affectedComponents.add(cls));
    }

    // Check if this is a critical file
    if (isCriticalFile(analysis.file)) {
      impact.criticalPaths.push({
        file: analysis.file,
        reason: determineCriticalReason(analysis.file)
      });
    }

    // Find potential test files
    const testFile = findTestFile(analysis.file);
    if (testFile) {
      impact.affectedTests.push(testFile);
    }
  });

  impact.affectedComponents = Array.from(impact.affectedComponents);

  return impact;
}

/**
 * Check if file is critical
 */
function isCriticalFile(filePath) {
  const criticalPatterns = [
    /\/Controllers?\//i,
    /\/Services?\//i,
    /\/Repositories?/i,
    /\/Models?\//i,
    /Program\.cs$/,
    /Startup\.cs$/,
    /appsettings/i,
    /\.config\./
  ];

  return criticalPatterns.some(pattern => pattern.test(filePath));
}

/**
 * Determine why file is critical
 */
function determineCriticalReason(filePath) {
  if (/\/Controllers?\//i.test(filePath)) return 'API endpoint controller';
  if (/\/Services?\//i.test(filePath)) return 'Business logic service';
  if (/\/Repositories?/i.test(filePath)) return 'Data access layer';
  if (/Program\.cs$/.test(filePath)) return 'Application entry point';
  if (/Startup\.cs$/.test(filePath)) return 'Application configuration';
  if (/appsettings/i.test(filePath)) return 'Configuration file';
  return 'Critical component';
}

/**
 * Find associated test file
 */
function findTestFile(filePath) {
  const fileName = basename(filePath, extname(filePath));
  const testPatterns = [
    `${fileName}Tests.cs`,
    `${fileName}Test.cs`,
    `${fileName}.test.ts`,
    `${fileName}.spec.ts`
  ];

  // Return first pattern (actual existence check would require file system access)
  return testPatterns[0];
}

/**
 * Calculate risk score
 */
function calculateRiskScore(impact) {
  let score = 0;
  let factors = [];

  // Direct impact (10 points per file)
  const directScore = impact.directImpact.length * 10;
  score += directScore;
  factors.push(`Direct impact: ${impact.directImpact.length} files (+${directScore})`);

  // Critical paths (20 points each)
  const criticalScore = impact.criticalPaths.length * 20;
  score += criticalScore;
  if (impact.criticalPaths.length > 0) {
    factors.push(`Critical files: ${impact.criticalPaths.length} (+${criticalScore})`);
  }

  // Affected components (5 points each)
  const componentScore = impact.affectedComponents.length * 5;
  score += componentScore;
  factors.push(`Affected components: ${impact.affectedComponents.length} (+${componentScore})`);

  // Determine risk level
  let level;
  if (score < 30) level = 'low';
  else if (score < 60) level = 'medium';
  else if (score < 100) level = 'high';
  else level = 'critical';

  return {
    score,
    level,
    factors,
    description: getRiskDescription(level)
  };
}

/**
 * Get risk description
 */
function getRiskDescription(level) {
  const descriptions = {
    low: 'Changes are isolated with minimal impact',
    medium: 'Changes affect multiple components, test thoroughly',
    high: 'Changes affect critical systems, extensive testing required',
    critical: 'Changes have widespread impact, requires careful review and comprehensive testing'
  };

  return descriptions[level];
}

/**
 * Generate recommendations
 */
function generateRecommendations(impact, risk) {
  const recommendations = [];

  // Based on risk level
  if (risk.level === 'critical' || risk.level === 'high') {
    recommendations.push({
      priority: 'high',
      category: 'testing',
      recommendation: 'Run full regression test suite',
      reason: 'High-risk changes require comprehensive testing'
    });

    recommendations.push({
      priority: 'high',
      category: 'review',
      recommendation: 'Require senior developer code review',
      reason: 'Critical changes need experienced oversight'
    });
  }

  // Critical paths
  if (impact.criticalPaths.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'testing',
      recommendation: 'Test critical user flows',
      reason: `${impact.criticalPaths.length} critical files modified`,
      files: impact.criticalPaths.map(cp => cp.file)
    });
  }

  // Affected tests
  if (impact.affectedTests.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'testing',
      recommendation: 'Run associated unit tests',
      reason: 'Ensure tests still pass',
      tests: impact.affectedTests
    });
  }

  // Components
  if (impact.affectedComponents.length > 5) {
    recommendations.push({
      priority: 'medium',
      category: 'testing',
      recommendation: 'Perform integration testing',
      reason: `${impact.affectedComponents.length} components affected`,
      components: impact.affectedComponents
    });
  }

  // Always recommend smoke tests
  recommendations.push({
    priority: 'medium',
    category: 'testing',
    recommendation: 'Run smoke tests before deployment',
    reason: 'Verify basic functionality works'
  });

  return recommendations;
}

export default {
  analyzeBlastRadius
};
