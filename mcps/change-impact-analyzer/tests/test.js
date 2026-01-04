#!/usr/bin/env node

/**
 * Test Suite for Change Impact Analyzer
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testCases = [
  {
    name: 'Analyze authentication changes',
    input: {
      data: {
        app: 'App1',
        changes: {
          description: 'Updated password validation logic and User model',
          files: ['Models/User.cs', 'Services/AuthService.cs'],
          diff: '+ new password regex\n- old validation\n+ removed middleName field'
        },
        context: 'Part of security enhancement initiative'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze API breaking change',
    input: {
      data: {
        app: 'App1',
        changes: {
          description: 'Changed API response format for user endpoints',
          files: ['Controllers/UserController.cs'],
          breaking: true
        }
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze database migration',
    input: {
      data: {
        app: 'App1',
        changes: {
          description: 'Added new table for audit logging',
          files: ['Migrations/AddAuditLog.cs', 'Models/AuditLog.cs'],
          schemaChange: true
        }
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid - missing app',
    input: {
      data: {
        changes: { description: 'test' }
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid - empty changes',
    input: {
      data: {
        app: 'App1',
        changes: {}
      }
    },
    expectedSuccess: false
  }
];

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
            const analysis = result.result;
            console.log(`   Summary: ${analysis.summary?.substring(0, 60)}...`);
            console.log(`   Impact Areas: ${analysis.impactAreas?.length || 0}`);
            console.log(`   Breaking Changes: ${analysis.breakingChanges?.length || 0}`);
            console.log(`   Risk Level: ${analysis.riskAssessment?.overallRisk || 'N/A'}`);
            console.log(`   Risk Score: ${analysis.riskAssessment?.riskScore || 0}/100`);
            console.log(`   Recommendations: ${analysis.recommendations?.length || 0}`);
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

    child.stdin.write(JSON.stringify(testCase.input));
    child.stdin.end();
  });
}

async function runAllTests() {
  console.log('\n🚀 Change Impact Analyzer - Test Suite');
  console.log('═'.repeat(60));

  const results = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
  }

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
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
