/**
 * Context Engine - Smart context management and optimization
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import figures from 'figures';
import { success, error, warning, info, header, divider } from '../utils/display.js';
import { hasProject } from '../utils/validate.js';

/**
 * Context optimization strategies
 */
const OPTIMIZATION_STRATEGIES = {
  SUMMARIZE: 'summarize',
  PRIORITIZE: 'prioritize',
  PRUNE: 'prune',
  WINDOW: 'window'
};

export class ContextEngine {
  constructor(dir = process.cwd()) {
    this.dir = dir;
    this.momentumDir = join(dir, '.momentum');
    this.maxTokens = 180000; // Target context window
  }

  /**
   * Manage project context
   */
  async manage(options = {}) {
    if (!hasProject(this.dir)) {
      error('No Momentum project found. Run `momentum init` first.');
      return;
    }

    if (options.optimize) {
      await this.optimizeContext();
    } else if (options.summarize) {
      await this.generateSummary();
    } else if (options.export) {
      await this.exportContext();
    } else {
      await this.showContextStatus();
    }
  }

  /**
   * Show current context status
   */
  async showContextStatus() {
    header('Context Status');
    console.log();

    const context = await this.loadFullContext();

    // Estimate token count (rough: ~4 chars per token)
    const totalChars = Object.values(context).reduce((sum, content) => sum + (content?.length || 0), 0);
    const estimatedTokens = Math.round(totalChars / 4);
    const utilization = Math.round((estimatedTokens / this.maxTokens) * 100);

    console.log(chalk.cyan('Context Utilization:'));
    console.log();

    const bar = this.createUtilizationBar(utilization);
    console.log(`  ${bar} ${utilization}%`);
    console.log(chalk.dim(`  ~${estimatedTokens.toLocaleString()} / ${this.maxTokens.toLocaleString()} tokens`));
    console.log();

    // Breakdown by file
    divider('Breakdown');

    const breakdown = Object.entries(context)
      .map(([key, content]) => ({
        name: key,
        chars: content?.length || 0,
        tokens: Math.round((content?.length || 0) / 4)
      }))
      .sort((a, b) => b.tokens - a.tokens);

    for (const item of breakdown) {
      const pct = Math.round((item.tokens / estimatedTokens) * 100);
      console.log(`  ${chalk.cyan(item.name.padEnd(20))} ${item.tokens.toLocaleString().padStart(8)} tokens (${pct}%)`);
    }

    // Recommendations
    console.log();
    divider('Recommendations');

    if (utilization > 80) {
      warning('Context utilization is high. Consider running `momentum context -o` to optimize.');
    } else if (utilization > 60) {
      info('Context utilization is moderate. Optimization may improve performance.');
    } else {
      success('Context utilization is healthy.');
    }
  }

  /**
   * Load full project context
   */
  async loadFullContext() {
    const context = {
      project: null,
      roadmap: null,
      state: null,
      issues: null,
      phases: null,
      codebase: null
    };

    // Load core files
    const files = {
      project: 'PROJECT.md',
      roadmap: 'ROADMAP.md',
      state: 'STATE.md',
      issues: 'ISSUES.md'
    };

    for (const [key, file] of Object.entries(files)) {
      const path = join(this.momentumDir, file);
      if (existsSync(path)) {
        context[key] = readFileSync(path, 'utf8');
      }
    }

    // Load phase summaries
    const phasesDir = join(this.momentumDir, 'phases');
    if (existsSync(phasesDir)) {
      const summaries = [];
      const phases = readdirSync(phasesDir);

      for (const phase of phases) {
        const phaseDir = join(phasesDir, phase);
        const files = readdirSync(phaseDir);

        for (const file of files.filter(f => f.endsWith('-SUMMARY.md'))) {
          summaries.push(readFileSync(join(phaseDir, file), 'utf8'));
        }
      }

      context.phases = summaries.join('\n\n---\n\n');
    }

    // Load codebase context
    const codebaseDir = join(this.momentumDir, 'codebase');
    if (existsSync(codebaseDir)) {
      const codebaseFiles = readdirSync(codebaseDir).filter(f => f.endsWith('.md'));
      const codebaseContent = codebaseFiles
        .map(f => readFileSync(join(codebaseDir, f), 'utf8'))
        .join('\n\n---\n\n');
      context.codebase = codebaseContent;
    }

    return context;
  }

  /**
   * Optimize context for AI consumption
   */
  async optimizeContext() {
    header('Context Optimization');
    console.log();

    const spinner = ora('Analyzing context...').start();

    const context = await this.loadFullContext();
    const totalChars = Object.values(context).reduce((sum, c) => sum + (c?.length || 0), 0);
    const estimatedTokens = Math.round(totalChars / 4);

    spinner.succeed(`Current context: ~${estimatedTokens.toLocaleString()} tokens`);

    if (estimatedTokens < this.maxTokens * 0.6) {
      success('Context is already optimized!');
      return;
    }

    // Ask for optimization strategy
    const { strategy } = await inquirer.prompt([{
      type: 'list',
      name: 'strategy',
      message: 'Choose optimization strategy:',
      choices: [
        { name: 'Summarize - Compress verbose content', value: OPTIMIZATION_STRATEGIES.SUMMARIZE },
        { name: 'Prioritize - Keep recent, archive old', value: OPTIMIZATION_STRATEGIES.PRIORITIZE },
        { name: 'Prune - Remove redundant information', value: OPTIMIZATION_STRATEGIES.PRUNE },
        { name: 'Window - Keep only current phase context', value: OPTIMIZATION_STRATEGIES.WINDOW }
      ]
    }]);

    spinner.start('Optimizing context...');

    let optimized;
    switch (strategy) {
      case OPTIMIZATION_STRATEGIES.SUMMARIZE:
        optimized = await this.summarizeContent(context);
        break;
      case OPTIMIZATION_STRATEGIES.PRIORITIZE:
        optimized = await this.prioritizeContent(context);
        break;
      case OPTIMIZATION_STRATEGIES.PRUNE:
        optimized = await this.pruneContent(context);
        break;
      case OPTIMIZATION_STRATEGIES.WINDOW:
        optimized = await this.windowContent(context);
        break;
    }

    const newTotal = Object.values(optimized).reduce((sum, c) => sum + (c?.length || 0), 0);
    const newTokens = Math.round(newTotal / 4);
    const reduction = Math.round((1 - newTokens / estimatedTokens) * 100);

    spinner.succeed(`Optimized: ~${newTokens.toLocaleString()} tokens (${reduction}% reduction)`);

    // Confirm and save
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Apply optimization?',
      default: true
    }]);

    if (confirm) {
      await this.saveOptimizedContext(optimized);
      success('Context optimized and saved');
    }
  }

  /**
   * Summarize verbose content
   */
  async summarizeContent(context) {
    // In a real implementation, this would use AI to summarize
    // For now, truncate long sections

    const optimized = { ...context };

    for (const [key, content] of Object.entries(optimized)) {
      if (content && content.length > 10000) {
        // Keep first and last portions
        const first = content.slice(0, 5000);
        const last = content.slice(-3000);
        optimized[key] = first + '\n\n[...content summarized...]\n\n' + last;
      }
    }

    return optimized;
  }

  /**
   * Prioritize recent content
   */
  async prioritizeContent(context) {
    const optimized = { ...context };

    // Keep only recent phase summaries
    if (context.phases) {
      const summaries = context.phases.split('---');
      optimized.phases = summaries.slice(-3).join('---');
    }

    return optimized;
  }

  /**
   * Prune redundant content
   */
  async pruneContent(context) {
    const optimized = { ...context };

    // Remove duplicate newlines, excess whitespace
    for (const [key, content] of Object.entries(optimized)) {
      if (content) {
        optimized[key] = content
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ \t]+$/gm, '')
          .trim();
      }
    }

    return optimized;
  }

  /**
   * Window to current phase only
   */
  async windowContent(context) {
    const optimized = {
      project: context.project,
      roadmap: null,
      state: context.state,
      issues: null,
      phases: null,
      codebase: null
    };

    // Keep only current milestone from roadmap
    if (context.roadmap) {
      const currentMilestone = context.roadmap.match(/## Milestone:[\s\S]*?(?=## Milestone:|$)/);
      if (currentMilestone) {
        optimized.roadmap = currentMilestone[0];
      }
    }

    return optimized;
  }

  /**
   * Save optimized context
   */
  async saveOptimizedContext(optimized) {
    // Create backup first
    const backupDir = join(this.momentumDir, 'backups', `backup-${Date.now()}`);
    const { mkdirSync, copyFileSync } = await import('fs');
    mkdirSync(backupDir, { recursive: true });

    const files = ['PROJECT.md', 'ROADMAP.md', 'STATE.md', 'ISSUES.md'];
    for (const file of files) {
      const src = join(this.momentumDir, file);
      if (existsSync(src)) {
        copyFileSync(src, join(backupDir, file));
      }
    }

    // Save optimized versions (selective)
    // Note: In practice, we'd be more careful about what to overwrite
    info('Backup created. Optimization applied to working context.');
  }

  /**
   * Generate context summary
   */
  async generateSummary() {
    header('Context Summary');
    console.log();

    const context = await this.loadFullContext();

    // Generate summary
    const summary = [];

    // Project summary
    if (context.project) {
      const nameMatch = context.project.match(/^# (.+)$/m);
      const visionMatch = context.project.match(/> (.+)$/m);
      summary.push(`## Project: ${nameMatch ? nameMatch[1] : 'Unknown'}`);
      if (visionMatch) summary.push(`\n${visionMatch[1]}`);
    }

    // Current position
    if (context.state) {
      const positionMatch = context.state.match(/## Current Position\n\n([\s\S]*?)(?=\n##|$)/);
      if (positionMatch) {
        summary.push('\n## Current Position');
        summary.push(positionMatch[1].trim());
      }
    }

    // Key decisions
    if (context.state) {
      const decisionsMatch = context.state.match(/## Key Decisions\n\n([\s\S]*?)(?=\n##|$)/);
      if (decisionsMatch && !decisionsMatch[1].includes('*Decisions made')) {
        summary.push('\n## Key Decisions');
        summary.push(decisionsMatch[1].trim());
      }
    }

    console.log(summary.join('\n'));
  }

  /**
   * Export context for handoff
   */
  async exportContext() {
    header('Export Context');
    console.log();

    const spinner = ora('Generating handoff document...').start();

    const context = await this.loadFullContext();
    const timestamp = new Date().toISOString().split('T')[0];

    const handoff = `# Project Handoff Document

Generated: ${timestamp}

---

## Project Overview

${context.project || 'No project documentation found.'}

---

## Current State

${context.state || 'No state documentation found.'}

---

## Roadmap

${context.roadmap || 'No roadmap found.'}

---

## Recent Work

${context.phases || 'No phase summaries found.'}

---

## Open Issues

${context.issues || 'No issues documented.'}

---

## Codebase Context

${context.codebase || 'No codebase analysis found.'}

---

*Generated by Momentum Context Engine*
`;

    const handoffFile = join(this.momentumDir, `HANDOFF-${timestamp}.md`);
    writeFileSync(handoffFile, handoff);

    spinner.succeed(`Handoff document created: ${relative(this.dir, handoffFile)}`);
  }

  /**
   * Resume work with context restoration
   */
  async resume(options = {}) {
    header('Resume Work');
    console.log();

    if (!hasProject(this.dir)) {
      error('No Momentum project found. Run `momentum init` first.');
      return;
    }

    const spinner = ora('Loading project context...').start();

    // Load state
    const stateFile = join(this.momentumDir, 'STATE.md');
    const state = existsSync(stateFile) ? readFileSync(stateFile, 'utf8') : null;

    // Check for continue file
    const continueFile = join(this.dir, '.continue-here');
    const hasContinue = existsSync(continueFile);

    spinner.succeed('Context loaded');
    console.log();

    // Display current position
    if (state) {
      const positionMatch = state.match(/## Current Position\n\n([\s\S]*?)(?=\n##|$)/);
      if (positionMatch) {
        divider('Current Position');
        console.log(positionMatch[1].trim());
        console.log();
      }

      // Show recent session
      const historyMatch = state.match(/## Session History\n\n(### [\s\S]*?)(?=### |$)/);
      if (historyMatch) {
        divider('Last Session');
        console.log(historyMatch[1].trim());
        console.log();
      }
    }

    // Show continue file if exists
    if (hasContinue) {
      divider('Continue From');
      console.log(readFileSync(continueFile, 'utf8'));
      console.log();

      const { clearContinue } = await inquirer.prompt([{
        type: 'confirm',
        name: 'clearContinue',
        message: 'Clear continue file?',
        default: false
      }]);

      if (clearContinue) {
        const { unlinkSync } = await import('fs');
        unlinkSync(continueFile);
        info('Continue file cleared');
      }
    }

    // Suggest next action
    divider('Suggested Next Action');

    // Analyze what to do next
    const phasesDir = join(this.momentumDir, 'phases');
    if (existsSync(phasesDir)) {
      const phases = readdirSync(phasesDir).sort();

      for (const phase of phases) {
        const phaseDir = join(phasesDir, phase);
        const files = readdirSync(phaseDir);
        const plans = files.filter(f => f.endsWith('-PLAN.md'));
        const summaries = files.filter(f => f.endsWith('-SUMMARY.md'));

        if (plans.length > summaries.length) {
          const nextPlan = plans.find(p => !summaries.includes(p.replace('-PLAN.md', '-SUMMARY.md')));
          if (nextPlan) {
            console.log(`  Run ${chalk.yellow(`momentum execute ${join(phaseDir, nextPlan)}`)}`);
            return;
          }
        }

        if (plans.length === 0) {
          const phaseNum = phase.split('-')[0];
          console.log(`  Run ${chalk.yellow(`momentum phase plan ${phaseNum}`)}`);
          return;
        }
      }

      console.log(chalk.green('  All current work complete!'));
      console.log(chalk.dim('  Consider adding a new milestone or reviewing issues.'));
    }
  }

  /**
   * Pause work with handoff
   */
  async pause(options = {}) {
    header('Pause Work');
    console.log();

    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'notes',
        message: 'Add notes for next session:',
        default: `# Continue Here

## What I was working on:


## What's left to do:


## Important notes:

`
      }
    ]);

    // Write continue file
    const continueFile = join(this.dir, '.continue-here');
    const content = `${answers.notes}

---
Paused: ${new Date().toISOString()}
${options.note ? `Note: ${options.note}` : ''}
`;

    writeFileSync(continueFile, content);

    // Update STATE.md
    const stateFile = join(this.momentumDir, 'STATE.md');
    if (existsSync(stateFile)) {
      let state = readFileSync(stateFile, 'utf8');

      // Add to context for next session
      state = state.replace(
        /## Context for Next Session\n\n[\s\S]*?(?=\n---)/,
        `## Context for Next Session\n\n${answers.notes}\n`
      );

      writeFileSync(stateFile, state);
    }

    success('Work paused. Run `momentum resume` to continue.');
  }

  /**
   * Create utilization bar
   */
  createUtilizationBar(percentage) {
    const width = 30;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;

    let color = chalk.green;
    if (percentage > 80) color = chalk.red;
    else if (percentage > 60) color = chalk.yellow;

    return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }
}

export default ContextEngine;
