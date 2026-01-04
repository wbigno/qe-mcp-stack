#!/usr/bin/env node

/**
 * Test Suite for Business Logic Documenter
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sampleCode = `
public class UserService
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;

    public async Task<User> RegisterUser(UserRegistrationDto dto)
    {
        // Business Rule: Users must be 18 or older
        if (dto.Age < 18)
            throw new BusinessException("User must be 18 or older to register");

        // Business Rule: Email must be unique
        var existingUser = await _userRepository.GetByEmail(dto.Email);
        if (existingUser != null)
            throw new BusinessException("Email already registered");

        // Business Rule: Password must meet complexity requirements
        if (!IsPasswordComplex(dto.Password))
            throw new BusinessException("Password does not meet complexity requirements");

        var user = new User
        {
            Email = dto.Email,
            PasswordHash = HashPassword(dto.Password),
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        await _userRepository.Add(user);
        await _emailService.SendWelcomeEmail(user.Email);

        return user;
    }

    private bool IsPasswordComplex(string password)
    {
        return password.Length >= 8 && 
               password.Any(char.IsUpper) && 
               password.Any(char.IsLower) && 
               password.Any(char.IsDigit);
    }
}
`;

const testCases = [
  {
    name: 'Document user service',
    input: {
      data: {
        app: 'App1',
        className: 'UserService',
        sourceCode: sampleCode,
        format: 'markdown'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Document with JSON format',
    input: {
      data: {
        app: 'App1',
        className: 'UserService',
        sourceCode: sampleCode,
        format: 'json'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Document with HTML format',
    input: {
      data: {
        app: 'App1',
        className: 'UserService',
        sourceCode: sampleCode,
        format: 'html'
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid - missing className',
    input: {
      data: {
        app: 'App1',
        sourceCode: sampleCode
      }
    },
    expectedSuccess: false
  },
  {
    name: 'Invalid - missing sourceCode',
    input: {
      data: {
        app: 'App1',
        className: 'UserService'
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
            console.log(`   Purpose: ${doc.overview?.purpose?.substring(0, 60)}...`);
            console.log(`   Business Rules: ${doc.businessRules?.length || 0}`);
            console.log(`   Workflows: ${doc.workflows?.length || 0}`);
            console.log(`   Validation Rules: ${doc.validationRules?.length || 0}`);
            console.log(`   Integrations: ${doc.integrations?.length || 0}`);
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
        console.log(`   Output: ${(stdout || stderr).substring(0, 500)}`);
        resolve({ passed: false, testCase: testCase.name });
      }
    });

    child.stdin.write(JSON.stringify(testCase.input));
    child.stdin.end();
  });
}

async function runAllTests() {
  console.log('\n🚀 Business Logic Documenter - Test Suite');
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
