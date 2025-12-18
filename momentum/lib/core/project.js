/**
 * Project Manager - Core project initialization and management
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import figures from 'figures';
import { success, error, warning, info, header, divider, step } from '../utils/display.js';
import { hasProject, validateGitState } from '../utils/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Project templates for different types
 */
const PROJECT_TEMPLATES = {
  web: {
    name: 'Web Application',
    description: 'Frontend web application (React, Vue, Svelte, etc.)',
    defaultPhases: ['Setup & Foundation', 'Core Features', 'UI/UX Polish', 'Testing & Launch']
  },
  api: {
    name: 'API/Backend',
    description: 'REST/GraphQL API or backend service',
    defaultPhases: ['Setup & Architecture', 'Core Endpoints', 'Auth & Security', 'Testing & Deployment']
  },
  cli: {
    name: 'CLI Tool',
    description: 'Command-line interface application',
    defaultPhases: ['Setup & Commands', 'Core Logic', 'Error Handling', 'Documentation & Release']
  },
  library: {
    name: 'Library/Package',
    description: 'Reusable library or npm package',
    defaultPhases: ['API Design', 'Core Implementation', 'Testing', 'Documentation & Publishing']
  },
  fullstack: {
    name: 'Full-Stack Application',
    description: 'Frontend + Backend + Database',
    defaultPhases: ['Foundation & Setup', 'Backend Core', 'Frontend Core', 'Integration', 'Polish & Launch']
  }
};

export class ProjectManager {
  constructor(dir = process.cwd()) {
    this.dir = dir;
    this.momentumDir = join(dir, '.momentum');
    this.phasesDir = join(this.momentumDir, 'phases');
    this.codebaseDir = join(this.momentumDir, 'codebase');
  }

  /**
   * Initialize a new project
   */
  async initialize(name, options = {}) {
    header('Initialize New Project');
    console.log();

    // Check if project already exists
    if (hasProject(this.dir)) {
      error('A Momentum project already exists in this directory.');
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to reinitialize?',
        default: false
      }]);
      if (!overwrite) return;
    }

    // Check for existing codebase
    const hasCode = this.detectExistingCode();
    if (hasCode && !options.brownfield) {
      warning('Existing code detected in this directory.');
      const { brownfield } = await inquirer.prompt([{
        type: 'confirm',
        name: 'brownfield',
        message: 'Initialize as brownfield project (analyze existing code)?',
        default: true
      }]);
      options.brownfield = brownfield;
    }

    // Git check
    const gitState = await validateGitState(this.dir);
    if (!gitState.isGitRepo && !options.skipGit) {
      const { initGit } = await inquirer.prompt([{
        type: 'confirm',
        name: 'initGit',
        message: 'Initialize git repository?',
        default: true
      }]);
      if (initGit) {
        await this.initGit();
      }
    }

    // Project details through intelligent questioning
    divider('Project Vision');
    console.log(chalk.dim('Let\'s understand what you\'re building...\n'));

    const answers = await this.conductProjectInterview(name, options);

    // Create project structure
    const spinner = ora('Creating project structure...').start();

    try {
      await this.createProjectStructure(answers);
      spinner.succeed('Project structure created');

      // Create initial files
      spinner.start('Writing project documentation...');
      await this.writeProjectFiles(answers);
      spinner.succeed('Project documentation created');

      // Map codebase if brownfield
      if (options.brownfield) {
        spinner.start('Analyzing existing codebase...');
        await this.mapCodebase({ depth: 'quick' });
        spinner.succeed('Codebase analysis complete');
      }

      // Git commit
      if (gitState.isGitRepo || !options.skipGit) {
        spinner.start('Committing initialization...');
        await this.commitChanges('chore: initialize Momentum project');
        spinner.succeed('Changes committed');
      }

      // Success output
      console.log();
      success('Project initialized successfully!');
      console.log();
      divider('Next Steps');
      console.log(`
  ${chalk.cyan('1.')} Review ${chalk.yellow('.momentum/PROJECT.md')} to ensure accuracy
  ${chalk.cyan('2.')} Run ${chalk.yellow('momentum roadmap -c')} to create your roadmap
  ${chalk.cyan('3.')} Run ${chalk.yellow('momentum status')} to view your dashboard
`);

    } catch (err) {
      spinner.fail('Initialization failed');
      error(err.message);
      throw err;
    }
  }

  /**
   * Conduct intelligent project interview
   */
  async conductProjectInterview(name, options) {
    const questions = [];

    // Project name
    if (!name) {
      questions.push({
        type: 'input',
        name: 'name',
        message: 'What is your project called?',
        default: this.dir.split('/').pop(),
        validate: input => input.length > 0 || 'Name is required'
      });
    }

    // Project type
    if (!options.template) {
      questions.push({
        type: 'list',
        name: 'type',
        message: 'What type of project is this?',
        choices: Object.entries(PROJECT_TEMPLATES).map(([key, val]) => ({
          name: `${val.name} - ${chalk.dim(val.description)}`,
          value: key
        }))
      });
    }

    // Vision & Goals
    questions.push(
      {
        type: 'input',
        name: 'vision',
        message: 'Describe your project in one sentence:',
        validate: input => input.length > 10 || 'Please provide a meaningful description'
      },
      {
        type: 'editor',
        name: 'goals',
        message: 'What are the main goals? (Opens editor - describe what success looks like)',
        default: '# Project Goals\n\n- Goal 1: \n- Goal 2: \n- Goal 3: \n'
      },
      {
        type: 'input',
        name: 'audience',
        message: 'Who is the target audience/user?'
      }
    );

    // Technical constraints
    questions.push(
      {
        type: 'input',
        name: 'stack',
        message: 'What technology stack will you use? (or press Enter to decide later)'
      },
      {
        type: 'input',
        name: 'constraints',
        message: 'Any constraints or requirements? (performance, security, compatibility, etc.)'
      }
    );

    // Scope boundaries
    questions.push({
      type: 'editor',
      name: 'scope',
      message: 'Define scope boundaries (what\'s IN and what\'s OUT):',
      default: '# Scope\n\n## In Scope\n- \n\n## Out of Scope\n- \n'
    });

    // Workflow mode
    questions.push({
      type: 'list',
      name: 'mode',
      message: 'Choose your workflow mode:',
      choices: [
        {
          name: `${chalk.green('Hybrid')} ${chalk.dim('(Recommended)')} - Confirm key decisions, auto-approve routine tasks`,
          value: 'hybrid'
        },
        {
          name: `${chalk.yellow('Interactive')} - Confirm every major step`,
          value: 'interactive'
        },
        {
          name: `${chalk.red('Autonomous')} - Full auto-pilot (use with caution)`,
          value: 'autonomous'
        }
      ],
      default: 'hybrid'
    });

    const answers = await inquirer.prompt(questions);

    return {
      name: name || answers.name,
      type: options.template || answers.type,
      ...answers
    };
  }

  /**
   * Create project directory structure
   */
  async createProjectStructure(answers) {
    const dirs = [
      this.momentumDir,
      this.phasesDir,
      join(this.momentumDir, 'checkpoints'),
      join(this.momentumDir, 'analytics')
    ];

    if (answers.type) {
      const template = PROJECT_TEMPLATES[answers.type];
      if (template && template.defaultPhases) {
        template.defaultPhases.forEach((phase, i) => {
          const phaseName = phase.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          dirs.push(join(this.phasesDir, `${String(i + 1).padStart(2, '0')}-${phaseName}`));
        });
      }
    }

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Write project documentation files
   */
  async writeProjectFiles(answers) {
    const template = PROJECT_TEMPLATES[answers.type] || PROJECT_TEMPLATES.web;

    // PROJECT.md
    const projectMd = `# ${answers.name}

> ${answers.vision}

## Overview

**Type:** ${template.name}
**Target Audience:** ${answers.audience || 'TBD'}
**Created:** ${new Date().toISOString().split('T')[0]}

## Goals

${answers.goals}

## Technical Stack

${answers.stack || 'To be determined during planning phase.'}

## Constraints & Requirements

${answers.constraints || 'None specified.'}

## Scope

${answers.scope}

## Success Metrics

- [ ] Define success metrics during roadmap creation

---

*Generated by Momentum v1.0.0*
`;

    writeFileSync(join(this.momentumDir, 'PROJECT.md'), projectMd);

    // config.json
    const config = {
      version: '1.0.0',
      projectName: answers.name,
      projectType: answers.type,
      workflowMode: answers.mode,
      features: {
        parallelExecution: true,
        autoCheckpoints: true,
        learningMode: true,
        smartRetries: true
      },
      git: {
        autoCommit: true,
        commitPrefix: 'chore:',
        branchStrategy: 'feature'
      },
      ai: {
        preferredModel: 'claude',
        contextOptimization: true,
        maxContextTokens: 180000
      },
      created: new Date().toISOString()
    };

    writeFileSync(
      join(this.momentumDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    // STATE.md - Project memory
    const stateMd = `# Project State

> Living document tracking project context, decisions, and accumulated knowledge.

## Current Position

- **Milestone:** 1 (Initial)
- **Phase:** Not started
- **Status:** Initialized

## Key Decisions

*Decisions made during the project will be recorded here.*

## Blockers

*Active blockers will be tracked here.*

## Context for Next Session

*Handoff notes for continuing work.*

---

## Session History

### ${new Date().toISOString().split('T')[0]} - Project Initialized

- Created project structure
- Defined project goals and scope
- Configured workflow mode: ${answers.mode}

---

*Auto-updated by Momentum*
`;

    writeFileSync(join(this.momentumDir, 'STATE.md'), stateMd);

    // ISSUES.md - Deferred issues
    const issuesMd = `# Deferred Issues

> Issues discovered during development that are deferred for later consideration.

## Open Issues

*No open issues yet.*

## Resolved Issues

*Resolved issues will be archived here.*

---

*Auto-updated by Momentum*
`;

    writeFileSync(join(this.momentumDir, 'ISSUES.md'), issuesMd);

    // .gitignore additions
    const gitignorePath = join(this.dir, '.gitignore');
    const gitignoreAdditions = `
# Momentum
.momentum/checkpoints/
.momentum/analytics/
*.momentum-backup
`;

    if (existsSync(gitignorePath)) {
      const existing = readFileSync(gitignorePath, 'utf8');
      if (!existing.includes('.momentum/checkpoints/')) {
        writeFileSync(gitignorePath, existing + gitignoreAdditions);
      }
    }
  }

  /**
   * Map existing codebase
   */
  async mapCodebase(options = {}) {
    const depth = options.depth || 'standard';

    if (!existsSync(this.codebaseDir)) {
      mkdirSync(this.codebaseDir, { recursive: true });
    }

    info(`Analyzing codebase (depth: ${depth})...`);

    // Create codebase documentation files
    const files = {
      'STACK.md': this.analyzeStack(),
      'ARCHITECTURE.md': this.analyzeArchitecture(),
      'STRUCTURE.md': this.analyzeStructure(),
      'CONVENTIONS.md': this.analyzeConventions(),
      'TESTING.md': this.analyzeTesting(),
      'INTEGRATIONS.md': this.analyzeIntegrations(),
      'CONCERNS.md': this.analyzeConcerns()
    };

    for (const [filename, content] of Object.entries(files)) {
      writeFileSync(join(this.codebaseDir, filename), content);
    }

    success(`Codebase analysis complete: ${Object.keys(files).length} documents created`);
  }

  /**
   * Analyze technology stack
   */
  analyzeStack() {
    const stack = { languages: [], frameworks: [], tools: [] };

    // Check for common config files
    const configFiles = {
      'package.json': 'Node.js/JavaScript',
      'requirements.txt': 'Python',
      'Cargo.toml': 'Rust',
      'go.mod': 'Go',
      'pom.xml': 'Java/Maven',
      'build.gradle': 'Java/Gradle',
      'Gemfile': 'Ruby',
      'composer.json': 'PHP'
    };

    for (const [file, lang] of Object.entries(configFiles)) {
      if (existsSync(join(this.dir, file))) {
        stack.languages.push(lang);
      }
    }

    return `# Technology Stack

## Languages

${stack.languages.length > 0 ? stack.languages.map(l => `- ${l}`).join('\n') : '- *Analysis pending*'}

## Frameworks

*To be analyzed*

## Build Tools

*To be analyzed*

## Dependencies

*Run full analysis for detailed dependency information*

---

*Generated by Momentum codebase analyzer*
`;
  }

  /**
   * Stub methods for codebase analysis
   */
  analyzeArchitecture() {
    return `# Architecture Overview\n\n*Detailed analysis pending. Run \`momentum map --depth deep\` for full analysis.*\n`;
  }

  analyzeStructure() {
    return `# Project Structure\n\n*Directory structure analysis pending.*\n`;
  }

  analyzeConventions() {
    return `# Coding Conventions\n\n*Convention analysis pending.*\n`;
  }

  analyzeTesting() {
    return `# Testing Overview\n\n*Testing analysis pending.*\n`;
  }

  analyzeIntegrations() {
    return `# Integrations\n\n*Integration analysis pending.*\n`;
  }

  analyzeConcerns() {
    return `# Known Concerns\n\n*Concern analysis pending.*\n`;
  }

  /**
   * Detect existing code in directory
   */
  detectExistingCode() {
    const codeIndicators = [
      'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod',
      'pom.xml', 'build.gradle', 'Gemfile', 'composer.json',
      'src', 'lib', 'app', 'main.py', 'index.js', 'main.go'
    ];

    return codeIndicators.some(indicator =>
      existsSync(join(this.dir, indicator))
    );
  }

  /**
   * Initialize git repository
   */
  async initGit() {
    const { execSync } = await import('child_process');
    execSync('git init', { cwd: this.dir, stdio: 'ignore' });
    success('Git repository initialized');
  }

  /**
   * Commit changes to git
   */
  async commitChanges(message) {
    const { execSync } = await import('child_process');
    try {
      execSync('git add .momentum/', { cwd: this.dir, stdio: 'ignore' });
      execSync(`git commit -m "${message}"`, { cwd: this.dir, stdio: 'ignore' });
    } catch {
      // May fail if nothing to commit
    }
  }

  /**
   * Create a rollback checkpoint
   */
  async createCheckpoint(name, options = {}) {
    const { execSync } = await import('child_process');
    const checkpointName = name || `checkpoint-${Date.now()}`;
    const checkpointDir = join(this.momentumDir, 'checkpoints', checkpointName);

    mkdirSync(checkpointDir, { recursive: true });

    // Get current git state
    const gitState = {
      branch: execSync('git branch --show-current', { cwd: this.dir, encoding: 'utf8' }).trim(),
      commit: execSync('git rev-parse HEAD', { cwd: this.dir, encoding: 'utf8' }).trim(),
      message: options.message || '',
      timestamp: new Date().toISOString()
    };

    writeFileSync(
      join(checkpointDir, 'checkpoint.json'),
      JSON.stringify(gitState, null, 2)
    );

    success(`Checkpoint created: ${checkpointName}`);
    return checkpointName;
  }

  /**
   * Rollback to a checkpoint
   */
  async rollback(checkpoint, options = {}) {
    const checkpointsDir = join(this.momentumDir, 'checkpoints');

    if (options.list) {
      const checkpoints = existsSync(checkpointsDir)
        ? readdirSync(checkpointsDir)
        : [];

      if (checkpoints.length === 0) {
        info('No checkpoints available');
        return;
      }

      console.log(chalk.cyan.bold('\nAvailable Checkpoints:\n'));
      for (const cp of checkpoints) {
        const cpFile = join(checkpointsDir, cp, 'checkpoint.json');
        if (existsSync(cpFile)) {
          const data = JSON.parse(readFileSync(cpFile, 'utf8'));
          console.log(`  ${figures.pointer} ${chalk.yellow(cp)}`);
          console.log(`    ${chalk.dim(`Commit: ${data.commit.slice(0, 8)} | ${data.timestamp}`)}`);
        }
      }
      return;
    }

    if (!checkpoint) {
      error('Checkpoint name required. Use --list to see available checkpoints.');
      return;
    }

    const cpFile = join(checkpointsDir, checkpoint, 'checkpoint.json');
    if (!existsSync(cpFile)) {
      error(`Checkpoint not found: ${checkpoint}`);
      return;
    }

    const { execSync } = await import('child_process');
    const data = JSON.parse(readFileSync(cpFile, 'utf8'));

    if (options.preview) {
      info(`Would rollback to commit: ${data.commit}`);
      execSync(`git diff ${data.commit}..HEAD --stat`, { cwd: this.dir, stdio: 'inherit' });
      return;
    }

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Rollback to ${checkpoint}? This will reset to commit ${data.commit.slice(0, 8)}`,
      default: false
    }]);

    if (confirm) {
      execSync(`git reset --hard ${data.commit}`, { cwd: this.dir, stdio: 'ignore' });
      success(`Rolled back to checkpoint: ${checkpoint}`);
    }
  }

  /**
   * Manage issues
   */
  async manageIssues(options = {}) {
    const issuesFile = join(this.momentumDir, 'ISSUES.md');

    if (options.add) {
      const content = existsSync(issuesFile) ? readFileSync(issuesFile, 'utf8') : '';
      const newIssue = `\n- [ ] ${options.add} *(Added: ${new Date().toISOString().split('T')[0]})*`;
      const updated = content.replace(
        '## Open Issues\n',
        `## Open Issues\n${newIssue}`
      );
      writeFileSync(issuesFile, updated);
      success(`Issue added: ${options.add}`);
      return;
    }

    if (options.list || options.review) {
      if (!existsSync(issuesFile)) {
        info('No issues file found');
        return;
      }
      console.log(readFileSync(issuesFile, 'utf8'));
    }
  }

  /**
   * Manage configuration
   */
  async manageConfig(options = {}) {
    const configFile = join(this.momentumDir, 'config.json');

    if (!existsSync(configFile)) {
      error('No Momentum project found. Run `momentum init` first.');
      return;
    }

    const config = JSON.parse(readFileSync(configFile, 'utf8'));

    if (options.set) {
      const [key, value] = options.set.split('=');
      if (!key || value === undefined) {
        error('Invalid format. Use: --set key=value');
        return;
      }

      // Support nested keys with dot notation
      const keys = key.split('.');
      let obj = config;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]] = obj[keys[i]] || {};
      }
      obj[keys[keys.length - 1]] = value === 'true' ? true : value === 'false' ? false : value;

      writeFileSync(configFile, JSON.stringify(config, null, 2));
      success(`Configuration updated: ${key} = ${value}`);
      return;
    }

    if (options.list) {
      console.log(chalk.cyan.bold('\nProject Configuration:\n'));
      console.log(JSON.stringify(config, null, 2));
    }
  }

  /**
   * Install Claude Code commands
   */
  async installCommands(options = {}) {
    const { homedir } = await import('os');

    const targetDir = options.global
      ? join(homedir(), '.claude', 'commands', 'mtm')
      : join(this.dir, '.claude', 'commands', 'mtm');

    const templateDir = join(__dirname, '..', '..', 'commands');

    if (!existsSync(templateDir)) {
      error('Command templates not found');
      return;
    }

    mkdirSync(targetDir, { recursive: true });

    const files = readdirSync(templateDir);
    for (const file of files) {
      copyFileSync(join(templateDir, file), join(targetDir, file));
    }

    success(`Commands installed to: ${targetDir}`);
    info(`Use /mtm:help to see available commands`);
  }
}

export default ProjectManager;
