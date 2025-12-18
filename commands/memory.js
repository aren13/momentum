/**
 * Memory commands - Manage Momentum's memory system
 */

import fs from 'fs/promises';
import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { MemoryStore } from '../lib/core/memory-store.js';
import { MemorySchema } from '../lib/core/memory-schema.js';

/**
 * Show memory statistics
 */
export async function stats() {
  console.log(chalk.blue.bold('\nMemory Statistics'));
  console.log(chalk.gray('─'.repeat(60)));

  const store = new MemoryStore();
  const memoryStats = await store.getStats();

  // Create table for statistics
  const table = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    style: { head: [], border: [] }
  });

  // Patterns
  table.push(
    ['Total Patterns', chalk.green(memoryStats.patterns.total)],
    ['Pattern Types', chalk.green(memoryStats.patterns.types)],
    ['Patterns by Type', '']
  );

  for (const [type, count] of Object.entries(memoryStats.patterns.byType)) {
    table.push([`  ${type}`, chalk.gray(count)]);
  }

  // Decisions
  table.push(
    ['', ''],
    ['Cached Decisions', chalk.green(memoryStats.decisions.total)]
  );

  // Executions
  table.push(
    ['', ''],
    ['Total Executions', chalk.green(memoryStats.executions.total)],
    ['Successful', chalk.green(memoryStats.executions.successful)],
    ['Failed', memoryStats.executions.failed > 0 ? chalk.red(memoryStats.executions.failed) : chalk.gray(0)],
    ['Success Rate', chalk.green((memoryStats.executions.successRate * 100).toFixed(1) + '%')]
  );

  // Files
  table.push(
    ['', ''],
    ['Tracked Files', chalk.green(memoryStats.files.total)]
  );

  // Database
  table.push(
    ['', ''],
    ['Database Size', chalk.yellow(memoryStats.database.sizeFormatted)],
    ['Schema Version', chalk.gray(`v${memoryStats.version}`)],
    ['Last Updated', chalk.gray(formatTimestamp(memoryStats.database.lastUpdated))]
  );

  console.log(table.toString());
  console.log();
}

/**
 * Export memory to JSON file
 */
export async function exportMemory(outputPath = 'memory-export.json') {
  const store = new MemoryStore();

  console.log(chalk.blue('\nExporting memory...'));

  const data = await store.export();

  await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(chalk.green(`✓ Memory exported to ${outputPath}`));

  // Show summary
  console.log(chalk.gray('\nExported:'));
  console.log(chalk.gray(`  • ${data.patterns.length} patterns`));
  console.log(chalk.gray(`  • ${data.decisions.length} decisions`));
  console.log(chalk.gray(`  • ${data.executions.length} executions`));
  console.log(chalk.gray(`  • ${data.files.length} files`));
  console.log();
}

/**
 * Import memory from JSON file
 */
export async function importMemory(inputPath, options = {}) {
  const store = new MemoryStore();

  console.log(chalk.blue(`\nImporting memory from ${inputPath}...`));

  // Read import file
  let data;
  try {
    const content = await fs.readFile(inputPath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    console.error(chalk.red(`✗ Failed to read import file: ${error.message}`));
    process.exit(1);
  }

  // Show import summary
  console.log(chalk.gray('\nImport contains:'));
  console.log(chalk.gray(`  • ${data.patterns?.length || 0} patterns`));
  console.log(chalk.gray(`  • ${data.decisions?.length || 0} decisions`));
  console.log(chalk.gray(`  • ${data.executions?.length || 0} executions`));
  console.log(chalk.gray(`  • ${data.files?.length || 0} files`));

  // Confirm import
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This will merge with existing memory. Continue?',
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\nImport cancelled.'));
      return;
    }
  }

  // Determine strategy
  const strategy = options.replace ? 'replace' : 'merge';

  // Import data
  await store.import(data, strategy);

  console.log(chalk.green(`\n✓ Memory imported successfully (${strategy} strategy)`));
  console.log();
}

/**
 * Clear memory
 */
export async function clear(options = {}) {
  const store = new MemoryStore();

  console.log(chalk.blue('\nClearing memory...'));

  // Determine what to clear
  const clearOptions = {
    patterns: options.patterns || options.all,
    decisions: options.decisions || options.all,
    executions: options.executions || options.all,
    files: options.files || options.all,
    all: options.all
  };

  // Show what will be cleared
  const toClear = [];
  if (clearOptions.patterns) toClear.push('patterns');
  if (clearOptions.decisions) toClear.push('decisions');
  if (clearOptions.executions) toClear.push('executions');
  if (clearOptions.files) toClear.push('files');

  if (toClear.length === 0) {
    console.log(chalk.yellow('\nNo clear options specified. Use --all, --patterns, --decisions, --executions, or --files'));
    console.log(chalk.gray('\nExample: momentum memory clear --all --force'));
    return;
  }

  console.log(chalk.yellow(`\nThis will clear: ${toClear.join(', ')}`));

  // Require confirmation unless --force
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This action cannot be undone. Continue?',
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\nClear cancelled.'));
      return;
    }
  }

  // Get counts before clearing
  const statsBefore = await store.getStats();

  // Clear data
  await store.clear(clearOptions);

  // Show what was cleared
  console.log(chalk.green('\n✓ Memory cleared:'));

  if (clearOptions.patterns) {
    console.log(chalk.gray(`  • ${statsBefore.patterns.total} patterns removed`));
  }

  if (clearOptions.decisions) {
    console.log(chalk.gray(`  • ${statsBefore.decisions.total} decisions removed`));
  }

  if (clearOptions.executions) {
    console.log(chalk.gray(`  • ${statsBefore.executions.total} executions removed`));
  }

  if (clearOptions.files) {
    console.log(chalk.gray(`  • ${statsBefore.files.total} files removed`));
  }

  console.log();
}

/**
 * Validate memory schema
 */
export async function validate() {
  const store = new MemoryStore();
  const schema = new MemorySchema(store);

  console.log(chalk.blue('\nValidating memory schema...'));

  const result = await schema.validate();

  if (result.valid) {
    console.log(chalk.green('\n✓ Schema is valid'));
  } else {
    console.log(chalk.red(`\n✗ Schema validation failed (${result.errors} errors, ${result.warnings} warnings)`));
  }

  // Show issues
  if (result.issues.length > 0) {
    console.log(chalk.yellow('\nIssues found:'));

    const issueTable = new Table({
      head: [chalk.cyan('Severity'), chalk.cyan('Table'), chalk.cyan('Issue')],
      style: { head: [], border: [] }
    });

    for (const issue of result.issues) {
      const severity = issue.severity === 'error' ? chalk.red('ERROR') : chalk.yellow('WARNING');
      issueTable.push([severity, issue.table, issue.message]);
    }

    console.log(issueTable.toString());
  }

  // Suggest repair if needed
  if (!result.valid) {
    console.log(chalk.gray('\nRun "momentum memory repair" to fix issues automatically.'));
  }

  console.log();
}

/**
 * Repair memory schema
 */
export async function repair() {
  const store = new MemoryStore();
  const schema = new MemorySchema(store);

  console.log(chalk.blue('\nRepairing memory schema...'));

  const result = await schema.repair();

  if (result.repaired) {
    console.log(chalk.green('\n✓ Schema repaired:'));

    for (const action of result.actions) {
      console.log(chalk.gray(`  • ${action}`));
    }
  } else {
    console.log(chalk.green('\n✓ Schema is already valid, no repairs needed'));
  }

  // Show validation result
  if (result.validation.valid) {
    console.log(chalk.green('\n✓ Schema is now valid'));
  } else {
    console.log(chalk.yellow(`\n⚠ Some issues remain (${result.validation.errors} errors, ${result.validation.warnings} warnings)`));
    console.log(chalk.gray('Run "momentum memory validate" for details.'));
  }

  console.log();
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

export default {
  stats,
  exportMemory,
  importMemory,
  clear,
  validate,
  repair
};
