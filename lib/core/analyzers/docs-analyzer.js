#!/usr/bin/env node

/**
 * DocsAnalyzer - Find documentation gaps
 *
 * Scans for:
 * - Missing JSDoc comments
 * - Undocumented public APIs
 * - README completeness
 * - Missing usage examples
 * - Outdated documentation
 * - Complex code without explanations
 *
 * @module momentum/lib/core/analyzers/docs-analyzer
 */

const fs = require('fs').promises;
const path = require('path');

class DocsAnalyzer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analyze files for documentation gaps
   * @param {string[]} files - Files to analyze
   * @returns {Promise<Object[]>} Documentation findings
   */
  async analyze(files) {
    const findings = [];

    // Check code files for missing JSDoc
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

    // Check for missing README
    const readmeFindings = await this.checkReadme(files);
    findings.push(...readmeFindings);

    // Check package.json completeness
    const packageFindings = await this.checkPackageJson(files);
    findings.push(...packageFindings);

    return findings;
  }

  /**
   * Analyze code file for missing documentation
   * @param {string} filePath - Path to file
   * @param {string} content - File content
   * @returns {Promise<Object[]>} Findings
   */
  async analyzeCodeFile(filePath, content) {
    const findings = [];
    const lines = content.split('\n');

    // Find exported functions/classes without JSDoc
    const exports = this.findExports(content, lines);

    for (const exp of exports) {
      if (!exp.hasDoc) {
        findings.push({
          category: 'docs',
          subcategory: 'Missing JSDoc',
          severity: exp.isPublic ? 'medium' : 'low',
          impact: exp.isPublic ? 'moderate' : 'localized',
          frequency: 'always',
          fixCost: 'low',
          title: `Missing documentation for ${exp.type}: ${exp.name}`,
          description: `${exp.type} '${exp.name}' is exported but lacks JSDoc documentation`,
          recommendation: 'Add JSDoc comment describing purpose, parameters, return value, and usage examples',
          file: filePath,
          line: exp.line,
          snippet: exp.snippet,
          relativeFile: path.relative(this.projectRoot, filePath)
        });
      }
    }

    // Check for complex functions without comments
    const complexFunctions = this.findComplexFunctions(content, lines);
    for (const func of complexFunctions) {
      findings.push({
        category: 'docs',
        subcategory: 'Complex Code',
        severity: 'low',
        impact: 'localized',
        frequency: 'often',
        fixCost: 'low',
        title: `Complex function needs explanation: ${func.name}`,
        description: `Function '${func.name}' has high complexity (${func.complexity}) but lacks explanatory comments`,
        recommendation: 'Add comments explaining the algorithm, edge cases, and why this approach was chosen',
        file: filePath,
        line: func.line,
        relativeFile: path.relative(this.projectRoot, filePath)
      });
    }

    return findings;
  }

  /**
   * Find exported functions and classes
   * @param {string} content - File content
   * @param {string[]} lines - File lines
   * @returns {Object[]} Export info
   */
  findExports(content, lines) {
    const exports = [];

    // Patterns for exports
    const patterns = [
      /^export\s+(async\s+)?function\s+(\w+)/gm,
      /^export\s+class\s+(\w+)/gm,
      /^export\s+const\s+(\w+)\s*=/gm,
      /^module\.exports\s*=\s*(\w+)/gm,
      /^module\.exports\.\w+\s*=\s*(\w+)/gm
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[2] || match[1];
        const lineNum = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNum - 1];

        // Check if there's JSDoc above (within 5 lines)
        let hasDoc = false;
        for (let i = Math.max(0, lineNum - 6); i < lineNum - 1; i++) {
          if (lines[i].includes('/**') || lines[i].includes('* @')) {
            hasDoc = true;
            break;
          }
        }

        const type = match[0].includes('class') ? 'class' :
                     match[0].includes('function') ? 'function' : 'constant';

        exports.push({
          name,
          type,
          line: lineNum,
          hasDoc,
          isPublic: true,
          snippet: line.trim()
        });
      }
    }

    return exports;
  }

  /**
   * Find complex functions that need explanation
   * @param {string} content - File content
   * @param {string[]} lines - File lines
   * @returns {Object[]} Complex functions
   */
  findComplexFunctions(content, lines) {
    const complexFuncs = [];

    // Simple complexity heuristic: count branches and loops
    const funcPattern = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
    let match;

    while ((match = funcPattern.exec(content)) !== null) {
      const name = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Find function body
      let braceCount = 0;
      let funcBody = '';
      let foundStart = false;

      for (let i = match.index; i < content.length; i++) {
        const char = content[i];
        if (char === '{') {
          braceCount++;
          foundStart = true;
        } else if (char === '}') {
          braceCount--;
        }
        funcBody += char;
        if (foundStart && braceCount === 0) break;
      }

      // Calculate complexity
      const ifCount = (funcBody.match(/\bif\s*\(/g) || []).length;
      const forCount = (funcBody.match(/\bfor\s*\(/g) || []).length;
      const whileCount = (funcBody.match(/\bwhile\s*\(/g) || []).length;
      const switchCount = (funcBody.match(/\bswitch\s*\(/g) || []).length;
      const ternaryCount = (funcBody.match(/\?[^:]+:/g) || []).length;

      const complexity = ifCount + forCount + whileCount + switchCount + ternaryCount;

      // Flag if complexity > 10 and no comments nearby
      if (complexity > 10) {
        let hasComments = false;
        for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 5); i++) {
          if (lines[i].includes('//') || lines[i].includes('/*')) {
            hasComments = true;
            break;
          }
        }

        if (!hasComments) {
          complexFuncs.push({
            name,
            line: lineNum,
            complexity
          });
        }
      }
    }

    return complexFuncs;
  }

  /**
   * Check for README and its completeness
   * @param {string[]} files - All files
   * @returns {Promise<Object[]>} README findings
   */
  async checkReadme(files) {
    const findings = [];
    const readme = files.find(f => /readme\.md$/i.test(f));

    if (!readme) {
      findings.push({
        category: 'docs',
        subcategory: 'Missing README',
        severity: 'high',
        impact: 'widespread',
        frequency: 'always',
        fixCost: 'medium',
        title: 'Project is missing README.md',
        description: 'No README.md found in project root. A README is essential for onboarding and documentation',
        recommendation: 'Create README.md with: project description, installation, usage, API docs, examples, and contribution guidelines',
        file: this.projectRoot,
        line: null,
        relativeFile: '.'
      });
    } else {
      // Check README completeness
      try {
        const content = await fs.readFile(readme, 'utf8');
        const sections = {
          installation: /##?\s*install/i,
          usage: /##?\s*usage/i,
          api: /##?\s*api/i,
          examples: /##?\s*example/i,
          contributing: /##?\s*contribut/i
        };

        for (const [section, pattern] of Object.entries(sections)) {
          if (!pattern.test(content)) {
            findings.push({
              category: 'docs',
              subcategory: 'Incomplete README',
              severity: 'low',
              impact: 'moderate',
              frequency: 'always',
              fixCost: 'low',
              title: `README missing ${section} section`,
              description: `README.md should include a ${section} section for better documentation`,
              recommendation: `Add ## ${section.charAt(0).toUpperCase() + section.slice(1)} section to README`,
              file: readme,
              line: null,
              relativeFile: path.relative(this.projectRoot, readme)
            });
          }
        }
      } catch (error) {
        // Skip
      }
    }

    return findings;
  }

  /**
   * Check package.json completeness
   * @param {string[]} files - All files
   * @returns {Promise<Object[]>} Package.json findings
   */
  async checkPackageJson(files) {
    const findings = [];
    const pkgFile = files.find(f => f.endsWith('package.json') && !f.includes('node_modules'));

    if (!pkgFile) return findings;

    try {
      const content = await fs.readFile(pkgFile, 'utf8');
      const pkg = JSON.parse(content);

      // Check for important fields
      const importantFields = [
        { field: 'description', severity: 'medium' },
        { field: 'author', severity: 'low' },
        { field: 'license', severity: 'medium' },
        { field: 'repository', severity: 'low' },
        { field: 'keywords', severity: 'low' }
      ];

      for (const { field, severity } of importantFields) {
        if (!pkg[field]) {
          findings.push({
            category: 'docs',
            subcategory: 'Incomplete Package.json',
            severity,
            impact: 'localized',
            frequency: 'always',
            fixCost: 'low',
            title: `package.json missing '${field}' field`,
            description: `Package metadata should include '${field}' for better discoverability and documentation`,
            recommendation: `Add "${field}" field to package.json`,
            file: pkgFile,
            line: null,
            relativeFile: path.relative(this.projectRoot, pkgFile)
          });
        }
      }
    } catch (error) {
      // Skip invalid package.json
    }

    return findings;
  }
}

module.exports = DocsAnalyzer;
