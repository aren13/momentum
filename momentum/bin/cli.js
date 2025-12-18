#!/usr/bin/env node

/**
 * Momentum CLI - Intelligent Project Management for AI-Assisted Development
 *
 * A meta-prompting, context engineering, and spec-driven development system
 * with parallel execution, smart learning, and multi-model support.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Core modules
import { ProjectManager } from '../lib/core/project.js';
import { RoadmapManager } from '../lib/core/roadmap.js';
import { PlanExecutor } from '../lib/core/executor.js';
import { ProgressTracker } from '../lib/core/progress.js';
import { ContextEngine } from '../lib/core/context.js';
import { displayBanner, displayHelp } from '../lib/utils/display.js';
import { validateEnvironment } from '../lib/utils/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();

// Display banner on startup
displayBanner(pkg.version);

program
  .name('momentum')
  .description(chalk.cyan('Intelligent project management for AI-assisted development'))
  .version(pkg.version, '-v, --version', 'Display version number')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--no-color', 'Disable colored output')
  .option('--debug', 'Enable debug mode');

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('init [name]')
  .description('Initialize a new project with intelligent questioning')
  .option('-t, --template <type>', 'Project template (web, api, cli, library, fullstack)', 'web')
  .option('-m, --mode <mode>', 'Workflow mode (interactive, autonomous, hybrid)', 'hybrid')
  .option('--skip-git', 'Skip git initialization')
  .option('--brownfield', 'Initialize in existing codebase')
  .action(async (name, options) => {
    const pm = new ProjectManager();
    await pm.initialize(name, options);
  });

program
  .command('map')
  .description('Map existing codebase structure and patterns')
  .option('-d, --depth <level>', 'Analysis depth (quick, standard, deep)', 'standard')
  .option('-f, --focus <areas>', 'Focus areas (comma-separated: arch,stack,patterns,tests)')
  .action(async (options) => {
    const pm = new ProjectManager();
    await pm.mapCodebase(options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// ROADMAP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('roadmap')
  .description('Create or view project roadmap')
  .option('-c, --create', 'Create new roadmap')
  .option('-e, --edit', 'Edit existing roadmap')
  .option('--milestone <name>', 'Create new milestone')
  .action(async (options) => {
    const rm = new RoadmapManager();
    await rm.manage(options);
  });

program
  .command('phase <action> [number]')
  .description('Manage project phases (plan, discuss, research, add, insert)')
  .option('-p, --parallel', 'Enable parallel task execution')
  .option('--dry-run', 'Preview without executing')
  .action(async (action, number, options) => {
    const rm = new RoadmapManager();
    await rm.handlePhase(action, number, options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// PLAN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('execute [path]')
  .description('Execute a plan with smart strategies')
  .option('-s, --strategy <type>', 'Execution strategy (auto, sequential, parallel, hybrid)', 'auto')
  .option('--checkpoint <name>', 'Resume from checkpoint')
  .option('--rollback', 'Rollback to previous state')
  .option('--dry-run', 'Preview execution without changes')
  .action(async (path, options) => {
    const executor = new PlanExecutor();
    await executor.execute(path, options);
  });

program
  .command('retry')
  .description('Retry failed tasks with smart error handling')
  .option('--force', 'Force retry even if dependencies changed')
  .action(async (options) => {
    const executor = new PlanExecutor();
    await executor.retry(options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS & STATUS
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('status')
  .alias('s')
  .description('Show project status with visual dashboard')
  .option('-d, --detailed', 'Show detailed breakdown')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const tracker = new ProgressTracker();
    await tracker.showStatus(options);
  });

program
  .command('dashboard')
  .alias('dash')
  .description('Interactive progress dashboard')
  .option('-r, --refresh <seconds>', 'Auto-refresh interval', '5')
  .action(async (options) => {
    const tracker = new ProgressTracker();
    await tracker.showDashboard(options);
  });

program
  .command('burndown')
  .description('Display burndown chart for current milestone')
  .option('--export <format>', 'Export chart (ascii, svg, png)')
  .action(async (options) => {
    const tracker = new ProgressTracker();
    await tracker.showBurndown(options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('context')
  .description('Manage project context and state')
  .option('-o, --optimize', 'Optimize context for AI consumption')
  .option('-s, --summarize', 'Generate context summary')
  .option('-e, --export', 'Export context for handoff')
  .action(async (options) => {
    const ctx = new ContextEngine();
    await ctx.manage(options);
  });

program
  .command('resume')
  .description('Resume work with full context restoration')
  .option('--from <checkpoint>', 'Resume from specific checkpoint')
  .action(async (options) => {
    const ctx = new ContextEngine();
    await ctx.resume(options);
  });

program
  .command('pause')
  .description('Pause work and create handoff document')
  .option('-n, --note <message>', 'Add note for next session')
  .action(async (options) => {
    const ctx = new ContextEngine();
    await ctx.pause(options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// LEARNING & ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('learn')
  .description('Analyze past projects to improve estimates')
  .option('--project <path>', 'Learn from specific project')
  .option('--all', 'Learn from all tracked projects')
  .action(async (options) => {
    const tracker = new ProgressTracker();
    await tracker.learn(options);
  });

program
  .command('insights')
  .description('Show AI-powered project insights')
  .option('--risks', 'Focus on risk analysis')
  .option('--blockers', 'Focus on potential blockers')
  .action(async (options) => {
    const tracker = new ProgressTracker();
    await tracker.showInsights(options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// IDEATION & CODE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('ideate')
  .description('AI-powered codebase analysis and improvement suggestions')
  .option('--focus <area>', 'Focus on specific area (security, performance, docs, debt)')
  .option('--output <path>', 'Output path for report (default: INSIGHTS.md)')
  .option('--format <type>', 'Output format (markdown, json)', 'markdown')
  .option('--path <dir>', 'Project path to analyze (default: current directory)')
  .option('--max-files <n>', 'Maximum files to analyze', '1000')
  .action(async (options) => {
    const { ideate } = await import('../commands/ideation.js');
    await ideate(options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// SPECIFICATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

const specCommand = program
  .command('spec')
  .description('Enhanced specification generation with discovery and critique');

specCommand
  .command('discover <feature>')
  .description('Discover context and gather requirements for a feature')
  .option('--no-interactive', 'Skip interactive Q&A')
  .option('-o, --output <path>', 'Output directory for discovery file')
  .action(async (feature, options) => {
    const { discover } = await import('../commands/spec.js');
    await discover(feature, options);
  });

specCommand
  .command('generate')
  .description('Generate specification with critic review')
  .option('-i, --input <file>', 'Input discovery file (default: DISCOVERY.md)')
  .option('-o, --output <file>', 'Output spec file (default: SPEC.md)')
  .option('--iterations <n>', 'Max critique iterations', '3')
  .action(async (options) => {
    const { generate } = await import('../commands/spec.js');
    await generate(options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// MEMORY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const memoryCommand = program
  .command('memory')
  .description('Manage Momentum memory system');

memoryCommand
  .command('stats')
  .description('Show memory usage statistics')
  .action(async () => {
    const { stats } = await import('../commands/memory.js');
    await stats();
  });

memoryCommand
  .command('export [file]')
  .description('Export memory to JSON file')
  .action(async (file) => {
    const { exportMemory } = await import('../commands/memory.js');
    await exportMemory(file);
  });

memoryCommand
  .command('import <file>')
  .description('Import memory from JSON file')
  .option('--force', 'Skip confirmation prompt')
  .option('--replace', 'Replace existing memory instead of merging')
  .action(async (file, options) => {
    const { importMemory } = await import('../commands/memory.js');
    await importMemory(file, options);
  });

memoryCommand
  .command('clear')
  .description('Clear memory data')
  .option('--all', 'Clear all memory data')
  .option('--patterns', 'Clear only patterns')
  .option('--decisions', 'Clear only decisions')
  .option('--executions', 'Clear only executions')
  .option('--files', 'Clear only files')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options) => {
    const { clear } = await import('../commands/memory.js');
    await clear(options);
  });

memoryCommand
  .command('validate')
  .description('Validate memory schema')
  .action(async () => {
    const { validate } = await import('../commands/memory.js');
    await validate();
  });

memoryCommand
  .command('repair')
  .description('Repair memory schema issues')
  .action(async () => {
    const { repair } = await import('../commands/memory.js');
    await repair();
  });

// ═══════════════════════════════════════════════════════════════════════════
// GIT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('checkpoint [name]')
  .description('Create a rollback checkpoint')
  .option('-m, --message <msg>', 'Checkpoint message')
  .action(async (name, options) => {
    const pm = new ProjectManager();
    await pm.createCheckpoint(name, options);
  });

program
  .command('rollback [checkpoint]')
  .description('Rollback to a previous checkpoint')
  .option('--list', 'List available checkpoints')
  .option('--preview', 'Preview changes without applying')
  .action(async (checkpoint, options) => {
    const pm = new ProjectManager();
    await pm.rollback(checkpoint, options);
  });

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

program
  .command('issues')
  .description('Manage deferred issues')
  .option('-a, --add <description>', 'Add new issue')
  .option('-l, --list', 'List all issues')
  .option('-r, --review', 'Review issues with context')
  .action(async (options) => {
    const pm = new ProjectManager();
    await pm.manageIssues(options);
  });

program
  .command('config')
  .description('View or update configuration')
  .option('-g, --global', 'Global configuration')
  .option('-s, --set <key=value>', 'Set configuration value')
  .option('-l, --list', 'List all configuration')
  .action(async (options) => {
    const pm = new ProjectManager();
    await pm.manageConfig(options);
  });

program
  .command('install')
  .description('Install Momentum commands for Claude Code')
  .option('-g, --global', 'Install globally')
  .option('-l, --local', 'Install in current project')
  .action(async (options) => {
    const pm = new ProjectManager();
    await pm.installCommands(options);
  });

// Parse and execute
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  displayHelp();
}
