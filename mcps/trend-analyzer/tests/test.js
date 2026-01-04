#!/usr/bin/env node

/**
 * Test Suite for Trend Analyzer
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const increasingTrend = Array.from({ length: 20 }, (_, i) => ({
  timestamp: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000).toISOString(),
  value: 100 + i * 5 + Math.random() * 10
}));

const stableTrend = Array.from({ length: 20 }, (_, i) => ({
  timestamp: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000).toISOString(),
  value: 100 + Math.random() * 5
}));

const testCases = [
  {
    name: 'Analyze increasing trend',
    input: {
      data: {
        app: 'App1',
        metricName: 'Test Coverage',
        metrics: increasingTrend
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze stable trend',
    input: {
      data: {
        app: 'App1',
        metricName: 'Response Time',
        metrics: stableTrend
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze with anomaly',
    input: {
      data: {
        app: 'App1',
        metricName: 'Error Rate',
        metrics: [
          { timestamp: '2024-01-01', value: 10 },
          { timestamp: '2024-01-02', value: 12 },
          { timestamp: '2024-01-03', value: 50 }, // Anomaly
          { timestamp: '2024-01-04', value: 11 },
          { timestamp: '2024-01-05', value: 13 }
        ]
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
  },
  {
    name: 'Invalid - empty metrics',
    input: {
      data: {
        app: 'App1',
        metrics: []
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
            console.log(`   Metric: ${analysis.metricName}`);
            console.log(`   Data Points: ${analysis.metadata.dataPoints}`);
            console.log(`   Mean: ${analysis.statistics.mean}`);
            console.log(`   Trend: ${analysis.trend.direction} (${analysis.trend.strength})`);
            console.log(`   Anomalies: ${analysis.anomalies.length}`);
            console.log(`   Insights: ${analysis.insights.length}`);
            console.log(`   Forecast: ${analysis.forecast.predictions.length} periods`);
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
  console.log('\n🚀 Trend Analyzer - Test Suite');
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
