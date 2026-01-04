#!/usr/bin/env node

/**
 * Test Suite for Requirements Analyzer
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
    name: 'Complete user story',
    input: {
      data: {
        storyId: 12345,
        storyContent: {
          title: 'As a patient, I want to schedule an appointment so that I can see my doctor',
          description: 'Patients need the ability to schedule appointments through the patient portal. This feature should allow them to select a provider, choose an available time slot, and receive confirmation.',
          acceptanceCriteria: `Given I am a logged-in patient
When I navigate to the appointment scheduling page
And I select a provider and available time slot
And I click "Schedule Appointment"
Then the appointment should be created
And I should receive a confirmation email
And the appointment should appear in my appointments list`
        }
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Incomplete user story - missing acceptance criteria',
    input: {
      data: {
        storyId: 12346,
        storyContent: {
          title: 'User login feature',
          description: 'Users should be able to log in'
        }
      }
    },
    expectedSuccess: true // Should succeed but have low scores
  },
  {
    name: 'Invalid input - missing storyId',
    input: {
      data: {
        storyContent: {
          title: 'Some feature'
        }
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid input - missing title',
    input: {
      data: {
        storyId: 12347,
        storyContent: {
          description: 'Description without title'
        }
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
          if (result.success) {
            console.log(`   Completeness Score: ${result.result.completenessScore}/100`);
            console.log(`   Testability Score: ${result.result.testabilityScore}/100`);
            console.log(`   Gaps: ${result.result.gaps.length}`);
            console.log(`   Recommendations: ${result.result.recommendations.length}`);
          } else {
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
        console.log(`   Output: ${stdout || stderr}`);
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
  console.log('\n🚀 Requirements Analyzer - Test Suite');
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
