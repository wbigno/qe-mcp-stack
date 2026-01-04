#!/usr/bin/env node

/**
 * Blast Radius Analyzer - STDIO MCP
 * 
 * Analyzes the blast radius of code changes using static analysis.
 * Does NOT use AI - performs fast static code analysis.
 * 
 * Communication: JSON via stdin/stdout
 */

import { analyzeBlastRadius } from './src/analyzer.js';

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
      changedFiles,
      analysisDepth = 'moderate'
    } = input.data;

    // Validate required fields
    if (!app) {
      throw new Error('Missing required field: app');
    }

    if (!changedFiles || !Array.isArray(changedFiles)) {
      throw new Error('changedFiles must be an array');
    }

    if (changedFiles.length === 0) {
      throw new Error('changedFiles array cannot be empty');
    }

    // Analyze blast radius
    const result = await analyzeBlastRadius({
      app,
      changedFiles,
      analysisDepth
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
