#!/usr/bin/env node

/**
 * Test Suite for State Machine Analyzer
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sampleStateMachine = `
public enum AppointmentStatus
{
    Scheduled,
    Confirmed,
    InProgress,
    Completed,
    Cancelled
}

public class AppointmentService
{
    public void UpdateStatus(Appointment appointment, string action)
    {
        switch (appointment.Status)
        {
            case AppointmentStatus.Scheduled:
                if (action == "confirm")
                    appointment.Status = AppointmentStatus.Confirmed;
                else if (action == "cancel")
                    appointment.Status = AppointmentStatus.Cancelled;
                break;

            case AppointmentStatus.Confirmed:
                if (action == "start")
                    appointment.Status = AppointmentStatus.InProgress;
                else if (action == "cancel")
                    appointment.Status = AppointmentStatus.Cancelled;
                break;

            case AppointmentStatus.InProgress:
                if (action == "complete")
                    appointment.Status = AppointmentStatus.Completed;
                break;
        }
    }
}
`;

const testCases = [
  {
    name: 'Analyze appointment state machine',
    input: {
      data: {
        app: 'App1',
        sourceCode: sampleStateMachine,
        entityName: 'Appointment'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze simple state machine',
    input: {
      data: {
        app: 'App1',
        sourceCode: 'enum Status { Pending, Active, Done }',
        entityName: 'Task'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid - missing sourceCode',
    input: {
      data: {
        app: 'App1',
        entityName: 'Test'
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid - missing app',
    input: {
      data: {
        sourceCode: 'enum Status { A, B }'
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
            console.log(`   Entity: ${analysis.entity}`);
            console.log(`   States: ${analysis.states?.length || 0}`);
            console.log(`   Transitions: ${analysis.transitions?.length || 0}`);
            console.log(`   Issues: ${analysis.issues?.length || 0}`);
            console.log(`   Complete Paths: ${analysis.paths?.complete?.length || 0}`);
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
        resolve({ passed: false, testCase: testCase.name });
      }
    });

    child.stdin.write(JSON.stringify(testCase.input));
    child.stdin.end();
  });
}

async function runAllTests() {
  console.log('\n🚀 State Machine Analyzer - Test Suite');
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
