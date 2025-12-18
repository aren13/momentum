#!/usr/bin/env node

/**
 * InsightsReporter - Generate comprehensive insights reports
 *
 * Formats analysis findings into actionable reports with:
 * - Executive summary
 * - Prioritized findings by category
 * - Recommendations
 * - Trend tracking
 *
 * @module momentum/lib/core/insights-reporter
 */

const path = require('path');

class InsightsReporter {
  constructor(results, projectRoot) {
    this.results = results;
    this.projectRoot = projectRoot;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Export report as markdown
   * @returns {string} Markdown report
   */
  exportToMarkdown() {
    const { findings, suggestions } = this.results;

    const report = [
      this.generateHeader(),
      this.generateSummary(findings),
      this.generateCriticalIssues(suggestions),
      this.generateCategorySection('Security Vulnerabilities', findings.security),
      this.generateCategorySection('Performance Bottlenecks', findings.performance),
      this.generateCategorySection('Documentation Gaps', findings.docs),
      this.generateCategorySection('Technical Debt', findings.debt),
      this.generateRecommendations(suggestions)
    ].join('\n\n');

    return report;
  }

  /**
   * Export report as JSON
   * @returns {string} JSON report
   */
  exportToJSON() {
    return JSON.stringify({
      timestamp: this.timestamp,
      projectRoot: this.projectRoot,
      summary: this.getSummaryStats(),
      findings: this.results.findings,
      suggestions: this.results.suggestions
    }, null, 2);
  }

  /**
   * Generate report header
   * @returns {string} Header markdown
   */
  generateHeader() {
    const projectName = path.basename(this.projectRoot);
    return `# Project Insights Report: ${projectName}

**Generated:** ${new Date(this.timestamp).toLocaleString()}
**Project:** ${this.projectRoot}

---
`;
  }

  /**
   * Generate executive summary
   * @param {Object} findings - All findings
   * @returns {string} Summary markdown
   */
  generateSummary(findings) {
    const stats = this.getSummaryStats();

    return `## Executive Summary

**Total Issues Found:** ${stats.total}

**By Severity:**
- 🔴 Critical: ${stats.bySeverity.critical}
- 🟠 High: ${stats.bySeverity.high}
- 🟡 Medium: ${stats.bySeverity.medium}
- 🟢 Low: ${stats.bySeverity.low}

**By Category:**
- 🔒 Security: ${stats.byCategory.security}
- ⚡ Performance: ${stats.byCategory.performance}
- 📚 Documentation: ${stats.byCategory.docs}
- 🔧 Technical Debt: ${stats.byCategory.debt}

---
`;
  }

  /**
   * Generate critical issues section
   * @param {Object[]} suggestions - Prioritized suggestions
   * @returns {string} Critical issues markdown
   */
  generateCriticalIssues(suggestions) {
    const critical = suggestions
      .filter(s => s.severity === 'critical' || s.severity === 'high')
      .slice(0, 10); // Top 10

    if (critical.length === 0) {
      return `## Critical Issues

✅ **No critical issues found!** Great job maintaining code quality.

---
`;
    }

    const items = critical.map((item, idx) => {
      const icon = item.severity === 'critical' ? '🔴' : '🟠';
      return `### ${idx + 1}. ${icon} ${item.title}

**Category:** ${item.category.charAt(0).toUpperCase() + item.category.slice(1)} - ${item.severity}
**Impact:** ${item.impact} | **Effort:** ${item.effort}

**Description:**
${item.description}

**Recommendation:**
${item.recommendation}

**Affected Files:**
${item.files.map(f => `- \`${path.relative(this.projectRoot, f)}\``).join('\n')}
`;
    }).join('\n---\n\n');

    return `## Critical Issues

${items}

---
`;
  }

  /**
   * Generate category section
   * @param {string} title - Section title
   * @param {Object[]} findings - Category findings
   * @returns {string} Category markdown
   */
  generateCategorySection(title, findings) {
    if (!findings || findings.length === 0) {
      return `## ${title}

✅ No issues found in this category.

---
`;
    }

    // Group by severity
    const bySeverity = {
      critical: findings.filter(f => f.severity === 'critical'),
      high: findings.filter(f => f.severity === 'high'),
      medium: findings.filter(f => f.severity === 'medium'),
      low: findings.filter(f => f.severity === 'low')
    };

    const items = [];

    for (const [severity, items_] of Object.entries(bySeverity)) {
      if (items_.length === 0) continue;

      const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[severity];
      items.push(`### ${icon} ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${items_.length})`);

      // Show first 5 of each severity
      const display = items_.slice(0, 5);
      for (const item of display) {
        const file = item.relativeFile || path.relative(this.projectRoot, item.file);
        const location = item.line ? `${file}:${item.line}` : file;

        items.push(`
**${item.title}**
\`${location}\`

${item.description}

*Recommendation:* ${item.recommendation}
`);
      }

      if (items_.length > 5) {
        items.push(`\n*...and ${items_.length - 5} more ${severity} issues*\n`);
      }
    }

    return `## ${title}

**Total:** ${findings.length} issue${findings.length === 1 ? '' : 's'}

${items.join('\n')}

---
`;
  }

  /**
   * Generate recommendations section
   * @param {Object[]} suggestions - All suggestions
   * @returns {string} Recommendations markdown
   */
  generateRecommendations(suggestions) {
    // Top 10 by priority
    const top = suggestions.slice(0, 10);

    const items = top.map((item, idx) => {
      const priority = Math.round(item.priority * 10) / 10;
      return `${idx + 1}. **${item.title}** (Priority: ${priority})
   - Category: ${item.category}
   - Severity: ${item.severity}
   - Effort: ${item.effort}
   - ${item.recommendation}`;
    }).join('\n\n');

    return `## Top Recommendations

Based on impact, severity, and effort, here are the top actions to improve your codebase:

${items}

---

## Next Steps

1. **Address Critical Issues First:** Focus on security and high-impact performance issues
2. **Plan Technical Debt Cleanup:** Schedule time for refactoring and documentation
3. **Run Regularly:** Use \`momentum ideate\` periodically to track progress
4. **Track Metrics:** Monitor issue count over time to measure improvement

---

*Report generated by Momentum Ideation Engine*
`;
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary stats
   */
  getSummaryStats() {
    const { findings } = this.results;

    const total = Object.values(findings)
      .reduce((sum, arr) => sum + arr.length, 0);

    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    Object.values(findings).forEach(categoryFindings => {
      categoryFindings.forEach(f => {
        bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
      });
    });

    return {
      total,
      byCategory: {
        security: findings.security?.length || 0,
        performance: findings.performance?.length || 0,
        docs: findings.docs?.length || 0,
        debt: findings.debt?.length || 0
      },
      bySeverity
    };
  }

  /**
   * Prioritize findings by impact
   * @param {Object[]} findings - All findings
   * @returns {Object[]} Prioritized findings
   */
  prioritizeByImpact() {
    const allFindings = [
      ...this.results.findings.security,
      ...this.results.findings.performance,
      ...this.results.findings.docs,
      ...this.results.findings.debt
    ];

    const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const impactWeight = { widespread: 3, moderate: 2, localized: 1 };

    return allFindings
      .map(finding => ({
        ...finding,
        priorityScore: (severityWeight[finding.severity] || 1) * (impactWeight[finding.impact] || 1)
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Track changes over time (stub for future)
   * @param {Object} previousReport - Previous report data
   * @returns {Object} Trend data
   */
  trackOverTime(previousReport) {
    // TODO: Compare with previous report and show trends
    // - Issues fixed
    // - New issues
    // - Category changes
    return {
      fixed: 0,
      new: 0,
      trend: 'stable'
    };
  }
}

module.exports = InsightsReporter;
