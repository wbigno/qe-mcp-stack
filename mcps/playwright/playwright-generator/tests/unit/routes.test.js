import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

describe("Playwright Generator Routes", () => {
  let app;
  let mockGenerateCompletion;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock function for AI client
    mockGenerateCompletion = jest.fn();

    app = express();
    app.use(express.json());

    const PORT = 3005; // eslint-disable-line no-unused-vars

    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "playwright-generator-mcp",
        timestamp: new Date().toISOString(),
      });
    });

    app.post("/generate", async (req, res) => {
      try {
        const {
          app: appName,
          paths = [],
          language = "typescript",
          includePageObjects = true,
          includeFixtures = true,
          model,
        } = req.body;

        if (!appName) {
          return res
            .status(400)
            .json({ error: "Application name is required" });
        }

        const files = [];

        // Generate test file for each path
        for (const path of paths) {
          const prompt = `Generate a complete Playwright test in ${language} for this user workflow:

Path: ${path.name}
Priority: ${path.priority}
Steps:
${path.steps.map((step, idx) => `${idx + 1}. ${step}`).join("\n")}
Expected Outcome: ${path.expectedOutcome}

Requirements:
1. Use Playwright with TypeScript
2. Include proper imports
3. Use describe/test structure
4. Include meaningful test descriptions
5. Use best practices for selectors (prefer data-testid, role, text)
6. Add proper waits and assertions
7. Include comments for each step
8. Handle async/await properly
9. Include error scenarios if relevant
10. Use Page Object Model if ${includePageObjects ? "yes" : "no"}

Return ONLY the complete, compilable test code without markdown code blocks.`;

          try {
            const response = await mockGenerateCompletion({
              model,
              messages: [{ role: "user", content: prompt }],
              maxTokens: 3000,
            });

            let testCode = response.text;
            testCode = testCode
              .replace(/```typescript\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();

            const fileName =
              path.name.toLowerCase().replace(/\s+/g, "-") + ".spec.ts";

            files.push({
              fileName,
              path: `/generated-tests/${appName}/playwright/${fileName}`,
              content: testCode,
              pathId: path.id,
              type: "test",
            });
          } catch (error) {
            console.error(
              `✗ Error generating test for ${path.name}:`,
              error.message,
            );
          }
        }

        // Generate page objects if requested
        if (includePageObjects && paths.length > 0) {
          const prompt = `Generate TypeScript page object models for these workflows:

${paths.map((p) => `- ${p.name}: ${p.steps.join(", ")}`).join("\n")}

Create page objects that:
1. Extend a base Page class
2. Include locators as getters
3. Include action methods
4. Include assertion methods
5. Use proper TypeScript types
6. Follow Playwright best practices

Return ONLY the code for BasePage.ts and relevant page objects.`;

          try {
            const response = await mockGenerateCompletion({
              model,
              messages: [{ role: "user", content: prompt }],
              maxTokens: 4000,
            });

            let pageObjectCode = response.text;
            pageObjectCode = pageObjectCode
              .replace(/```typescript\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();

            // Split into separate page object files
            const pageObjects = pageObjectCode
              .split("// File:")
              .filter((p) => p.trim());

            for (const po of pageObjects) {
              const lines = po.trim().split("\n");
              const firstLine = lines[0];
              const fileName = firstLine.includes(".ts")
                ? firstLine.trim()
                : "BasePage.ts";
              const content = lines.slice(1).join("\n").trim();

              files.push({
                fileName,
                path: `/generated-tests/${appName}/playwright/pages/${fileName}`,
                content,
                type: "page-object",
              });
            }
          } catch (error) {
            console.error(`✗ Error generating page objects:`, error.message);
          }
        }

        // Generate fixtures if requested
        if (includeFixtures) {
          const prompt = `Generate Playwright fixtures for testing including:

1. Authentication fixture (auto-login)
2. Test data fixture (generate test data)
3. Database cleanup fixture
4. API mocking fixture

Return TypeScript code for fixtures.ts`;

          try {
            const response = await mockGenerateCompletion({
              model,
              messages: [{ role: "user", content: prompt }],
              maxTokens: 2000,
            });

            let fixtureCode = response.text;
            fixtureCode = fixtureCode
              .replace(/```typescript\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();

            files.push({
              fileName: "fixtures.ts",
              path: `/generated-tests/${appName}/playwright/fixtures.ts`,
              content: fixtureCode,
              type: "fixture",
            });
          } catch (error) {
            console.error(`✗ Error generating fixtures:`, error.message);
          }
        }

        res.json({
          success: true,
          app: appName,
          generated: files.length,
          files,
          defaultPath: `/generated-tests/${appName}/playwright`,
        });
      } catch (error) {
        console.error("Test generation error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  });

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("healthy");
      expect(response.body.service).toBe("playwright-generator-mcp");
    });

    it("should include timestamp", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("timestamp");
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe("POST /generate", () => {
    beforeEach(() => {
      mockGenerateCompletion.mockResolvedValue({
        text: `import { test, expect } from '@playwright/test';

test.describe('User Login', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });
});`,
      });
    });

    it("should return 400 for missing app name", async () => {
      const response = await request(app).post("/generate").send({
        paths: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Application name is required");
    });

    it("should generate test successfully for single path", async () => {
      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "User Login",
              priority: "high",
              steps: [
                "Navigate to login page",
                "Enter credentials",
                "Click login",
              ],
              expectedOutcome: "User is logged in",
            },
          ],
          includePageObjects: false,
          includeFixtures: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.app).toBe("TestApp");
      expect(response.body.generated).toBe(1);
      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0].fileName).toBe("user-login.spec.ts");
      expect(response.body.files[0].type).toBe("test");
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
    });

    it("should generate tests for multiple paths", async () => {
      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "User Login",
              priority: "high",
              steps: [
                "Navigate to login page",
                "Enter credentials",
                "Click login",
              ],
              expectedOutcome: "User is logged in",
            },
            {
              id: "path-2",
              name: "Create Post",
              priority: "medium",
              steps: [
                "Click new post",
                "Enter title",
                "Enter content",
                "Publish",
              ],
              expectedOutcome: "Post is created",
            },
          ],
          includePageObjects: false,
          includeFixtures: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.generated).toBe(2);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0].fileName).toBe("user-login.spec.ts");
      expect(response.body.files[1].fileName).toBe("create-post.spec.ts");
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(2);
    });

    it("should strip markdown code blocks from generated code", async () => {
      mockGenerateCompletion.mockResolvedValueOnce({
        text: '```typescript\nimport { test } from "@playwright/test";\ntest("sample", async () => {});\n```',
      });

      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "Test Path",
              priority: "high",
              steps: ["Step 1"],
              expectedOutcome: "Success",
            },
          ],
          includePageObjects: false,
          includeFixtures: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.files[0].content).not.toContain("```typescript");
      expect(response.body.files[0].content).not.toContain("```");
      expect(response.body.files[0].content).toContain("import { test }");
    });

    it("should generate page objects when requested", async () => {
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "test code",
      });
      mockGenerateCompletion.mockResolvedValueOnce({
        text: `// File: BasePage.ts
export class BasePage {
  constructor(public page: Page) {}
}

// File: LoginPage.ts
export class LoginPage extends BasePage {
  async login() {}
}`,
      });

      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "User Login",
              priority: "high",
              steps: ["Login"],
              expectedOutcome: "Logged in",
            },
          ],
          includePageObjects: true,
          includeFixtures: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.generated).toBeGreaterThan(1);
      expect(response.body.files.some((f) => f.type === "page-object")).toBe(
        true,
      );
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(2);
    });

    it("should generate fixtures when requested", async () => {
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "test code",
      });
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "export const fixtures = { auth: async () => {} };",
      });

      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "User Login",
              priority: "high",
              steps: ["Login"],
              expectedOutcome: "Logged in",
            },
          ],
          includePageObjects: false,
          includeFixtures: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.files.some((f) => f.type === "fixture")).toBe(true);
      expect(
        response.body.files.some((f) => f.fileName === "fixtures.ts"),
      ).toBe(true);
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(2);
    });

    it("should generate all components when all options enabled", async () => {
      mockGenerateCompletion.mockResolvedValueOnce({ text: "test code" });
      mockGenerateCompletion.mockResolvedValueOnce({
        text: "// File: BasePage.ts\nclass BasePage {}",
      });
      mockGenerateCompletion.mockResolvedValueOnce({ text: "fixture code" });

      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "User Login",
              priority: "high",
              steps: ["Login"],
              expectedOutcome: "Logged in",
            },
          ],
          includePageObjects: true,
          includeFixtures: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.files.some((f) => f.type === "test")).toBe(true);
      expect(response.body.files.some((f) => f.type === "page-object")).toBe(
        true,
      );
      expect(response.body.files.some((f) => f.type === "fixture")).toBe(true);
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(3);
    });

    it("should handle errors during test generation", async () => {
      mockGenerateCompletion.mockRejectedValueOnce(
        new Error("AI generation failed"),
      );

      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "User Login",
              priority: "high",
              steps: ["Login"],
              expectedOutcome: "Logged in",
            },
          ],
          includePageObjects: false,
          includeFixtures: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.generated).toBe(0);
      expect(response.body.files).toHaveLength(0);
    });

    it("should pass model parameter to AI client", async () => {
      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-1",
              name: "User Login",
              priority: "high",
              steps: ["Login"],
              expectedOutcome: "Logged in",
            },
          ],
          model: "claude-opus-4-5-20251101",
          includePageObjects: false,
          includeFixtures: false,
        });

      expect(response.status).toBe(200);
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-opus-4-5-20251101",
        }),
      );
    });

    it("should return default path in response", async () => {
      const response = await request(app).post("/generate").send({
        app: "MyApp",
        paths: [],
        includePageObjects: false,
        includeFixtures: false,
      });

      expect(response.status).toBe(200);
      expect(response.body.defaultPath).toBe(
        "/generated-tests/MyApp/playwright",
      );
    });

    it("should handle empty paths array", async () => {
      const response = await request(app).post("/generate").send({
        app: "TestApp",
        paths: [],
        includePageObjects: false,
        includeFixtures: false,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.generated).toBe(0);
      expect(mockGenerateCompletion).not.toHaveBeenCalled();
    });

    it("should include path metadata in generated files", async () => {
      const response = await request(app)
        .post("/generate")
        .send({
          app: "TestApp",
          paths: [
            {
              id: "path-123",
              name: "User Login",
              priority: "high",
              steps: ["Login"],
              expectedOutcome: "Logged in",
            },
          ],
          includePageObjects: false,
          includeFixtures: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.files[0]).toHaveProperty("pathId", "path-123");
      expect(response.body.files[0]).toHaveProperty(
        "fileName",
        "user-login.spec.ts",
      );
      expect(response.body.files[0]).toHaveProperty(
        "path",
        "/generated-tests/TestApp/playwright/user-login.spec.ts",
      );
    });
  });
});
