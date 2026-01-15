/**
 * Unit tests for Config Utility
 *
 * Tests the apps configuration loading
 */

import { jest } from "@jest/globals";

// Create mock function
const mockReadFileSync = jest.fn();

// Mock fs module before importing
jest.unstable_mockModule("fs", () => ({
  readFileSync: mockReadFileSync,
}));

// Dynamic import after mocking
const { loadAppsConfig } = await import("../../../src/utils/config.js");

describe("Config Utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.error mock
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it("should load valid apps configuration", () => {
    const mockConfig = {
      applications: [
        {
          name: "App1",
          displayName: "Application 1",
          path: "/mnt/apps/app1",
          includePatterns: ["**/*.cs"],
          excludePaths: ["bin", "obj"],
        },
      ],
      settings: {
        timeout: 30000,
      },
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    const result = loadAppsConfig();

    expect(mockReadFileSync).toHaveBeenCalledWith(
      "/app/config/apps.json",
      "utf-8",
    );
    expect(result).toEqual(mockConfig);
    expect(result.applications).toHaveLength(1);
  });

  it("should return empty config on file not found error", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const result = loadAppsConfig();

    expect(result).toEqual({
      applications: [],
      settings: {},
    });
    expect(console.error).toHaveBeenCalledWith(
      "Error loading apps config:",
      expect.any(Error),
    );
  });

  it("should return empty config on JSON parse error", () => {
    mockReadFileSync.mockReturnValue("{ invalid json }");

    const result = loadAppsConfig();

    expect(result).toEqual({
      applications: [],
      settings: {},
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("should handle empty applications array", () => {
    const mockConfig = {
      applications: [],
      settings: {},
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    const result = loadAppsConfig();

    expect(result.applications).toEqual([]);
  });

  it("should preserve all application properties", () => {
    const mockConfig = {
      applications: [
        {
          name: "PreCare",
          displayName: "PreCare Application",
          path: "/mnt/apps/patient-portal",
          framework: ".NET Core 8",
          includePatterns: ["**/*.cs"],
          excludePaths: ["bin", "obj", "wwwroot"],
          integrations: ["epic", "financial"],
        },
      ],
      settings: {
        timeout: 30000,
        maxFiles: 1000,
      },
    };

    mockReadFileSync.mockReturnValue(JSON.stringify(mockConfig));

    const result = loadAppsConfig();

    expect(result.applications[0]).toEqual(mockConfig.applications[0]);
    expect(result.settings).toEqual(mockConfig.settings);
  });
});
