#!/usr/bin/env node

/**
 * IdeationEngine - AI-powered project analysis and improvement suggestions
 *
 * Orchestrates codebase analysis across multiple dimensions:
 * - Security vulnerabilities
 * - Performance bottlenecks
 * - Documentation gaps
 * - Technical debt
 *
 * @module momentum/lib/core/ideation-engine
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const SecurityAnalyzer = require('./analyzers/security-analyzer');
const PerformanceAnalyzer = require('./analyzers/performance-analyzer');
const DocsAnalyzer = require('./analyzers/docs-analyzer');
const DebtAnalyzer = require('./analyzers/debt-analyzer');
const InsightsReporter = require('./insights-reporter');

class IdeationEngine {
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.options = {
      focus: options.focus || null, // null = all, or 'security', 'performance', 'docs', 'debt'
      maxFiles: options.maxFiles || 1000,
      ignorePatterns: options.ignorePatterns || [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.worktrees/**',
        '**/.next/**',
        '**/vendor/**'
      ],
      ...options
    };

    this.findings = {
      security: [],
      performance: [],
      docs: [],
      debt: []
    };

    // Initialize analyzers
    this.analyzers = {
      security: new SecurityAnalyzer(this.projectRoot),
      performance: new PerformanceAnalyzer(this.projectRoot),
      docs: new DocsAnalyzer(this.projectRoot),
      debt: new DebtAnalyzer(this.projectRoot)
    };
  }

  /**
   * Analyze entire codebase
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeCodebase() {
    console.log(`\n🔍 Analyzing codebase at: ${this.projectRoot}\n`);

    // Discover files
    const files = await this.discoverFiles();
    console.log(`📂 Found ${files.length} files to analyze\n`);

    // Run focused or full analysis
    const focus = this.options.focus;

    if (!focus || focus === 'security') {
      await this.findVulnerabilities(files);
    }

    if (!focus || focus === 'performance') {
      await this.findPerformanceIssues(files);
    }

    if (!focus || focus === 'docs') {
      await this.findDocGaps(files);
    }

    if (!focus || focus === 'debt') {
      await this.trackTechDebt(files);
    }

    // Generate suggestions
    const suggestions = await this.generateSuggestions();

    return {
      files: files.length,
      findings: this.findings,
      suggestions
    };
  }

  /**
   * Discover files to analyze
   * @returns {Promise<string[]>} File paths
   */
  async discoverFiles() {
    const patterns = [
      '**/*.js',
      '**/*.jsx',
      '**/*.ts',
      '**/*.tsx',
      '**/*.json',
      '**/*.md',
      '**/package.json',
      '**/README.md'
    ];

    const files = await glob(patterns, {
      cwd: this.projectRoot,
      ignore: this.options.ignorePatterns,
      absolute: true,
      nodir: true
    });

    return files.slice(0, this.options.maxFiles);
  }

  /**
   * Find security vulnerabilities
   * @param {string[]} files - Files to analyze
   * @returns {Promise<void>}
   */
  async findVulnerabilities(files = null) {
    console.log('🔒 Analyzing security...');

    if (!files) {
      files = await this.discoverFiles();
    }

    const securityFindings = await this.analyzers.security.analyze(files);
    this.findings.security = securityFindings;

    console.log(`   Found ${securityFindings.length} security issues`);
  }

  /**
   * Find performance bottlenecks
   * @param {string[]} files - Files to analyze
   * @returns {Promise<void>}
   */
  async findPerformanceIssues(files = null) {
    console.log('⚡ Analyzing performance...');

    if (!files) {
      files = await this.discoverFiles();
    }

    const perfFindings = await this.analyzers.performance.analyze(files);
    this.findings.performance = perfFindings;

    console.log(`   Found ${perfFindings.length} performance issues`);
  }

  /**
   * Find documentation gaps
   * @param {string[]} files - Files to analyze
   * @returns {Promise<void>}
   */
  async findDocGaps(files = null) {
    console.log('📚 Analyzing documentation...');

    if (!files) {
      files = await this.discoverFiles();
    }

    const docFindings = await this.analyzers.docs.analyze(files);
    this.findings.docs = docFindings;

    console.log(`   Found ${docFindings.length} documentation gaps`);
  }

  /**
   * Track technical debt
   * @param {string[]} files - Files to analyze
   * @returns {Promise<void>}
   */
  async trackTechDebt(files = null) {
    console.log('🔧 Analyzing technical debt...');

    if (!files) {
      files = await this.discoverFiles();
    }

    const debtFindings = await this.analyzers.debt.analyze(files);
    this.findings.debt = debtFindings;

    console.log(`   Found ${debtFindings.length} technical debt items`);
  }

  /**
   * Generate improvement suggestions
   * @returns {Promise<Object[]>} Prioritized suggestions
   */
  async generateSuggestions() {
    console.log('\n💡 Generating improvement suggestions...\n');

    const allFindings = [
      ...this.findings.security,
      ...this.findings.performance,
      ...this.findings.docs,
      ...this.findings.debt
    ];

    // Prioritize by impact
    const prioritized = this.prioritizeFindings(allFindings);

    // Generate actionable suggestions
    const suggestions = prioritized.map(finding => ({
      title: finding.title,
      category: finding.category,
      severity: finding.severity,
      impact: finding.impact,
      priority: finding.priority,
      description: finding.description,
      recommendation: finding.recommendation,
      files: finding.files || [finding.file],
      effort: this.estimateEffort(finding)
    }));

    return suggestions;
  }

  /**
   * Prioritize findings by impact
   * @param {Object[]} findings - All findings
   * @returns {Object[]} Prioritized findings
   */
  prioritizeFindings(findings) {
    const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const impactWeight = { widespread: 3, moderate: 2, localized: 1 };
    const frequencyWeight = { always: 3, often: 2, rare: 1 };
    const costWeight = { high: 3, medium: 2, low: 1 };

    return findings
      .map(finding => {
        const severity = severityWeight[finding.severity] || 1;
        const impact = impactWeight[finding.impact] || 1;
        const frequency = frequencyWeight[finding.frequency] || 1;
        const cost = costWeight[finding.fixCost] || 2;

        const priority = (severity * impact * frequency) / cost;

        return { ...finding, priority };
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Estimate effort to fix
   * @param {Object} finding - Finding to estimate
   * @returns {string} Effort estimate
   */
  estimateEffort(finding) {
    const fixCost = finding.fixCost || 'medium';
    const filesAffected = finding.files?.length || 1;

    if (fixCost === 'low' && filesAffected === 1) return 'Quick (< 1 hour)';
    if (fixCost === 'low' && filesAffected <= 3) return 'Short (1-2 hours)';
    if (fixCost === 'medium' && filesAffected <= 5) return 'Medium (2-4 hours)';
    if (fixCost === 'medium') return 'Long (4-8 hours)';
    return 'Extended (> 8 hours)';
  }

  /**
   * Generate insights report
   * @param {string} outputPath - Path to write report
   * @param {string} format - 'markdown' or 'json'
   * @returns {Promise<string>} Report content
   */
  async generateReport(outputPath = null, format = 'markdown') {
    const results = {
      findings: this.findings,
      suggestions: await this.generateSuggestions()
    };

    const reporter = new InsightsReporter(results, this.projectRoot);
    const report = format === 'json'
      ? reporter.exportToJSON()
      : reporter.exportToMarkdown();

    if (outputPath) {
      await fs.writeFile(outputPath, report, 'utf8');
      console.log(`\n✅ Report written to: ${outputPath}\n`);
    }

    return report;
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary stats
   */
  getSummary() {
    const total = Object.values(this.findings)
      .reduce((sum, arr) => sum + arr.length, 0);

    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    Object.values(this.findings).forEach(findings => {
      findings.forEach(f => {
        bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      });
    });

    return {
      total,
      byCategory: {
        security: this.findings.security.length,
        performance: this.findings.performance.length,
        docs: this.findings.docs.length,
        debt: this.findings.debt.length
      },
      bySeverity
    };
  }
}

module.exports = IdeationEngine;
