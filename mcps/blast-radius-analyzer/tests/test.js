#!/usr/bin/env node

/**
 * Test Suite for Blast Radius Analyzer
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testCases = [
  {
    name: 'Analyze single file change',
    input: {
      data: {
        app: 'App1',
        changedFiles: ['Services/UserService.cs'],
        analysisDepth: 'moderate'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze multiple file changes',
    input: {
      data: {
        app: 'App1',
        changedFiles: [
          'Controllers/UserController.cs',
          'Services/UserService.cs',
          'Models/User.cs'
        ],
        analysisDepth: 'deep'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze shallow depth',
    input: {
      data: {
        app: 'App1',
        changedFiles: ['Program.cs'],
        analysisDepth: 'shallow'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid - missing app',
    input: {
      data: {
        changedFiles: ['test.cs']
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid - empty changedFiles',
    input: {
      data: {
        app: 'App1',
        changedFiles: []
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
            console.log(`   Files Analyzed: ${analysis.metadata.filesAnalyzed}`);
            console.log(`   Risk Level: ${analysis.risk.level}`);
            console.log(`   Risk Score: ${analysis.risk.score}`);
            console.log(`   Direct Impact: ${analysis.impact.directImpact.length}`);
            console.log(`   Critical Paths: ${analysis.impact.criticalPaths.length}`);
            console.log(`   Recommendations: ${analysis.recommendations.length}`);
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
  console.log('\n🚀 Blast Radius Analyzer - Test Suite');
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
