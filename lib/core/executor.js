/**
 * Plan Executor - Intelligent plan execution with parallel support
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import figures from 'figures';
import { success, error, warning, info, header, divider, step, taskStatus, createProgressBar } from '../utils/display.js';
import { validatePlanFile } from '../utils/validate.js';
import { WorktreeContext } from './worktree-context.js';
import { MemoryStore } from './memory-store.js';
import { PatternLearner } from './pattern-learner.js';
import { DecisionCache } from './decision-cache.js';

/**
 * Execution strategies
 */
const STRATEGIES = {
  AUTO: 'auto',
  SEQUENTIAL: 'sequential',
  PARALLEL: 'parallel',
  HYBRID: 'hybrid'
};

/**
 * Task states
 */
const TASK_STATE = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  BLOCKED: 'blocked',
  SKIPPED: 'skipped'
};

export class PlanExecutor {
  constructor(dir = process.cwd()) {
    this.dir = dir;
    this.momentumDir = join(dir, '.momentum');
    this.currentPlan = null;
    this.tasks = [];
    this.executionLog = [];
    this.checkpoints = [];
    this.worktreeContext = new WorktreeContext(dir);

    // Initialize memory system
    this.memory = new MemoryStore();
    this.patternLearner = new PatternLearner(this.memory);
    this.decisionCache = new DecisionCache(this.memory);
    this.executionStartTime = null;
  }

  /**
   * Execute a plan
   */
  async execute(planPath, options = {}) {
    this.executionStartTime = Date.now();

    header('Execute Plan');
    console.log();

    // Resolve plan path
    const resolvedPath = this.resolvePlanPath(planPath);

    if (!resolvedPath) {
      error('Plan file not found. Specify a valid plan path or run from a phase directory.');
      return;
    }

    info(`Executing: ${basename(resolvedPath)}`);

    // Show worktree context
    const wtInfo = this.worktreeContext.formatInfo();
    if (wtInfo.type === 'worktree') {
      console.log(chalk.cyan('Worktree:'), chalk.yellow(`${wtInfo.name} (${wtInfo.branch})`));
      console.log(chalk.dim(`  Path: ${this.worktreeContext.worktreeRoot}`));
    } else {
      console.log(chalk.cyan('Repository:'), 'Main');
    }
    console.log();

    // Validate plan
    const planContent = readFileSync(resolvedPath, 'utf8');
    const validation = validatePlanFile(planContent);

    if (!validation.valid) {
      error('Plan validation failed:');
      validation.issues.forEach(issue => console.log(chalk.red(`  ${figures.pointer} ${issue}`)));
      return;
    }

    // Check for existing summary (already executed)
    const summaryPath = resolvedPath.replace('-PLAN.md', '-SUMMARY.md');
    if (existsSync(summaryPath) && !options.force) {
      warning('This plan has already been executed.');
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'View summary', value: 'view' },
          { name: 'Re-execute plan', value: 'reexecute' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }]);

      if (action === 'view') {
        console.log(readFileSync(summaryPath, 'utf8'));
        return;
      } else if (action === 'cancel') {
        return;
      }
    }

    // Parse plan
    this.currentPlan = this.parsePlan(planContent, resolvedPath);

    // Load config
    const configFile = join(this.momentumDir, 'config.json');
    const config = existsSync(configFile)
      ? JSON.parse(readFileSync(configFile, 'utf8'))
      : { workflowMode: 'hybrid' };

    // Create worktree if enabled
    if (config.features?.useWorktrees) {
      const { WorktreeManager } = await import('./worktree.js');
      const wm = new WorktreeManager(this.dir);
      wm.init();
      const planName = basename(resolvedPath).replace('-PLAN.md', '');
      try {
        const wt = await wm.create(planName);
        info(`Created worktree: ${wt.name}`);
        // Execute in worktree context
        this.executionContext = wt.path;
      } catch (err) {
        // Worktree may already exist, check if it's the one we want
        const existing = wm.get(planName);
        if (existing) {
          warning(`Using existing worktree: ${planName}`);
          this.executionContext = existing.path;
        } else {
          throw err;
        }
      }
    }

    // Determine execution strategy
    const strategy = options.strategy || this.determineStrategy(this.currentPlan, config);
    info(`Execution strategy: ${strategy}`);

    // Dry run check
    if (options.dryRun) {
      return this.previewExecution(this.currentPlan, strategy);
    }

    // Create checkpoint
    if (config.features?.autoCheckpoints) {
      await this.createCheckpoint(`pre-${basename(resolvedPath)}`);
    }

    // Execute based on strategy
    const startTime = Date.now();

    try {
      switch (strategy) {
        case STRATEGIES.PARALLEL:
          await this.executeParallel(this.currentPlan, config);
          break;
        case STRATEGIES.HYBRID:
          await this.executeHybrid(this.currentPlan, config);
          break;
        case STRATEGIES.SEQUENTIAL:
        default:
          await this.executeSequential(this.currentPlan, config);
      }

      const duration = Date.now() - startTime;

      // Generate summary
      await this.generateSummary(resolvedPath, duration);

      // Update state
      await this.updateState();

      // Commit changes
      await this.commitChanges(`feat: complete ${basename(resolvedPath).replace('-PLAN.md', '')}`);

      // Record execution in memory
      await this.recordExecutionInMemory(resolvedPath, duration, true);

      success('Plan execution complete!');
      this.displayExecutionSummary(duration);

    } catch (err) {
      error(`Execution failed: ${err.message}`);

      // Record failed execution in memory
      const duration = Date.now() - this.executionStartTime;
      await this.recordExecutionInMemory(resolvedPath, duration, false, [err.message]);

      // Create failure checkpoint
      await this.createCheckpoint(`failed-${basename(resolvedPath)}`);

      // Offer retry
      const { retry } = await inquirer.prompt([{
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to retry failed tasks?',
        default: true
      }]);

      if (retry) {
        await this.retry(options);
      }
    }
  }

  /**
   * Resolve plan path from various inputs
   */
  resolvePlanPath(planPath) {
    if (planPath && existsSync(planPath)) {
      return planPath;
    }

    // Try relative to momentum dir
    if (planPath) {
      const momentumPath = join(this.momentumDir, planPath);
      if (existsSync(momentumPath)) return momentumPath;

      const phasesPath = join(this.momentumDir, 'phases', planPath);
      if (existsSync(phasesPath)) return phasesPath;
    }

    // Find next unexecuted plan
    const phasesDir = join(this.momentumDir, 'phases');
    if (!existsSync(phasesDir)) return null;

    const phases = readdirSync(phasesDir).sort();
    for (const phase of phases) {
      const phaseDir = join(phasesDir, phase);
      const plans = readdirSync(phaseDir).filter(f => f.endsWith('-PLAN.md')).sort();

      for (const plan of plans) {
        const summaryPath = join(phaseDir, plan.replace('-PLAN.md', '-SUMMARY.md'));
        if (!existsSync(summaryPath)) {
          return join(phaseDir, plan);
        }
      }
    }

    return null;
  }

  /**
   * Parse plan content into structured format
   */
  parsePlan(content, path) {
    const plan = {
      path,
      objective: '',
      context: '',
      tasks: [],
      verificationSteps: [],
      successCriteria: '',
      checkpoints: [],
      dependencies: []
    };

    // Extract objective
    const objectiveMatch = content.match(/## Objective\n\n([\s\S]*?)(?=\n##|$)/);
    if (objectiveMatch) {
      plan.objective = objectiveMatch[1].trim();
    }

    // Extract tasks
    const tasksMatch = content.match(/## Tasks\n\n([\s\S]*?)(?=\n##|$)/);
    if (tasksMatch) {
      const taskContent = tasksMatch[1];

      // Parse task blocks
      const taskPattern = /### Task \d+: (.+)\n([\s\S]*?)(?=### Task|$)/g;
      let match;

      while ((match = taskPattern.exec(taskContent)) !== null) {
        const taskName = match[1].trim();
        const taskBody = match[2].trim();

        plan.tasks.push({
          id: `task-${plan.tasks.length + 1}`,
          name: taskName,
          description: this.extractField(taskBody, 'Description'),
          files: this.extractField(taskBody, 'Files involved')?.split(',').map(f => f.trim()) || [],
          verification: this.extractField(taskBody, 'Verification'),
          dependencies: this.extractField(taskBody, 'Dependencies')?.split(',').map(d => d.trim()) || [],
          status: TASK_STATE.PENDING,
          result: null,
          error: null
        });
      }

      // Also parse simple checkbox format
      const checkboxPattern = /- \[ \] (.+)/g;
      while ((match = checkboxPattern.exec(taskContent)) !== null) {
        if (!plan.tasks.some(t => t.name === match[1])) {
          plan.tasks.push({
            id: `task-${plan.tasks.length + 1}`,
            name: match[1].trim(),
            description: '',
            files: [],
            verification: '',
            dependencies: [],
            status: TASK_STATE.PENDING,
            result: null,
            error: null
          });
        }
      }
    }

    // Extract verification steps
    const verifyMatch = content.match(/## Verification Steps\n\n([\s\S]*?)(?=\n##|$)/);
    if (verifyMatch) {
      const steps = verifyMatch[1].match(/\d+\. \[ \] (.+)/g) || [];
      plan.verificationSteps = steps.map(s => s.replace(/\d+\. \[ \] /, ''));
    }

    // Extract success criteria
    const criteriaMatch = content.match(/## Success Criteria\n\n([\s\S]*?)(?=\n##|$)/);
    if (criteriaMatch) {
      plan.successCriteria = criteriaMatch[1].trim();
    }

    // Check for checkpoints
    plan.checkpoints = content.includes('[CHECKPOINT]') || content.includes('checkpoint:');

    return plan;
  }

  /**
   * Extract a field from task body
   */
  extractField(body, fieldName) {
    const pattern = new RegExp(`- ${fieldName}:\\s*(.+)`, 'i');
    const match = body.match(pattern);
    return match ? match[1].trim() : null;
  }

  /**
   * Determine best execution strategy
   */
  determineStrategy(plan, config) {
    // If checkpoints exist, use sequential
    if (plan.checkpoints) {
      return STRATEGIES.SEQUENTIAL;
    }

    // If tasks have dependencies, use hybrid
    const hasDeps = plan.tasks.some(t => t.dependencies.length > 0);
    if (hasDeps) {
      return STRATEGIES.HYBRID;
    }

    // If parallel execution enabled and multiple tasks
    if (config.features?.parallelExecution && plan.tasks.length > 2) {
      return STRATEGIES.PARALLEL;
    }

    return STRATEGIES.SEQUENTIAL;
  }

  /**
   * Execute tasks sequentially
   */
  async executeSequential(plan, config) {
    divider('Sequential Execution');

    // Show execution context
    const wtInfo = this.worktreeContext.formatInfo();
    if (wtInfo.type === 'worktree') {
      console.log(chalk.dim(`Executing in worktree: ${wtInfo.name} (${wtInfo.branch})`));
      console.log();
    }

    for (let i = 0; i < plan.tasks.length; i++) {
      const task = plan.tasks[i];

      console.log();
      step(i + 1, task.name);
      taskStatus(task.name, TASK_STATE.IN_PROGRESS);

      task.status = TASK_STATE.IN_PROGRESS;
      task.startTime = Date.now();

      try {
        // Simulate task execution (in real implementation, this would delegate to Claude)
        await this.executeTask(task, config);

        task.status = TASK_STATE.COMPLETED;
        task.endTime = Date.now();
        taskStatus(task.name, TASK_STATE.COMPLETED);

        this.executionLog.push({
          task: task.name,
          status: 'completed',
          duration: task.endTime - task.startTime
        });

      } catch (err) {
        task.status = TASK_STATE.FAILED;
        task.error = err.message;
        taskStatus(task.name, TASK_STATE.FAILED);

        this.executionLog.push({
          task: task.name,
          status: 'failed',
          error: err.message
        });

        // In interactive mode, ask to continue
        if (config.workflowMode === 'interactive') {
          const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: `Task "${task.name}" failed. What would you like to do?`,
            choices: [
              { name: 'Retry this task', value: 'retry' },
              { name: 'Skip and continue', value: 'skip' },
              { name: 'Abort execution', value: 'abort' }
            ]
          }]);

          if (action === 'retry') {
            i--; // Retry same task
          } else if (action === 'abort') {
            throw new Error('Execution aborted by user');
          }
        }
      }

      // Progress update
      const completed = plan.tasks.filter(t => t.status === TASK_STATE.COMPLETED).length;
      console.log(createProgressBar(completed, plan.tasks.length, 20));
    }
  }

  /**
   * Execute tasks in parallel (where possible)
   */
  async executeParallel(plan, config) {
    divider('Parallel Execution');

    const { AgentPool } = await import('./agent-pool.js');
    const pool = new AgentPool({
      maxAgents: config.features?.maxAgents || 4
    });

    await pool.init(this.dir);

    // Convert tasks to agent tasks
    const agentTasks = plan.tasks.map(task => ({
      id: task.id,
      name: task.name,
      prompt: this.buildTaskPrompt(task, plan)
    }));

    // Subscribe to events
    pool.on('agent:spawn', ({ taskId }) => {
      info(`Agent spawned: ${taskId}`);
    });

    pool.on('agent:complete', ({ taskId, code }) => {
      const status = code === 0 ? 'completed' : 'failed';
      taskStatus(taskId, status);
    });

    // Execute all
    const results = await pool.distribute(agentTasks);

    // Merge successful results
    const mergeResults = await pool.mergeAll();

    // Cleanup
    await pool.cleanup();

    // Update task statuses
    for (const task of plan.tasks) {
      const result = results[task.id];
      task.status = result?.success ? 'completed' : 'failed';
      task.error = result?.error;
    }
  }

  /**
   * Execute with hybrid strategy (parallel where possible, sequential where needed)
   */
  async executeHybrid(plan, config) {
    divider('Hybrid Execution');

    // Build dependency graph
    const graph = this.buildDependencyGraph(plan.tasks);

    // Execute in topological order with parallelization
    const executed = new Set();

    while (executed.size < plan.tasks.length) {
      // Find tasks ready to execute
      const ready = plan.tasks.filter(task =>
        !executed.has(task.id) &&
        task.dependencies.every(dep => executed.has(dep))
      );

      if (ready.length === 0) {
        error('Circular dependency detected or unresolvable dependencies');
        break;
      }

      // Execute ready tasks in parallel
      if (ready.length > 1) {
        info(`Executing ${ready.length} tasks in parallel`);
      }

      await Promise.all(ready.map(async task => {
        task.status = TASK_STATE.IN_PROGRESS;
        try {
          await this.executeTask(task, config);
          task.status = TASK_STATE.COMPLETED;
        } catch (err) {
          task.status = TASK_STATE.FAILED;
          task.error = err.message;
        }
        executed.add(task.id);
        taskStatus(task.name, task.status);
      }));
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(task, config) {
    // This is where the actual execution happens
    // In a real implementation, this would:
    // 1. Prepare context for the AI
    // 2. Send task to Claude/AI for execution
    // 3. Monitor progress
    // 4. Verify results

    // For now, simulate with a delay
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    await delay(100 + Math.random() * 200);

    // Log execution
    this.executionLog.push({
      timestamp: new Date().toISOString(),
      task: task.name,
      action: 'executed',
      files: task.files
    });

    return { success: true };
  }

  /**
   * Build prompt for agent
   */
  buildTaskPrompt(task, plan) {
    return `
## Task: ${task.name}

${task.description}

### Files to modify:
${task.files.join('\n')}

### Context:
${plan.context}

### Verification:
${task.verification}

Execute this task. Commit changes when complete.
`;
  }

  /**
   * Group tasks by dependency level
   */
  groupByDependencyLevel(tasks) {
    const levels = [];
    const assigned = new Set();

    while (assigned.size < tasks.length) {
      const currentLevel = tasks.filter(task =>
        !assigned.has(task.id) &&
        task.dependencies.every(dep => assigned.has(dep))
      );

      if (currentLevel.length === 0) break;

      levels.push(currentLevel);
      currentLevel.forEach(task => assigned.add(task.id));
    }

    return levels;
  }

  /**
   * Build dependency graph
   */
  buildDependencyGraph(tasks) {
    const graph = {};
    tasks.forEach(task => {
      graph[task.id] = task.dependencies;
    });
    return graph;
  }

  /**
   * Preview execution without running
   */
  previewExecution(plan, strategy) {
    header('Execution Preview (Dry Run)');

    console.log(chalk.cyan('\nObjective:'), plan.objective);
    console.log(chalk.cyan('Strategy:'), strategy);
    console.log(chalk.cyan('Tasks:'), plan.tasks.length);

    console.log(chalk.cyan.bold('\nTasks to execute:\n'));

    plan.tasks.forEach((task, i) => {
      console.log(`  ${chalk.yellow(i + 1)}. ${task.name}`);
      if (task.files.length > 0) {
        console.log(chalk.dim(`     Files: ${task.files.join(', ')}`));
      }
      if (task.dependencies.length > 0) {
        console.log(chalk.dim(`     Depends on: ${task.dependencies.join(', ')}`));
      }
    });

    console.log(chalk.cyan.bold('\nVerification steps:\n'));
    plan.verificationSteps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });

    console.log();
    info('This was a dry run. No changes were made.');
  }

  /**
   * Generate execution summary
   */
  async generateSummary(planPath, duration) {
    const summaryPath = planPath.replace('-PLAN.md', '-SUMMARY.md');

    const completed = this.currentPlan.tasks.filter(t => t.status === TASK_STATE.COMPLETED).length;
    const failed = this.currentPlan.tasks.filter(t => t.status === TASK_STATE.FAILED).length;

    const wtInfo = this.worktreeContext.formatInfo();
    const contextLine = wtInfo.type === 'worktree'
      ? `- **Context:** Worktree \`${wtInfo.name}\` (branch: \`${wtInfo.branch}\`)\n`
      : '';

    const summary = `# Execution Summary

> ${this.currentPlan.objective}

## Results

- **Status:** ${failed === 0 ? '✅ Success' : '⚠️ Completed with errors'}
${contextLine}- **Duration:** ${Math.round(duration / 1000)}s
- **Tasks:** ${completed}/${this.currentPlan.tasks.length} completed
${failed > 0 ? `- **Failed:** ${failed} tasks` : ''}

## Task Details

${this.currentPlan.tasks.map(task => `
### ${task.name}

- **Status:** ${task.status}
- **Duration:** ${task.endTime && task.startTime ? `${task.endTime - task.startTime}ms` : 'N/A'}
${task.error ? `- **Error:** ${task.error}` : ''}
`).join('\n')}

## Changes Made

*Files modified during execution will be listed here by the AI executor.*

## Verification

${this.currentPlan.verificationSteps.map(step => `- [ ] ${step}`).join('\n')}

## Notes

*Any notes from execution will be added here.*

---

*Generated by Momentum at ${new Date().toISOString()}*
`;

    writeFileSync(summaryPath, summary);
    info(`Summary written to: ${basename(summaryPath)}`);
  }

  /**
   * Update project state
   */
  async updateState() {
    const stateFile = join(this.momentumDir, 'STATE.md');
    if (!existsSync(stateFile)) return;

    const content = readFileSync(stateFile, 'utf8');

    // Add to session history
    const historyEntry = `\n### ${new Date().toISOString().split('T')[0]} - Plan Executed

- Executed: ${basename(this.currentPlan.path)}
- Tasks completed: ${this.currentPlan.tasks.filter(t => t.status === TASK_STATE.COMPLETED).length}/${this.currentPlan.tasks.length}
`;

    const updated = content.replace(
      /## Session History/,
      `## Session History${historyEntry}`
    );

    writeFileSync(stateFile, updated);
  }

  /**
   * Retry failed tasks
   */
  async retry(options = {}) {
    if (!this.currentPlan) {
      error('No plan loaded. Execute a plan first.');
      return;
    }

    const failedTasks = this.currentPlan.tasks.filter(t => t.status === TASK_STATE.FAILED);

    if (failedTasks.length === 0) {
      info('No failed tasks to retry.');
      return;
    }

    info(`Retrying ${failedTasks.length} failed tasks...`);

    for (const task of failedTasks) {
      task.status = TASK_STATE.PENDING;
      task.error = null;
    }

    const config = JSON.parse(readFileSync(join(this.momentumDir, 'config.json'), 'utf8'));
    await this.executeSequential(this.currentPlan, config);
  }

  /**
   * Create a checkpoint
   */
  async createCheckpoint(name) {
    const { execSync } = await import('child_process');
    const checkpointDir = join(this.momentumDir, 'checkpoints', name);

    try {
      const { mkdirSync, writeFileSync } = await import('fs');
      mkdirSync(checkpointDir, { recursive: true });

      const checkpoint = {
        name,
        timestamp: new Date().toISOString(),
        commit: execSync('git rev-parse HEAD', { cwd: this.dir, encoding: 'utf8' }).trim(),
        plan: this.currentPlan?.path
      };

      writeFileSync(join(checkpointDir, 'checkpoint.json'), JSON.stringify(checkpoint, null, 2));
    } catch {
      // Checkpoint creation is optional
    }
  }

  /**
   * Commit changes
   */
  async commitChanges(message) {
    const { execSync } = await import('child_process');
    try {
      execSync('git add -A', { cwd: this.dir, stdio: 'ignore' });
      execSync(`git commit -m "${message}"`, { cwd: this.dir, stdio: 'ignore' });
    } catch {
      // May fail if nothing to commit
    }
  }

  /**
   * Display execution summary
   */
  displayExecutionSummary(duration) {
    const completed = this.currentPlan.tasks.filter(t => t.status === TASK_STATE.COMPLETED).length;
    const failed = this.currentPlan.tasks.filter(t => t.status === TASK_STATE.FAILED).length;

    console.log();
    divider('Summary');

    const wtInfo = this.worktreeContext.formatInfo();
    console.log(`
  ${chalk.cyan('Context:')} ${wtInfo.type === 'worktree' ? `Worktree: ${wtInfo.name} (${wtInfo.branch})` : 'Main Repository'}
  ${chalk.cyan('Duration:')} ${Math.round(duration / 1000)}s
  ${chalk.cyan('Tasks:')} ${completed}/${this.currentPlan.tasks.length} completed
  ${failed > 0 ? chalk.red(`Failed: ${failed}`) : ''}
`);
  }

  /**
   * Record execution in memory system
   */
  async recordExecutionInMemory(planPath, duration, success, errors = []) {
    try {
      // Record execution
      await this.memory.recordExecution(planPath, duration, success, errors);

      // Learn patterns from successful execution
      if (success && this.currentPlan) {
        const execution = {
          success: true,
          planPath,
          duration,
          filesCreated: this.extractCreatedFiles(),
          importsAdded: this.extractImports(),
          testsCreated: this.extractTests(),
          commitMessage: this.lastCommitMessage
        };

        await this.patternLearner.learnFromExecution(execution);
      }
    } catch (err) {
      // Memory recording is optional - don't fail execution if it fails
      console.error(chalk.gray(`Note: Failed to record in memory: ${err.message}`));
    }
  }

  /**
   * Extract created files from execution
   */
  extractCreatedFiles() {
    const files = [];

    if (this.currentPlan && this.currentPlan.tasks) {
      for (const task of this.currentPlan.tasks) {
        if (task.files && Array.isArray(task.files)) {
          files.push(...task.files);
        }
      }
    }

    return files;
  }

  /**
   * Extract imports from execution (placeholder)
   */
  extractImports() {
    // Placeholder - would analyze created files for imports
    return [];
  }

  /**
   * Extract tests from execution
   */
  extractTests() {
    const tests = [];

    if (this.currentPlan && this.currentPlan.tasks) {
      for (const task of this.currentPlan.tasks) {
        if (task.files && Array.isArray(task.files)) {
          const testFiles = task.files.filter(f =>
            f.includes('.test.') || f.includes('.spec.') || f.includes('/tests/')
          );
          tests.push(...testFiles);
        }
      }
    }

    return tests;
  }
}

export default PlanExecutor;
