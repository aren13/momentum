#!/usr/bin/env node

/**
 * SecurityAnalyzer - Detect security vulnerabilities in codebase
 *
 * Scans for:
 * - Hardcoded secrets/credentials
 * - SQL injection risks
 * - XSS vulnerabilities
 * - Insecure dependencies
 * - Unsafe eval/exec usage
 * - Exposed API keys
 *
 * @module momentum/lib/core/analyzers/security-analyzer
 */

const fs = require('fs').promises;
const path = require('path');

class SecurityAnalyzer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;

    // Security patterns to detect
    this.patterns = {
      hardcodedSecrets: [
        { regex: /(password|passwd|pwd)\s*=\s*['"][^'"]+['"]/i, severity: 'critical' },
        { regex: /(api[_-]?key|apikey)\s*=\s*['"][^'"]+['"]/i, severity: 'critical' },
        { regex: /(secret|token)\s*=\s*['"][^'"]+['"]/i, severity: 'critical' },
        { regex: /-----BEGIN (RSA |DSA )?PRIVATE KEY-----/, severity: 'critical' }
      ],
      sqlInjection: [
        { regex: /query\([^)]*\+[^)]*\)/i, severity: 'high' },
        { regex: /execute\([^)]*\+[^)]*\)/i, severity: 'high' },
        { regex: /sql\s*=\s*['"][^'"]*\$\{[^}]+\}/i, severity: 'high' }
      ],
      xss: [
        { regex: /innerHTML\s*=\s*[^;]+(?!\.sanitize|\.escape)/i, severity: 'high' },
        { regex: /dangerouslySetInnerHTML/i, severity: 'medium' },
        { regex: /document\.write\(/i, severity: 'medium' }
      ],
      unsafeEval: [
        { regex: /\beval\(/i, severity: 'high' },
        { regex: /new Function\(/i, severity: 'medium' },
        { regex: /setTimeout\(['"]/i, severity: 'medium' },
        { regex: /setInterval\(['"]/i, severity: 'medium' }
      ],
      insecureRandom: [
        { regex: /Math\.random\(\)(?!.*\/\/ OK:)/i, severity: 'medium' }
      ],
      pathTraversal: [
        { regex: /\.\.\/|\.\.\\/, severity: 'medium' }
      ]
    };
  }

  /**
   * Analyze files for security vulnerabilities
   * @param {string[]} files - Files to analyze
   * @returns {Promise<Object[]>} Security findings
   */
  async analyze(files) {
    const findings = [];

    // Filter to relevant files (code files)
    const codeFiles = files.filter(f =>
      /\.(js|jsx|ts|tsx)$/.test(f) && !f.includes('test') && !f.includes('spec')
    );

    for (const file of codeFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const fileFindings = await this.analyzeFile(file, content);
        findings.push(...fileFindings);
      } catch (error) {
        // Skip unreadable files
      }
    }

    // Also check package.json for insecure dependencies
    const packageFindings = await this.checkDependencies(files);
    findings.push(...packageFindings);

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
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const match = pattern.regex.exec(line);

          if (match) {
            findings.push({
              category: 'security',
              subcategory: this.formatCategory(category),
              severity: pattern.severity,
              impact: this.getImpact(pattern.severity),
              frequency: 'often',
              fixCost: 'low',
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
   * Check package.json for insecure dependencies
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

        // Check for known vulnerable packages (simplified check)
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies
        };

        // Known vulnerable patterns (this is a simplified example)
        const vulnerablePatterns = [
          { name: 'request', reason: 'Deprecated and unmaintained' },
          { name: 'node-uuid', reason: 'Deprecated, use uuid instead' }
        ];

        for (const [depName, version] of Object.entries(allDeps || {})) {
          const vulnerable = vulnerablePatterns.find(p => depName === p.name);
          if (vulnerable) {
            findings.push({
              category: 'security',
              subcategory: 'Vulnerable Dependencies',
              severity: 'medium',
              impact: 'moderate',
              frequency: 'often',
              fixCost: 'low',
              title: `Vulnerable dependency: ${depName}`,
              description: `Package '${depName}' is known to be vulnerable or deprecated: ${vulnerable.reason}`,
              recommendation: 'Update to a secure alternative or latest version',
              file: pkgFile,
              line: null,
              relativeFile: path.relative(this.projectRoot, pkgFile)
            });
          }
        }
      } catch (error) {
        // Skip invalid package.json
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
      hardcodedSecrets: 'Hardcoded Secrets',
      sqlInjection: 'SQL Injection Risk',
      xss: 'XSS Vulnerability',
      unsafeEval: 'Unsafe Code Execution',
      insecureRandom: 'Insecure Random',
      pathTraversal: 'Path Traversal'
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
   * Get title for finding
   * @param {string} category - Category
   * @returns {string} Title
   */
  getTitle(category) {
    const titles = {
      hardcodedSecrets: 'Hardcoded secret detected',
      sqlInjection: 'Potential SQL injection vulnerability',
      xss: 'Potential XSS vulnerability',
      unsafeEval: 'Unsafe code execution detected',
      insecureRandom: 'Insecure random number generation',
      pathTraversal: 'Potential path traversal vulnerability'
    };
    return titles[category] || 'Security issue detected';
  }

  /**
   * Get description for finding
   * @param {string} category - Category
   * @param {string} match - Matched text
   * @returns {string} Description
   */
  getDescription(category, match) {
    const descriptions = {
      hardcodedSecrets: `Hardcoded credential detected: "${match}". Secrets should never be committed to source code.`,
      sqlInjection: `SQL query uses string concatenation, which is vulnerable to SQL injection attacks.`,
      xss: `Direct HTML manipulation detected, which could allow XSS attacks if user input is involved.`,
      unsafeEval: `Use of eval() or similar dynamic code execution is dangerous and should be avoided.`,
      insecureRandom: `Math.random() is not cryptographically secure. Use crypto.randomBytes() for security-sensitive operations.`,
      pathTraversal: `Path contains traversal sequences (..) which could allow unauthorized file access.`
    };
    return descriptions[category] || 'Security vulnerability detected';
  }

  /**
   * Get recommendation for fixing
   * @param {string} category - Category
   * @returns {string} Recommendation
   */
  getRecommendation(category) {
    const recommendations = {
      hardcodedSecrets: 'Move secrets to environment variables or a secure vault (e.g., AWS Secrets Manager, .env files with .gitignore)',
      sqlInjection: 'Use parameterized queries or an ORM to prevent SQL injection',
      xss: 'Sanitize user input and use safe APIs like textContent instead of innerHTML',
      unsafeEval: 'Avoid eval() entirely. Use JSON.parse() for data or refactor to eliminate dynamic code execution',
      insecureRandom: 'Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive random numbers',
      pathTraversal: 'Validate and sanitize file paths. Use path.resolve() and check that result is within allowed directory'
    };
    return recommendations[category] || 'Review and fix security issue';
  }
}

module.exports = SecurityAnalyzer;
