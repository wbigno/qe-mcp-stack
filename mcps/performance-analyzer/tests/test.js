#!/usr/bin/env node

/**
 * Test Suite for Performance Analyzer
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const goodPerformance = {
  responseTimes: Array.from({ length: 100 }, (_, i) => ({
    endpoint: '/api/users',
    duration: 100 + Math.random() * 100,
    timestamp: new Date(Date.now() - i * 1000).toISOString()
  })),
  requests: Array.from({ length: 100 }, (_, i) => ({
    endpoint: '/api/users',
    status: 200,
    timestamp: new Date(Date.now() - i * 1000).toISOString()
  }))
};

const poorPerformance = {
  responseTimes: Array.from({ length: 100 }, (_, i) => ({
    endpoint: '/api/users',
    duration: 2000 + Math.random() * 1000,
    timestamp: new Date(Date.now() - i * 1000).toISOString()
  })),
  requests: Array.from({ length: 100 }, (_, i) => ({
    endpoint: '/api/users',
    status: i % 10 === 0 ? 500 : 200,
    timestamp: new Date(Date.now() - i * 1000).toISOString()
  }))
};

const testCases = [
  {
    name: 'Analyze good performance',
    input: {
      data: {
        app: 'App1',
        metrics: goodPerformance
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze poor performance',
    input: {
      data: {
        app: 'App1',
        metrics: poorPerformance
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze minimal metrics',
    input: {
      data: {
        app: 'App1',
        metrics: {
          responseTimes: [
            { endpoint: '/api/test', duration: 150, timestamp: '2024-12-30' }
          ]
        }
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid - missing metrics',
    input: {
      data: {
        app: 'App1'
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
            console.log(`   Response Time: ${analysis.responseTime?.mean || 'N/A'}ms avg`);
            console.log(`   Throughput: ${analysis.throughput?.requestsPerSecond || 'N/A'} req/s`);
            console.log(`   Error Rate: ${analysis.errorRate?.rate || 0}%`);
            console.log(`   Bottlenecks: ${analysis.bottlenecks?.length || 0}`);
            console.log(`   Issues: ${analysis.issues?.length || 0}`);
            console.log(`   Score: ${analysis.performanceScore?.score || 0}/100 (${analysis.performanceScore?.grade || 'N/A'})`);
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
  console.log('\n🚀 Performance Analyzer - Test Suite');
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
