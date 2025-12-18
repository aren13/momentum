#!/usr/bin/env node

/**
 * Ideation Command - AI-powered codebase analysis and improvement suggestions
 *
 * @module momentum/commands/ideation
 */

import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Use require for CommonJS modules
const require = createRequire(import.meta.url);
const IdeationEngine = require('../lib/core/ideation-engine.js');

/**
 * Run ideation analysis
 * @param {Object} options - Command options
 */
export async function ideate(options = {}) {
  try {
    console.log(chalk.cyan.bold('\n🔍 Momentum Ideation Engine\n'));
    console.log(chalk.gray('Analyzing codebase for improvement opportunities...\n'));

    // Determine project root
    const projectRoot = options.path || process.cwd();

    // Initialize engine
    const engine = new IdeationEngine(projectRoot, {
      focus: options.focus || null,
      maxFiles: options.maxFiles || 1000
    });

    // Run analysis
    const results = await engine.analyzeCodebase();

    // Display summary
    const summary = engine.getSummary();
    displaySummary(summary);

    // Generate report
    const outputPath = options.output || path.join(projectRoot, 'INSIGHTS.md');
    const format = options.format || 'markdown';

    await engine.generateReport(outputPath, format);

    console.log(chalk.green(`\n✅ Analysis complete! Found ${summary.total} issues.\n`));

    if (format === 'markdown') {
      console.log(chalk.cyan(`📄 Report saved to: ${chalk.bold(outputPath)}\n`));
    } else {
      console.log(chalk.cyan(`📄 JSON report saved to: ${chalk.bold(outputPath)}\n`));
    }

    // Show top recommendations
    if (results.suggestions.length > 0) {
      displayTopRecommendations(results.suggestions.slice(0, 5));
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Error running ideation analysis:'));
    console.error(chalk.red(error.message));
    if (options.debug) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Display summary statistics
 * @param {Object} summary - Summary stats
 */
function displaySummary(summary) {
  console.log(chalk.bold('\n📊 Analysis Summary\n'));

  // Total
  console.log(chalk.white(`Total Issues: ${chalk.bold(summary.total)}\n`));

  // By Severity
  console.log(chalk.bold('By Severity:'));
  console.log(`  ${chalk.red('●')} Critical: ${chalk.bold(summary.bySeverity.critical)}`);
  console.log(`  ${chalk.yellow('●')} High:     ${chalk.bold(summary.bySeverity.high)}`);
  console.log(`  ${chalk.blue('●')} Medium:   ${chalk.bold(summary.bySeverity.medium)}`);
  console.log(`  ${chalk.green('●')} Low:      ${chalk.bold(summary.bySeverity.low)}\n`);

  // By Category
  console.log(chalk.bold('By Category:'));
  console.log(`  🔒 Security:     ${chalk.bold(summary.byCategory.security)}`);
  console.log(`  ⚡ Performance:  ${chalk.bold(summary.byCategory.performance)}`);
  console.log(`  📚 Documentation: ${chalk.bold(summary.byCategory.docs)}`);
  console.log(`  🔧 Tech Debt:    ${chalk.bold(summary.byCategory.debt)}`);
}

/**
 * Display top recommendations
 * @param {Object[]} recommendations - Top recommendations
 */
function displayTopRecommendations(recommendations) {
  console.log(chalk.bold('\n💡 Top 5 Recommendations\n'));

  recommendations.forEach((rec, idx) => {
    const priorityColor = rec.severity === 'critical' || rec.severity === 'high'
      ? chalk.red
      : rec.severity === 'medium' ? chalk.yellow : chalk.green;

    console.log(`${chalk.bold((idx + 1) + '.')} ${priorityColor(rec.title)}`);
    console.log(`   ${chalk.gray('Category:')} ${rec.category}`);
    console.log(`   ${chalk.gray('Severity:')} ${priorityColor(rec.severity)}`);
    console.log(`   ${chalk.gray('Effort:')}   ${rec.effort}`);
    console.log(`   ${chalk.gray('→')} ${chalk.italic(rec.recommendation)}\n`);
  });
}

/**
 * Show quick stats
 * @param {Object} options - Command options
 */
export async function quickStats(options = {}) {
  try {
    const projectRoot = options.path || process.cwd();
    const engine = new IdeationEngine(projectRoot, {
      maxFiles: options.maxFiles || 1000
    });

    await engine.analyzeCodebase();
    const summary = engine.getSummary();

    displaySummary(summary);

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}
