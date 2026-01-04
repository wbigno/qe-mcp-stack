#!/usr/bin/env node

/**
 * Test Suite for Smell Detector
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const smellyCode = `
public class UserService
{
    public async Task<User> ProcessUserRegistration(string email, string password, string firstName, string lastName, int age, string phone, string address, string city)
    {
        if (email != null && email.Length > 0 && email.Contains("@") && password != null && password.Length >= 8 && firstName != null && firstName.Length > 0)
        {
            if (age >= 18)
            {
                if (phone != null && phone.Length == 10)
                {
                    if (address != null && address.Length > 0)
                    {
                        if (city != null && city.Length > 0)
                        {
                            var user = new User();
                            user.Email = email;
                            user.Password = password;
                            user.FirstName = firstName;
                            user.LastName = lastName;
                            user.Age = age;
                            user.Phone = phone;
                            user.Address = address;
                            user.City = city;
                            // 100 more lines of processing
                            return user;
                        }
                    }
                }
            }
        }
        return null;
    }
}
`;

const testCases = [
  {
    name: 'Detect smells in bad code',
    input: {
      data: {
        app: 'App1',
        sourceCode: smellyCode,
        fileName: 'UserService.cs',
        severity: 'all'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Filter high severity only',
    input: {
      data: {
        app: 'App1',
        sourceCode: smellyCode,
        fileName: 'UserService.cs',
        severity: 'high'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Analyze clean code',
    input: {
      data: {
        app: 'App1',
        sourceCode: 'public class Simple { public void Do() { } }',
        fileName: 'Simple.cs'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid - missing sourceCode',
    input: {
      data: {
        app: 'App1',
        fileName: 'Test.cs'
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
            console.log(`   File: ${analysis.fileName}`);
            console.log(`   Total Smells: ${analysis.summary.total}`);
            console.log(`   Critical: ${analysis.summary.critical}`);
            console.log(`   High: ${analysis.summary.high}`);
            console.log(`   Medium: ${analysis.summary.medium}`);
            console.log(`   Low: ${analysis.summary.low}`);
            console.log(`   Quality Score: ${analysis.qualityScore.score}/100 (${analysis.qualityScore.grade})`);
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
        resolve({ passed: false, testCase: testCase.name });
      }
    });

    child.stdin.write(JSON.stringify(testCase.input));
    child.stdin.end();
  });
}

async function runAllTests() {
  console.log('\n🚀 Smell Detector - Test Suite');
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
