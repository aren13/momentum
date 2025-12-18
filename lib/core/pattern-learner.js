/**
 * PatternLearner - Extract and learn patterns from successful executions
 *
 * Analyzes execution results to identify reusable patterns and suggest
 * them for similar future tasks.
 */

import path from 'path';

export class PatternLearner {
  constructor(memoryStore) {
    this.store = memoryStore;

    // Pattern types we can learn
    this.patternTypes = [
      'file-structure',
      'naming-convention',
      'import-pattern',
      'error-resolution',
      'test-pattern',
      'commit-pattern'
    ];
  }

  /**
   * Learn from a successful execution
   * @param {object} execution - Execution result
   */
  async learnFromExecution(execution) {
    if (!execution || !execution.success) {
      return;
    }

    const patterns = await this.extractPatterns(execution);

    for (const { type, pattern } of patterns) {
      await this.store.addPattern(type, pattern);
    }

    return patterns;
  }

  /**
   * Extract patterns from execution result
   * @param {object} execution - Execution result
   * @returns {array} Array of extracted patterns
   */
  async extractPatterns(execution) {
    const patterns = [];

    // Extract file structure patterns
    if (execution.filesCreated && execution.filesCreated.length > 0) {
      patterns.push(...this.extractFileStructurePatterns(execution.filesCreated));
    }

    // Extract naming convention patterns
    if (execution.filesCreated) {
      patterns.push(...this.extractNamingPatterns(execution.filesCreated));
    }

    // Extract import patterns
    if (execution.importsAdded) {
      patterns.push(...this.extractImportPatterns(execution.importsAdded));
    }

    // Extract error resolution patterns
    if (execution.errors && execution.errorResolutions) {
      patterns.push(...this.extractErrorResolutionPatterns(execution.errors, execution.errorResolutions));
    }

    // Extract test patterns
    if (execution.testsCreated) {
      patterns.push(...this.extractTestPatterns(execution.testsCreated));
    }

    // Extract commit patterns
    if (execution.commitMessage) {
      patterns.push(...this.extractCommitPatterns(execution.commitMessage));
    }

    return patterns;
  }

  /**
   * Extract file structure patterns
   * @param {array} files - Array of file paths
   * @returns {array} Extracted patterns
   */
  extractFileStructurePatterns(files) {
    const patterns = [];

    // Find common directory structures
    const directories = files.map(f => path.dirname(f));
    const uniqueDirs = [...new Set(directories)];

    for (const dir of uniqueDirs) {
      patterns.push({
        type: 'file-structure',
        pattern: dir
      });
    }

    // Find file grouping patterns (related files in same directory)
    const groupings = {};
    for (const file of files) {
      const dir = path.dirname(file);
      const ext = path.extname(file);

      if (!groupings[dir]) {
        groupings[dir] = new Set();
      }
      groupings[dir].add(ext);
    }

    for (const [dir, extensions] of Object.entries(groupings)) {
      if (extensions.size > 1) {
        patterns.push({
          type: 'file-structure',
          pattern: `${dir}: ${[...extensions].join(', ')}`
        });
      }
    }

    return patterns;
  }

  /**
   * Extract naming convention patterns
   * @param {array} files - Array of file paths
   * @returns {array} Extracted patterns
   */
  extractNamingPatterns(files) {
    const patterns = [];

    for (const file of files) {
      const basename = path.basename(file, path.extname(file));

      // Detect naming style
      const namingStyle = this.detectNamingStyle(basename);
      patterns.push({
        type: 'naming-convention',
        pattern: `${namingStyle}: ${basename}`
      });

      // Detect common prefixes/suffixes
      const affixes = this.detectAffixes(basename);
      for (const affix of affixes) {
        patterns.push({
          type: 'naming-convention',
          pattern: affix
        });
      }
    }

    return patterns;
  }

  /**
   * Detect naming style (camelCase, kebab-case, etc.)
   * @param {string} name - Name to analyze
   * @returns {string} Naming style
   */
  detectNamingStyle(name) {
    if (/^[a-z]+(-[a-z]+)+$/.test(name)) return 'kebab-case';
    if (/^[a-z]+(_[a-z]+)+$/.test(name)) return 'snake_case';
    if (/^[a-z]+[A-Z]/.test(name)) return 'camelCase';
    if (/^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(name)) return 'PascalCase';
    return 'unknown';
  }

  /**
   * Detect common prefixes and suffixes
   * @param {string} name - Name to analyze
   * @returns {array} Detected affixes
   */
  detectAffixes(name) {
    const affixes = [];

    const commonPrefixes = ['get', 'set', 'create', 'update', 'delete', 'fetch', 'load', 'save', 'handle', 'process'];
    const commonSuffixes = ['Manager', 'Store', 'Runner', 'Handler', 'Service', 'Controller', 'Helper', 'Util'];

    for (const prefix of commonPrefixes) {
      if (name.toLowerCase().startsWith(prefix)) {
        affixes.push(`prefix: ${prefix}`);
      }
    }

    for (const suffix of commonSuffixes) {
      if (name.endsWith(suffix)) {
        affixes.push(`suffix: ${suffix}`);
      }
    }

    return affixes;
  }

  /**
   * Extract import patterns
   * @param {array} imports - Array of import statements
   * @returns {array} Extracted patterns
   */
  extractImportPatterns(imports) {
    const patterns = [];

    for (const importStmt of imports) {
      // Detect default vs named imports
      if (importStmt.includes('import {')) {
        patterns.push({
          type: 'import-pattern',
          pattern: 'named-import'
        });
      } else if (importStmt.includes('import ')) {
        patterns.push({
          type: 'import-pattern',
          pattern: 'default-import'
        });
      }

      // Detect import sources
      if (importStmt.includes('from \'./') || importStmt.includes('from "./')) {
        patterns.push({
          type: 'import-pattern',
          pattern: 'relative-import'
        });
      } else if (importStmt.includes('from \'../') || importStmt.includes('from "../')) {
        patterns.push({
          type: 'import-pattern',
          pattern: 'parent-relative-import'
        });
      } else {
        patterns.push({
          type: 'import-pattern',
          pattern: 'external-import'
        });
      }
    }

    return patterns;
  }

  /**
   * Extract error resolution patterns
   * @param {array} errors - Array of errors
   * @param {array} resolutions - Array of resolutions
   * @returns {array} Extracted patterns
   */
  extractErrorResolutionPatterns(errors, resolutions) {
    const patterns = [];

    for (let i = 0; i < Math.min(errors.length, resolutions.length); i++) {
      const error = errors[i];
      const resolution = resolutions[i];

      patterns.push({
        type: 'error-resolution',
        pattern: `${error} → ${resolution}`
      });
    }

    return patterns;
  }

  /**
   * Extract test patterns
   * @param {array} tests - Array of test files
   * @returns {array} Extracted patterns
   */
  extractTestPatterns(tests) {
    const patterns = [];

    for (const test of tests) {
      // Detect test file naming pattern
      if (test.includes('.test.')) {
        patterns.push({
          type: 'test-pattern',
          pattern: 'test-suffix: .test.js'
        });
      } else if (test.includes('.spec.')) {
        patterns.push({
          type: 'test-pattern',
          pattern: 'test-suffix: .spec.js'
        });
      }

      // Detect test directory structure
      if (test.includes('/tests/') || test.includes('/test/')) {
        patterns.push({
          type: 'test-pattern',
          pattern: 'test-directory: /tests/'
        });
      } else if (test.includes('/__tests__/')) {
        patterns.push({
          type: 'test-pattern',
          pattern: 'test-directory: /__tests__/'
        });
      }
    }

    return patterns;
  }

  /**
   * Extract commit message patterns
   * @param {string} commitMessage - Commit message
   * @returns {array} Extracted patterns
   */
  extractCommitPatterns(commitMessage) {
    const patterns = [];

    // Detect conventional commit format
    const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|perf)(\(.+?\))?:/;
    if (conventionalPattern.test(commitMessage)) {
      const match = commitMessage.match(conventionalPattern);
      patterns.push({
        type: 'commit-pattern',
        pattern: `conventional-commit: ${match[1]}`
      });

      if (match[2]) {
        patterns.push({
          type: 'commit-pattern',
          pattern: `commit-scope: ${match[2]}`
        });
      }
    }

    return patterns;
  }

  /**
   * Get pattern suggestions for current context
   * @param {object} context - Current context
   * @returns {array} Array of pattern suggestions
   */
  async suggestPatterns(context) {
    const relevant = await this.findRelevantPatterns(context);

    return relevant.map(p => ({
      pattern: p.pattern,
      type: p.type,
      confidence: this.calculateConfidence(p, context),
      frequency: p.frequency,
      lastSeen: p.last_seen
    }));
  }

  /**
   * Find patterns relevant to current context
   * @param {object} context - Current context
   * @returns {array} Array of relevant patterns
   */
  async findRelevantPatterns(context) {
    const allPatterns = await this.store.getPatterns(null, 100);

    // Filter by context type if specified
    if (context.type) {
      const typePatterns = allPatterns.filter(p => p.type === context.type);
      if (typePatterns.length > 0) {
        return typePatterns.slice(0, 10);
      }
    }

    // Filter by context keywords
    if (context.keywords) {
      const keywordPatterns = allPatterns.filter(p => {
        return context.keywords.some(keyword =>
          p.pattern.toLowerCase().includes(keyword.toLowerCase())
        );
      });

      if (keywordPatterns.length > 0) {
        return keywordPatterns.slice(0, 10);
      }
    }

    // Filter by file path if specified
    if (context.path) {
      const pathPatterns = allPatterns.filter(p => {
        if (p.type !== 'file-structure') return false;

        const contextDir = path.dirname(context.path);
        return p.pattern.includes(contextDir) || contextDir.includes(p.pattern);
      });

      if (pathPatterns.length > 0) {
        return pathPatterns.slice(0, 10);
      }
    }

    // Return most frequent patterns as fallback
    return allPatterns.slice(0, 10);
  }

  /**
   * Calculate confidence score for pattern suggestion
   * @param {object} pattern - Pattern object
   * @param {object} context - Current context
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(pattern, context) {
    let score = 0;

    // Factor 1: Frequency (0-0.4)
    const maxFrequency = 100; // Assume max frequency of 100
    const frequencyScore = Math.min(pattern.frequency / maxFrequency, 1) * 0.4;
    score += frequencyScore;

    // Factor 2: Recency (0-0.3)
    const lastSeen = new Date(pattern.last_seen);
    const now = new Date();
    const ageInDays = (now - lastSeen) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (ageInDays / 30)) * 0.3; // Decay over 30 days
    score += recencyScore;

    // Factor 3: Context similarity (0-0.3)
    let similarityScore = 0;

    if (context.type && pattern.type === context.type) {
      similarityScore += 0.15;
    }

    if (context.keywords) {
      const matchingKeywords = context.keywords.filter(keyword =>
        pattern.pattern.toLowerCase().includes(keyword.toLowerCase())
      );
      similarityScore += (matchingKeywords.length / context.keywords.length) * 0.15;
    }

    score += similarityScore;

    return Math.min(score, 1);
  }

  /**
   * Get pattern statistics by type
   * @param {string} type - Pattern type
   * @returns {object} Statistics
   */
  async getPatternStats(type) {
    const patterns = await this.store.getPatterns(type);

    return {
      type,
      total: patterns.length,
      mostFrequent: patterns.slice(0, 5),
      avgFrequency: patterns.reduce((sum, p) => sum + p.frequency, 0) / patterns.length || 0
    };
  }
}

export default PatternLearner;
