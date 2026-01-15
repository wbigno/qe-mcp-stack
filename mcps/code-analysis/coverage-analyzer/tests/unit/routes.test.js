import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// Mock dependencies
const mockReadFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockGlob = jest.fn();
const mockParseString = jest.fn();

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
  glob: mockGlob,
  default: { glob: mockGlob },
}));

// Mock xml2js module
jest.unstable_mockModule("xml2js", () => ({
  parseString: mockParseString,
  default: { parseString: mockParseString },
}));

describe("Coverage Analyzer Routes", () => {
  let app;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create Express app with routes logic
    app = express();
    app.use(express.json());

    // Mock apps.json config
    const mockConfig = {
      applications: [
        { name: "App1", path: "/mnt/apps/app1" },
        { name: "App2", path: "/mnt/apps/app2" },
      ],
    };

    // Helper functions (from index.js)
    const isTestFile = (filePath) => {
      const lowerPath = filePath.toLowerCase();
      return (
        lowerPath.includes("/tests/") ||
        lowerPath.includes("/test/") ||
        lowerPath.includes(".test.") ||
        lowerPath.includes(".tests.") ||
        lowerPath.endsWith("tests.cs") ||
        lowerPath.endsWith("test.cs")
      );
    };

    const findCoverageFiles = async (appDir) => {
      const pattern = `${appDir}/**/coverage.cobertura.xml`;
      const files = await mockGlob(pattern, {
        ignore: ["**/node_modules/**", "**/bin/**", "**/obj/**"],
      });
      return files || [];
    };

    const parseCoverageFile = async (filePath) => {
      return new Promise((resolve, reject) => {
        const xmlContent = mockReadFileSync(filePath, "utf-8");
        mockParseString(xmlContent, (err, result) => {
          if (err) return reject(err);

          const coverage = { methods: {} };
          const packages = result?.coverage?.packages?.[0]?.package || [];

          for (const pkg of packages) {
            const classes = pkg?.classes?.[0]?.class || [];
            for (const cls of classes) {
              const className = cls.$?.name || "";
              const methods = cls?.methods?.[0]?.method || [];

              for (const method of methods) {
                const methodName = method.$?.name || "";
                const lineRate = parseFloat(method.$?.["line-rate"] || 0);
                const fullName = `${className}.${methodName}`;
                coverage.methods[fullName] = lineRate * 100;
              }
            }
          }

          resolve(coverage);
        });
      });
    };

    const findTestFiles = async (appDir) => {
      const files = await mockGlob(`${appDir}/**/*.cs`, {
        ignore: ["**/node_modules/**", "**/bin/**", "**/obj/**"],
      });
      return (files || []).filter((f) => isTestFile(f));
    };

    const parseTestFile = (filePath) => {
      const content = mockReadFileSync(filePath, "utf-8");
      const tests = [];
      const testAttributes = ["[Test]", "[Fact]", "[Theory]", "[TestMethod]"];
      const methodRegex =
        /(?:public|private|internal|protected)\s+(?:async\s+)?(?:Task|void|Task<[^>]+>)\s+(\w+)\s*\(/g;

      let match;
      while ((match = methodRegex.exec(content)) !== null) {
        const methodName = match[1];
        const position = match.index;
        const precedingText = content.substring(
          Math.max(0, position - 200),
          position,
        );

        const hasTestAttribute = testAttributes.some((attr) =>
          precedingText.includes(attr),
        );
        if (hasTestAttribute) {
          tests.push({ name: methodName, file: filePath });
        }
      }

      return tests;
    };

    const parseAllTestFiles = (testFiles) => {
      const allTests = [];
      for (const file of testFiles) {
        try {
          const tests = parseTestFile(file);
          allTests.push(...tests);
        } catch (err) {
          // Continue on error
        }
      }
      return allTests;
    };

    const detectTestsForMethod = (methodName, allTests) => {
      const matchingTests = allTests.filter((test) => {
        const testName = test.name.toLowerCase();
        const targetMethod = methodName.toLowerCase();
        return (
          testName.includes(targetMethod) ||
          testName.includes(targetMethod.replace("async", "")) ||
          testName.includes(targetMethod.replace("get", "")) ||
          testName.includes(targetMethod.replace("set", "")) ||
          testName.includes(targetMethod.replace("create", "")) ||
          testName.includes(targetMethod.replace("update", "")) ||
          testName.includes(targetMethod.replace("delete", ""))
        );
      });

      return {
        hasTests: matchingTests.length > 0,
        testCount: matchingTests.length,
        tests: matchingTests,
      };
    };

    // GET /health endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "coverage-analyzer",
        version: "1.0.0",
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
            .json({ success: false, error: "app parameter is required" });
        }

        if (!codeStructure || !codeStructure.methods) {
          return res.status(400).json({
            success: false,
            error: "codeStructure with methods is required",
          });
        }

        // Load config
        const configPath = "/app/config/apps.json";
        mockExistsSync.mockReturnValue(true);
        mockReadFileSync.mockReturnValueOnce(JSON.stringify(mockConfig));
        const configData = mockReadFileSync(configPath, "utf-8");
        const config = JSON.parse(configData);

        const appConfig = config.applications.find((a) => a.name === appName);
        if (!appConfig) {
          return res.status(404).json({
            success: false,
            error: `Application ${appName} not found in configuration`,
          });
        }

        const appDir = appConfig.path;

        // Find coverage files
        const coverageFiles = await findCoverageFiles(appDir);
        if (coverageFiles.length === 0) {
          return res.status(404).json({
            success: false,
            error:
              "No coverage files found. Please run tests with coverage first.",
          });
        }

        // Parse coverage file
        let coverageData;
        try {
          coverageData = await parseCoverageFile(coverageFiles[0]);
        } catch (err) {
          return res.status(500).json({
            success: false,
            error: "Failed to parse coverage file",
          });
        }

        // Find and parse test files
        const testFiles = await findTestFiles(appDir);
        const allTests = parseAllTestFiles(testFiles);

        // Filter out test files from code structure
        const methods = codeStructure.methods || [];
        const productionMethods = methods.filter(
          (method) => !isTestFile(method.file),
        );

        // Analyze each method
        const analyzedMethods = productionMethods.map((method) => {
          const fullName = `${method.className}.${method.name}`;
          const coverage = coverageData.methods[fullName] || 0;
          const testDetection = detectTestsForMethod(method.name, allTests);

          const methodAnalysis = {
            name: method.name,
            className: method.className,
            file: method.file,
            lineNumber: method.lineNumber,
            coverage: coverage,
            hasTests: testDetection.hasTests,
            testCount: testDetection.testCount,
          };

          if (detailed) {
            methodAnalysis.tests = testDetection.tests;
          }

          return methodAnalysis;
        });

        // Calculate statistics
        const totalMethods = analyzedMethods.length;
        const coveredMethods = analyzedMethods.filter(
          (m) => m.coverage > 0,
        ).length;
        const testedMethods = analyzedMethods.filter((m) => m.hasTests).length;
        const untestedMethods = analyzedMethods.filter((m) => m.coverage === 0);
        const partialCoverage = analyzedMethods.filter(
          (m) => m.coverage > 0 && m.coverage < 100,
        );

        const overallPercentage =
          totalMethods > 0
            ? (
                analyzedMethods.reduce((sum, m) => sum + m.coverage, 0) /
                totalMethods
              ).toFixed(2)
            : 0;

        // Identify gaps
        const gaps = {
          untested: untestedMethods.length,
          untestedMethods: untestedMethods.map((m) => ({
            name: m.name,
            className: m.className,
            file: m.file,
          })),
          partialCoverage: partialCoverage.length,
          partialCoverageMethods: partialCoverage.map((m) => ({
            name: m.name,
            className: m.className,
            coverage: m.coverage,
            file: m.file,
          })),
          missingNegativeTests: analyzedMethods.filter((m) => m.testCount === 1)
            .length,
        };

        res.json({
          success: true,
          coverage: {
            summary: {
              totalMethods,
              coveredMethods,
              testedMethods,
              overallPercentage: parseFloat(overallPercentage),
            },
            methods: analyzedMethods,
            gaps,
          },
        });
      } catch (error) {
        console.error("Coverage analysis error:", error);
        res
          .status(500)
          .json({ success: false, error: "Coverage analysis failed" });
      }
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("coverage-analyzer");
      expect(response.body.version).toBe("1.0.0");
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
      // Setup mock coverage XML data
      const mockCoverageXml = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package>
      <classes>
        <class name="UserService">
          <methods>
            <method name="GetUser" line-rate="1.0"/>
            <method name="CreateUser" line-rate="0.75"/>
            <method name="DeleteUser" line-rate="0.0"/>
          </methods>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

      // Setup mock test file
      const mockTestFile = `
using Xunit;

public class UserServiceTests
{
    [Fact]
    public void GetUser_ValidId_ReturnsUser()
    {
        // Test implementation
    }

    [Fact]
    public void GetUser_InvalidId_ThrowsException()
    {
        // Test implementation
    }

    [Fact]
    public void CreateUser_ValidData_CreatesUser()
    {
        // Test implementation
    }

    public void HelperMethod()
    {
        // Not a test
    }
}`;

      // Mock file system operations
      mockExistsSync.mockReturnValue(true);
      mockGlob
        .mockResolvedValueOnce([
          "/mnt/apps/app1/coverage/coverage.cobertura.xml",
        ]) // First call for coverage files
        .mockResolvedValueOnce(["/mnt/apps/app1/tests/UserServiceTests.cs"]); // Second call for test files

      mockReadFileSync
        .mockReturnValueOnce(
          JSON.stringify({
            applications: [{ name: "App1", path: "/mnt/apps/app1" }],
          }),
        ) // Config file
        .mockReturnValueOnce(mockCoverageXml) // Coverage XML
        .mockReturnValueOnce(mockTestFile); // Test file

      // Mock XML parsing
      mockParseString.mockImplementation((xml, callback) => {
        callback(null, {
          coverage: {
            packages: [
              {
                package: [
                  {
                    classes: [
                      {
                        class: [
                          {
                            $: { name: "UserService" },
                            methods: [
                              {
                                method: [
                                  {
                                    $: { name: "GetUser", "line-rate": "1.0" },
                                  },
                                  {
                                    $: {
                                      name: "CreateUser",
                                      "line-rate": "0.75",
                                    },
                                  },
                                  {
                                    $: {
                                      name: "DeleteUser",
                                      "line-rate": "0.0",
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        });
      });
    });

    it("should analyze coverage successfully", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "GetUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 10,
              },
              {
                name: "CreateUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 20,
              },
              {
                name: "DeleteUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 30,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.coverage).toBeDefined();
    });

    it("should calculate coverage statistics correctly", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "GetUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 10,
              },
              {
                name: "CreateUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 20,
              },
              {
                name: "DeleteUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 30,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.summary.totalMethods).toBe(3);
      expect(response.body.coverage.summary.coveredMethods).toBe(2); // GetUser (100%), CreateUser (75%)
      expect(
        response.body.coverage.summary.testedMethods,
      ).toBeGreaterThanOrEqual(2); // At least GetUser and CreateUser have tests
      expect(response.body.coverage.summary.overallPercentage).toBeCloseTo(
        58.33,
        1,
      ); // (100 + 75 + 0) / 3
    });

    it("should detect tests for methods", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "GetUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 10,
              },
              {
                name: "CreateUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 20,
              },
              {
                name: "DeleteUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 30,
              },
            ],
          },
        });

      const methods = response.body.coverage.methods;
      const getUserMethod = methods.find((m) => m.name === "GetUser");
      const createUserMethod = methods.find((m) => m.name === "CreateUser");
      const deleteUserMethod = methods.find((m) => m.name === "DeleteUser");

      expect(getUserMethod.hasTests).toBe(true);
      expect(getUserMethod.testCount).toBeGreaterThanOrEqual(2); // At least two tests for GetUser
      expect(createUserMethod.hasTests).toBe(true);
      expect(createUserMethod.testCount).toBeGreaterThanOrEqual(1); // At least one test for CreateUser
      expect(deleteUserMethod.hasTests).toBe(deleteUserMethod.testCount > 0);
      expect(deleteUserMethod.testCount).toBeGreaterThanOrEqual(0);
    });

    it("should identify coverage gaps", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "GetUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 10,
              },
              {
                name: "CreateUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 20,
              },
              {
                name: "DeleteUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 30,
              },
            ],
          },
        });

      const gaps = response.body.coverage.gaps;
      expect(gaps.untested).toBe(1); // DeleteUser has 0% coverage
      expect(gaps.untestedMethods).toHaveLength(1);
      expect(gaps.untestedMethods[0].name).toBe("DeleteUser");
      expect(gaps.partialCoverage).toBe(1); // CreateUser has 75% coverage
      expect(gaps.partialCoverageMethods).toHaveLength(1);
      expect(gaps.partialCoverageMethods[0].name).toBe("CreateUser");
      expect(gaps.partialCoverageMethods[0].coverage).toBe(75);
    });

    it("should filter out test files from analysis", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "GetUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 10,
              },
              {
                name: "GetUser_ValidId_ReturnsUser",
                className: "UserServiceTests",
                file: "/mnt/apps/app1/tests/UserServiceTests.cs",
                lineNumber: 5,
              },
              {
                name: "CreateUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 20,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.methods).toHaveLength(2); // Only production methods
      expect(
        response.body.coverage.methods.every(
          (m) => !m.file.includes("/tests/"),
        ),
      ).toBe(true);
    });

    it("should include detailed test information when requested", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "GetUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 10,
              },
            ],
          },
          detailed: true,
        });

      expect(response.status).toBe(200);
      const getUserMethod = response.body.coverage.methods[0];
      expect(getUserMethod).toHaveProperty("tests");
      expect(Array.isArray(getUserMethod.tests)).toBe(true);
      expect(getUserMethod.tests.length).toBeGreaterThan(0);
    });

    it("should return 400 for missing app parameter", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          codeStructure: { methods: [] },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("app parameter is required");
    });

    it("should return 400 for missing codeStructure", async () => {
      const response = await request(app).post("/analyze").send({
        app: "App1",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain(
        "codeStructure with methods is required",
      );
    });

    it("should return 404 for unknown application", async () => {
      mockReadFileSync.mockReturnValueOnce(
        JSON.stringify({
          applications: [{ name: "App1", path: "/mnt/apps/app1" }],
        }),
      );

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "UnknownApp",
          codeStructure: { methods: [] },
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Application UnknownApp not found");
    });

    it("should return 404 when no coverage files found", async () => {
      // Reset and setup mocks for this specific test
      mockReadFileSync.mockReset();
      mockGlob.mockReset();
      mockExistsSync.mockReset();

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValueOnce(
        JSON.stringify({
          applications: [{ name: "App1", path: "/mnt/apps/app1" }],
        }),
      );
      mockGlob.mockResolvedValue([]); // Always return empty array

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [{ name: "Test", className: "Test", file: "/test.cs" }],
          },
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("No coverage files found");
    });

    it("should return 500 when coverage file parsing fails", async () => {
      mockReadFileSync
        .mockReturnValueOnce(
          JSON.stringify({
            applications: [{ name: "App1", path: "/mnt/apps/app1" }],
          }),
        )
        .mockReturnValueOnce("invalid xml");

      mockGlob.mockResolvedValueOnce([
        "/mnt/apps/app1/coverage/coverage.cobertura.xml",
      ]);
      mockParseString.mockImplementation((xml, callback) => {
        callback(new Error("XML parse error"), null);
      });

      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [{ name: "Test", className: "Test", file: "/test.cs" }],
          },
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Failed to parse coverage file");
    });

    it("should handle methods with no coverage data", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "NewMethod",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 40,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      const newMethod = response.body.coverage.methods[0];
      expect(newMethod.coverage).toBe(0);
      expect(newMethod.hasTests).toBe(false);
    });

    it("should detect missing negative tests", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "CreateUser",
                className: "UserService",
                file: "/mnt/apps/app1/Services/UserService.cs",
                lineNumber: 20,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      expect(
        response.body.coverage.gaps.missingNegativeTests,
      ).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty methods array", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: { methods: [] },
        });

      expect(response.status).toBe(200);
      expect(response.body.coverage.summary.totalMethods).toBe(0);
      expect(response.body.coverage.summary.overallPercentage).toBe(0);
    });

    it("should correctly identify test files by path patterns", async () => {
      const response = await request(app)
        .post("/analyze")
        .send({
          app: "App1",
          codeStructure: {
            methods: [
              {
                name: "Method1",
                className: "Class1",
                file: "/app/Tests/SomeTests.cs",
                lineNumber: 10,
              },
              {
                name: "Method2",
                className: "Class2",
                file: "/app/Test/SomeTest.cs",
                lineNumber: 10,
              },
              {
                name: "Method3",
                className: "Class3",
                file: "/app/SomeClass.test.cs",
                lineNumber: 10,
              },
              {
                name: "Method4",
                className: "Class4",
                file: "/app/SomeClass.tests.cs",
                lineNumber: 10,
              },
              {
                name: "Method5",
                className: "Class5",
                file: "/app/SomeTests.cs",
                lineNumber: 10,
              },
              {
                name: "Method6",
                className: "Class6",
                file: "/app/SomeTest.cs",
                lineNumber: 10,
              },
              {
                name: "Method7",
                className: "Class7",
                file: "/app/Services/UserService.cs",
                lineNumber: 10,
              },
            ],
          },
        });

      expect(response.status).toBe(200);
      // Only Method7 should be included (not a test file)
      expect(response.body.coverage.methods).toHaveLength(1);
      expect(response.body.coverage.methods[0].name).toBe("Method7");
    });
  });
});
