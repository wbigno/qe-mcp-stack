#!/usr/bin/env node

/**
 * Test Suite for Integration Test Generator
 * 
 * Tests the STDIO MCP with various inputs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test cases
const testCases = [
  {
    name: 'Generate tests for user API CRUD operations',
    input: {
      data: {
        app: 'App1',
        apiEndpoint: '/api/users',
        scenario: 'Full CRUD operations',
        includeAuth: true,
        includeDatabase: true
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate tests for specific scenario',
    input: {
      data: {
        app: 'App1',
        apiEndpoint: '/api/appointments',
        scenario: 'Scheduling appointments with conflict detection',
        includeAuth: true,
        includeDatabase: true
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate tests without authentication',
    input: {
      data: {
        app: 'App1',
        apiEndpoint: '/api/public/health',
        includeAuth: false,
        includeDatabase: false
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid input - missing apiEndpoint',
    input: {
      data: {
        app: 'App1'
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid input - apiEndpoint without leading slash',
    input: {
      data: {
        app: 'App1',
        apiEndpoint: 'api/users'
      }
    },
    expectedSuccess: false
  }
];

/**
 * Run a single test case
 */
function runTest(testCase) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('─'.repeat(60));

    const indexPath = join(__dirname, '..', 'index.js');
    const child = spawn('node', [indexPath], {
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      try {
        const output = stdout || stderr;
        const result = JSON.parse(output);

        const passed = result.success === testCase.expectedSuccess;

        if (passed) {
          console.log('✅ PASSED');
          if (result.success && result.result) {
            const stats = result.result.statistics;
            console.log(`   Total Tests: ${stats.totalTests}`);
            console.log(`   HTTP Methods: ${Object.keys(stats.byHttpMethod).join(', ')}`);
            console.log(`   Success Cases: ${stats.coverage.successCases}`);
            console.log(`   Error Cases: ${stats.coverage.errorCases}`);
            console.log(`   Auth Required: ${stats.authentication.requiresAuth}`);
          } else if (!result.success) {
            console.log(`   Error (expected): ${result.error}`);
          }
        } else {
          console.log('❌ FAILED');
          console.log(`   Expected success=${testCase.expectedSuccess}, got success=${result.success}`);
        }

        resolve({ passed, testCase: testCase.name });

      } catch (error) {
        console.log('❌ FAILED - Invalid JSON response');
        console.log(`   Error: ${error.message}`);
        console.log(`   Output: ${(stdout || stderr).substring(0, 500)}`);
        resolve({ passed: false, testCase: testCase.name });
      }
    });

    // Send input to stdin
    child.stdin.write(JSON.stringify(testCase.input));
    child.stdin.end();
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Integration Test Generator - Test Suite');
  console.log('═'.repeat(60));

  const results = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
  }

  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testCase}`);
    });
  }

  console.log('\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
