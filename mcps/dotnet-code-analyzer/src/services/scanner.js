import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Scan directory for C# files
 */
export async function scanDirectory(basePath, includePatterns = ['**/*.cs'], excludePaths = []) {
  if (!existsSync(basePath)) {
    throw new Error(`Path does not exist: ${basePath}`);
  }

  const ignorePatterns = excludePaths.map(p => `**/${p}/**`);

  const files = await glob(includePatterns, {
    cwd: basePath,
    absolute: true,
    ignore: ignorePatterns
  });

  return files;
}

/**
 * Analyze a C# file
 */
export async function analyzeCSharpFile(filePath, options = {}) {
  const content = readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const relativePath = filePath;

  const analysis = {
    file: relativePath,
    classes: [],
    methods: [],
    isTestFile: false,
    testMethods: [],
    epicReferences: [],
    financialReferences: []
  };

  // Detect if it's a test file
  analysis.isTestFile = fileName.includes('Test') || fileName.includes('Spec') || 
                         content.includes('[Fact]') || content.includes('[Theory]');

  // Extract classes (simplified regex - in production use Roslyn)
  const classMatches = content.matchAll(/(?:public|private|internal|protected)\s+(?:static\s+)?(?:abstract\s+)?class\s+(\w+)/g);
  for (const match of classMatches) {
    analysis.classes.push({
      name: match[1],
      file: relativePath,
      isTest: analysis.isTestFile
    });
  }

  // Extract methods (simplified regex)
  const methodMatches = content.matchAll(/(?:public|private|internal|protected)\s+(?:static\s+)?(?:async\s+)?(?:\w+(?:<[\w,\s]+>)?)\s+(\w+)\s*\(/g);
  for (const match of methodMatches) {
    const methodName = match[1];
    const isTestMethod = content.includes(`[Fact]`) && methodName || 
                        content.includes(`[Theory]`) && methodName;

    analysis.methods.push({
      name: methodName,
      file: relativePath,
      isTest: isTestMethod
    });

    if (isTestMethod) {
      analysis.testMethods.push(methodName);
    }
  }

  // Find Epic references
  if (options.findEpicReferences) {
    const epicPatterns = [
      /Epic\.?\w+/gi,
      /IEpic\w+/gi,
      /EpicClient/gi,
      /FhirClient/gi,
      /"Epic"/gi
    ];

    for (const pattern of epicPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        analysis.epicReferences.push({
          reference: match[0],
          context: getContextAroundMatch(content, match.index)
        });
      }
    }
  }

  // Find Financial references
  if (options.findFinancialReferences) {
    const financialPatterns = [
      /IFinanc\w+/gi,
      /Payment\w+/gi,
      /Billing\w+/gi,
      /Invoice\w+/gi,
      /Transaction\w+/gi,
      /"Financial"/gi
    ];

    for (const pattern of financialPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        analysis.financialReferences.push({
          reference: match[0],
          context: getContextAroundMatch(content, match.index)
        });
      }
    }
  }

  return analysis;
}

/**
 * Get context around a match for better understanding
 */
function getContextAroundMatch(content, index, contextLength = 100) {
  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + contextLength);
  return content.substring(start, end).trim();
}
