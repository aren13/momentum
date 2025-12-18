#!/usr/bin/env node

/**
 * PerformanceAnalyzer - Detect performance bottlenecks
 *
 * Scans for:
 * - N+1 query patterns
 * - Memory leaks (event listeners, closures)
 * - Blocking operations in critical paths
 * - Large bundle sizes
 * - Inefficient algorithms (nested loops)
 * - Missing indexes in database queries
 *
 * @module momentum/lib/core/analyzers/performance-analyzer
 */

const fs = require('fs').promises;
const path = require('path');

class PerformanceAnalyzer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;

    // Performance anti-patterns
    this.patterns = {
      nPlusOne: [
        { regex: /\.forEach\([^)]+\.(query|find|findOne)\(/i, severity: 'high' },
        { regex: /\.map\([^)]+\.(query|find|findOne)\(/i, severity: 'high' },
        { regex: /for\s*\([^)]+\)\s*\{[^}]*\.(query|find|findOne)\(/i, severity: 'high' }
      ],
      memoryLeaks: [
        { regex: /addEventListener\([^)]+\)(?!.*removeEventListener)/i, severity: 'medium' },
        { regex: /setInterval\((?!.*clearInterval)/i, severity: 'medium' },
        { regex: /setTimeout\([^,]+,\s*\d{4,}\)/i, severity: 'low' } // Long timeouts
      ],
      blockingOps: [
        { regex: /fs\.readFileSync\(/i, severity: 'high' },
        { regex: /fs\.writeFileSync\(/i, severity: 'high' },
        { regex: /execSync\(/i, severity: 'medium' },
        { regex: /JSON\.parse\([^)]{100,}\)/i, severity: 'medium' } // Large JSON parse
      ],
      inefficientLoops: [
        { regex: /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)\s*\{[^}]*for\s*\(/i, severity: 'high' }, // Triple nested
        { regex: /\.forEach\([^)]+\.forEach\([^)]+\.forEach\(/i, severity: 'high' },
        { regex: /while\s*\(true\)(?!.*break)/i, severity: 'critical' } // Infinite loop without break
      ],
      inefficientDataStructures: [
        { regex: /\.push\([^)]+\).*\.indexOf\(/i, severity: 'medium' }, // Array when Set is better
        { regex: /\.concat\([^)]+\)/i, severity: 'low' } // Potentially inefficient array concatenation
      ],
      missingOptimizations: [
        { regex: /React\.createElement\(.*map\(/i, severity: 'medium' }, // Missing key prop likely
        { regex: /useEffect\(\(\)\s*=>\s*\{(?!.*\[)/i, severity: 'low' } // useEffect without dependencies
      ]
    };
  }

  /**
   * Analyze files for performance issues
   * @param {string[]} files - Files to analyze
   * @returns {Promise<Object[]>} Performance findings
   */
  async analyze(files) {
    const findings = [];

    // Filter to code files
    const codeFiles = files.filter(f => /\.(js|jsx|ts|tsx)$/.test(f));

    for (const file of codeFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const fileFindings = await this.analyzeFile(file, content);
        findings.push(...fileFindings);
      } catch (error) {
        // Skip unreadable files
      }
    }

    // Check for large files
    const sizeFindings = await this.checkFileSizes(codeFiles);
    findings.push(...sizeFindings);

    return findings;
  }

  /**
   * Analyze a single file
   * @param {string} filePath - Path to file
   * @param {string} content - File content
   * @returns {Promise<Object[]>} Findings
   */
  async analyzeFile(filePath, content) {
    const findings = [];
    const lines = content.split('\n');

    // Check each pattern category
    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        // For multi-line patterns, check entire content
        if (category === 'inefficientLoops' && pattern.regex.source.includes('for.*for.*for')) {
          const match = pattern.regex.exec(content);
          if (match) {
            findings.push({
              category: 'performance',
              subcategory: this.formatCategory(category),
              severity: pattern.severity,
              impact: this.getImpact(pattern.severity),
              frequency: 'often',
              fixCost: 'medium',
              title: this.getTitle(category),
              description: this.getDescription(category, match[0].substring(0, 50)),
              recommendation: this.getRecommendation(category),
              file: filePath,
              line: null,
              relativeFile: path.relative(this.projectRoot, filePath)
            });
          }
          continue;
        }

        // Line-by-line check
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = pattern.regex.exec(line);

          if (match) {
            findings.push({
              category: 'performance',
              subcategory: this.formatCategory(category),
              severity: pattern.severity,
              impact: this.getImpact(pattern.severity),
              frequency: 'often',
              fixCost: this.getFixCost(category),
              title: this.getTitle(category),
              description: this.getDescription(category, match[0]),
              recommendation: this.getRecommendation(category),
              file: filePath,
              line: i + 1,
              snippet: line.trim(),
              relativeFile: path.relative(this.projectRoot, filePath)
            });
          }
        }
      }
    }

    return findings;
  }

  /**
   * Check for large files that could impact performance
   * @param {string[]} files - Files to check
   * @returns {Promise<Object[]>} Size findings
   */
  async checkFileSizes(files) {
    const findings = [];

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        const sizeKB = stats.size / 1024;

        // Flag files over 500KB
        if (sizeKB > 500) {
          findings.push({
            category: 'performance',
            subcategory: 'Large File',
            severity: sizeKB > 1000 ? 'high' : 'medium',
            impact: 'moderate',
            frequency: 'always',
            fixCost: 'medium',
            title: 'Large file detected',
            description: `File is ${Math.round(sizeKB)}KB, which may impact bundle size and load time`,
            recommendation: 'Consider code splitting, lazy loading, or refactoring into smaller modules',
            file,
            line: null,
            relativeFile: path.relative(this.projectRoot, file)
          });
        }
      } catch (error) {
        // Skip
      }
    }

    return findings;
  }

  /**
   * Format category name
   * @param {string} category - Category key
   * @returns {string} Formatted name
   */
  formatCategory(category) {
    const names = {
      nPlusOne: 'N+1 Query Problem',
      memoryLeaks: 'Memory Leak Risk',
      blockingOps: 'Blocking Operation',
      inefficientLoops: 'Inefficient Loop',
      inefficientDataStructures: 'Inefficient Data Structure',
      missingOptimizations: 'Missing Optimization'
    };
    return names[category] || category;
  }

  /**
   * Get impact level from severity
   * @param {string} severity - Severity level
   * @returns {string} Impact level
   */
  getImpact(severity) {
    const map = {
      critical: 'widespread',
      high: 'moderate',
      medium: 'localized',
      low: 'localized'
    };
    return map[severity] || 'localized';
  }

  /**
   * Get fix cost
   * @param {string} category - Category
   * @returns {string} Fix cost
   */
  getFixCost(category) {
    const costs = {
      nPlusOne: 'high',
      memoryLeaks: 'low',
      blockingOps: 'medium',
      inefficientLoops: 'medium',
      inefficientDataStructures: 'medium',
      missingOptimizations: 'low'
    };
    return costs[category] || 'medium';
  }

  /**
   * Get title for finding
   * @param {string} category - Category
   * @returns {string} Title
   */
  getTitle(category) {
    const titles = {
      nPlusOne: 'Potential N+1 query detected',
      memoryLeaks: 'Potential memory leak',
      blockingOps: 'Blocking synchronous operation',
      inefficientLoops: 'Inefficient nested loops',
      inefficientDataStructures: 'Inefficient data structure usage',
      missingOptimizations: 'Missing optimization opportunity'
    };
    return titles[category] || 'Performance issue detected';
  }

  /**
   * Get description for finding
   * @param {string} category - Category
   * @param {string} match - Matched text
   * @returns {string} Description
   */
  getDescription(category, match) {
    const descriptions = {
      nPlusOne: 'Loop contains database query, which can cause N+1 query problem and severely impact performance',
      memoryLeaks: 'Event listener or timer without cleanup can cause memory leaks over time',
      blockingOps: 'Synchronous file operation blocks event loop and degrades performance',
      inefficientLoops: 'Deeply nested loops can have exponential time complexity',
      inefficientDataStructures: 'Data structure choice may not be optimal for the operation being performed',
      missingOptimizations: 'Code could benefit from optimization techniques'
    };
    return descriptions[category] || 'Performance issue detected';
  }

  /**
   * Get recommendation for fixing
   * @param {string} category - Category
   * @returns {string} Recommendation
   */
  getRecommendation(category) {
    const recommendations = {
      nPlusOne: 'Use batch queries, eager loading, or DataLoader pattern to fetch all needed data upfront',
      memoryLeaks: 'Add cleanup: removeEventListener, clearInterval, or cleanup function in useEffect',
      blockingOps: 'Replace with async version: fs.readFile, fs.writeFile, or use worker threads for CPU-intensive work',
      inefficientLoops: 'Optimize algorithm: consider HashMaps, Set lookups, or reduce nesting depth',
      inefficientDataStructures: 'Use Set for membership tests, Map for key-value pairs, or consider data structure that matches access pattern',
      missingOptimizations: 'Add React.memo, useMemo, useCallback, or list keys as appropriate'
    };
    return recommendations[category] || 'Review and optimize performance';
  }
}

module.exports = PerformanceAnalyzer;
