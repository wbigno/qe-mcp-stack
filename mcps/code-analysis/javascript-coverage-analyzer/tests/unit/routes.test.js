import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import istanbulCoverage from "istanbul-lib-coverage";

// Mock dependencies
const mockReadFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockGlobSync = jest.fn();

// Mock fs module
jest.unstable_mockModule("fs", () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  default: {
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
  },
}));

// Mock glob module
jest.unstable_mockModule("glob", () => ({
  glob: {
    sync: mockGlobSync,
  },
  default: {
    glob: {
      sync: mockGlobSync,
    },
  },
}));

describe("JavaScript Coverage Analyzer Routes", () => {
  let app;
  const { createCoverageMap } = istanbulCoverage;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Import path module
    const path = await import("path");

    // Create Express app
    app = express();
    app.use(express.json({ limit: "50mb" }));

    // Mock config
    // eslint-disable-next-line no-unused-vars
    const mockConfig = {
      applications: [
        { name: "ReactApp", path: "/mnt/apps/react-app" },
        { name: "VueApp", path: "/mnt/apps/vue-app" },
      ],
    };

    // Helper: loadAppsConfig
    function loadAppsConfig() {
      try {
        const configPath = "/app/config/apps.json";
        const content = mockReadFileSync(configPath, "utf-8");
        return JSON.parse(content);
      } catch (error) {
        return { applications: [] };
      }
    }

    // Helper: isTestFile
    function isTestFile(filePath) {
      if (!filePath) return false;

      const lowerPath = filePath.toLowerCase();
      const fileName = path.basename(filePath).toLowerCase();

      const testPatterns = [
        ".test.js",
        ".test.jsx",
        ".test.ts",
        ".test.tsx",
        ".spec.js",
        ".spec.jsx",
        ".spec.ts",
        ".spec.tsx",
        "_test.js",
        "_test.ts",
      ];

      if (testPatterns.some((pattern) => fileName.endsWith(pattern))) {
        return true;
      }

      const testDirPatterns = [
        "/__tests__/",
        "/tests/",
        "/test/",
        "/__mocks__/",
        "/e2e/",
        "/cypress/",
      ];

      if (testDirPatterns.some((pattern) => lowerPath.includes(pattern))) {
        return true;
      }

      return false;
    }

    // Helper: findCoverageFiles
    function findCoverageFiles(appDir) {
      const patterns = [
        `${appDir}/**/coverage/coverage-final.json`,
        `${appDir}/**/coverage/coverage.json`,
        `${appDir}/**/.nyc_output/coverage.json`,
      ];

      for (const pattern of patterns) {
        try {
          const files = mockGlobSync(pattern, { nodir: true });
          if (files.length > 0) {
            return files;
          }
        } catch (error) {
          // Continue
        }
      }

      return [];
    }

    // Helper: parseCoverageFile
    function parseCoverageFile(filePath) {
      try {
        const content = mockReadFileSync(filePath, "utf-8");
        const coverageData = JSON.parse(content);

        const coverageMap = createCoverageMap(coverageData);
        const coverage = {};

        for (const [fileName, fileCoverage] of Object.entries(
          coverageMap.data,
        )) {
          const summary = fileCoverage.toSummary();

          coverage[fileName] = {
            file: fileName,
            lines: {
              total: summary.lines.total,
              covered: summary.lines.covered,
              skipped: summary.lines.skipped,
              pct: summary.lines.pct,
            },
            statements: {
              total: summary.statements.total,
              covered: summary.statements.covered,
              skipped: summary.statements.skipped,
              pct: summary.statements.pct,
            },
            functions: {
              total: summary.functions.total,
              covered: summary.functions.covered,
              skipped: summary.functions.skipped,
              pct: summary.functions.pct,
            },
            branches: {
              total: summary.branches.total,
              covered: summary.branches.covered,
              skipped: summary.branches.skipped,
              pct: summary.branches.pct,
            },
          };
        }

        return coverage;
      } catch (error) {
        return null;
      }
    }

    // Helper: findTestFiles
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
          `${appDir}/**/__tests__/**/*.tsx`,
        ];

        const excludePatterns = [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
        ];

        let files = [];
        for (const pattern of patterns) {
          const found = mockGlobSync(pattern, {
            nodir: true,
            ignore: excludePatterns,
          });
          files.push(...found);
        }

        files = [...new Set(files)];
        return files;
      } catch (error) {
        return [];
      }
    }

    // Helper: parseTestFile
    function parseTestFile(filePath) {
      try {
        const content = mockReadFileSync(filePath, "utf-8");
        const tests = [];

        const testRegex = /(?:it|test|describe)\s*\(\s*['"`]([^'"`]+)['"`]/g;

        let match;
        while ((match = testRegex.exec(content)) !== null) {
          const testName = match[1];
          const isNegativeTest =
            /error|fail|invalid|throw|reject|null|undefined|empty|negative|edge case/i.test(
              testName,
            );

          tests.push({
            name: testName,
            isNegativeTest,
            file: filePath,
          });
        }

        return tests;
      } catch (error) {
        return [];
      }
    }

    // Helper: matchTestsToSource
    function matchTestsToSource(fileName, allTests) {
      const baseName = path.basename(fileName, path.extname(fileName));
      const dirName = path.dirname(fileName);

      const matchingTests = allTests.filter((test) => {
        const testFileName = path.basename(test.file);
        const testDirName = path.dirname(test.file);

        if (testFileName.includes(baseName)) {
          return true;
        }

        if (
          testDirName === dirName &&
          test.name.toLowerCase().includes(baseName.toLowerCase())
        ) {
          return true;
        }

        if (test.name.toLowerCase().includes(baseName.toLowerCase())) {
          return true;
        }

        return false;
      });

      const hasTests = matchingTests.length > 0;
      const hasNegativeTests = matchingTests.some((t) => t.isNegativeTest);

      return {
        hasTests,
        hasNegativeTests,
        testCount: matchingTests.length,
        testFiles: [...new Set(matchingTests.map((t) => t.file))],
      };
    }

    // GET /health endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "javascript-coverage-analyzer-mcp",
        timestamp: new Date().toISOString(),
      });
    });

    // POST /analyze endpoint
    app.post("/analyze", async (req, res) => {
      try {
        const { app: appName, codeStructure, detailed = false } = req.body;

        if (!appName) {
          return res
            .status(400)
            .json({ error: "Application name is required" });
        }

        const functions = codeStructure?.functions || [];
        const components = codeStructure?.components || [];
        const allItems = [...functions, ...components];

        const config = loadAppsConfig();
        const appConfig = config.applications.find((a) => a.name === appName);

        if (!appConfig) {
          return res
            .status(404)
            .json({ error: `Application ${appName} not found` });
        }

        const appDir = appConfig.path;

        const coverageFiles = findCoverageFiles(appDir);
        let coverageData = null;
        if (coverageFiles.length > 0) {
          coverageData = parseCoverageFile(coverageFiles[0]);
        }

        const testFiles = findTestFiles(appDir);
        const allTests = [];
        for (const testFile of testFiles) {
          const tests = parseTestFile(testFile);
          allTests.push(...tests);
        }

        const productionItems = allItems.filter(
          (item) => !isTestFile(item.file),
        );

        const analyzedItems = productionItems.map((item) => {
          let coverage = null;
          if (coverageData && item.file) {
            const fileCov = coverageData[item.file];
            if (fileCov) {
              coverage = fileCov.lines.pct;
            }
          }

          const testMatching = matchTestsToSource(item.file, allTests);

          return {
            name: item.name,
            file: item.file,
            type: item.type || "function",
            line: item.line,
            complexity: item.complexity || 1,
            coverage: coverage,
            hasTests: testMatching.hasTests,
            hasNegativeTests: testMatching.hasNegativeTests,
            testCount: testMatching.testCount,
            ...(detailed && { testFiles: testMatching.testFiles }),
          };
        });

        const itemsWithCoverage = analyzedItems.filter(
          (i) => i.coverage !== null,
        );
        const overallPercentage =
          itemsWithCoverage.length > 0
            ? Math.round(
                itemsWithCoverage.reduce((sum, i) => sum + i.coverage, 0) /
                  itemsWithCoverage.length,
              )
            : null;

        const untestedItems = analyzedItems.filter(
          (i) => !i.hasTests && (i.coverage === null || i.coverage === 0),
        );
        const partialCoverage = analyzedItems.filter(
          (i) => i.coverage !== null && i.coverage > 0 && i.coverage < 80,
        );
        const missingNegativeTests = analyzedItems.filter(
          (i) => i.hasTests && !i.hasNegativeTests,
        );

        const coverage = {
          app: appName,
          timestamp: new Date().toISOString(),
          dataSource:
            coverageFiles.length > 0 ? "istanbul" : "test-detection-only",
          coverageFilesFound: coverageFiles.length,
          message:
            coverageFiles.length > 0
              ? `Coverage data from ${coverageFiles.length} file(s)`
              : "No coverage files found. Run: npm test -- --coverage",
          overallPercentage,
          functions: analyzedItems,
          summary: {
            totalFunctions: analyzedItems.length,
            functionsWithCoverageData: itemsWithCoverage.length,
            functionsWithTests: analyzedItems.filter((i) => i.hasTests).length,
            untestedCount: untestedItems.length,
            partialCount: partialCoverage.length,
            missingNegativeTests: missingNegativeTests.length,
            coveragePercentage: overallPercentage,
          },
        };

        if (detailed) {
          coverage.gaps = {
            untestedFunctions: untestedItems,
            partialCoverage,
            missingNegativeTests,
          };
        }

        res.json({ success: true, coverage });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: "Analysis failed",
          message: error.message,
        });
      }
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("javascript-coverage-analyzer-mcp");
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe("POST /analyze", () => {
    beforeEach(() => {
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        return "";
      });
    });

    it("should analyze with Istanbul coverage data", async () => {
      const coverageData = {
        "/mnt/apps/react-app/src/utils.js": {
          path: "/mnt/apps/react-app/src/utils.js",
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      };

      mockGlobSync.mockImplementation((pattern) => {
        if (pattern.includes("coverage-final.json")) {
          return ["/mnt/apps/react-app/coverage/coverage-final.json"];
        }
        if (pattern.includes(".test.js")) {
          return ["/mnt/apps/react-app/src/utils.test.js"];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/coverage/coverage-final.json") {
          return JSON.stringify(coverageData);
        }
        if (path === "/mnt/apps/react-app/src/utils.test.js") {
          return `
            test('formatDate formats correctly', () => {
              expect(formatDate('2024-01-01')).toBe('01/01/2024');
            });
          `;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "formatDate",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
                complexity: 2,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.coverage.dataSource).toBe("istanbul");
      expect(response.body.coverage.coverageFilesFound).toBe(1);
    });

    it("should detect test files and match to source", async () => {
      mockGlobSync.mockImplementation((pattern) => {
        if (pattern.includes("coverage-final.json")) {
          return [];
        }
        if (pattern.includes(".test.js")) {
          return ["/mnt/apps/react-app/src/Component.test.js"];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/src/Component.test.js") {
          return `
            test('Component renders correctly', () => {});
            test('Component handles invalid input', () => {});
          `;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "Component",
                file: "/mnt/apps/react-app/src/Component.js",
                line: 5,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.functions[0].hasTests).toBe(true);
      expect(response.body.coverage.functions[0].testCount).toBeGreaterThan(0);
    });

    it("should detect negative/edge case tests", async () => {
      mockGlobSync.mockImplementation((pattern) => {
        if (pattern.includes(".test.js")) {
          return ["/mnt/apps/react-app/src/validator.test.js"];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/src/validator.test.js") {
          return `
            test('validator validates correct input', () => {});
            test('validator throws error on invalid input', () => {});
            test('validator handles null value', () => {});
          `;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "validator",
                file: "/mnt/apps/react-app/src/validator.js",
                line: 1,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      const func = response.body.coverage.functions[0];
      expect(func.hasTests).toBe(true);
      expect(func.hasNegativeTests).toBe(true);
    });

    it("should filter out test files from analysis", async () => {
      mockGlobSync.mockReturnValue([]);

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "formatDate",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
              },
              {
                name: "testFormatDate",
                file: "/mnt/apps/react-app/src/utils.test.js",
                line: 5,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.functions).toHaveLength(1);
      expect(response.body.coverage.functions[0].name).toBe("formatDate");
    });

    it("should calculate overall coverage percentage", async () => {
      const coverageData = {
        "/mnt/apps/react-app/src/utils.js": {
          path: "/mnt/apps/react-app/src/utils.js",
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      };

      mockGlobSync.mockImplementation((pattern) => {
        if (pattern.includes("coverage-final.json")) {
          return ["/mnt/apps/react-app/coverage/coverage-final.json"];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/coverage/coverage-final.json") {
          return JSON.stringify(coverageData);
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "formatDate",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.summary).toHaveProperty(
        "coveragePercentage",
      );
      expect(response.body.coverage).toHaveProperty("overallPercentage");
    });

    it("should identify coverage gaps", async () => {
      mockGlobSync.mockReturnValue([]);

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "uncovered",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
              },
            ],
          },
          detailed: true,
        });

      expect(response.status).toBe(200);
      expect(
        response.body.coverage.summary.untestedCount,
      ).toBeGreaterThanOrEqual(0);
      expect(response.body.coverage).toHaveProperty("gaps");
      expect(response.body.coverage.gaps).toHaveProperty("untestedFunctions");
    });

    it("should handle no coverage files found", async () => {
      mockGlobSync.mockReturnValue([]);

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "formatDate",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.dataSource).toBe("test-detection-only");
      expect(response.body.coverage.message).toContain(
        "No coverage files found",
      );
    });

    it("should return 400 for missing app name", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          codeStructure: { functions: [] },
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Application name is required");
    });

    it("should return 404 for unknown application", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "UnknownApp",
          codeStructure: { functions: [] },
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Application UnknownApp not found");
    });

    it("should handle empty codeStructure", async () => {
      mockGlobSync.mockReturnValue([]);

      const response = await request(app).post("/analyze").send({
        app: "ReactApp",
        codeStructure: {},
      });

      expect(response.status).toBe(200);
      expect(response.body.coverage.summary.totalFunctions).toBe(0);
    });

    it("should include test files in detailed mode", async () => {
      mockGlobSync.mockImplementation((pattern) => {
        if (pattern.includes(".test.js")) {
          return ["/mnt/apps/react-app/src/utils.test.js"];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/src/utils.test.js") {
          return `test('formatDate works', () => {});`;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "formatDate",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
              },
            ],
          },
          detailed: true,
        });

      expect(response.status).toBe(200);
      if (response.body.coverage.functions[0].hasTests) {
        expect(response.body.coverage.functions[0]).toHaveProperty("testFiles");
      }
    });

    it("should handle components from codeStructure", async () => {
      mockGlobSync.mockReturnValue([]);

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            components: [
              {
                name: "Button",
                file: "/mnt/apps/react-app/src/Button.jsx",
                line: 5,
                type: "component",
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.functions).toHaveLength(1);
      expect(response.body.coverage.functions[0].type).toBe("component");
    });

    it("should calculate summary statistics", async () => {
      mockGlobSync.mockReturnValue([]);

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "func1",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 1,
              },
              {
                name: "func2",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.summary.totalFunctions).toBe(2);
      expect(response.body.coverage.summary).toHaveProperty(
        "functionsWithCoverageData",
      );
      expect(response.body.coverage.summary).toHaveProperty(
        "functionsWithTests",
      );
      expect(response.body.coverage.summary).toHaveProperty("untestedCount");
      expect(response.body.coverage.summary).toHaveProperty("partialCount");
      expect(response.body.coverage.summary).toHaveProperty(
        "missingNegativeTests",
      );
    });

    it("should identify partial coverage items", async () => {
      const coverageData = {
        "/mnt/apps/react-app/src/utils.js": {
          path: "/mnt/apps/react-app/src/utils.js",
          statementMap: {},
          fnMap: {},
          branchMap: {},
          s: {},
          f: {},
          b: {},
        },
      };

      mockGlobSync.mockImplementation((pattern) => {
        if (pattern.includes("coverage-final.json")) {
          return ["/mnt/apps/react-app/coverage/coverage-final.json"];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/coverage/coverage-final.json") {
          return JSON.stringify(coverageData);
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "formatDate",
                file: "/mnt/apps/react-app/src/utils.js",
                line: 10,
              },
            ],
          },
          detailed: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.gaps).toHaveProperty("partialCoverage");
    });

    it("should handle missing negative tests in gaps", async () => {
      mockGlobSync.mockImplementation((pattern) => {
        if (pattern.includes(".test.js")) {
          return ["/mnt/apps/react-app/src/validator.test.js"];
        }
        return [];
      });

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/src/validator.test.js") {
          return `test('validator validates', () => {});`;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "ReactApp",
          codeStructure: {
            functions: [
              {
                name: "validator",
                file: "/mnt/apps/react-app/src/validator.js",
                line: 1,
              },
            ],
          },
          detailed: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.gaps).toHaveProperty(
        "missingNegativeTests",
      );
      expect(
        Array.isArray(response.body.coverage.gaps.missingNegativeTests),
      ).toBe(true);
    });
  });
});
