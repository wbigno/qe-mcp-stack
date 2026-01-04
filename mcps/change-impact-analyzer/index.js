#!/usr/bin/env node

/**
 * Change Impact Analyzer - STDIO MCP
 * 
 * AI-powered deep analysis of code changes with recommendations.
 * Uses Anthropic Claude API for intelligent impact analysis.
 * 
 * Communication: JSON via stdin/stdout
 */

import { analyzeChangeImpact } from './src/analyzer.js';

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
      changes,
      context
    } = input.data;

    // Validate required fields
    if (!app) {
      throw new Error('Missing required field: app');
    }

    if (!changes || typeof changes !== 'object') {
      throw new Error('changes must be an object');
    }

    // Analyze change impact
    const result = await analyzeChangeImpact({
      app,
      changes,
      context
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
