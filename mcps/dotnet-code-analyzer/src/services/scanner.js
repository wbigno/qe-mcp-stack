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

  // Split content into lines for line number tracking
  const lines = content.split('\n');

  // Extract classes with line numbers and positions
  // ✅ Updated to detect partial classes (e.g., "public partial class About")
  const classMatches = [...content.matchAll(/(?:public|private|internal|protected)\s+(?:static\s+)?(?:abstract\s+)?(?:partial\s+)?class\s+(\w+)/g)];
  const classData = [];

  for (const match of classMatches) {
    const className = match[1];
    const lineNumber = getLineNumber(content, match.index);
    const startIndex = match.index;

    // Find the end of this class (next class or end of file)
    const nextClassIndex = classMatches[classMatches.indexOf(match) + 1]?.index || content.length;

    classData.push({
      name: className,
      file: relativePath,
      isTest: analysis.isTestFile,
      lineNumber,
      startIndex,
      endIndex: nextClassIndex
    });

    analysis.classes.push({
      name: className,
      file: relativePath,
      isTest: analysis.isTestFile,
      lineNumber
    });
  }

  // Extract methods with enhanced metadata
  const methodRegex = /(public|private|internal|protected)\s+(?:static\s+)?(?:async\s+)?(?:\w+(?:<[\w,\s]+>)?)\s+(\w+)\s*\([^)]*\)/g;
  const methodMatches = [...content.matchAll(methodRegex)];

  for (const match of methodMatches) {
    const visibility = match[1];
    const methodName = match[2];
    const lineNumber = getLineNumber(content, match.index);

    // ✅ IMPROVED: Check if THIS method has a test attribute directly above it
    // Look backwards from method declaration to find attributes
    const methodStartIndex = match.index;
    const precedingContent = content.substring(Math.max(0, methodStartIndex - 200), methodStartIndex);
    const isTestMethod = /\[(Test|Fact|Theory|TestMethod)\]/.test(precedingContent);

    // Determine which class this method belongs to
    let className = 'Unknown';
    for (const cls of classData) {
      if (match.index >= cls.startIndex && match.index < cls.endIndex) {
        className = cls.name;
        break;
      }
    }

    // Calculate complexity (count decision points: if, while, for, foreach, case, catch, ||, &&)
    const methodEndIndex = findMethodEnd(content, match.index);
    const methodBody = content.substring(match.index, methodEndIndex);
    const complexity = calculateComplexity(methodBody);

    // Detect file type from path
    const fileType = detectFileType(relativePath);

    analysis.methods.push({
      name: methodName,
      className,
      file: relativePath,
      lineNumber,
      visibility,
      isPublic: visibility === 'public',
      complexity,
      fileType,
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

/**
 * Get line number from character index
 */
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

/**
 * Find the end of a method by matching braces
 */
function findMethodEnd(content, startIndex) {
  let braceCount = 0;
  let inMethod = false;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (char === '{') {
      braceCount++;
      inMethod = true;
    } else if (char === '}') {
      braceCount--;
      if (inMethod && braceCount === 0) {
        return i + 1;
      }
    }
  }

  // If we couldn't find the end, return a reasonable default
  return Math.min(startIndex + 500, content.length);
}

/**
 * Calculate cyclomatic complexity
 * Counts decision points: if, while, for, foreach, case, catch, &&, ||, ?
 */
function calculateComplexity(methodBody) {
  let complexity = 1; // Base complexity

  // Count control flow keywords
  const patterns = [
    /\bif\s*\(/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bforeach\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\|\|/g,
    /&&/g,
    /\?/g
  ];

  for (const pattern of patterns) {
    const matches = methodBody.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Detect file type from path
 */
function detectFileType(filePath) {
  const lower = filePath.toLowerCase();

  if (lower.includes('controller')) return 'Controller';
  if (lower.includes('service')) return 'Service';
  if (lower.includes('repository')) return 'Repository';
  if (lower.includes('helper') || lower.includes('util')) return 'Utility';
  if (lower.includes('model') || lower.includes('dto')) return 'Model';
  if (lower.includes('test')) return 'Test';

  return 'Other';
}
