#!/usr/bin/env node

/**
 * Test Suite for Unit Test Generator
 * 
 * Tests the STDIO MCP with various inputs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sample C# code for testing
const sampleUserServiceCode = `
public class UserService
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;

    public UserService(IUserRepository userRepository, IEmailService emailService)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
    }

    public User GetUserById(int userId)
    {
        if (userId <= 0)
            throw new ArgumentException("User ID must be positive", nameof(userId));

        var user = _userRepository.GetById(userId);
        
        if (user == null)
            throw new UserNotFoundException($"User with ID {userId} not found");

        return user;
    }

    public async Task<bool> CreateUser(User user)
    {
        if (user == null)
            throw new ArgumentNullException(nameof(user));

        if (string.IsNullOrWhiteSpace(user.Email))
            throw new ArgumentException("Email is required", nameof(user.Email));

        var existingUser = await _userRepository.GetByEmail(user.Email);
        if (existingUser != null)
            throw new DuplicateUserException($"User with email {user.Email} already exists");

        await _userRepository.Add(user);
        await _emailService.SendWelcomeEmail(user.Email);

        return true;
    }
}
`;

// Test cases
const testCases = [
  {
    name: 'Generate tests for UserService class',
    input: {
      data: {
        app: 'App1',
        className: 'UserService',
        sourceCode: sampleUserServiceCode,
        includeNegativeTests: true,
        includeMocks: true
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate tests for specific method only',
    input: {
      data: {
        app: 'App1',
        className: 'UserService',
        methodName: 'GetUserById',
        sourceCode: sampleUserServiceCode,
        includeNegativeTests: true,
        includeMocks: true
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Generate positive tests only',
    input: {
      data: {
        app: 'App1',
        className: 'UserService',
        sourceCode: sampleUserServiceCode,
        includeNegativeTests: false,
        includeMocks: true
      }
    },
    expectedSuccess: true
  },
  {
    name: 'Invalid input - missing className',
    input: {
      data: {
        app: 'App1',
        sourceCode: sampleUserServiceCode
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
            const stats = result.result.statistics;
            console.log(`   Total Tests: ${stats.totalTests}`);
            console.log(`   Positive: ${stats.byCategory.positive}`);
            console.log(`   Negative: ${stats.byCategory.negative}`);
            console.log(`   Edge Cases: ${stats.byCategory.edgeCase}`);
            console.log(`   Mocks: ${stats.mocks.total}`);
            console.log(`   Assertions: ${stats.assertions.unique} unique types`);
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
  console.log('\n🚀 Unit Test Generator - Test Suite');
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
