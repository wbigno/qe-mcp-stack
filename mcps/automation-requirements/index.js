#!/usr/bin/env node

/**
 * Automation Requirements - STDIO MCP
 * 
 * Creates automation requirements and strategies from test cases.
 * Uses Anthropic Claude API for intelligent automation planning.
 * 
 * Communication: JSON via stdin/stdout
 */

import { generateAutomationRequirements } from './src/planner.js';

// Set encoding for stdin/stdout
process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

let inputData = '';

// Collect input data from stdin
process.stdin.on('data', (chunk) => {
  inputData += chunk;
});

// Process when input stream ends
process.stdin.on('end', async () => {
  try {
    // Parse input JSON
    const input = JSON.parse(inputData);
    
    // Validate input structure
    if (!input.data) {
      throw new Error('Missing "data" field in input');
    }

    const { 
      storyId,
      testCases,
      automationLevel = 'all'
    } = input.data;

    // Validate required fields
    if (!storyId) {
      throw new Error('Missing required field: storyId');
    }

    if (!testCases || !Array.isArray(testCases)) {
      throw new Error('testCases must be an array');
    }

    if (testCases.length === 0) {
      throw new Error('testCases array cannot be empty');
    }

    // Generate automation requirements
    const result = await generateAutomationRequirements({
      storyId,
      testCases,
      automationLevel
    });

    // Output result as JSON to stdout
    console.log(JSON.stringify({
      success: true,
      result
    }, null, 2));

    process.exit(0);

  } catch (error) {
    // Output error as JSON to stdout
    console.error(JSON.stringify({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, null, 2));

    process.exit(1);
  }
});

// Handle premature termination
process.on('SIGINT', () => {
  console.error(JSON.stringify({
    success: false,
    error: 'Process interrupted'
  }));
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.error(JSON.stringify({
    success: false,
    error: 'Process terminated'
  }));
  process.exit(1);
});
