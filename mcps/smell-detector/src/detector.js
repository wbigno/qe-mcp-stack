/**
 * Smell Detector
 * 
 * Static analysis for code smell detection
 */

/**
 * Detect code smells
 */
export async function detectSmells(params) {
  const { app, sourceCode, fileName, severity = 'all' } = params;

  validateInput(params);

  const smells = [];

  // Run all detectors
  smells.push(...detectLongMethod(sourceCode));
  smells.push(...detectLongParameterList(sourceCode));
  smells.push(...detectDuplicateCode(sourceCode));
  smells.push(...detectLargeClass(sourceCode));
  smells.push(...detectDeadCode(sourceCode));
  smells.push(...detectMagicNumbers(sourceCode));
  smells.push(...detectDeepNesting(sourceCode));
  smells.push(...detectComplexConditions(sourceCode));
  smells.push(...detectGodClass(sourceCode));
  smells.push(...detectFeatureEnvy(sourceCode));

  // Filter by severity if specified
  const filtered = severity === 'all' 
    ? smells 
    : smells.filter(s => s.severity === severity);

  // Calculate quality score
  const qualityScore = calculateQualityScore(smells);

  // Generate recommendations
  const recommendations = generateRecommendations(smells);

  return {
    fileName: fileName || 'unknown',
    smells: filtered,
    summary: {
      total: smells.length,
      critical: smells.filter(s => s.severity === 'critical').length,
      high: smells.filter(s => s.severity === 'high').length,
      medium: smells.filter(s => s.severity === 'medium').length,
      low: smells.filter(s => s.severity === 'low').length
    },
    qualityScore,
    recommendations,
    metadata: {
      app,
      analyzedAt: new Date().toISOString(),
      version: '1.0.0',
      severityFilter: severity
    }
  };
}

/**
 * Validate input
 */
function validateInput(params) {
  const { app, sourceCode } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!sourceCode || typeof sourceCode !== 'string') {
    throw new Error('sourceCode must be a string');
  }
}

/**
 * Detect long methods
 */
function detectLongMethod(sourceCode) {
  const smells = [];
  const methodPattern = /(?:public|private|protected|internal)?\s+(?:static\s+)?(?:async\s+)?[\w<>]+\s+(\w+)\s*\([^)]*\)\s*{([^}]*)}/gs;
  
  let match;
  while ((match = methodPattern.exec(sourceCode)) !== null) {
    const methodName = match[1];
    const methodBody = match[2];
    const lines = methodBody.split('\n').filter(l => l.trim().length > 0);
    
    if (lines.length > 50) {
      smells.push({
        type: 'long-method',
        severity: 'high',
        location: methodName,
        description: `Method has ${lines.length} lines (threshold: 50)`,
        suggestion: 'Extract parts into smaller methods'
      });
    } else if (lines.length > 30) {
      smells.push({
        type: 'long-method',
        severity: 'medium',
        location: methodName,
        description: `Method has ${lines.length} lines (threshold: 30)`,
        suggestion: 'Consider breaking into smaller methods'
      });
    }
  }

  return smells;
}

/**
 * Detect long parameter lists
 */
function detectLongParameterList(sourceCode) {
  const smells = [];
  const methodPattern = /(\w+)\s*\(([^)]+)\)/g;
  
  let match;
  while ((match = methodPattern.exec(sourceCode)) !== null) {
    const methodName = match[1];
    const params = match[2];
    const paramCount = params.split(',').filter(p => p.trim().length > 0).length;
    
    if (paramCount > 5) {
      smells.push({
        type: 'long-parameter-list',
        severity: 'medium',
        location: methodName,
        description: `Method has ${paramCount} parameters (threshold: 5)`,
        suggestion: 'Introduce parameter object or builder pattern'
      });
    }
  }

  return smells;
}

/**
 * Detect duplicate code
 */
function detectDuplicateCode(sourceCode) {
  const smells = [];
  const lines = sourceCode.split('\n');
  const blocks = new Map();
  
  // Look for duplicate blocks of 5+ lines
  for (let i = 0; i < lines.length - 5; i++) {
    const block = lines.slice(i, i + 5).join('\n').trim();
    if (block.length > 50) { // Ignore very short blocks
      if (blocks.has(block)) {
        blocks.set(block, blocks.get(block) + 1);
      } else {
        blocks.set(block, 1);
      }
    }
  }

  blocks.forEach((count, block) => {
    if (count > 1) {
      smells.push({
        type: 'duplicate-code',
        severity: 'high',
        location: `Lines ${block.substring(0, 30)}...`,
        description: `Code block appears ${count} times`,
        suggestion: 'Extract duplicated code into a reusable method'
      });
    }
  });

  return smells;
}

/**
 * Detect large classes
 */
function detectLargeClass(sourceCode) {
  const smells = [];
  const classPattern = /class\s+(\w+)[^{]*{([^}]*)}/gs;
  
  let match;
  while ((match = classPattern.exec(sourceCode)) !== null) {
    const className = match[1];
    const classBody = match[2];
    const lines = classBody.split('\n').filter(l => l.trim().length > 0);
    const methods = (classBody.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;
    
    if (lines.length > 500) {
      smells.push({
        type: 'large-class',
        severity: 'critical',
        location: className,
        description: `Class has ${lines.length} lines and ${methods} methods`,
        suggestion: 'Split into multiple smaller classes with single responsibilities'
      });
    } else if (lines.length > 300) {
      smells.push({
        type: 'large-class',
        severity: 'high',
        location: className,
        description: `Class has ${lines.length} lines and ${methods} methods`,
        suggestion: 'Consider splitting into smaller classes'
      });
    }
  }

  return smells;
}

/**
 * Detect dead code
 */
function detectDeadCode(sourceCode) {
  const smells = [];
  
  // Detect commented out code
  const commentedCodePattern = /\/\/\s*(public|private|protected|if|for|while|return)/g;
  let match;
  let commentedLines = 0;
  
  while ((match = commentedCodePattern.exec(sourceCode)) !== null) {
    commentedLines++;
  }

  if (commentedLines > 5) {
    smells.push({
      type: 'dead-code',
      severity: 'low',
      location: 'Multiple locations',
      description: `Found ${commentedLines} lines of commented-out code`,
      suggestion: 'Remove commented code or use version control'
    });
  }

  return smells;
}

/**
 * Detect magic numbers
 */
function detectMagicNumbers(sourceCode) {
  const smells = [];
  
  // Look for numeric literals (excluding 0, 1, -1)
  const magicNumberPattern = /(?<![\w.])\b(?!0\b|1\b|-1\b)\d{2,}\b/g;
  const matches = sourceCode.match(magicNumberPattern) || [];
  
  const uniqueNumbers = [...new Set(matches)];
  
  if (uniqueNumbers.length > 3) {
    smells.push({
      type: 'magic-numbers',
      severity: 'low',
      location: 'Multiple locations',
      description: `Found ${uniqueNumbers.length} magic numbers: ${uniqueNumbers.slice(0, 5).join(', ')}${uniqueNumbers.length > 5 ? '...' : ''}`,
      suggestion: 'Define constants with meaningful names'
    });
  }

  return smells;
}

/**
 * Detect deep nesting
 */
function detectDeepNesting(sourceCode) {
  const smells = [];
  const lines = sourceCode.split('\n');
  
  let maxNesting = 0;
  let currentNesting = 0;
  let lineNumber = 0;
  
  lines.forEach((line, idx) => {
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    
    currentNesting += openBraces - closeBraces;
    
    if (currentNesting > maxNesting) {
      maxNesting = currentNesting;
      lineNumber = idx + 1;
    }
  });

  if (maxNesting > 5) {
    smells.push({
      type: 'deep-nesting',
      severity: 'high',
      location: `Around line ${lineNumber}`,
      description: `Nesting depth reaches ${maxNesting} levels (threshold: 5)`,
      suggestion: 'Extract nested logic into separate methods'
    });
  } else if (maxNesting > 3) {
    smells.push({
      type: 'deep-nesting',
      severity: 'medium',
      location: `Around line ${lineNumber}`,
      description: `Nesting depth reaches ${maxNesting} levels (threshold: 3)`,
      suggestion: 'Consider flattening nested conditions'
    });
  }

  return smells;
}

/**
 * Detect complex conditions
 */
function detectComplexConditions(sourceCode) {
  const smells = [];
  const ifPattern = /if\s*\(([^)]+)\)/g;
  
  let match;
  while ((match = ifPattern.exec(sourceCode)) !== null) {
    const condition = match[1];
    const andOrs = (condition.match(/&&|\|\|/g) || []).length;
    
    if (andOrs > 3) {
      smells.push({
        type: 'complex-condition',
        severity: 'medium',
        location: `Condition: ${condition.substring(0, 40)}...`,
        description: `Condition has ${andOrs + 1} logical operators`,
        suggestion: 'Extract condition into well-named boolean method'
      });
    }
  }

  return smells;
}

/**
 * Detect god class
 */
function detectGodClass(sourceCode) {
  const smells = [];
  const classPattern = /class\s+(\w+)[^{]*{([^}]*)}/gs;
  
  let match;
  while ((match = classPattern.exec(sourceCode)) !== null) {
    const className = match[1];
    const classBody = match[2];
    
    const methods = (classBody.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;
    const fields = (classBody.match(/(?:public|private|protected)\s+[\w<>]+\s+\w+;/g) || []).length;
    
    if (methods > 20 || fields > 15) {
      smells.push({
        type: 'god-class',
        severity: 'critical',
        location: className,
        description: `Class has ${methods} methods and ${fields} fields - too many responsibilities`,
        suggestion: 'Apply Single Responsibility Principle - split into focused classes'
      });
    }
  }

  return smells;
}

/**
 * Detect feature envy
 */
function detectFeatureEnvy(sourceCode) {
  const smells = [];
  
  // Look for methods that call other objects' methods excessively
  const methodPattern = /(\w+)\s*\([^)]*\)\s*{([^}]*)}/gs;
  
  let match;
  while ((match = methodPattern.exec(sourceCode)) !== null) {
    const methodName = match[1];
    const methodBody = match[2];
    
    // Count calls to other objects (pattern: object.method())
    const externalCalls = (methodBody.match(/\w+\.\w+\(/g) || []).length;
    const totalLines = methodBody.split('\n').filter(l => l.trim().length > 0).length;
    
    if (externalCalls > 5 && totalLines < 20) {
      smells.push({
        type: 'feature-envy',
        severity: 'medium',
        location: methodName,
        description: `Method makes ${externalCalls} calls to other objects`,
        suggestion: 'Consider moving method to the class it uses most'
      });
    }
  }

  return smells;
}

/**
 * Calculate quality score
 */
function calculateQualityScore(smells) {
  let score = 100;

  smells.forEach(smell => {
    switch (smell.severity) {
      case 'critical': score -= 10; break;
      case 'high': score -= 5; break;
      case 'medium': score -= 2; break;
      case 'low': score -= 1; break;
    }
  });

  score = Math.max(0, score);

  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { score, grade };
}

/**
 * Generate recommendations
 */
function generateRecommendations(smells) {
  const recommendations = [];
  const smellTypes = new Set(smells.map(s => s.type));

  if (smellTypes.has('god-class') || smellTypes.has('large-class')) {
    recommendations.push({
      priority: 'high',
      category: 'architecture',
      action: 'Apply Single Responsibility Principle',
      reason: 'Large classes are hard to understand and maintain'
    });
  }

  if (smellTypes.has('long-method')) {
    recommendations.push({
      priority: 'high',
      category: 'refactoring',
      action: 'Extract methods to improve readability',
      reason: 'Long methods are difficult to test and understand'
    });
  }

  if (smellTypes.has('duplicate-code')) {
    recommendations.push({
      priority: 'high',
      category: 'refactoring',
      action: 'Apply DRY principle - extract common code',
      reason: 'Duplicate code increases maintenance burden'
    });
  }

  if (smellTypes.has('deep-nesting')) {
    recommendations.push({
      priority: 'medium',
      category: 'readability',
      action: 'Flatten nested logic using guard clauses',
      reason: 'Deep nesting reduces code clarity'
    });
  }

  return recommendations;
}

export default {
  detectSmells
};
