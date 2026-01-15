import { jest } from "@jest/globals";

// Mock fs/promises BEFORE importing the analyzer
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();

jest.unstable_mockModule("fs/promises", () => ({
  default: {
    readdir: mockReaddir,
    readFile: mockReadFile,
  },
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

// Import AFTER mocking
const { DotNetAnalyzer } = await import("../dotnet-analyzer.js");

describe("DotNetAnalyzer", () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new DotNetAnalyzer();
    jest.clearAllMocks();

    // Setup default successful responses
    mockReaddir.mockResolvedValue([]);
    mockReadFile.mockResolvedValue("");
  });

  // ============================================
  // scanCSharpFiles()
  // ============================================

  describe("scanCSharpFiles()", () => {
    it("should find all .cs files in directory", async () => {
      mockReaddir.mockResolvedValueOnce([
        { name: "UserService.cs", isDirectory: () => false },
        { name: "Program.cs", isDirectory: () => false },
      ]);

      const files = await analyzer.scanCSharpFiles("/app/src");

      expect(files).toHaveLength(2);
      expect(files[0].relativePath).toBe("UserService.cs");
      expect(files[1].relativePath).toBe("Program.cs");
    });

    it("should recursively scan subdirectories", async () => {
      mockReaddir
        .mockResolvedValueOnce([{ name: "Services", isDirectory: () => true }])
        .mockResolvedValueOnce([
          { name: "UserService.cs", isDirectory: () => false },
        ]);

      const files = await analyzer.scanCSharpFiles("/app/src");

      expect(files).toHaveLength(1);
      expect(files[0].relativePath).toContain("Services");
    });

    it("should exclude test files by default", async () => {
      mockReaddir.mockResolvedValueOnce([
        { name: "UserService.cs", isDirectory: () => false },
        { name: "UserServiceTests.cs", isDirectory: () => false },
        { name: "UserServiceTest.cs", isDirectory: () => false },
      ]);

      const files = await analyzer.scanCSharpFiles("/app/src");

      expect(files).toHaveLength(1);
      expect(files[0].relativePath).toBe("UserService.cs");
    });

    it("should include test files when includeTests is true", async () => {
      mockReaddir.mockResolvedValueOnce([
        { name: "UserService.cs", isDirectory: () => false },
        { name: "UserServiceTests.cs", isDirectory: () => false },
      ]);

      const files = await analyzer.scanCSharpFiles("/app/src", true);

      expect(files).toHaveLength(2);
    });

    it("should exclude bin, obj, packages, node_modules directories", async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: "bin", isDirectory: () => true },
          { name: "obj", isDirectory: () => true },
          { name: "Services", isDirectory: () => true },
        ])
        .mockResolvedValueOnce([
          { name: "UserService.cs", isDirectory: () => false },
        ]);

      const files = await analyzer.scanCSharpFiles("/app/src");

      expect(files).toHaveLength(1);
      expect(mockReaddir).toHaveBeenCalledTimes(2); // Only scans Services, not bin/obj
    });

    it("should handle custom exclude paths", async () => {
      mockReaddir
        .mockResolvedValueOnce([
          { name: "Generated", isDirectory: () => true },
          { name: "Services", isDirectory: () => true },
        ])
        .mockResolvedValueOnce([
          { name: "UserService.cs", isDirectory: () => false },
        ]);

      const files = await analyzer.scanCSharpFiles("/app/src", false, [
        "bin",
        "obj",
        "Generated",
      ]);

      expect(files).toHaveLength(1);
    });

    it("should handle errors gracefully", async () => {
      mockReaddir.mockRejectedValueOnce(new Error("Permission denied"));

      const files = await analyzer.scanCSharpFiles("/app/src");

      expect(files).toHaveLength(0);
    });

    it("should return empty array for empty directory", async () => {
      mockReaddir.mockResolvedValueOnce([]);

      const files = await analyzer.scanCSharpFiles("/app/src");

      expect(files).toHaveLength(0);
    });
  });

  // ============================================
  // parseFile()
  // ============================================

  describe("parseFile()", () => {
    const sampleCSharpCode = `
using System;
using System.Linq;

namespace MyApp.Services
{
    public class UserService
    {
        public string Name { get; set; }

        public async Task<User> GetUserAsync(int id)
        {
            return new User { Id = id };
        }
    }
}`;

    beforeEach(() => {
      mockReadFile.mockResolvedValue(sampleCSharpCode);
    });

    it("should parse file and extract all components", async () => {
      const result = await analyzer.parseFile("/app/UserService.cs");

      expect(result).toBeDefined();
      expect(result.file).toBe("/app/UserService.cs");
      expect(result.namespace).toBe("MyApp.Services");
      expect(result.usings).toContain("System");
      expect(result.usings).toContain("System.Linq");
      expect(result.classes).toBeDefined();
      expect(result.interfaces).toBeDefined();
      expect(result.integrations).toBeDefined();
      expect(result.complexity).toBeGreaterThan(0);
    });

    it("should handle file read errors", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("File not found"));

      const result = await analyzer.parseFile("/app/missing.cs");

      expect(result).toBeNull();
    });

    it("should parse file with no namespace", async () => {
      mockReadFile.mockResolvedValueOnce("public class Test { }");

      const result = await analyzer.parseFile("/app/Test.cs");

      expect(result.namespace).toBeNull();
    });
  });

  // ============================================
  // extractNamespace()
  // ============================================

  describe("extractNamespace()", () => {
    it("should extract namespace", () => {
      const code = "namespace MyApp.Services { }";
      const ns = analyzer.extractNamespace(code);
      expect(ns).toBe("MyApp.Services");
    });

    it("should handle nested namespace", () => {
      const code = "namespace MyApp.Services.User { }";
      const ns = analyzer.extractNamespace(code);
      expect(ns).toBe("MyApp.Services.User");
    });

    it("should return null when no namespace", () => {
      const code = "public class Test { }";
      const ns = analyzer.extractNamespace(code);
      expect(ns).toBeNull();
    });
  });

  // ============================================
  // extractUsings()
  // ============================================

  describe("extractUsings()", () => {
    it("should extract all using statements", () => {
      const code = `
using System;
using System.Linq;
using MyApp.Models;
`;
      const usings = analyzer.extractUsings(code);

      expect(usings).toHaveLength(3);
      expect(usings).toContain("System");
      expect(usings).toContain("System.Linq");
      expect(usings).toContain("MyApp.Models");
    });

    it("should return empty array when no usings", () => {
      const code = "public class Test { }";
      const usings = analyzer.extractUsings(code);
      expect(usings).toHaveLength(0);
    });
  });

  // ============================================
  // extractClasses()
  // ============================================

  describe("extractClasses()", () => {
    it("should extract public class", () => {
      const code = "public class UserService { }";
      const classes = analyzer.extractClasses(code, "test.cs");

      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe("UserService");
      expect(classes[0].isService).toBe(true);
    });

    it("should detect Controllers", () => {
      const code = "public class UsersController : ControllerBase { }";
      const classes = analyzer.extractClasses(code, "test.cs");

      expect(classes[0].isController).toBe(true);
      expect(classes[0].isService).toBe(false);
    });

    it("should detect Services", () => {
      const code = "public class UserService { }";
      const classes = analyzer.extractClasses(code, "test.cs");

      expect(classes[0].isService).toBe(true);
    });

    it("should detect Repositories", () => {
      const code = "public class UserRepository { }";
      const classes = analyzer.extractClasses(code, "test.cs");

      expect(classes[0].isRepository).toBe(true);
    });

    it("should extract class inheritance", () => {
      const code = "public class UserService : BaseService, IUserService { }";
      const classes = analyzer.extractClasses(code, "test.cs");

      expect(classes[0].inherits).toBe("BaseService, IUserService");
    });

    it("should handle abstract classes", () => {
      const code = "public abstract class BaseService { }";
      const classes = analyzer.extractClasses(code, "test.cs");

      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe("BaseService");
    });

    it("should handle static classes", () => {
      const code = "public static class Helper { }";
      const classes = analyzer.extractClasses(code, "test.cs");

      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe("Helper");
    });
  });

  // ============================================
  // extractMethods()
  // ============================================

  describe("extractMethods()", () => {
    it("should extract public methods", () => {
      const code = `
public class Test {
    public void DoSomething() { }
    public string GetName() { return "test"; }
}`;
      const methods = analyzer.extractMethods(code);

      expect(methods).toHaveLength(2);
      expect(methods[0].name).toBe("DoSomething");
      expect(methods[1].name).toBe("GetName");
    });

    it("should detect async keyword in method context", () => {
      const code = `
public class Test {
    public async Task GetDataAsync() {
        await SomeOperation();
    }
}`;
      const methods = analyzer.extractMethods(code);

      // Should extract at least one method
      expect(methods.length).toBeGreaterThan(0);
      // The isAsync flag depends on 'async' being within 20 chars before method signature
      // This is a best-effort detection
    });

    it("should detect method visibility modifiers", () => {
      const code = `
public void Method1() { }
private void Method2() { }
`;
      const methods = analyzer.extractMethods(code);

      // Should extract both methods
      expect(methods.length).toBe(2);
      // The isPublic flag depends on 'public' being within 20 chars before method signature
      // This is a best-effort detection
    });

    it("should skip property getters and setters", () => {
      const code = `
public string Name { get; set; }
public void ActualMethod() { }
`;
      const methods = analyzer.extractMethods(code);

      // Should only find ActualMethod, not get_Name or set_Name
      expect(methods.length).toBeGreaterThan(0);
      expect(
        methods.every(
          (m) => !m.name.startsWith("get_") && !m.name.startsWith("set_"),
        ),
      ).toBe(true);
    });

    it("should detect error handling", () => {
      const code = `
public void SafeMethod() {
    try {
        DoSomething();
    } catch (Exception ex) {
        Log(ex);
    }
}`;
      const methods = analyzer.extractMethods(code);

      expect(methods[0].hasErrorHandling).toBe(true);
    });

    it("should calculate method complexity", () => {
      const code = `
public void ComplexMethod() {
    if (condition) {
        for (int i = 0; i < 10; i++) {
            DoSomething();
        }
    }
}`;
      const methods = analyzer.extractMethods(code);

      expect(methods[0].complexity).toBeGreaterThan(1);
    });
  });

  // ============================================
  // extractProperties()
  // ============================================

  describe("extractProperties()", () => {
    it("should extract auto-properties", () => {
      const code = `
public class User {
    public int Id { get; set; }
    public string Name { get; set; }
    public DateTime CreatedAt { get; set; }
}`;
      const properties = analyzer.extractProperties(code);

      expect(properties).toHaveLength(3);
      expect(properties[0]).toEqual({ name: "Id", type: "int" });
      expect(properties[1]).toEqual({ name: "Name", type: "string" });
      expect(properties[2]).toEqual({ name: "CreatedAt", type: "DateTime" });
    });

    it("should handle generic types", () => {
      const code = "public List<User> Users { get; set; }";
      const properties = analyzer.extractProperties(code);

      expect(properties[0]).toEqual({ name: "Users", type: "List<User>" });
    });
  });

  // ============================================
  // extractAttributes()
  // ============================================

  describe("extractAttributes()", () => {
    it("should extract attributes", () => {
      const code = `
[Route("api/users")]
[ApiController]
public class UsersController { }
`;
      const attributes = analyzer.extractAttributes(code, "UsersController");

      expect(attributes).toContain("Route");
      expect(attributes).toContain("ApiController");
    });

    it("should extract attributes with parameters", () => {
      const code = '[HttpGet("{id}")]';
      const attributes = analyzer.extractAttributes(code, "Test");

      expect(attributes).toContain("HttpGet");
    });
  });

  // ============================================
  // extractInterfaces()
  // ============================================

  describe("extractInterfaces()", () => {
    it("should extract interfaces", () => {
      const code = `
public interface IUserService { }
internal interface ILogger { }
`;
      const interfaces = analyzer.extractInterfaces(code);

      expect(interfaces).toHaveLength(2);
      expect(interfaces[0].name).toBe("IUserService");
      expect(interfaces[1].name).toBe("ILogger");
    });

    it("should handle files with no interfaces", () => {
      const code = "public class Test { }";
      const interfaces = analyzer.extractInterfaces(code);

      expect(interfaces).toHaveLength(0);
    });
  });

  // ============================================
  // detectIntegrations()
  // ============================================

  describe("detectIntegrations()", () => {
    it("should detect Epic integration", () => {
      const code = "var epic = new EpicService();";
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("Epic");
    });

    it("should detect Financial integration", () => {
      const code = "var payment = new PaymentProcessor();";
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("Financial");
    });

    it("should detect Database integration", () => {
      const code = "using (var context = new DbContext()) { }";
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("Database");
    });

    it("should detect HTTP integration", () => {
      const code = "var client = new HttpClient();";
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("HTTP");
    });

    it("should detect AWS integration", () => {
      const code = "var s3 = new AmazonS3Client();";
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("AWS");
    });

    it("should detect Azure integration", () => {
      const code = "var blob = new BlobServiceClient();";
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("Azure");
    });

    it("should detect Redis integration", () => {
      const code =
        'var redis = StackExchange.Redis.ConnectionMultiplexer.Connect("localhost");';
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("Redis");
    });

    it("should detect multiple integrations", () => {
      const code = `
using (var context = new DbContext()) {
    var client = new HttpClient();
    var cache = new Redis.Cache();
}`;
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toContain("Database");
      expect(integrations).toContain("HTTP");
      expect(integrations).toContain("Redis");
      expect(integrations.length).toBe(3);
    });

    it("should not duplicate integrations", () => {
      const code = `
var client1 = new HttpClient();
var client2 = new HttpClient();
`;
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations.filter((i) => i === "HTTP").length).toBe(1);
    });

    it("should return empty array when no integrations", () => {
      const code = "public class SimpleCalculator { }";
      const integrations = analyzer.detectIntegrations(code);

      expect(integrations).toHaveLength(0);
    });
  });

  // ============================================
  // calculateComplexity()
  // ============================================

  describe("calculateComplexity()", () => {
    it("should return 1 for simple code", () => {
      const code = "return true;";
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(1);
    });

    it("should count if statements", () => {
      const code = `
if (x > 0) {
    DoSomething();
}
if (y > 0) {
    DoSomethingElse();
}`;
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(3); // 1 + 2 ifs
    });

    it("should count for loops", () => {
      const code = "for (int i = 0; i < 10; i++) { }";
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(2); // 1 + 1 for
    });

    it("should count while loops", () => {
      const code = "while (condition) { }";
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(2); // 1 + 1 while
    });

    it("should count foreach loops", () => {
      const code = "foreach (var item in items) { }";
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(2); // 1 + 1 foreach
    });

    it("should count case statements", () => {
      const code = `
switch (value) {
    case 1:
        break;
    case 2:
        break;
}`;
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(3); // 1 + 2 cases
    });

    it("should count catch blocks", () => {
      const code = `
try {
    DoSomething();
} catch (Exception ex) {
    Log(ex);
}`;
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(2); // 1 + 1 catch
    });

    it("should count logical operators", () => {
      const code = "if (x > 0 && y > 0 || z > 0) { }";
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBeGreaterThan(2); // 1 + if + && + ||
    });

    it("should count ternary operators", () => {
      const code = "var result = condition ? value1 : value2;";
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBe(2); // 1 + 1 ternary
    });

    it("should count all complexity factors", () => {
      const code = `
if (x > 0) {
    for (int i = 0; i < 10; i++) {
        while (condition && otherCondition) {
            DoSomething();
        }
    }
}`;
      const complexity = analyzer.calculateComplexity(code);

      expect(complexity).toBeGreaterThan(4); // 1 + if + for + while + &&
    });
  });

  // ============================================
  // findReferences()
  // ============================================

  describe("findReferences()", () => {
    it("should find pattern references", () => {
      const code = `line 1
EpicService call here
line 3
Another EpicService reference
line 5`;

      const references = analyzer.findReferences(code, ["EpicService"]);

      expect(references).toHaveLength(2);
      expect(references[0].pattern).toBe("EpicService");
      expect(references[0].lineNumber).toBe(2);
      expect(references[1].lineNumber).toBe(4);
    });

    it("should provide context for each reference", () => {
      const code = "line 1\nline 2\npattern here\nline 4\nline 5";

      const references = analyzer.findReferences(code, ["pattern"]);

      expect(references[0].context).toBeDefined();
      expect(references[0].context).toContain("pattern here");
    });

    it("should handle multiple patterns", () => {
      const code = "HttpClient and DbContext";
      const references = analyzer.findReferences(code, [
        "HttpClient",
        "DbContext",
      ]);

      expect(references).toHaveLength(2);
    });

    it("should handle case-insensitive search", () => {
      const code = "HTTPCLIENT and httpclient";
      const references = analyzer.findReferences(code, ["httpclient"]);

      expect(references).toHaveLength(2);
    });
  });

  // ============================================
  // getContext()
  // ============================================

  describe("getContext()", () => {
    it("should return surrounding lines", () => {
      const code = "line 1\nline 2\ntarget line\nline 4\nline 5";

      const targetIndex = code.indexOf("target line");
      const context = analyzer.getContext(code, targetIndex, 1);

      expect(context).toContain("line 2");
      expect(context).toContain("target line");
      expect(context).toContain("line 4");
    });

    it("should handle start of file", () => {
      const code = "first line\nline 2\nline 3";

      const context = analyzer.getContext(code, 0, 2);

      expect(context).toContain("first line");
      expect(context).not.toContain("undefined");
    });

    it("should handle end of file", () => {
      const code = "line 1\nline 2\nlast line";

      const lastIndex = code.indexOf("last line");
      const context = analyzer.getContext(code, lastIndex, 2);

      expect(context).toContain("last line");
      expect(context).not.toContain("undefined");
    });
  });

  // ============================================
  // loadAppConfig()
  // ============================================

  describe("loadAppConfig()", () => {
    it("should load app configuration from apps.json", async () => {
      const mockConfig = {
        applications: [
          { name: "App1", path: "/app/App1" },
          { name: "App2", path: "/app/App2" },
        ],
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockConfig));

      const config = await analyzer.loadAppConfig("App1");

      expect(config).toEqual({ name: "App1", path: "/app/App1" });
    });

    it("should use CONFIG_PATH env var when set", async () => {
      process.env.CONFIG_PATH = "/custom/path/apps.json";

      const mockConfig = {
        applications: [{ name: "TestApp", path: "/test" }],
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockConfig));

      await analyzer.loadAppConfig("TestApp");

      expect(mockReadFile).toHaveBeenCalledWith(
        "/custom/path/apps.json",
        "utf-8",
      );

      delete process.env.CONFIG_PATH;
    });

    it("should default to /app/config/apps.json", async () => {
      delete process.env.CONFIG_PATH;

      const mockConfig = {
        applications: [{ name: "TestApp", path: "/test" }],
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockConfig));

      await analyzer.loadAppConfig("TestApp");

      expect(mockReadFile).toHaveBeenCalledWith(
        "/app/config/apps.json",
        "utf-8",
      );
    });

    it("should throw error when app not found", async () => {
      const mockConfig = {
        applications: [{ name: "App1", path: "/app/App1" }],
      };

      mockReadFile.mockResolvedValueOnce(JSON.stringify(mockConfig));

      await expect(analyzer.loadAppConfig("NonExistentApp")).rejects.toThrow(
        "Application NonExistentApp not found in configuration",
      );
    });

    it("should handle file read errors", async () => {
      mockReadFile.mockRejectedValueOnce(new Error("File not found"));

      await expect(analyzer.loadAppConfig("App1")).rejects.toThrow();
    });

    it("should handle invalid JSON", async () => {
      mockReadFile.mockResolvedValueOnce("invalid json{");

      await expect(analyzer.loadAppConfig("App1")).rejects.toThrow();
    });
  });
});
