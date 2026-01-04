#!/usr/bin/env node

/**
 * Business Logic Documenter - STDIO MCP
 * 
 * Documents business logic from code using AI.
 * Uses Anthropic Claude API for intelligent documentation generation.
 * 
 * Communication: JSON via stdin/stdout
 */

import { documentBusinessLogic } from './src/documenter.js';

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
      app,
      className,
      sourceCode,
      format = 'markdown'
    } = input.data;

    // Validate required fields
    if (!app) {
      throw new Error('Missing required field: app');
    }

    if (!className) {
      throw new Error('Missing required field: className');
    }

    if (!sourceCode) {
      throw new Error('Missing required field: sourceCode');
    }

    // Document business logic
    const result = await documentBusinessLogic({
      app,
      className,
      sourceCode,
      format
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
