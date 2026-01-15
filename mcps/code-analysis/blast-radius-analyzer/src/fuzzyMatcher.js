/**
 * Fuzzy File Matcher
 * Finds similar files when exact paths don't match
 */

import { glob } from "glob";
import path from "path";

export class FuzzyMatcher {
  constructor() {
    this.fileCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minute cache
  }

  /**
   * Find a file using fuzzy matching strategies
   */
  async findSimilarFile(app, searchPath) {
    // Get available files for the app
    const availableFiles = await this.getAvailableFiles(app);

    // Strategy 1: Exact match
    if (availableFiles.includes(searchPath)) {
      return { path: searchPath, exists: true, matchType: "exact" };
    }

    // Strategy 2: Case-insensitive match
    const ciMatch = availableFiles.find(
      (f) => f.toLowerCase() === searchPath.toLowerCase(),
    );
    if (ciMatch) {
      return {
        path: ciMatch,
        exists: true,
        matchType: "case-insensitive",
        fuzzyMatch: true,
      };
    }

    // Strategy 3: Filename-only match (ignoring directory)
    const filename = path.basename(searchPath);
    const filenameMatches = availableFiles.filter(
      (f) => path.basename(f) === filename,
    );
    if (filenameMatches.length === 1) {
      return {
        path: filenameMatches[0],
        exists: true,
        matchType: "filename-only",
        fuzzyMatch: true,
        originalPath: searchPath,
      };
    }

    // Strategy 4: Filename case-insensitive match
    const filenameCiMatches = availableFiles.filter(
      (f) => path.basename(f).toLowerCase() === filename.toLowerCase(),
    );
    if (filenameCiMatches.length === 1) {
      return {
        path: filenameCiMatches[0],
        exists: true,
        matchType: "filename-case-insensitive",
        fuzzyMatch: true,
        originalPath: searchPath,
      };
    }

    // Strategy 5: Partial path match (last N segments)
    const pathSegments = searchPath.split(/[/\\]/).filter(Boolean);
    for (let i = 2; i <= Math.min(pathSegments.length, 4); i++) {
      const partialPath = pathSegments.slice(-i).join("/");
      const partialMatches = availableFiles.filter(
        (f) =>
          f.endsWith(partialPath) ||
          f.toLowerCase().endsWith(partialPath.toLowerCase()),
      );
      if (partialMatches.length === 1) {
        return {
          path: partialMatches[0],
          exists: true,
          matchType: "partial-path",
          fuzzyMatch: true,
          originalPath: searchPath,
        };
      }
    }

    // Strategy 6: Levenshtein distance for typos
    const closeMatches = this.findByLevenshtein(searchPath, availableFiles, 5);
    if (closeMatches.length > 0) {
      return {
        path: closeMatches[0].path,
        exists: true,
        matchType: "levenshtein",
        fuzzyMatch: true,
        distance: closeMatches[0].distance,
        originalPath: searchPath,
      };
    }

    // No match found
    return {
      path: searchPath,
      exists: false,
      matchType: "not-found",
      suggestions: this.getSuggestions(searchPath, availableFiles),
    };
  }

  /**
   * Get available files for an app (with caching)
   */
  async getAvailableFiles(app) {
    const cacheKey = `files-${app}`;
    const cached = this.fileCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.files;
    }

    // In a real implementation, this would fetch from the code-analyzer MCP
    // or scan the actual codebase. For now, return a mock set.
    const files = await this.scanAppFiles(app);

    this.fileCache.set(cacheKey, {
      files,
      timestamp: Date.now(),
    });

    return files;
  }

  /**
   * Scan app files (mock implementation)
   */
  async scanAppFiles(app) {
    // This would integrate with the code-analyzer MCP in production
    // For now, return common .NET file patterns
    try {
      // Try to glob for actual files if a source path exists
      const patterns = [
        "**/src/**/*.cs",
        "**/Controllers/**/*.cs",
        "**/Services/**/*.cs",
        "**/Models/**/*.cs",
        "**/Tests/**/*.cs",
      ];

      let files = [];
      for (const pattern of patterns) {
        try {
          const matches = await glob(pattern, {
            ignore: "**/node_modules/**",
            nodir: true,
          });
          files = files.concat(matches);
        } catch (e) {
          // Pattern didn't match, continue
        }
      }

      return [...new Set(files)];
    } catch (error) {
      console.log(
        "[FuzzyMatcher] File scan failed, using empty list:",
        error.message,
      );
      return [];
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Find files by Levenshtein distance
   */
  findByLevenshtein(searchPath, availableFiles, maxDistance) {
    const filename = path.basename(searchPath);
    const matches = [];

    for (const file of availableFiles) {
      const fileBasename = path.basename(file);
      const distance = this.levenshteinDistance(
        filename.toLowerCase(),
        fileBasename.toLowerCase(),
      );

      if (distance <= maxDistance) {
        matches.push({ path: file, distance });
      }
    }

    return matches.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get suggestions for unmatched file
   */
  getSuggestions(searchPath, availableFiles) {
    const filename = path.basename(searchPath);
    const suggestions = [];

    // Find files with similar names
    for (const file of availableFiles) {
      const fileBasename = path.basename(file);
      if (
        fileBasename.includes(filename.slice(0, 4)) ||
        filename.includes(fileBasename.slice(0, 4))
      ) {
        suggestions.push(file);
      }
    }

    return suggestions.slice(0, 5);
  }
}
