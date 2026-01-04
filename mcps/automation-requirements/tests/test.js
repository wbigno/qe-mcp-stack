#!/usr/bin/env node

/**
 * Test Suite for Automation Requirements
 * 
 * Tests the STDIO MCP with various inputs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample test cases
const sampleTestCases = [
  {
    id: 'TC001',
    title: 'User can log in with valid credentials',
    category: 'positive',
    priority: 'high',
    estimatedDuration: '3 minutes',
    automationFeasibility: { feasibility: 'high' }
  },
  {
    id: 'TC002',
    title: 'User cannot log in with invalid password',
    category: 'negative',
    priority: 'high',
    estimatedDuration: '2 minutes',
    automationFeasibility: { feasibility: 'high' }
  },
  {
    id: 'TC003',
    title: 'User can schedule an appointment',
    category: 'positive',
    priority: 'high',
    estimatedDuration: '8 minutes',
    steps: [
      { action: 'Navigate to appointment page' },
      { action: 'Select provider' },
      { action: 'Choose time slot' }
    ]
  }
];

// Test cases
const testCases = [
  {
    name: 'Generate automation requirements for login flow',
    input: {
      data: {
        storyId: 12345,
        testCases: sampleTestCases,
        automationLevel: 'all'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate E2E-only automation requirements',
    input: {
      data: {
        storyId: 12346,
        testCases: sampleTestCases,
        automationLevel: 'e2e'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate unit test requirements only',
    input: {
      data: {
        storyId: 12347,
        testCases: sampleTestCases,
        automationLevel: 'unit'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid input - missing storyId',
    input: {
      data: {
        testCases: sampleTestCases
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid input - empty testCases array',
    input: {
      data: {
        storyId: 12348,
        testCases: []
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
            const req = result.result;
            console.log(`   Feasibility: ${req.feasibility.overall} (${req.feasibility.score}/100)`);
            console.log(`   Test Levels: Unit=${req.automationStrategy.testLevels.unit.recommended}, E2E=${req.automationStrategy.testLevels.e2e.recommended}`);
            console.log(`   ROI: ${req.roi.breakEvenPeriod}`);
            console.log(`   Pages: ${req.pageObjectModel.pages.length}`);
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
  console.log('\n🚀 Automation Requirements - Test Suite');
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
