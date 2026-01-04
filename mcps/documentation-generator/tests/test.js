#!/usr/bin/env node

/**
 * Test Suite for Documentation Generator
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testCases = [
  {
    name: 'Generate API documentation',
    input: {
      data: {
        app: 'App1',
        docType: 'api',
        content: {
          endpoints: [
            { method: 'GET', path: '/api/users', description: 'Get all users' },
            { method: 'POST', path: '/api/users', description: 'Create user' }
          ],
          authentication: 'JWT Bearer token',
          baseUrl: 'https://api.example.com'
        },
        format: 'markdown'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate setup documentation',
    input: {
      data: {
        app: 'App1',
        docType: 'setup',
        content: {
          prerequisites: ['Node.js 18+', 'PostgreSQL 14+'],
          steps: ['Clone repo', 'Install deps', 'Configure env', 'Run migrations']
        },
        format: 'markdown'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate HTML format',
    input: {
      data: {
        app: 'App1',
        docType: 'troubleshooting',
        content: {
          issues: [
            { problem: 'Cannot connect', solution: 'Check connection string' }
          ]
        },
        format: 'html'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid - missing docType',
    input: {
      data: {
        app: 'App1',
        content: {}
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid - invalid docType',
    input: {
      data: {
        app: 'App1',
        docType: 'invalid',
        content: {}
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
            const doc = result.result;
            console.log(`   Title: ${doc.title}`);
            console.log(`   Sections: ${doc.sections?.length || 0}`);
            console.log(`   TOC Entries: ${doc.tableOfContents?.length || 0}`);
            console.log(`   Format: ${doc.metadata?.format || 'N/A'}`);
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
        resolve({ passed: false, testCase: testCase.name });
      }
    });

    child.stdin.write(JSON.stringify(testCase.input));
    child.stdin.end();
  });
}

async function runAllTests() {
  console.log('\n🚀 Documentation Generator - Test Suite');
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
