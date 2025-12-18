#!/usr/bin/env node

/**
 * DebtAnalyzer - Track technical debt
 *
 * Scans for:
 * - Code smells (long methods, god objects)
 * - Cyclomatic complexity
 * - Duplicate code
 * - TODO/FIXME comments
 * - Dead code
 * - Outdated dependencies
 *
 * @module momentum/lib/core/analyzers/debt-analyzer
 */

const fs = require('fs').promises;
const path = require('path');

class DebtAnalyzer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze files for technical debt
   * @param {string[]} files - Files to analyze
   * @returns {Promise<Object[]>} Debt findings
   */
  async analyze(files) {
    const findings = [];

    // Check code files
    const codeFiles = files.filter(f => /\.(js|jsx|ts|tsx)$/.test(f));
    for (const file of codeFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const codeFindings = await this.analyzeCodeFile(file, content);
        findings.push(...codeFindings);
      } catch (error) {
        // Skip unreadable files
      }
    }

    // Check for outdated dependencies
    const depFindings = await this.checkDependencies(files);
    findings.push(...depFindings);

    return findings;
  }

  /**
   * Analyze code file for technical debt
   * @param {string} filePath - Path to file
   * @param {string} content - File content
   * @returns {Promise<Object[]>} Findings
   */
  async analyzeCodeFile(filePath, content) {
    const findings = [];
    const lines = content.split('\n');

    // Find TODO/FIXME comments
    const todoFindings = this.findTodos(lines, filePath);
    findings.push(...todoFindings);

    // Find long functions (code smell)
    const longFuncs = this.findLongFunctions(content, lines, filePath);
    findings.push(...longFuncs);

    // Find duplicate code patterns
    const duplicates = this.findDuplicates(lines, filePath);
    findings.push(...duplicates);

    // Find god objects (large classes)
    const godObjects = this.findGodObjects(content, lines, filePath);
    findings.push(...godObjects);

    // Find dead code
    const deadCode = this.findDeadCode(content, lines, filePath);
    findings.push(...deadCode);

    // Find magic numbers
    const magicNumbers = this.findMagicNumbers(lines, filePath);
    findings.push(...magicNumbers);

    return findings;
  }

  /**
   * Find TODO/FIXME comments
   * @param {string[]} lines - File lines
   * @param {string} filePath - File path
   * @returns {Object[]} Findings
   */
  findTodos(lines, filePath) {
    const findings = [];
    const todoPattern = /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)(\([^)]+\))?:?\s*(.+)/i;

    for (let i = 0; i < lines.length; i++) {
      const match = todoPattern.exec(lines[i]);
      if (match) {
        const type = match[1].toUpperCase();
        const severity = type === 'BUG' || type === 'FIXME' ? 'medium' : 'low';

        findings.push({
          category: 'debt',
          subcategory: 'TODO Comment',
          severity,
          impact: 'localized',
          frequency: 'always',
          fixCost: 'medium',
          title: `${type} comment requires attention`,
          description: `${type} comment found: "${match[3].trim()}"`,
          recommendation: `Address ${type} item or create a tracked issue if work is deferred`,
          file: filePath,
          line: i + 1,
          snippet: lines[i].trim(),
          relativeFile: path.relative(this.projectRoot, filePath)
        });
      }
    }

    return findings;
  }

  /**
   * Find long functions (code smell)
   * @param {string} content - File content
   * @param {string[]} lines - File lines
   * @param {string} filePath - File path
   * @returns {Object[]} Findings
   */
  findLongFunctions(content, lines, filePath) {
    const findings = [];
    const funcPattern = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\{/g;
    let match;

    while ((match = funcPattern.exec(content)) !== null) {
      const name = match[1] || match[2];
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Find function body length
      let braceCount = 0;
      let funcLines = 0;
      let foundStart = false;

      for (let i = match.index; i < content.length; i++) {
        if (content[i] === '\n') funcLines++;
        if (content[i] === '{') {
          braceCount++;
          foundStart = true;
        } else if (content[i] === '}') {
          braceCount--;
        }
        if (foundStart && braceCount === 0) break;
      }

      // Flag functions over 50 lines
      if (funcLines > 50) {
        findings.push({
          category: 'debt',
          subcategory: 'Long Function',
          severity: funcLines > 100 ? 'medium' : 'low',
          impact: 'localized',
          frequency: 'always',
          fixCost: 'high',
          title: `Function '${name}' is too long (${funcLines} lines)`,
          description: `Long functions are harder to understand, test, and maintain. This function has ${funcLines} lines.`,
          recommendation: 'Refactor into smaller, focused functions with single responsibilities',
          file: filePath,
          line: lineNum,
          relativeFile: path.relative(this.projectRoot, filePath)
        });
      }
    }

    return findings;
  }

  /**
   * Find duplicate code patterns
   * @param {string[]} lines - File lines
   * @param {string} filePath - File path
   * @returns {Object[]} Findings
   */
  findDuplicates(lines, filePath) {
    const findings = [];
    const blockSize = 5; // Look for 5+ identical lines
    const blocks = new Map();

    // Find repeated blocks
    for (let i = 0; i < lines.length - blockSize; i++) {
      const block = lines.slice(i, i + blockSize)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('//'))
        .join('\n');

      if (block.length < 50) continue; // Skip very small blocks

      if (blocks.has(block)) {
        blocks.get(block).push(i);
      } else {
        blocks.set(block, [i]);
      }
    }

    // Report duplicates
    for (const [block, occurrences] of blocks.entries()) {
      if (occurrences.length > 1) {
        findings.push({
          category: 'debt',
          subcategory: 'Duplicate Code',
          severity: 'medium',
          impact: 'moderate',
          frequency: 'often',
          fixCost: 'medium',
          title: `Duplicate code block found (${occurrences.length} times)`,
          description: `Code block repeated ${occurrences.length} times at lines: ${occurrences.join(', ')}`,
          recommendation: 'Extract duplicate code into a reusable function',
          file: filePath,
          line: occurrences[0] + 1,
          relativeFile: path.relative(this.projectRoot, filePath)
        });
        break; // Only report first duplicate per file
      }
    }

    return findings;
  }

  /**
   * Find god objects (large classes)
   * @param {string} content - File content
   * @param {string[]} lines - File lines
   * @param {string} filePath - File path
   * @returns {Object[]} Findings
   */
  findGodObjects(content, lines, filePath) {
    const findings = [];
    const classPattern = /class\s+(\w+)/g;
    let match;

    while ((match = classPattern.exec(content)) !== null) {
      const name = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Find class body
      let braceCount = 0;
      let classLines = 0;
      let methodCount = 0;
      let foundStart = false;

      for (let i = match.index; i < content.length; i++) {
        const char = content[i];
        if (char === '\n') classLines++;
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
        }

        // Count methods
        if (foundStart && /\s(\w+)\s*\([^)]*\)\s*\{/.test(content.substring(i, i + 50))) {
          methodCount++;
        }

        if (foundStart && braceCount === 0) break;
      }

      // Flag large classes
      if (classLines > 200 || methodCount > 15) {
        findings.push({
          category: 'debt',
          subcategory: 'God Object',
          severity: 'medium',
          impact: 'moderate',
          frequency: 'always',
          fixCost: 'high',
          title: `Class '${name}' is too large`,
          description: `Large class with ${classLines} lines and ~${methodCount} methods. Likely has too many responsibilities.`,
          recommendation: 'Split into smaller, focused classes following Single Responsibility Principle',
          file: filePath,
          line: lineNum,
          relativeFile: path.relative(this.projectRoot, filePath)
        });
      }
    }

    return findings;
  }

  /**
   * Find potentially dead code
   * @param {string} content - File content
   * @param {string[]} lines - File lines
   * @param {string} filePath - File path
   * @returns {Object[]} Findings
   */
  findDeadCode(content, lines, filePath) {
    const findings = [];

    // Find unreachable code after return/throw
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if ((line.startsWith('return ') || line === 'return;' || line.startsWith('throw ')) &&
          !line.includes('//')) {
        // Check next non-empty line
        for (let j = i + 1; j < lines.length && j < i + 5; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && nextLine !== '}' && !nextLine.startsWith('//')) {
            findings.push({
              category: 'debt',
              subcategory: 'Dead Code',
              severity: 'low',
              impact: 'localized',
              frequency: 'always',
              fixCost: 'low',
              title: 'Unreachable code detected',
              description: `Code after ${line.split(' ')[0]} statement is unreachable`,
              recommendation: 'Remove unreachable code or restructure logic',
              file: filePath,
              line: j + 1,
              snippet: nextLine,
              relativeFile: path.relative(this.projectRoot, filePath)
            });
            break;
          }
        }
      }
    }

    // Find commented-out code (more than 5 consecutive lines)
    let commentedLines = 0;
    let commentStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') && /[a-z]+\s*[=({]/.test(line)) {
        if (commentStart === -1) commentStart = i;
        commentedLines++;
      } else {
        if (commentedLines > 5) {
          findings.push({
            category: 'debt',
            subcategory: 'Commented Code',
            severity: 'low',
            impact: 'localized',
            frequency: 'always',
            fixCost: 'low',
            title: 'Large block of commented-out code',
            description: `${commentedLines} lines of commented code found (lines ${commentStart + 1}-${i})`,
            recommendation: 'Remove commented code. Use version control to preserve history.',
            file: filePath,
            line: commentStart + 1,
            relativeFile: path.relative(this.projectRoot, filePath)
          });
        }
        commentedLines = 0;
        commentStart = -1;
      }
    }

    return findings;
  }

  /**
   * Find magic numbers
   * @param {string[]} lines - File lines
   * @param {string} filePath - File path
   * @returns {Object[]} Findings
   */
  findMagicNumbers(lines, filePath) {
    const findings = [];
    const magicNumberPattern = /\b(\d{3,})\b(?!.*\/\/.*\1)/; // Numbers 100+ without explanatory comment

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = magicNumberPattern.exec(line);

      if (match && !line.includes('const') && !line.includes('=')) {
        const number = match[1];
        // Skip common values like 1000 (ms), 404 (HTTP), etc.
        if (number === '1000' || number === '404' || number === '200') continue;

        findings.push({
          category: 'debt',
          subcategory: 'Magic Number',
          severity: 'low',
          impact: 'localized',
          frequency: 'often',
          fixCost: 'low',
          title: 'Magic number should be a named constant',
          description: `Numeric literal ${number} lacks context. Magic numbers reduce code readability.`,
          recommendation: `Extract to named constant: const MEANINGFUL_NAME = ${number}`,
          file: filePath,
          line: i + 1,
          snippet: line.trim(),
          relativeFile: path.relative(this.projectRoot, filePath)
        });
      }
    }

    return findings;
  }

  /**
   * Check for outdated dependencies
   * @param {string[]} files - All files
   * @returns {Promise<Object[]>} Dependency findings
   */
  async checkDependencies(files) {
    const findings = [];
    const packageJsons = files.filter(f => f.endsWith('package.json'));

    for (const pkgFile of packageJsons) {
      try {
        const content = await fs.readFile(pkgFile, 'utf8');
        const pkg = JSON.parse(content);

        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies
        };

        // Check for version wildcards (poor practice)
        for (const [depName, version] of Object.entries(allDeps || {})) {
          if (version === '*' || version === 'latest') {
            findings.push({
              category: 'debt',
              subcategory: 'Dependency Management',
              severity: 'medium',
              impact: 'moderate',
              frequency: 'always',
              fixCost: 'low',
              title: `Unpinned dependency: ${depName}`,
              description: `Dependency '${depName}' uses wildcard version '${version}', which can cause unpredictable builds`,
              recommendation: 'Pin to specific version or use caret/tilde ranges',
              file: pkgFile,
              line: null,
              relativeFile: path.relative(this.projectRoot, pkgFile)
            });
          }
        }

        // Check for missing lockfile
        const dirName = path.dirname(pkgFile);
        const hasLockfile = files.some(f =>
          f.startsWith(dirName) &&
          (f.endsWith('package-lock.json') || f.endsWith('yarn.lock') || f.endsWith('pnpm-lock.yaml'))
        );

        if (!hasLockfile && Object.keys(allDeps || {}).length > 0) {
          findings.push({
            category: 'debt',
            subcategory: 'Missing Lockfile',
            severity: 'high',
            impact: 'widespread',
            frequency: 'always',
            fixCost: 'low',
            title: 'Missing dependency lockfile',
            description: 'No package-lock.json, yarn.lock, or pnpm-lock.yaml found. This can cause inconsistent builds.',
            recommendation: 'Run npm install, yarn install, or pnpm install to generate lockfile and commit it',
            file: pkgFile,
            line: null,
            relativeFile: path.relative(this.projectRoot, pkgFile)
          });
        }
      } catch (error) {
        // Skip invalid package.json
      }
    }

    return findings;
  }
}

module.exports = DebtAnalyzer;
