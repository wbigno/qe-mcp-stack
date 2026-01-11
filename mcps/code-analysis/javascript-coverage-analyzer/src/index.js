import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import istanbulCoverage from 'istanbul-lib-coverage';
const { createCoverageMap } = istanbulCoverage;

const app = express();
const PORT = process.env.PORT || 8205;

app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'javascript-coverage-analyzer-mcp',
    timestamp: new Date().toISOString()
  });
});

/**
 * Load apps configuration
 */
function loadAppsConfig() {
  try {
    const configPath = process.env.CONFIG_PATH || '/app/config/apps.json';
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading apps config:', error);
    return { applications: [] };
  }
}

/**
 * Check if file is a test file
 */
function isTestFile(filePath) {
  if (!filePath) return false;

  const lowerPath = filePath.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();

  // Test file patterns
  const testPatterns = [
    '.test.js',
    '.test.jsx',
    '.test.ts',
    '.test.tsx',
    '.spec.js',
    '.spec.jsx',
    '.spec.ts',
    '.spec.tsx',
    '_test.js',
    '_test.ts'
  ];

  if (testPatterns.some(pattern => fileName.endsWith(pattern))) {
    return true;
  }

  // Test directory patterns
  const testDirPatterns = [
    '/__tests__/',
    '/tests/',
    '/test/',
    '/__mocks__/',
    '/e2e/',
    '/cypress/'
  ];

  if (testDirPatterns.some(pattern => lowerPath.includes(pattern))) {
    return true;
  }

  return false;
}

/**
 * Find coverage files (Jest/Vitest produce coverage-final.json)
 */
function findCoverageFiles(appDir) {
  const patterns = [
    `${appDir}/**/coverage/coverage-final.json`,
    `${appDir}/**/coverage/coverage.json`,
    `${appDir}/**/.nyc_output/coverage.json`
  ];

  for (const pattern of patterns) {
    try {
      const files = glob.sync(pattern, { nodir: true });
      if (files.length > 0) {
        console.log(`[JS Coverage] Found ${files.length} coverage file(s) with pattern: ${pattern}`);
        return files;
      }
    } catch (error) {
      console.error(`[JS Coverage] Error searching with pattern ${pattern}:`, error.message);
    }
  }

  return [];
}

/**
 * Parse Istanbul JSON coverage file
 */
function parseCoverageFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const coverageData = JSON.parse(content);

    // Create coverage map from Istanbul data
    const coverageMap = createCoverageMap(coverageData);

    const coverage = {};

    // Extract coverage for each file
    for (const [fileName, fileCoverage] of Object.entries(coverageMap.data)) {
      const summary = fileCoverage.toSummary();

      coverage[fileName] = {
        file: fileName,
        lines: {
          total: summary.lines.total,
          covered: summary.lines.covered,
          skipped: summary.lines.skipped,
          pct: summary.lines.pct
        },
        statements: {
          total: summary.statements.total,
          covered: summary.statements.covered,
          skipped: summary.statements.skipped,
          pct: summary.statements.pct
        },
        functions: {
          total: summary.functions.total,
          covered: summary.functions.covered,
          skipped: summary.functions.skipped,
          pct: summary.functions.pct
        },
        branches: {
          total: summary.branches.total,
          covered: summary.branches.covered,
          skipped: summary.branches.skipped,
          pct: summary.branches.pct
        }
      };
    }

    console.log(`[JS Coverage] Parsed coverage data for ${Object.keys(coverage).length} files`);
    return coverage;
  } catch (error) {
    console.error(`[JS Coverage] Error parsing coverage file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Find ALL JavaScript test files
 */
function findTestFiles(appDir) {
  try {
    const patterns = [
      `${appDir}/**/*.test.js`,
      `${appDir}/**/*.test.jsx`,
      `${appDir}/**/*.test.ts`,
      `${appDir}/**/*.test.tsx`,
      `${appDir}/**/*.spec.js`,
      `${appDir}/**/*.spec.jsx`,
      `${appDir}/**/*.spec.ts`,
      `${appDir}/**/*.spec.tsx`,
      `${appDir}/**/__tests__/**/*.js`,
      `${appDir}/**/__tests__/**/*.jsx`,
      `${appDir}/**/__tests__/**/*.ts`,
      `${appDir}/**/__tests__/**/*.tsx`
    ];

    const excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**'
    ];

    let files = [];
    for (const pattern of patterns) {
      const found = glob.sync(pattern, {
        nodir: true,
        ignore: excludePatterns
      });
      files.push(...found);
    }

    // Remove duplicates
    files = [...new Set(files)];

    console.log(`[JS Coverage] Found ${files.length} test files`);
    return files;
  } catch (error) {
    console.error('[JS Coverage] Error finding test files:', error);
    return [];
  }
}

/**
 * Parse test file to extract test cases
 */
function parseTestFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const tests = [];

    // Match Jest/Vitest/Mocha test patterns
    // it('test name', ...) or test('test name', ...)
    const testRegex = /(?:it|test|describe)\s*\(\s*['"`]([^'"`]+)['"`]/g;

    let match;
    while ((match = testRegex.exec(content)) !== null) {
      const testName = match[1];

      // Detect negative/edge case tests
      const isNegativeTest = /error|fail|invalid|throw|reject|null|undefined|empty|negative|edge case/i.test(testName);

      tests.push({
        name: testName,
        isNegativeTest,
        file: filePath
      });
    }

    return tests;
  } catch (error) {
    console.error(`[JS Coverage] Error parsing test file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Match tests to source files/functions
 */
function matchTestsToSource(fileName, allTests) {
  // Extract file name without extension and path
  const baseName = path.basename(fileName, path.extname(fileName));
  const dirName = path.dirname(fileName);

  // Find tests that likely test this file
  const matchingTests = allTests.filter(test => {
    const testFileName = path.basename(test.file);
    const testDirName = path.dirname(test.file);

    // Check if test file name matches source file name
    // e.g., Component.tsx -> Component.test.tsx
    if (testFileName.includes(baseName)) {
      return true;
    }

    // Check if in same directory and test name mentions the file
    if (testDirName === dirName && test.name.toLowerCase().includes(baseName.toLowerCase())) {
      return true;
    }

    // Check if test name mentions the file
    if (test.name.toLowerCase().includes(baseName.toLowerCase())) {
      return true;
    }

    return false;
  });

  const hasTests = matchingTests.length > 0;
  const hasNegativeTests = matchingTests.some(t => t.isNegativeTest);

  return {
    hasTests,
    hasNegativeTests,
    testCount: matchingTests.length,
    testFiles: [...new Set(matchingTests.map(t => t.file))]
  };
}

/**
 * Main analysis endpoint
 */
app.post('/analyze', async (req, res) => {
  try {
    const { app: appName, codeStructure, detailed = false } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    console.log(`[JS Coverage] Analyzing coverage for ${appName}`);

    // Get functions/components from code structure
    const functions = codeStructure?.functions || [];
    const components = codeStructure?.components || [];
    const allItems = [...functions, ...components];

    console.log(`[JS Coverage] Analyzing ${allItems.length} functions/components`);

    // Get app directory
    const config = loadAppsConfig();
    const appConfig = config.applications.find(a => a.name === appName);

    if (!appConfig) {
      return res.status(404).json({ error: `Application ${appName} not found` });
    }

    const appDir = appConfig.path;
    console.log(`[JS Coverage] App directory: ${appDir}`);

    // Find coverage files
    const coverageFiles = findCoverageFiles(appDir);
    console.log(`[JS Coverage] Found ${coverageFiles.length} coverage file(s)`);

    // Parse coverage data
    let coverageData = null;
    if (coverageFiles.length > 0) {
      coverageData = parseCoverageFile(coverageFiles[0]);
    }

    // Find test files
    const testFiles = findTestFiles(appDir);
    console.log(`[JS Coverage] Found ${testFiles.length} test file(s)`);

    // Parse all test files once
    const allTests = [];
    for (const testFile of testFiles) {
      const tests = parseTestFile(testFile);
      allTests.push(...tests);
    }
    console.log(`[JS Coverage] Parsed ${allTests.length} test cases`);

    // Filter out test files from analysis
    const productionItems = allItems.filter(item => !isTestFile(item.file));
    console.log(`[JS Coverage] Analyzing ${productionItems.length} production files`);

    // Analyze each item
    const analyzedItems = productionItems.map(item => {
      // Get coverage from parsed data
      let coverage = null;
      if (coverageData && item.file) {
        const fileCov = coverageData[item.file];
        if (fileCov) {
          // Use line coverage percentage
          coverage = fileCov.lines.pct;
        }
      }

      // Match tests
      const testMatching = matchTestsToSource(item.file, allTests);

      return {
        name: item.name,
        file: item.file,
        type: item.type || 'function',
        line: item.line,
        complexity: item.complexity || 1,
        coverage: coverage,
        hasTests: testMatching.hasTests,
        hasNegativeTests: testMatching.hasNegativeTests,
        testCount: testMatching.testCount,
        ...(detailed && { testFiles: testMatching.testFiles })
      };
    });

    // Calculate overall percentage
    const itemsWithCoverage = analyzedItems.filter(i => i.coverage !== null);
    const overallPercentage = itemsWithCoverage.length > 0
      ? Math.round(itemsWithCoverage.reduce((sum, i) => sum + i.coverage, 0) / itemsWithCoverage.length)
      : null;

    // Calculate gaps
    const untestedItems = analyzedItems.filter(i =>
      !i.hasTests && (i.coverage === null || i.coverage === 0)
    );
    const partialCoverage = analyzedItems.filter(i =>
      i.coverage !== null && i.coverage > 0 && i.coverage < 80
    );
    const missingNegativeTests = analyzedItems.filter(i =>
      i.hasTests && !i.hasNegativeTests
    );

    console.log(`[JS Coverage] Analysis complete: ${analyzedItems.length} items, ${untestedItems.length} untested`);

    const coverage = {
      app: appName,
      timestamp: new Date().toISOString(),
      dataSource: coverageFiles.length > 0 ? 'istanbul' : 'test-detection-only',
      coverageFilesFound: coverageFiles.length,
      message: coverageFiles.length > 0
        ? `Coverage data from ${coverageFiles.length} file(s)`
        : 'No coverage files found. Run: npm test -- --coverage',
      overallPercentage,
      functions: analyzedItems,
      summary: {
        totalFunctions: analyzedItems.length,
        functionsWithCoverageData: itemsWithCoverage.length,
        functionsWithTests: analyzedItems.filter(i => i.hasTests).length,
        untestedCount: untestedItems.length,
        partialCount: partialCoverage.length,
        missingNegativeTests: missingNegativeTests.length,
        coveragePercentage: overallPercentage
      }
    };

    if (detailed) {
      coverage.gaps = {
        untestedFunctions: untestedItems,
        partialCoverage,
        missingNegativeTests
      };
    }

    res.json({ success: true, coverage });

  } catch (error) {
    console.error('[JS Coverage] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`JavaScript Coverage Analyzer MCP running on port ${PORT}`);
});
