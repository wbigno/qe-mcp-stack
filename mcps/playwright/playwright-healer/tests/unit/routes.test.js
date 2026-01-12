import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

// Mock fs/promises
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();

jest.unstable_mockModule("fs/promises", () => ({
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

describe("Playwright Healer Routes", () => {
  let app;
  let mockGenerateCompletion;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);

    // Create mock function for AI client
    mockGenerateCompletion = jest.fn();

    app = express();
    app.use(express.json({ limit: "10mb" }));

    const PORT = 8402; // eslint-disable-line no-unused-vars
    const DATA_DIR = "/app/data";

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "playwright-healer-mcp",
        timestamp: new Date().toISOString(),
      });
    });

    app.post("/analyze-failures", async (req, res) => {
      try {
        const { testFile, errorLog, screenshot, model } = req.body;

        if (!testFile || !errorLog) {
          return res.status(400).json({
            error: "testFile and errorLog are required",
          });
        }

        const analysisPrompt = `Analyze this Playwright test failure and provide a detailed diagnosis.

Test File: ${testFile}

Error Log:
${errorLog}

${screenshot ? "Screenshot data is available for visual analysis." : "No screenshot provided."}

Provide analysis in this JSON format:
{
  "failureType": "selector-not-found" | "timeout" | "assertion-failed" | "element-not-visible" | "network-error" | "race-condition" | "flaky-test" | "environment-issue",
  "rootCause": "Detailed explanation of what caused the failure",
  "affectedSelector": "CSS/XPath selector that failed (if applicable)",
  "suggestedFix": "Concrete steps to fix this issue",
  "confidence": "high" | "medium" | "low",
  "isFlaky": boolean,
  "flakinessReason": "Why this might be flaky (if applicable)",
  "preventionTips": ["Tip 1", "Tip 2"],
  "relatedIssues": ["Similar issues that might occur"]
}

Return ONLY valid JSON.`;

        const response = await mockGenerateCompletion({
          model,
          messages: [{ role: "user", content: analysisPrompt }],
          maxTokens: 2000,
          temperature: 0.2,
        });

        let failureAnalysis;
        try {
          const cleanedText = response.text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          failureAnalysis = JSON.parse(cleanedText);
        } catch (parseError) {
          return res.status(500).json({
            error: "Failed to parse failure analysis",
            details: parseError.message,
            rawResponse: response.text.substring(0, 500),
          });
        }

        const analysisData = {
          testFile,
          timestamp: new Date().toISOString(),
          errorLog: errorLog.substring(0, 1000),
          failureAnalysis,
          model: response.model,
          usage: response.usage,
        };

        const fileName = `failure-analysis-${Date.now()}.json`;
        await mockWriteFile(
          `${DATA_DIR}/${fileName}`,
          JSON.stringify(analysisData, null, 2),
        );

        res.json({
          success: true,
          testFile,
          failureAnalysis,
          savedTo: fileName,
          usage: response.usage,
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    });

    app.post("/heal", async (req, res) => {
      try {
        const { testFile, testCode, errorLog, model } = req.body;

        if (!testFile || !testCode || !errorLog) {
          return res.status(400).json({
            error: "testFile, testCode, and errorLog are required",
          });
        }

        const healingPrompt = `You are a Playwright test healing expert. Fix this broken Playwright test.

Test File: ${testFile}

Current Test Code:
\`\`\`typescript
${testCode}
\`\`\`

Error Log:
${errorLog}

Your task:
1. Analyze the error and identify the root cause
2. Fix the test code to resolve the issue
3. Improve test stability (better selectors, explicit waits, error handling)
4. Add comments explaining the changes

Common fixes:
- Replace fragile selectors (CSS classes) with stable ones (data-testid, role, text)
- Add explicit waits instead of hardcoded delays
- Handle race conditions with proper assertions
- Add retry logic for flaky elements
- Improve error messages for better debugging

Return JSON:
{
  "fixedCode": "Complete fixed test code",
  "changes": [
    {
      "line": 15,
      "before": "await page.click('.submit-btn')",
      "after": "await page.click('[data-testid="submit-button"]')",
      "reason": "Replaced fragile CSS class selector with stable data-testid"
    }
  ],
  "confidence": "high" | "medium" | "low",
  "additionalNotes": "Any warnings or suggestions",
  "testabilityImprovements": ["Improvement 1", "Improvement 2"]
}

Return ONLY valid JSON.`;

        const response = await mockGenerateCompletion({
          model,
          messages: [{ role: "user", content: healingPrompt }],
          maxTokens: 4000,
          temperature: 0.2,
        });

        let healResult;
        try {
          const cleanedText = response.text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          healResult = JSON.parse(cleanedText);
        } catch (parseError) {
          return res.status(500).json({
            error: "Failed to parse heal result",
            details: parseError.message,
            rawResponse: response.text.substring(0, 500),
          });
        }

        const healingData = {
          testFile,
          timestamp: new Date().toISOString(),
          originalCode: testCode.substring(0, 2000),
          errorLog: errorLog.substring(0, 1000),
          fixedCode: healResult.fixedCode,
          changes: healResult.changes,
          confidence: healResult.confidence,
          model: response.model,
          usage: response.usage,
        };

        const fileName = `heal-${testFile.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.json`;
        await mockWriteFile(
          `${DATA_DIR}/${fileName}`,
          JSON.stringify(healingData, null, 2),
        );

        res.json({
          success: true,
          testFile,
          fixedCode: healResult.fixedCode,
          changes: healResult.changes,
          confidence: healResult.confidence,
          additionalNotes: healResult.additionalNotes,
          testabilityImprovements: healResult.testabilityImprovements,
          savedTo: fileName,
          usage: response.usage,
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    });

    app.post("/detect-flaky", async (req, res) => {
      try {
        const { testResults, model } = req.body;

        if (!testResults || !Array.isArray(testResults)) {
          return res.status(400).json({
            error: "testResults array is required",
          });
        }

        if (testResults.length === 0) {
          return res.status(400).json({
            error: "testResults array cannot be empty",
          });
        }

        const detectionPrompt = `Analyze these Playwright test results to detect flaky tests.

Test Results (multiple runs):
${JSON.stringify(testResults, null, 2)}

A test is flaky if:
1. It passes sometimes and fails sometimes
2. It has intermittent timeouts or assertion failures
3. It depends on timing or external state
4. Error messages vary between runs

For each flaky test detected, provide:
{
  "flakyTests": [
    {
      "testName": "Test name",
      "testFile": "File path",
      "flakinessScore": 1-10,
      "passRate": 0.65,
      "totalRuns": 20,
      "passes": 13,
      "failures": 7,
      "failurePatterns": [
        {
          "pattern": "TimeoutError: waiting for selector",
          "occurrences": 4
        }
      ],
      "rootCauses": [
        "Race condition with network requests",
        "Element visibility timing"
      ],
      "suggestedFixes": [
        "Add explicit wait for network idle",
        "Use waitForSelector with visible state"
      ],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "summary": {
    "totalTestsAnalyzed": 50,
    "flakyTestsFound": 5,
    "criticalFlaky": 2,
    "recommendations": ["General recommendation 1", "General recommendation 2"]
  }
}

Return ONLY valid JSON.`;

        const response = await mockGenerateCompletion({
          model,
          messages: [{ role: "user", content: detectionPrompt }],
          maxTokens: 4000,
          temperature: 0.2,
        });

        let detectionResult;
        try {
          const cleanedText = response.text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          detectionResult = JSON.parse(cleanedText);
        } catch (parseError) {
          return res.status(500).json({
            error: "Failed to parse detection result",
            details: parseError.message,
            rawResponse: response.text.substring(0, 500),
          });
        }

        const reportData = {
          timestamp: new Date().toISOString(),
          totalTestRuns: testResults.length,
          flakyTests: detectionResult.flakyTests,
          summary: detectionResult.summary,
          model: response.model,
          usage: response.usage,
        };

        const fileName = `flaky-detection-${Date.now()}.json`;
        await mockWriteFile(
          `${DATA_DIR}/${fileName}`,
          JSON.stringify(reportData, null, 2),
        );

        res.json({
          success: true,
          flakyTests: detectionResult.flakyTests,
          summary: detectionResult.summary,
          savedTo: fileName,
          usage: response.usage,
        });
      } catch (error) {
        res.status(500).json({
          error: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("playwright-healer-mcp");
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe("POST /analyze-failures", () => {
    beforeEach(() => {
      mockGenerateCompletion.mockResolvedValue({
        text: JSON.stringify({
          failureType: "selector-not-found",
          rootCause:
            'The selector ".submit-button" could not be found on the page',
          affectedSelector: ".submit-button",
          suggestedFix: "Use a more stable selector like data-testid",
          confidence: "high",
          isFlaky: false,
          flakinessReason: null,
          preventionTips: ["Use data-testid attributes", "Add explicit waits"],
          relatedIssues: ["Timing issues", "DOM changes"],
        }),
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 100, output_tokens: 50 },
      });
    });

    it("should return 400 for missing testFile", async () => {
      const response = await request(app).post("/analyze-failures").send({
        errorLog: "Error: selector not found",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("testFile and errorLog are required");
    });

    it("should return 400 for missing errorLog", async () => {
      const response = await request(app).post("/analyze-failures").send({
        testFile: "login.spec.ts",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("testFile and errorLog are required");
    });

    it("should analyze failure successfully", async () => {
      const response = await request(app).post("/analyze-failures").send({
        testFile: "login.spec.ts",
        errorLog: 'Error: selector ".submit-button" not found',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.testFile).toBe("login.spec.ts");
      expect(response.body.failureAnalysis).toBeDefined();
      expect(response.body.failureAnalysis.failureType).toBe(
        "selector-not-found",
      );
      expect(response.body).toHaveProperty("savedTo");
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
    });

    it("should include screenshot flag in prompt when provided", async () => {
      const response = await request(app).post("/analyze-failures").send({
        testFile: "login.spec.ts",
        errorLog: "Error: element not visible",
        screenshot: "base64-encoded-image",
      });

      expect(response.status).toBe(200);
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.stringContaining("Screenshot data is available"),
            }),
          ],
        }),
      );
    });

    it("should handle JSON parse errors", async () => {
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "This is not valid JSON",
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const response = await request(app).post("/analyze-failures").send({
        testFile: "login.spec.ts",
        errorLog: "Error message",
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to parse failure analysis");
      expect(response.body).toHaveProperty("details");
      expect(response.body).toHaveProperty("rawResponse");
    });

    it("should save analysis to file", async () => {
      const response = await request(app).post("/analyze-failures").send({
        testFile: "login.spec.ts",
        errorLog: "Error: selector not found",
      });

      expect(response.status).toBe(200);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("failure-analysis-"),
        expect.any(String),
      );
    });
  });

  describe("POST /heal", () => {
    beforeEach(() => {
      mockGenerateCompletion.mockResolvedValue({
        text: JSON.stringify({
          fixedCode: 'await page.click("[data-testid=\\"submit\\"]")',
          changes: [
            {
              line: 10,
              before: 'await page.click(".submit-button")',
              after: 'await page.click("[data-testid=\\"submit\\"]")',
              reason: "Replaced fragile CSS selector with stable data-testid",
            },
          ],
          confidence: "high",
          additionalNotes: "Test is now more stable",
          testabilityImprovements: ["Better selector", "Explicit waits"],
        }),
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 200, output_tokens: 100 },
      });
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app).post("/heal").send({
        testFile: "login.spec.ts",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "testFile, testCode, and errorLog are required",
      );
    });

    it("should heal test successfully", async () => {
      const response = await request(app).post("/heal").send({
        testFile: "login.spec.ts",
        testCode: 'await page.click(".submit-button")',
        errorLog: "Error: selector not found",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.testFile).toBe("login.spec.ts");
      expect(response.body.fixedCode).toBeDefined();
      expect(response.body.changes).toBeInstanceOf(Array);
      expect(response.body.changes).toHaveLength(1);
      expect(response.body.confidence).toBe("high");
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
    });

    it("should include all change details", async () => {
      const response = await request(app).post("/heal").send({
        testFile: "login.spec.ts",
        testCode: 'await page.click(".submit-button")',
        errorLog: "Error: selector not found",
      });

      expect(response.status).toBe(200);
      expect(response.body.changes[0]).toHaveProperty("line");
      expect(response.body.changes[0]).toHaveProperty("before");
      expect(response.body.changes[0]).toHaveProperty("after");
      expect(response.body.changes[0]).toHaveProperty("reason");
    });

    it("should handle JSON parse errors", async () => {
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "Invalid JSON response",
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 200, output_tokens: 100 },
      });

      const response = await request(app).post("/heal").send({
        testFile: "login.spec.ts",
        testCode: 'await page.click(".submit-button")',
        errorLog: "Error: selector not found",
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to parse heal result");
    });

    it("should save healing history to file", async () => {
      const response = await request(app).post("/heal").send({
        testFile: "login.spec.ts",
        testCode: 'await page.click(".submit-button")',
        errorLog: "Error: selector not found",
      });

      expect(response.status).toBe(200);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("heal-"),
        expect.any(String),
      );
    });
  });

  describe("POST /detect-flaky", () => {
    beforeEach(() => {
      mockGenerateCompletion.mockResolvedValue({
        text: JSON.stringify({
          flakyTests: [
            {
              testName: "Login test",
              testFile: "login.spec.ts",
              flakinessScore: 8,
              passRate: 0.65,
              totalRuns: 20,
              passes: 13,
              failures: 7,
              failurePatterns: [
                {
                  pattern: "TimeoutError: waiting for selector",
                  occurrences: 4,
                },
              ],
              rootCauses: ["Race condition with network requests"],
              suggestedFixes: ["Add explicit wait for network idle"],
              confidence: "high",
            },
          ],
          summary: {
            totalTestsAnalyzed: 20,
            flakyTestsFound: 1,
            criticalFlaky: 1,
            recommendations: ["Add more explicit waits", "Improve selectors"],
          },
        }),
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 300, output_tokens: 150 },
      });
    });

    it("should return 400 for missing testResults", async () => {
      const response = await request(app).post("/detect-flaky").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("testResults array is required");
    });

    it("should return 400 for non-array testResults", async () => {
      const response = await request(app).post("/detect-flaky").send({
        testResults: "not an array",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("testResults array is required");
    });

    it("should return 400 for empty testResults array", async () => {
      const response = await request(app).post("/detect-flaky").send({
        testResults: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("testResults array cannot be empty");
    });

    it("should detect flaky tests successfully", async () => {
      const response = await request(app)
        .post("/detect-flaky")
        .send({
          testResults: [
            { testName: "Login test", status: "passed" },
            { testName: "Login test", status: "failed" },
            { testName: "Login test", status: "passed" },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.flakyTests).toBeInstanceOf(Array);
      expect(response.body.flakyTests).toHaveLength(1);
      expect(response.body.summary).toBeDefined();
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
    });

    it("should include summary statistics", async () => {
      const response = await request(app)
        .post("/detect-flaky")
        .send({
          testResults: [
            { testName: "Login test", status: "passed" },
            { testName: "Login test", status: "failed" },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.summary).toHaveProperty("totalTestsAnalyzed");
      expect(response.body.summary).toHaveProperty("flakyTestsFound");
      expect(response.body.summary).toHaveProperty("criticalFlaky");
      expect(response.body.summary).toHaveProperty("recommendations");
    });

    it("should include detailed flaky test information", async () => {
      const response = await request(app)
        .post("/detect-flaky")
        .send({
          testResults: [
            { testName: "Login test", status: "passed" },
            { testName: "Login test", status: "failed" },
          ],
        });

      expect(response.status).toBe(200);
      const flakyTest = response.body.flakyTests[0];
      expect(flakyTest).toHaveProperty("testName");
      expect(flakyTest).toHaveProperty("flakinessScore");
      expect(flakyTest).toHaveProperty("passRate");
      expect(flakyTest).toHaveProperty("failurePatterns");
      expect(flakyTest).toHaveProperty("rootCauses");
      expect(flakyTest).toHaveProperty("suggestedFixes");
    });

    it("should handle JSON parse errors", async () => {
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "Not valid JSON",
        model: "claude-sonnet-4-5",
        usage: { input_tokens: 300, output_tokens: 150 },
      });

      const response = await request(app)
        .post("/detect-flaky")
        .send({
          testResults: [{ testName: "Test", status: "passed" }],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to parse detection result");
    });

    it("should save detection report to file", async () => {
      const response = await request(app)
        .post("/detect-flaky")
        .send({
          testResults: [{ testName: "Login test", status: "passed" }],
        });

      expect(response.status).toBe(200);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("flaky-detection-"),
        expect.any(String),
      );
    });
  });
});
