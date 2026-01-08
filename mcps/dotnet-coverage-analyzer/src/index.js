import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import path from 'path';

const parseXml = promisify(parseString);

const app = express();
const PORT = process.env.PORT || 3002;

// Increase payload size limit to handle large method arrays
app.use(express.json({ limit: '50mb' }));

/**
 * Comprehensive test file detection
 * Filters out test files that should NEVER appear in coverage gaps
 */
function isTestFile(filePath) {
  if (!filePath) return false;

  const lowerPath = filePath.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();

  // Filename patterns (case insensitive)
  const testFilePatterns = [
    'test.cs',
    'tests.cs',
    '_test.cs',
    '_tests.cs',
    '.test.cs',
    '.tests.cs'
  ];

  if (testFilePatterns.some(pattern => fileName.endsWith(pattern))) {
    return true;
  }

  // Directory patterns (case insensitive)
  const testDirectoryPatterns = [
    '/test/',
    '/tests/',
    '/__tests__/',
    '/testing/',
    '/testproject/'
  ];

  if (testDirectoryPatterns.some(pattern => lowerPath.includes(pattern))) {
    return true;
  }

  return false;
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'coverage-analyzer-mcp',
    timestamp: new Date().toISOString()
  });
});

/**
 * Get app directory from configuration
 */
async function getAppDirectory(appName) {
  try {
    const configPath = process.env.CONFIG_PATH || '/app/config/apps.json';
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    const app = config.applications.find(a => a.name === appName);
    if (!app) {
      throw new Error(`Application ${appName} not found in configuration`);
    }

    return app.path;
  } catch (error) {
    console.error('Error loading app config:', error);
    return `/mnt/apps/${appName}`;
  }
}

/**
 * Search for coverage XML files
 */
function findCoverageFiles(appDir) {
  const patterns = [
    `${appDir}/**/TestResults/**/coverage.cobertura.xml`,
    `${appDir}/**/coverage.cobertura.xml`,
    `${appDir}/**/TestResults/**/coverage.xml`
  ];

  for (const pattern of patterns) {
    try {
      const files = glob.sync(pattern, { nodir: true });
      if (files.length > 0) {
        console.log(`Found ${files.length} coverage file(s) with pattern: ${pattern}`);
        return files;
      }
    } catch (error) {
      console.error(`Error searching with pattern ${pattern}:`, error.message);
    }
  }

  return [];
}

/**
 * Parse coverage XML file
 */
async function parseCoverageFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const result = await parseXml(content);

    const coverage = {};
    const packages = result.coverage?.packages?.[0]?.package || [];

    for (const pkg of packages) {
      const classes = pkg.classes?.[0]?.class || [];

      for (const cls of classes) {
        const className = cls.$.name;
        const fileName = cls.$.filename;
        const methods = cls.methods?.[0]?.method || [];

        for (const method of methods) {
          const methodName = method.$.name;
          const lineRate = parseFloat(method.$['line-rate'] || 0);
          const coveragePercent = Math.round(lineRate * 100);

          const key = `${fileName}:${methodName}`;
          coverage[key] = {
            method: methodName,
            file: fileName,
            class: className,
            coverage: coveragePercent
          };
        }
      }
    }

    return coverage;
  } catch (error) {
    console.error(`Error parsing coverage file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Find ALL C# files that might contain test methods
 * ✅ UPDATED: Search ALL .cs files, not just files with "Test" in the name
 * This ensures we find test methods in any file, regardless of naming conventions
 */
function findTestFiles(appDir) {
  try {
    // ✅ Search ALL .cs files, just like the code analyzer does
    const pattern = `${appDir}/**/*.cs`;

    // Exclude common directories that won't have tests
    const excludePatterns = [
      '**/bin/**',
      '**/obj/**',
      '**/packages/**',
      '**/node_modules/**',
      '**/.vs/**',
      '**/TestResults/**'
    ];

    const files = glob.sync(pattern, {
      nodir: true,
      ignore: excludePatterns
    });

    console.log(`[Coverage Analyzer] Found ${files.length} C# files to scan for test methods`);
    return files;
  } catch (error) {
    console.error('Error finding C# files:', error);
    return [];
  }
}

/**
 * Parse C# file to find test methods (with [Test], [Fact], [Theory], or [TestMethod] attributes)
 * ✅ UPDATED: Can parse ANY .cs file, not just files with "Test" in the name
 */
function parseTestFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const tests = [];

    // Match test methods with xUnit, MSTest, or NUnit attributes
    const testMethodRegex = /\[(Test|Fact|Theory|TestMethod)\][\s\S]*?(?:public|private|internal)\s+(?:async\s+)?(?:Task|void)\s+(\w+)/g;

    let match;
    while ((match = testMethodRegex.exec(content)) !== null) {
      const methodName = match[2];

      // Detect negative test patterns
      const isNegativeTest = /Invalid|Error|Exception|Fail|Throw|Bad|Negative|Wrong|Should.*Not/i.test(methodName);

      tests.push({
        name: methodName,
        isNegativeTest,
        file: filePath
      });
    }

    return tests;
  } catch (error) {
    console.error(`Error parsing test file ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Parse all C# files once and return all test methods found
 * ✅ UPDATED: Parses ALL .cs files to find test methods anywhere in the codebase
 */
function parseAllTestFiles(testFiles) {
  const allTests = [];
  let filesWithTests = 0;

  for (const testFile of testFiles) {
    try {
      const tests = parseTestFile(testFile);
      if (tests.length > 0) {
        allTests.push(...tests);
        filesWithTests++;
      }
    } catch (error) {
      console.error(`[Coverage Analyzer] Error parsing file ${testFile}:`, error.message);
    }
  }

  console.log(`[Coverage Analyzer] Parsed ${allTests.length} test methods from ${filesWithTests} files (scanned ${testFiles.length} total .cs files)`);
  return allTests;
}

/**
 * Match test methods to source method (optimized - uses pre-parsed test list)
 */
function detectTestsForMethod(methodName, allTests) {
  // Look for test methods that match the source method name
  const matchingTests = allTests.filter(test => {
    const testName = test.name.toLowerCase();
    const methodLower = methodName.toLowerCase();

    // Common test naming patterns:
    // MethodName_Should_DoSomething
    // MethodName_When_Condition
    // Test_MethodName
    // MethodNameTests
    return testName.includes(methodLower) ||
           testName.replace(/_/g, '').includes(methodLower.replace(/_/g, ''));
  });

  const hasTests = matchingTests.length > 0;
  const hasNegativeTests = matchingTests.some(t => t.isNegativeTest);

  return {
    hasTests,
    hasNegativeTests,
    testCount: matchingTests.length,
    testMethods: matchingTests.map(t => ({
      name: t.name,
      isNegative: t.isNegativeTest
    }))
  };
}

app.post('/analyze', async (req, res) => {
  try {
    const { app: appName, codeStructure, detailed = false } = req.body;

    console.log(`[Coverage Analyzer] Analyzing coverage for ${appName}`);

    const methods = codeStructure?.methods || codeStructure?.analysis?.methods || [];
    console.log(`[Coverage Analyzer] Extracted ${methods.length} methods for analysis`);

    // DEBUG: Check if className is present in incoming methods
    if (methods.length > 0) {
      const sampleMethod = methods[0];
      console.log(`[Coverage Analyzer] Sample method fields:`, Object.keys(sampleMethod));
      if (sampleMethod.className) {
        console.log(`[Coverage Analyzer] ✅ className field present: ${sampleMethod.className}`);
      } else {
        console.log(`[Coverage Analyzer] ❌ className field MISSING`);
      }
    }

    if (methods.length === 0) {
      return res.json({
        success: true,
        coverage: {
          app: appName,
          timestamp: new Date().toISOString(),
          dataSource: 'none',
          message: 'No methods provided for analysis',
          overallPercentage: null,
          methods: []
        }
      });
    }

    // Get app directory
    const appDir = await getAppDirectory(appName);
    console.log(`[Coverage Analyzer] App directory: ${appDir}`);

    // Find coverage files
    const coverageFiles = findCoverageFiles(appDir);
    console.log(`[Coverage Analyzer] Found ${coverageFiles.length} coverage file(s)`);

    // Parse coverage data if available
    let coverageData = null;
    if (coverageFiles.length > 0) {
      coverageData = await parseCoverageFile(coverageFiles[0]);
      console.log(`[Coverage Analyzer] Parsed coverage data: ${coverageData ? Object.keys(coverageData).length : 0} methods`);
    }

    // Find test files
    const testFiles = findTestFiles(appDir);
    console.log(`[Coverage Analyzer] Found ${testFiles.length} test file(s)`);

    // Parse all test files ONCE upfront (major performance optimization)
    const allTests = parseAllTestFiles(testFiles);

    // ✅ FILTER: Remove test files from analysis
    const productionMethods = methods.filter(method => !isTestFile(method.file));
    console.log(`[Coverage Analyzer] Filtered ${methods.length - productionMethods.length} test file methods, analyzing ${productionMethods.length} production methods`);

    // Analyze each method
    const analyzedMethods = productionMethods.map(method => {
      // Get coverage from parsed data
      let coverage = null;
      if (coverageData) {
        // Try to match by method name and file
        const keys = Object.keys(coverageData);
        const matchingKey = keys.find(key => {
          const data = coverageData[key];
          return data.method === method.name ||
                 data.method.includes(method.name) ||
                 method.name.includes(data.method);
        });

        if (matchingKey) {
          coverage = coverageData[matchingKey].coverage;
        }
      }

      // Detect tests using pre-parsed test list (fast lookup)
      const testDetection = detectTestsForMethod(method.name, allTests);

      return {
        name: method.name,
        className: method.className || 'Unknown', // ✅ ADD: Class name for grouping
        file: method.file,
        lineNumber: method.lineNumber, // ✅ ADD: Line number
        visibility: method.visibility, // ✅ ADD: public/private/etc
        isPublic: method.isPublic, // ✅ ADD: Boolean for quick checks
        complexity: method.complexity || 1, // ✅ ADD: Cyclomatic complexity
        fileType: method.fileType || 'Other', // ✅ ADD: Controller/Service/etc
        coverage: coverage, // null if no coverage data, number 0-100 if found
        hasTests: testDetection.hasTests,
        hasNegativeTests: testDetection.hasNegativeTests,
        testCount: testDetection.testCount,
        ...(detailed && { testMethods: testDetection.testMethods })
      };
    });

    // Calculate overall percentage (only from methods with coverage data)
    const methodsWithCoverage = analyzedMethods.filter(m => m.coverage !== null);
    const overallPercentage = methodsWithCoverage.length > 0
      ? Math.round(methodsWithCoverage.reduce((sum, m) => sum + m.coverage, 0) / methodsWithCoverage.length)
      : null;

    // Calculate gaps
    const untestedMethods = analyzedMethods.filter(m => m.coverage === 0 || m.coverage === null);
    const partialCoverage = analyzedMethods.filter(m => m.coverage !== null && m.coverage > 0 && m.coverage < 80);
    const missingNegativeTests = analyzedMethods.filter(m => m.hasTests && !m.hasNegativeTests);

    console.log(`[Coverage Analyzer] Analysis complete: ${analyzedMethods.length} methods, ${untestedMethods.length} untested/no-coverage`);

    const coverage = {
      app: appName,
      timestamp: new Date().toISOString(),
      dataSource: coverageFiles.length > 0 ? 'cobertura' : 'test-detection-only',
      coverageFilesFound: coverageFiles.length,
      message: coverageFiles.length > 0
        ? `Coverage data from ${coverageFiles.length} file(s)`
        : 'No coverage files found. Run: dotnet test --collect:"XPlat Code Coverage"',
      overallPercentage,
      methods: analyzedMethods,
      summary: {
        totalMethods: analyzedMethods.length,
        methodsWithCoverageData: methodsWithCoverage.length,
        methodsWithTests: analyzedMethods.filter(m => m.hasTests).length,
        untestedCount: untestedMethods.length,
        partialCount: partialCoverage.length,
        missingNegativeTests: missingNegativeTests.length,
        coveragePercentage: overallPercentage
      }
    };

    if (detailed) {
      coverage.gaps = {
        untestedMethods,
        partialCoverage,
        missingNegativeTests
      };
    }

    res.json({ success: true, coverage });

  } catch (error) {
    console.error('[Coverage Analyzer] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`Coverage Analyzer MCP running on port ${PORT}`);
});
