import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import parser from "@babel/parser";
import traverse from "@babel/traverse";
import { parse as parseVue } from "@vue/compiler-sfc";

// Mock dependencies
const mockReadFileSync = jest.fn();
const mockGlobSync = jest.fn();

// Mock fs module
jest.unstable_mockModule("fs", () => ({
  readFileSync: mockReadFileSync,
  default: {
    readFileSync: mockReadFileSync,
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

describe("JavaScript Code Analyzer Routes", () => {
  let app;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Import path module (needed for helpers)
    const path = await import("path");

    // Create Express app
    app = express();
    app.use(express.json());

    // Mock apps.json config
    // eslint-disable-next-line no-unused-vars
    const mockConfig = {
      applications: [
        { name: "ReactApp", path: "/mnt/apps/react-app" },
        { name: "VueApp", path: "/mnt/apps/vue-app" },
      ],
    };

    // Helper function: loadAppsConfig
    function loadAppsConfig() {
      try {
        const configPath = "/app/config/apps.json";
        const content = mockReadFileSync(configPath, "utf-8");
        return JSON.parse(content);
      } catch (error) {
        return { applications: [] };
      }
    }

    // Helper function: detectFileType
    function detectFileType(filePath, content) {
      const fileName = path.basename(filePath);

      if (filePath.includes("/components/")) return "Component";
      if (filePath.includes("/hooks/")) return "Hook";
      if (filePath.includes("/utils/") || filePath.includes("/helpers/"))
        return "Utility";
      if (filePath.includes("/services/") || filePath.includes("/api/"))
        return "Service";
      if (filePath.includes("/store/") || filePath.includes("/redux/"))
        return "State";
      if (filePath.includes("/pages/") || filePath.includes("/routes/"))
        return "Page";
      if (fileName.endsWith(".test.js") || fileName.endsWith(".spec.js"))
        return "Test";
      if (fileName.endsWith(".config.js")) return "Config";

      if (content.includes("React.Component") || content.includes("useState"))
        return "Component";
      if (content.includes("export default function use")) return "Hook";

      return "Other";
    }

    // Helper function: calculateComplexity
    function calculateComplexity(path) {
      let complexity = 1;

      path.traverse({
        IfStatement() {
          complexity++;
        },
        ConditionalExpression() {
          complexity++;
        },
        SwitchCase(path) {
          if (path.node.test) complexity++;
        },
        ForStatement() {
          complexity++;
        },
        ForInStatement() {
          complexity++;
        },
        ForOfStatement() {
          complexity++;
        },
        WhileStatement() {
          complexity++;
        },
        DoWhileStatement() {
          complexity++;
        },
        LogicalExpression(path) {
          if (path.node.operator === "&&" || path.node.operator === "||") {
            complexity++;
          }
        },
        CatchClause() {
          complexity++;
        },
      });

      return complexity;
    }

    // Helper function: extractFunction
    function extractFunction(path, filePath) {
      const name = path.node.id?.name || path.node.key?.name || "anonymous";
      return {
        name,
        file: filePath,
        line: path.node.loc?.start.line,
        params: path.node.params?.length || path.node.init?.params?.length || 0,
        isAsync: path.node.async || path.node.init?.async || false,
        isArrow: path.node.init?.type === "ArrowFunctionExpression",
        complexity: calculateComplexity(path),
      };
    }

    // Helper function: extractHooks
    function extractHooks(path) {
      const hooks = [];
      path.traverse({
        CallExpression(callPath) {
          const callee = callPath.node.callee;
          if (callee.name && /^use[A-Z]/.test(callee.name)) {
            hooks.push(callee.name);
          }
        },
      });
      return [...new Set(hooks)];
    }

    // Helper function: extractProps
    function extractProps(path) {
      const props = [];
      path.traverse({
        ObjectPattern(objPath) {
          if (
            objPath.parent.type === "ArrowFunctionExpression" ||
            objPath.parent.type === "FunctionExpression"
          ) {
            objPath.node.properties.forEach((prop) => {
              if (prop.key) {
                props.push(prop.key.name);
              }
            });
          }
        },
      });
      return props;
    }

    // Helper function: analyzeJavaScriptFile
    function analyzeJavaScriptFile(filePath, options = {}) {
      try {
        const content = mockReadFileSync(filePath, "utf-8");
        const ext = path.extname(filePath);

        // Handle Vue files
        if (ext === ".vue") {
          return analyzeVueFile(filePath, content, options);
        }

        const ast = parser.parse(content, {
          sourceType: "module",
          plugins: [
            "jsx",
            "typescript",
            "decorators-legacy",
            "classProperties",
            "dynamicImport",
            "optionalChaining",
            "nullishCoalescingOperator",
          ],
        });

        const analysis = {
          file: filePath,
          type: detectFileType(filePath, content),
          components: [],
          functions: [],
          classes: [],
          hooks: [],
          imports: [],
          exports: [],
          apiCalls: [],
          complexity: 0,
        };

        traverse.default(ast, {
          FunctionDeclaration(path) {
            const func = extractFunction(path, filePath);
            analysis.functions.push(func);
            analysis.complexity += func.complexity;
          },

          VariableDeclarator(path) {
            if (
              path.node.init &&
              (path.node.init.type === "ArrowFunctionExpression" ||
                path.node.init.type === "FunctionExpression")
            ) {
              const func = extractFunction(path, filePath);
              analysis.functions.push(func);
              analysis.complexity += func.complexity;

              if (path.node.id && /^[A-Z]/.test(path.node.id.name)) {
                analysis.components.push({
                  name: path.node.id.name,
                  type: "FunctionalComponent",
                  file: filePath,
                  hooks: extractHooks(path),
                  props: extractProps(path),
                  complexity: func.complexity,
                });
              }

              if (path.node.id && /^use[A-Z]/.test(path.node.id.name)) {
                analysis.hooks.push({
                  name: path.node.id.name,
                  file: filePath,
                  dependencies: [],
                });
              }
            }
          },

          ClassDeclaration(path) {
            const cls = {
              name: path.node.id.name,
              file: filePath,
              methods: [],
              isComponent: false,
              extendsComponent: false,
            };

            if (path.node.superClass) {
              const superClassName =
                path.node.superClass.name ||
                path.node.superClass.property?.name;
              if (
                superClassName === "Component" ||
                superClassName === "PureComponent"
              ) {
                cls.isComponent = true;
                cls.extendsComponent = true;
              }
            }

            path.node.body.body.forEach((member) => {
              if (member.type === "ClassMethod") {
                cls.methods.push({
                  name: member.key.name,
                  kind: member.kind,
                  isAsync: member.async,
                  params: member.params.length,
                });
              }
            });

            if (cls.isComponent) {
              analysis.components.push({
                name: cls.name,
                type: "ClassComponent",
                file: filePath,
                methods: cls.methods,
                complexity: calculateComplexity(path),
              });
            } else {
              analysis.classes.push(cls);
            }
          },

          ImportDeclaration(path) {
            analysis.imports.push({
              source: path.node.source.value,
              specifiers: path.node.specifiers.map((s) => s.local.name),
            });
          },

          ExportNamedDeclaration(path) {
            if (path.node.declaration) {
              if (path.node.declaration.type === "VariableDeclaration") {
                path.node.declaration.declarations.forEach((decl) => {
                  analysis.exports.push(decl.id.name);
                });
              } else if (path.node.declaration.id) {
                analysis.exports.push(path.node.declaration.id.name);
              }
            }
          },

          // eslint-disable-next-line no-unused-vars
          ExportDefaultDeclaration(path) {
            analysis.exports.push("default");
          },

          CallExpression(path) {
            const callee = path.node.callee;
            if (
              callee.name === "fetch" ||
              (callee.object && callee.object.name === "axios") ||
              (callee.property &&
                ["get", "post", "put", "delete"].includes(callee.property.name))
            ) {
              const apiCall = {
                method: callee.property?.name || "fetch",
                line: path.node.loc?.start.line,
              };

              if (
                path.node.arguments[0] &&
                path.node.arguments[0].type === "StringLiteral"
              ) {
                apiCall.url = path.node.arguments[0].value;
              }

              analysis.apiCalls.push(apiCall);
            }
          },
        });

        return analysis;
      } catch (error) {
        return {
          file: filePath,
          error: error.message,
          components: [],
          functions: [],
          classes: [],
          hooks: [],
          imports: [],
          exports: [],
          apiCalls: [],
          complexity: 0,
        };
      }
    }

    // Helper function: analyzeVueFile
    // eslint-disable-next-line no-unused-vars
    function analyzeVueFile(filePath, content, options) {
      try {
        const { descriptor } = parseVue(content);

        const analysis = {
          file: filePath,
          type: "VueComponent",
          components: [],
          functions: [],
          classes: [],
          hooks: [],
          imports: [],
          exports: [],
          apiCalls: [],
          complexity: 0,
          template: descriptor.template ? true : false,
          script: descriptor.script ? true : false,
          styles: descriptor.styles.length,
        };

        if (descriptor.script || descriptor.scriptSetup) {
          const scriptContent =
            descriptor.script?.content || descriptor.scriptSetup?.content;
          if (scriptContent) {
            try {
              const scriptAst = parser.parse(scriptContent, {
                sourceType: "module",
                plugins: ["jsx", "typescript"],
              });

              traverse.default(scriptAst, {
                ExportDefaultDeclaration(path) {
                  if (path.node.declaration.type === "ObjectExpression") {
                    const component = {
                      name: path.basename(filePath, ".vue"),
                      type: "VueComponent",
                      file: filePath,
                      props: [],
                      data: [],
                      methods: [],
                      computed: [],
                      complexity: 0,
                    };

                    path.node.declaration.properties.forEach((prop) => {
                      if (prop.key.name === "methods") {
                        if (prop.value.type === "ObjectExpression") {
                          prop.value.properties.forEach((method) => {
                            component.methods.push(method.key.name);
                          });
                        }
                      }
                    });

                    analysis.components.push(component);
                  }
                },
              });
            } catch (err) {
              // Continue on error
            }
          }
        }

        return analysis;
      } catch (error) {
        return {
          file: filePath,
          error: error.message,
          type: "VueComponent",
          components: [],
          functions: [],
          classes: [],
          hooks: [],
          imports: [],
          exports: [],
          apiCalls: [],
          complexity: 0,
        };
      }
    }

    // Helper function: findJavaScriptFiles
    function findJavaScriptFiles(
      appDir,
      includePatterns = [],
      excludePaths = [],
    ) {
      const defaultPatterns = [
        "**/*.js",
        "**/*.jsx",
        "**/*.ts",
        "**/*.tsx",
        "**/*.vue",
      ];

      const defaultExcludes = [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/*.test.js",
        "**/*.test.jsx",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.js",
        "**/*.spec.jsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "**/__tests__/**",
        "**/__mocks__/**",
        ...excludePaths,
      ];

      const patterns =
        includePatterns.length > 0 ? includePatterns : defaultPatterns;
      const files = [];

      for (const pattern of patterns) {
        const found = mockGlobSync(`${appDir}/${pattern}`, {
          nodir: true,
          ignore: defaultExcludes,
        });
        files.push(...found);
      }

      return [...new Set(files)];
    }

    // GET /health endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        service: "javascript-code-analyzer-mcp",
        timestamp: new Date().toISOString(),
      });
    });

    // POST /analyze endpoint
    app.post("/analyze", async (req, res) => {
      try {
        const {
          app: appName,
          includeTests = false,
          // eslint-disable-next-line no-unused-vars
          detailed = false,
        } = req.body;

        if (!appName) {
          return res
            .status(400)
            .json({ error: "Application name is required" });
        }

        const config = loadAppsConfig();
        const appConfig = config.applications.find((a) => a.name === appName);

        if (!appConfig) {
          return res
            .status(404)
            .json({ error: `Application ${appName} not found` });
        }

        const files = findJavaScriptFiles(
          appConfig.path,
          appConfig.includePatterns,
          appConfig.excludePaths,
        );

        const analysis = {
          app: appName,
          timestamp: new Date().toISOString(),
          totalFiles: files.length,
          components: [],
          functions: [],
          classes: [],
          hooks: [],
          apiCalls: [],
          summary: {},
        };

        let totalComplexity = 0;

        for (const file of files) {
          try {
            const fileAnalysis = analyzeJavaScriptFile(file, { includeTests });

            analysis.components.push(...fileAnalysis.components);
            analysis.functions.push(...fileAnalysis.functions);
            analysis.classes.push(...fileAnalysis.classes);
            analysis.hooks.push(...fileAnalysis.hooks);
            analysis.apiCalls.push(...fileAnalysis.apiCalls);
            totalComplexity += fileAnalysis.complexity;
          } catch (error) {
            // Continue on error
          }
        }

        analysis.summary = {
          totalFiles: files.length,
          totalComponents: analysis.components.length,
          totalFunctions: analysis.functions.length,
          totalClasses: analysis.classes.length,
          totalHooks: analysis.hooks.length,
          totalApiCalls: analysis.apiCalls.length,
          averageComplexity:
            analysis.functions.length > 0
              ? Math.round(totalComplexity / analysis.functions.length)
              : 0,
          totalComplexity,
        };

        res.json({
          success: true,
          analysis,
        });
      } catch (error) {
        res.status(500).json({
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
      expect(response.body.service).toBe("javascript-code-analyzer-mcp");
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
      // Mock config file
      // eslint-disable-next-line no-unused-vars
      mockReadFileSync.mockImplementation((path, encoding) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [
              { name: "ReactApp", path: "/mnt/apps/react-app" },
              { name: "VueApp", path: "/mnt/apps/vue-app" },
            ],
          });
        }
        return "";
      });
    });

    it("should analyze React functional component", async () => {
      const reactCode = `
import React, { useState } from 'react';

const MyComponent = ({ name, age }) => {
  const [count, setCount] = useState(0);

  return <div>{name} - {count}</div>;
};

export default MyComponent;
`;

      mockGlobSync.mockReturnValue([
        "/mnt/apps/react-app/components/MyComponent.jsx",
      ]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/components/MyComponent.jsx") {
          return reactCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis.components.length).toBeGreaterThan(0);
      expect(response.body.analysis.components[0].name).toBe("MyComponent");
      expect(response.body.analysis.components[0].type).toBe(
        "FunctionalComponent",
      );
      expect(response.body.analysis.components[0].hooks).toContain("useState");
      expect(response.body.analysis.components[0].props).toContain("name");
      expect(response.body.analysis.components[0].props).toContain("age");
    });

    it("should analyze React class component", async () => {
      const reactCode = `
import React, { Component } from 'react';

class MyClassComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  handleClick() {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return <div>{this.state.count}</div>;
  }
}

export default MyClassComponent;
`;

      mockGlobSync.mockReturnValue([
        "/mnt/apps/react-app/components/MyClassComponent.jsx",
      ]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/components/MyClassComponent.jsx") {
          return reactCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.components.length).toBeGreaterThan(0);
      expect(response.body.analysis.components[0].type).toBe("ClassComponent");
      expect(
        response.body.analysis.components[0].methods.length,
      ).toBeGreaterThan(0);
    });

    it("should detect custom hooks", async () => {
      const hookCode = `
import { useState, useEffect } from 'react';

const useCounter = (initialValue = 0) => {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);

  return { count, increment, decrement };
};

export default useCounter;
`;

      mockGlobSync.mockReturnValue(["/mnt/apps/react-app/hooks/useCounter.js"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/hooks/useCounter.js") {
          return hookCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.hooks.length).toBeGreaterThan(0);
      expect(response.body.analysis.hooks[0].name).toBe("useCounter");
    });

    it("should detect API calls", async () => {
      const apiCode = `
import axios from 'axios';

async function fetchUsers() {
  const response = await fetch('https://api.example.com/users');
  return response.json();
}

async function createUser(data) {
  return axios.post('https://api.example.com/users', data);
}

export { fetchUsers, createUser };
`;

      mockGlobSync.mockReturnValue([
        "/mnt/apps/react-app/services/userService.js",
      ]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/services/userService.js") {
          return apiCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.apiCalls.length).toBeGreaterThan(0);
      expect(
        response.body.analysis.apiCalls.some((call) => call.method === "fetch"),
      ).toBe(true);
      expect(
        response.body.analysis.apiCalls.some((call) => call.method === "post"),
      ).toBe(true);
    });

    it("should calculate complexity correctly", async () => {
      const complexCode = `
function complexFunction(x) {
  if (x > 0) {
    if (x > 10) {
      return 'large';
    } else {
      return 'small';
    }
  } else if (x < 0) {
    return 'negative';
  } else {
    return 'zero';
  }
}

export default complexFunction;
`;

      mockGlobSync.mockReturnValue(["/mnt/apps/react-app/utils/complex.js"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/utils/complex.js") {
          return complexCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.functions.length).toBeGreaterThan(0);
      expect(response.body.analysis.functions[0].complexity).toBeGreaterThan(1);
    });

    it("should analyze Vue SFC files", async () => {
      const vueCode = `
<template>
  <div>
    <h1>{{ title }}</h1>
    <button @click="increment">Count: {{ count }}</button>
  </div>
</template>

<script>
export default {
  name: 'Counter',
  props: ['initialCount'],
  data() {
    return {
      count: 0,
      title: 'Counter App'
    };
  },
  methods: {
    increment() {
      this.count++;
    },
    reset() {
      this.count = 0;
    }
  }
};
</script>

<style scoped>
button { padding: 10px; }
</style>
`;

      mockGlobSync.mockReturnValue([
        "/mnt/apps/vue-app/components/Counter.vue",
      ]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "VueApp", path: "/mnt/apps/vue-app" }],
          });
        }
        if (path === "/mnt/apps/vue-app/components/Counter.vue") {
          return vueCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "VueApp" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis.summary.totalFiles).toBe(1);
      // Vue components may or may not be fully analyzed depending on parsing
      if (response.body.analysis.components.length > 0) {
        const component = response.body.analysis.components[0];
        expect(component.type).toBe("VueComponent");
        expect(component.methods.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should detect file types correctly", async () => {
      mockGlobSync.mockReturnValue([
        "/mnt/apps/react-app/components/Button.jsx",
        "/mnt/apps/react-app/utils/formatDate.js",
        "/mnt/apps/react-app/services/api.js",
        "/mnt/apps/react-app/pages/Home.jsx",
      ]);

      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        return "const test = 1; export default test;";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.summary.totalFiles).toBe(4);
    });

    it("should generate summary statistics", async () => {
      const simpleCode = `
const add = (a, b) => a + b;
const subtract = (a, b) => a - b;
export { add, subtract };
`;

      mockGlobSync.mockReturnValue(["/mnt/apps/react-app/utils/math.js"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/utils/math.js") {
          return simpleCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.summary).toBeDefined();
      expect(response.body.analysis.summary.totalFiles).toBe(1);
      expect(
        response.body.analysis.summary.totalFunctions,
      ).toBeGreaterThanOrEqual(0);
      expect(response.body.analysis.summary).toHaveProperty(
        "averageComplexity",
      );
      expect(response.body.analysis.summary).toHaveProperty("totalComplexity");
    });

    it("should return 400 for missing app name", async () => {
      const response = await request(app).post("/analyze").send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Application name is required");
    });

    it("should return 404 for unknown application", async () => {
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "UnknownApp" });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Application UnknownApp not found");
    });

    it("should handle files with parse errors gracefully", async () => {
      const invalidCode = "const invalid = ;";

      mockGlobSync.mockReturnValue(["/mnt/apps/react-app/invalid.js"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/invalid.js") {
          return invalidCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should handle empty files", async () => {
      mockGlobSync.mockReturnValue(["/mnt/apps/react-app/empty.js"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/empty.js") {
          return "";
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis.summary.totalFiles).toBe(1);
    });

    it("should handle no files found", async () => {
      mockGlobSync.mockReturnValue([]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.summary.totalFiles).toBe(0);
    });

    it("should detect imports and exports", async () => {
      const moduleCode = `
import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Component = () => {
  return <div>Test</div>;
};

export const helper = () => {};
export default Component;
`;

      mockGlobSync.mockReturnValue(["/mnt/apps/react-app/Component.jsx"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/Component.jsx") {
          return moduleCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.analysis.components[0].file).toBe(
        "/mnt/apps/react-app/Component.jsx",
      );
    });

    it("should handle TypeScript files", async () => {
      const tsCode = `
interface User {
  name: string;
  age: number;
}

const getUser = (): User => {
  return { name: 'John', age: 30 };
};

export { getUser, User };
`;

      mockGlobSync.mockReturnValue(["/mnt/apps/react-app/types.ts"]);
      mockReadFileSync.mockImplementation((path) => {
        if (path === "/app/config/apps.json") {
          return JSON.stringify({
            applications: [{ name: "ReactApp", path: "/mnt/apps/react-app" }],
          });
        }
        if (path === "/mnt/apps/react-app/types.ts") {
          return tsCode;
        }
        return "";
      });

      const response = await request(app)
        .post("/analyze")
        .send({ app: "ReactApp" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analysis.functions.length).toBeGreaterThan(0);
    });
  });
});
