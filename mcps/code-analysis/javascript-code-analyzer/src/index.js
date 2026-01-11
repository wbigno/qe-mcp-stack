import express from 'express';
import { readFileSync } from 'fs';
import { glob } from 'glob';
import parser from '@babel/parser';
import traverse from '@babel/traverse';
import { parse as parseVue } from '@vue/compiler-sfc';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 8204;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'javascript-code-analyzer-mcp',
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
 * Find all JavaScript/TypeScript files in app directory
 */
function findJavaScriptFiles(appDir, includePatterns = [], excludePaths = []) {
  const defaultPatterns = [
    '**/*.js',
    '**/*.jsx',
    '**/*.ts',
    '**/*.tsx',
    '**/*.vue'
  ];

  const defaultExcludes = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**',
    '**/*.test.js',
    '**/*.test.jsx',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.js',
    '**/*.spec.jsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/__tests__/**',
    '**/__mocks__/**',
    ...excludePaths
  ];

  const patterns = includePatterns.length > 0 ? includePatterns : defaultPatterns;
  const files = [];

  for (const pattern of patterns) {
    const found = glob.sync(`${appDir}/${pattern}`, {
      nodir: true,
      ignore: defaultExcludes
    });
    files.push(...found);
  }

  return [...new Set(files)]; // Remove duplicates
}

/**
 * Parse JavaScript/TypeScript file and analyze structure
 */
function analyzeJavaScriptFile(filePath, options = {}) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath);

    // Handle Vue SFC files
    if (ext === '.vue') {
      return analyzeVueFile(filePath, content, options);
    }

    // Parse JavaScript/TypeScript
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator'
      ]
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
      complexity: 0
    };

    // Traverse AST to extract information
    traverse.default(ast, {
      // Function declarations
      FunctionDeclaration(path) {
        const func = extractFunction(path, filePath);
        analysis.functions.push(func);
        analysis.complexity += func.complexity;
      },

      // Arrow functions and function expressions
      VariableDeclarator(path) {
        if (path.node.init &&
            (path.node.init.type === 'ArrowFunctionExpression' ||
             path.node.init.type === 'FunctionExpression')) {
          const func = extractFunction(path, filePath);
          analysis.functions.push(func);
          analysis.complexity += func.complexity;

          // Check if it's a React component (starts with capital letter)
          if (path.node.id && /^[A-Z]/.test(path.node.id.name)) {
            analysis.components.push({
              name: path.node.id.name,
              type: 'FunctionalComponent',
              file: filePath,
              hooks: extractHooks(path),
              props: extractProps(path),
              complexity: func.complexity
            });
          }

          // Check if it's a custom hook (starts with 'use')
          if (path.node.id && /^use[A-Z]/.test(path.node.id.name)) {
            analysis.hooks.push({
              name: path.node.id.name,
              file: filePath,
              dependencies: extractHookDependencies(path)
            });
          }
        }
      },

      // Class declarations (Class components, services, etc.)
      ClassDeclaration(path) {
        const cls = {
          name: path.node.id.name,
          file: filePath,
          methods: [],
          isComponent: false,
          extendsComponent: false
        };

        // Check if it extends React.Component
        if (path.node.superClass) {
          const superClassName = path.node.superClass.name ||
                                path.node.superClass.property?.name;
          if (superClassName === 'Component' || superClassName === 'PureComponent') {
            cls.isComponent = true;
            cls.extendsComponent = true;
          }
        }

        // Extract methods
        path.node.body.body.forEach(member => {
          if (member.type === 'ClassMethod') {
            cls.methods.push({
              name: member.key.name,
              kind: member.kind,
              isAsync: member.async,
              params: member.params.length
            });
          }
        });

        if (cls.isComponent) {
          analysis.components.push({
            name: cls.name,
            type: 'ClassComponent',
            file: filePath,
            methods: cls.methods,
            complexity: calculateComplexity(path)
          });
        } else {
          analysis.classes.push(cls);
        }
      },

      // Import statements
      ImportDeclaration(path) {
        analysis.imports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers.map(s => s.local.name)
        });
      },

      // Export statements
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          if (path.node.declaration.type === 'VariableDeclaration') {
            path.node.declaration.declarations.forEach(decl => {
              analysis.exports.push(decl.id.name);
            });
          } else if (path.node.declaration.id) {
            analysis.exports.push(path.node.declaration.id.name);
          }
        }
      },

      ExportDefaultDeclaration(path) {
        analysis.exports.push('default');
      },

      // API calls (fetch, axios, etc.)
      CallExpression(path) {
        const callee = path.node.callee;
        if (callee.name === 'fetch' ||
            (callee.object && callee.object.name === 'axios') ||
            (callee.property && ['get', 'post', 'put', 'delete'].includes(callee.property.name))) {
          const apiCall = {
            method: callee.property?.name || 'fetch',
            line: path.node.loc?.start.line
          };

          // Try to extract URL if it's a string literal
          if (path.node.arguments[0] && path.node.arguments[0].type === 'StringLiteral') {
            apiCall.url = path.node.arguments[0].value;
          }

          analysis.apiCalls.push(apiCall);
        }
      }
    });

    return analysis;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
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
      complexity: 0
    };
  }
}

/**
 * Analyze Vue Single File Component
 */
function analyzeVueFile(filePath, content, options) {
  try {
    const { descriptor } = parseVue(content);

    const analysis = {
      file: filePath,
      type: 'VueComponent',
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
      styles: descriptor.styles.length
    };

    // Analyze script block if present
    if (descriptor.script || descriptor.scriptSetup) {
      const scriptContent = descriptor.script?.content || descriptor.scriptSetup?.content;
      if (scriptContent) {
        try {
          const scriptAst = parser.parse(scriptContent, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript']
          });

          // Extract component info
          traverse.default(scriptAst, {
            ExportDefaultDeclaration(path) {
              if (path.node.declaration.type === 'ObjectExpression') {
                const component = {
                  name: path.basename(filePath, '.vue'),
                  type: 'VueComponent',
                  file: filePath,
                  props: [],
                  data: [],
                  methods: [],
                  computed: [],
                  complexity: 0
                };

                path.node.declaration.properties.forEach(prop => {
                  if (prop.key.name === 'props') {
                    // Extract props
                    component.props = extractVueProps(prop.value);
                  } else if (prop.key.name === 'methods') {
                    // Extract methods
                    if (prop.value.type === 'ObjectExpression') {
                      prop.value.properties.forEach(method => {
                        component.methods.push(method.key.name);
                      });
                    }
                  }
                });

                analysis.components.push(component);
              }
            }
          });
        } catch (err) {
          console.error(`Error parsing Vue script in ${filePath}:`, err.message);
        }
      }
    }

    return analysis;
  } catch (error) {
    console.error(`Error analyzing Vue file ${filePath}:`, error.message);
    return {
      file: filePath,
      error: error.message,
      type: 'VueComponent',
      components: [],
      functions: [],
      classes: [],
      hooks: [],
      imports: [],
      exports: [],
      apiCalls: [],
      complexity: 0
    };
  }
}

/**
 * Extract function information from AST path
 */
function extractFunction(path, filePath) {
  const name = path.node.id?.name || path.node.key?.name || 'anonymous';
  return {
    name,
    file: filePath,
    line: path.node.loc?.start.line,
    params: path.node.params?.length || path.node.init?.params?.length || 0,
    isAsync: path.node.async || path.node.init?.async || false,
    isArrow: path.node.init?.type === 'ArrowFunctionExpression',
    complexity: calculateComplexity(path)
  };
}

/**
 * Calculate cyclomatic complexity
 */
function calculateComplexity(path) {
  let complexity = 1; // Base complexity

  path.traverse({
    IfStatement() { complexity++; },
    ConditionalExpression() { complexity++; },
    SwitchCase(path) {
      if (path.node.test) complexity++; // Don't count default case
    },
    ForStatement() { complexity++; },
    ForInStatement() { complexity++; },
    ForOfStatement() { complexity++; },
    WhileStatement() { complexity++; },
    DoWhileStatement() { complexity++; },
    LogicalExpression(path) {
      if (path.node.operator === '&&' || path.node.operator === '||') {
        complexity++;
      }
    },
    CatchClause() { complexity++; }
  });

  return complexity;
}

/**
 * Extract React hooks from component
 */
function extractHooks(path) {
  const hooks = [];
  path.traverse({
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (callee.name && /^use[A-Z]/.test(callee.name)) {
        hooks.push(callee.name);
      }
    }
  });
  return [...new Set(hooks)];
}

/**
 * Extract props from component
 */
function extractProps(path) {
  const props = [];
  path.traverse({
    ObjectPattern(objPath) {
      if (objPath.parent.type === 'ArrowFunctionExpression' ||
          objPath.parent.type === 'FunctionExpression') {
        objPath.node.properties.forEach(prop => {
          if (prop.key) {
            props.push(prop.key.name);
          }
        });
      }
    }
  });
  return props;
}

/**
 * Extract hook dependencies
 */
function extractHookDependencies(path) {
  const deps = [];
  path.traverse({
    CallExpression(callPath) {
      if (callPath.node.callee.name === 'useEffect' ||
          callPath.node.callee.name === 'useMemo' ||
          callPath.node.callee.name === 'useCallback') {
        const depsArg = callPath.node.arguments[1];
        if (depsArg && depsArg.type === 'ArrayExpression') {
          depsArg.elements.forEach(elem => {
            if (elem.type === 'Identifier') {
              deps.push(elem.name);
            }
          });
        }
      }
    }
  });
  return deps;
}

/**
 * Extract Vue props
 */
function extractVueProps(propsNode) {
  const props = [];
  if (propsNode.type === 'ArrayExpression') {
    propsNode.elements.forEach(elem => {
      if (elem.type === 'StringLiteral') {
        props.push(elem.value);
      }
    });
  } else if (propsNode.type === 'ObjectExpression') {
    propsNode.properties.forEach(prop => {
      props.push(prop.key.name);
    });
  }
  return props;
}

/**
 * Detect file type based on path and content
 */
function detectFileType(filePath, content) {
  const fileName = path.basename(filePath);
  const dir = path.dirname(filePath);

  if (filePath.includes('/components/')) return 'Component';
  if (filePath.includes('/hooks/')) return 'Hook';
  if (filePath.includes('/utils/') || filePath.includes('/helpers/')) return 'Utility';
  if (filePath.includes('/services/') || filePath.includes('/api/')) return 'Service';
  if (filePath.includes('/store/') || filePath.includes('/redux/')) return 'State';
  if (filePath.includes('/pages/') || filePath.includes('/routes/')) return 'Page';
  if (fileName.endsWith('.test.js') || fileName.endsWith('.spec.js')) return 'Test';
  if (fileName.endsWith('.config.js')) return 'Config';

  // Check content for hints
  if (content.includes('React.Component') || content.includes('useState')) return 'Component';
  if (content.includes('export default function use')) return 'Hook';

  return 'Other';
}

/**
 * Main analysis endpoint
 */
app.post('/analyze', async (req, res) => {
  try {
    const {
      app: appName,
      includeTests = false,
      detailed = false
    } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    const config = loadAppsConfig();
    const appConfig = config.applications.find(a => a.name === appName);

    if (!appConfig) {
      return res.status(404).json({ error: `Application ${appName} not found` });
    }

    console.log(`[JS Analyzer] Analyzing ${appName} at ${appConfig.path}`);

    // Find JavaScript files
    const files = findJavaScriptFiles(
      appConfig.path,
      appConfig.includePatterns,
      appConfig.excludePaths
    );

    console.log(`[JS Analyzer] Found ${files.length} JavaScript/TypeScript files`);

    // Analyze each file
    const analysis = {
      app: appName,
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      components: [],
      functions: [],
      classes: [],
      hooks: [],
      apiCalls: [],
      summary: {}
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
        console.error(`[JS Analyzer] Error analyzing ${file}:`, error.message);
      }
    }

    // Generate summary
    analysis.summary = {
      totalFiles: files.length,
      totalComponents: analysis.components.length,
      totalFunctions: analysis.functions.length,
      totalClasses: analysis.classes.length,
      totalHooks: analysis.hooks.length,
      totalApiCalls: analysis.apiCalls.length,
      averageComplexity: analysis.functions.length > 0
        ? Math.round(totalComplexity / analysis.functions.length)
        : 0,
      totalComplexity
    };

    console.log(`[JS Analyzer] Analysis complete: ${analysis.components.length} components, ${analysis.functions.length} functions`);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('[JS Analyzer] Error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`JavaScript Code Analyzer MCP running on port ${PORT}`);
});
