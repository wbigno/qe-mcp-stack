/**
 * Requirements Analyzer
 * 
 * Core analysis logic for evaluating user story quality
 */

import { analyzeWithClaude } from './claudeClient.js';

/**
 * Analyze requirements for completeness and testability
 * 
 * @param {Object} params - Analysis parameters
 * @param {number} params.storyId - Story ID
 * @param {Object} params.storyContent - Story content
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeRequirements({ storyId, storyContent }) {
  // Validate input
  validateInput(storyId, storyContent);

  // Perform pre-analysis checks
  const preAnalysis = performPreAnalysis(storyContent);

  // Use Claude for deep analysis
  const claudeAnalysis = await analyzeWithClaude({ storyId, storyContent });

  // Combine analyses
  const finalAnalysis = combineAnalyses(preAnalysis, claudeAnalysis);

  // Add metadata
  finalAnalysis.metadata = {
    storyId,
    analyzedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  return finalAnalysis;
}

/**
 * Validate input parameters
 */
function validateInput(storyId, storyContent) {
  if (!storyId || typeof storyId !== 'number') {
    throw new Error('storyId must be a number');
  }

  if (!storyContent || typeof storyContent !== 'object') {
    throw new Error('storyContent must be an object');
  }

  if (!storyContent.title || typeof storyContent.title !== 'string') {
    throw new Error('storyContent.title is required and must be a string');
  }

  // Description and acceptanceCriteria are optional but should be strings if provided
  if (storyContent.description && typeof storyContent.description !== 'string') {
    throw new Error('storyContent.description must be a string');
  }

  if (storyContent.acceptanceCriteria && typeof storyContent.acceptanceCriteria !== 'string') {
    throw new Error('storyContent.acceptanceCriteria must be a string');
  }
}

/**
 * Perform quick pre-analysis checks
 * These are rule-based checks before sending to Claude
 */
function performPreAnalysis(storyContent) {
  const { title, description, acceptanceCriteria } = storyContent;

  const issues = [];
  const warnings = [];

  // Check title quality
  if (title.length < 10) {
    issues.push('Title is too short (less than 10 characters)');
  }

  if (title.length > 150) {
    warnings.push('Title is very long (over 150 characters)');
  }

  if (!title.toLowerCase().includes('user') && 
      !title.toLowerCase().includes('as a') &&
      !title.toLowerCase().includes('should')) {
    warnings.push('Title does not follow user story format');
  }

  // Check description
  if (!description || description.trim().length === 0) {
    issues.push('Description is missing');
  } else if (description.length < 20) {
    issues.push('Description is too short (less than 20 characters)');
  }

  // Check acceptance criteria
  if (!acceptanceCriteria || acceptanceCriteria.trim().length === 0) {
    issues.push('Acceptance criteria are missing');
  } else {
    // Check for Given-When-Then format
    const hasGiven = acceptanceCriteria.toLowerCase().includes('given');
    const hasWhen = acceptanceCriteria.toLowerCase().includes('when');
    const hasThen = acceptanceCriteria.toLowerCase().includes('then');

    if (!hasGiven && !hasWhen && !hasThen) {
      warnings.push('Acceptance criteria do not follow Given-When-Then format');
    }
  }

  return {
    issues,
    warnings
  };
}

/**
 * Combine pre-analysis and Claude analysis
 */
function combineAnalyses(preAnalysis, claudeAnalysis) {
  // Add pre-analysis issues to gaps
  const combinedGaps = [...claudeAnalysis.gaps];

  preAnalysis.issues.forEach(issue => {
    combinedGaps.push({
      category: 'structure',
      description: issue,
      severity: 'high'
    });
  });

  preAnalysis.warnings.forEach(warning => {
    combinedGaps.push({
      category: 'structure',
      description: warning,
      severity: 'medium'
    });
  });

  // Adjust scores if there are critical pre-analysis issues
  let adjustedCompletenessScore = claudeAnalysis.completenessScore;
  let adjustedTestabilityScore = claudeAnalysis.testabilityScore;

  if (preAnalysis.issues.length > 0) {
    adjustedCompletenessScore = Math.max(0, adjustedCompletenessScore - (preAnalysis.issues.length * 10));
    adjustedTestabilityScore = Math.max(0, adjustedTestabilityScore - (preAnalysis.issues.length * 10));
  }

  return {
    completenessScore: Math.round(adjustedCompletenessScore),
    testabilityScore: Math.round(adjustedTestabilityScore),
    missingRequirements: claudeAnalysis.missingRequirements,
    ambiguousRequirements: claudeAnalysis.ambiguousRequirements,
    recommendations: claudeAnalysis.recommendations,
    gaps: combinedGaps,
    strengths: claudeAnalysis.strengths,
    summary: claudeAnalysis.summary
  };
}

export default {
  analyzeRequirements
};
