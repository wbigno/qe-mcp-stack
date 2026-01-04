#!/usr/bin/env node

/**
 * Test Suite for Playwright Planner
 * 
 * Tests the STDIO MCP with various inputs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample user flows
const sampleFlows = [
  {
    name: 'User Login',
    pages: ['LoginPage', 'HomePage'],
    steps: ['Navigate to login', 'Enter credentials', 'Click login', 'Verify dashboard'],
    requiresAuth: false,
    testCount: 4
  },
  {
    name: 'Appointment Scheduling',
    pages: ['HomePage', 'AppointmentPage', 'ConfirmationPage'],
    steps: ['Navigate to appointments', 'Select provider', 'Choose time', 'Confirm'],
    requiresAuth: true,
    testCount: 5
  }
];

// Test cases
const testCases = [
  {
    name: 'Plan Playwright architecture for basic flows',
    input: {
      data: {
        app: 'HealthcareApp',
        userFlows: sampleFlows,
        includeFixtures: true,
        includeHelpers: true
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Plan without fixtures and helpers',
    input: {
      data: {
        app: 'HealthcareApp',
        userFlows: sampleFlows,
        includeFixtures: false,
        includeHelpers: false
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Plan for single flow',
    input: {
      data: {
        app: 'HealthcareApp',
        userFlows: [sampleFlows[0]]
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid input - missing app',
    input: {
      data: {
        userFlows: sampleFlows
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid input - empty userFlows',
    input: {
      data: {
        app: 'HealthcareApp',
        userFlows: []
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
            const plan = result.result;
            console.log(`   Pages: ${plan.pageObjectModel?.pages?.length || 0}`);
            console.log(`   Components: ${plan.pageObjectModel?.components?.length || 0}`);
            console.log(`   Test Files: ${plan.testFiles?.length || 0}`);
            console.log(`   Fixtures: ${plan.fixtures?.length || 0}`);
            console.log(`   Helpers: ${plan.helpers?.length || 0}`);
            console.log(`   Complexity: ${plan.flowAnalysis?.complexity?.level || 'unknown'}`);
            console.log(`   Estimate: ${plan.implementationEstimate?.total || 'N/A'}`);
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
  console.log('\n🚀 Playwright Planner - Test Suite');
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
