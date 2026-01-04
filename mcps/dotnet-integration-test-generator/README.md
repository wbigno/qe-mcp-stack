# Integration Test Generator - STDIO MCP

**Type:** STDIO MCP (On-Demand Process)  
**Location:** `mcps/integration-test-generator/`  
**Technology:** Node.js + Anthropic Claude API  
**Communication:** JSON via stdin/stdout  
**Status:** ✅ Production Ready

---

## Overview

The **Integration Test Generator** is a STDIO MCP that uses AI (Anthropic Claude) to generate comprehensive integration tests for .NET APIs and services. It creates production-ready test code using WebApplicationFactory, test databases, and proper HTTP testing patterns.

### Purpose

- ✅ Generate integration tests for RESTful APIs
- ✅ Use WebApplicationFactory for in-memory testing
- ✅ Test database operations with proper seeding/cleanup
- ✅ Include authentication/authorization testing
- ✅ Cover all CRUD operations
- ✅ Test error scenarios and validation
- ✅ Complete, runnable test files

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
curl -X POST http://localhost:3000/api/tests/generate-integration-tests \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "apiEndpoint": "/api/users",
    "scenario": "CRUD operations"
  }'
```

### Direct Testing (Development)

```bash
cd mcps/integration-test-generator

# Install dependencies
npm install

# Test with sample input
cat sample-input.json | node index.js

# Run test suite
npm test
```

---

## Input Schema

```typescript
{
  data: {
    app: string;                      // Required: App name from apps.json
    apiEndpoint: string;              // Required: API endpoint (e.g., "/api/users")
    scenario?: string;                // Optional: Test scenario description
    includeAuth?: boolean;            // Default: true - Include auth tests
    includeDatabase?: boolean;        // Default: true - Include DB operations
  }
}
```

---

## Output Schema

```typescript
{
  success: boolean;
  result: {
    tests: Array<{
      testName: string;               // e.g., "GetUsers_ValidRequest_Returns200"
      testCode: string;               // Complete xUnit test method
      description: string;
      httpMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
      endpoint: string;               // e.g., "/api/users"
      requiresAuth: boolean;
      statusCode: number;
      testData: object;
      category: "crud" | "authentication" | "validation" | "error-handling";
    }>;
    setupCode: string;                // Test fixture setup
    teardownCode: string;             // Cleanup code
    testDataSeed: {
      description: string;
      seedMethods: string[];          // Data seeding methods
    };
    testFixture: {
      className: string;              // e.g., "UserApiTests"
      namespaces: string[];
      baseClass: string;              // e.g., "IClassFixture<WebApplicationFactory<Program>>"
    };
    helpers: {
      httpClientHelper: string;       // HTTP helper methods
      testDataHelper: string | null;  // Data seeding helpers
      authHelper: string | null;      // Auth helpers
    };
    completeTestFile: string;         // Full .cs file
    statistics: {
      totalTests: number;
      byHttpMethod: object;
      byStatusCode: object;
      byCategory: object;
      authentication: {
        requiresAuth: number;
        noAuth: number;
      };
      coverage: {
        crud: {
          create: number;
          read: number;
          update: number;
          delete: number;
        };
        successCases: number;
        errorCases: number;
      };
    };
    metadata: {
      app: string;
      apiEndpoint: string;
      scenario: string;
      generatedAt: string;
      version: string;
      includeAuth: boolean;
      includeDatabase: boolean;
    };
  }
}
```

---

## Example Output

```json
{
  "success": true,
  "result": {
    "tests": [
      {
        "testName": "GetUsers_ValidRequest_Returns200AndUserList",
        "testCode": "[Fact]\npublic async Task GetUsers_ValidRequest_Returns200AndUserList()\n{\n    // Arrange\n    await SeedTestData();\n    var client = _factory.CreateClient();\n    \n    // Act\n    var response = await client.GetAsync(\"/api/users\");\n    \n    // Assert\n    Assert.Equal(HttpStatusCode.OK, response.StatusCode);\n    var users = await response.Content.ReadFromJsonAsync<List<User>>();\n    Assert.NotNull(users);\n    Assert.True(users.Count > 0);\n}",
        "description": "Verifies that GET /api/users returns 200 OK with a list of users",
        "httpMethod": "GET",
        "endpoint": "/api/users",
        "requiresAuth": false,
        "statusCode": 200,
        "testData": {},
        "category": "crud"
      },
      {
        "testName": "PostUser_ValidData_Returns201AndCreatesUser",
        "testCode": "[Fact]\npublic async Task PostUser_ValidData_Returns201AndCreatesUser()\n{\n    // Arrange\n    var client = _factory.CreateClient();\n    var newUser = new { Name = \"John Doe\", Email = \"john@example.com\" };\n    \n    // Act\n    var response = await client.PostAsJsonAsync(\"/api/users\", newUser);\n    \n    // Assert\n    Assert.Equal(HttpStatusCode.Created, response.StatusCode);\n    var createdUser = await response.Content.ReadFromJsonAsync<User>();\n    Assert.NotNull(createdUser);\n    Assert.Equal(newUser.Name, createdUser.Name);\n}",
        "description": "Verifies that POST /api/users with valid data returns 201 Created and creates the user",
        "httpMethod": "POST",
        "endpoint": "/api/users",
        "requiresAuth": true,
        "statusCode": 201,
        "testData": {
          "Name": "John Doe",
          "Email": "john@example.com"
        },
        "category": "crud"
      },
      {
        "testName": "PostUser_InvalidEmail_Returns400BadRequest",
        "testCode": "[Fact]\npublic async Task PostUser_InvalidEmail_Returns400BadRequest()\n{\n    // Arrange\n    var client = _factory.CreateClient();\n    var invalidUser = new { Name = \"John Doe\", Email = \"invalid-email\" };\n    \n    // Act\n    var response = await client.PostAsJsonAsync(\"/api/users\", invalidUser);\n    \n    // Assert\n    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);\n}",
        "description": "Verifies that POST /api/users with invalid email returns 400 Bad Request",
        "httpMethod": "POST",
        "endpoint": "/api/users",
        "requiresAuth": true,
        "statusCode": 400,
        "category": "validation"
      }
    ],
    "setupCode": "private readonly WebApplicationFactory<Program> _factory;\n\npublic UserApiTests(WebApplicationFactory<Program> factory)\n{\n    _factory = factory;\n}",
    "testDataSeed": {
      "description": "Seed test data before each test",
      "seedMethods": [
        "private async Task SeedTestData()\n{\n    var context = GetTestDbContext();\n    await context.Users.AddRangeAsync(\n        new User { Name = \"Alice\", Email = \"alice@example.com\" },\n        new User { Name = \"Bob\", Email = \"bob@example.com\" }\n    );\n    await context.SaveChangesAsync();\n}"
      ]
    },
    "statistics": {
      "totalTests": 8,
      "byHttpMethod": {
        "GET": 2,
        "POST": 3,
        "PUT": 2,
        "DELETE": 1
      },
      "byStatusCode": {
        "200": 2,
        "201": 2,
        "204": 1,
        "400": 2,
        "404": 1
      },
      "authentication": {
        "requiresAuth": 6,
        "noAuth": 2
      },
      "coverage": {
        "crud": {
          "create": 3,
          "read": 2,
          "update": 2,
          "delete": 1
        },
        "successCases": 5,
        "errorCases": 3
      }
    }
  }
}
```

---

## Test Structure

### WebApplicationFactory Setup

Generated tests use WebApplicationFactory for in-memory API testing:

```csharp
public class UserApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public UserApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetUsers_ValidRequest_Returns200()
    {
        // Arrange
        var client = _factory.CreateClient();
        
        // Act
        var response = await client.GetAsync("/api/users");
        
        // Assert
        response.EnsureSuccessStatusCode();
    }
}
```

---

## Test Categories

### CRUD Operations
- **Create (POST):** Valid data, invalid data, duplicates
- **Read (GET):** Single item, list, not found, filtering
- **Update (PUT):** Valid update, invalid data, not found
- **Delete (DELETE):** Successful delete, not found

### Authentication Tests
- Valid JWT token
- Expired token
- Missing token
- Invalid token
- Wrong role/permissions

### Validation Tests
- Required fields
- Email format
- Length constraints
- Business rules

### Error Handling Tests
- 400 Bad Request
- 401 Unauthorized
- 404 Not Found
- 409 Conflict

---

## HTTP Status Code Coverage

Generated tests cover common status codes:

- **200 OK** - Successful GET
- **201 Created** - Successful POST
- **204 No Content** - Successful DELETE/PUT
- **400 Bad Request** - Validation errors
- **401 Unauthorized** - Missing/invalid auth
- **403 Forbidden** - Insufficient permissions
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate resources

---

## Environment Requirements

### Required Environment Variables

```bash
# .env file (root directory)
ANTHROPIC_API_KEY=sk-ant-...     # Required: Anthropic API key
CLAUDE_MODEL=claude-sonnet-4-20250514  # Optional: Model to use
NODE_ENV=production              # Optional: Environment
```

---

## Testing

### Run Test Suite

```bash
cd mcps/integration-test-generator
npm test
```

### Manual Testing

```bash
cat > test-input.json << EOF
{
  "data": {
    "app": "App1",
    "apiEndpoint": "/api/users",
    "scenario": "Full CRUD operations with validation",
    "includeAuth": true,
    "includeDatabase": true
  }
}
EOF

cat test-input.json | node index.js
```

---

## Helper Methods Generated

### HTTP Client Helper
```csharp
private HttpClient CreateAuthenticatedClient(string token)
{
    var client = _factory.CreateClient();
    client.DefaultRequestHeaders.Authorization = 
        new AuthenticationHeaderValue("Bearer", token);
    return client;
}
```

### Test Data Helper
```csharp
private async Task SeedTestData()
{
    await _context.Users.AddAsync(new User { Name = "Test" });
    await _context.SaveChangesAsync();
}
```

### Auth Helper
```csharp
private string GenerateValidToken()
{
    return "valid_test_token";
}
```

---

## Error Handling

### Common Errors

**Missing API Key:**
```json
{
  "success": false,
  "error": "Claude API error: Missing API key"
}
```

**Invalid Endpoint:**
```json
{
  "success": false,
  "error": "apiEndpoint must start with /"
}
```

---

## Integration with Orchestrator

Part of the complete test generation workflow:

**Workflow:**
1. **requirements-analyzer** - Analyze requirements
2. **test-case-planner** - Generate test cases
3. **unit-test-generator** - Generate unit tests
4. **integration-test-generator** - Generate integration tests (this MCP)
5. Tests added to test project

---

## Performance

- **Typical Generation Time:** 8-15 seconds
- **API Tokens Used:** ~3,000-5,000 tokens per endpoint
- **Memory Usage:** ~50-100 MB per process
- **Tests Generated:** 6-12 per endpoint

---

## Best Practices

1. **Provide clear scenarios** - Better test generation
2. **Use realistic endpoints** - /api/resource format
3. **Enable auth testing** - Critical for security
4. **Enable database testing** - Ensures data integrity
5. **Review generated tests** - Customize as needed
6. **Run tests to verify** - Ensure they compile and pass

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ WebApplicationFactory integration tests
- ✅ CRUD operation coverage
- ✅ Authentication testing
- ✅ Database seeding/cleanup

---

**Need help?** Check the test suite in `tests/test.js` for examples.
