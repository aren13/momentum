/**
 * Roadmap Manager - Phase planning and management
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import figures from 'figures';
import { success, error, warning, info, header, divider, step, createProgressBar } from '../utils/display.js';
import { hasProject, validateProjectStructure } from '../utils/validate.js';

export class RoadmapManager {
  constructor(dir = process.cwd()) {
    this.dir = dir;
    this.momentumDir = join(dir, '.momentum');
    this.phasesDir = join(this.momentumDir, 'phases');
  }

  /**
   * Main roadmap management entry point
   */
  async manage(options = {}) {
    // Validate project exists
    if (!hasProject(this.dir)) {
      error('No Momentum project found. Run `momentum init` first.');
      return;
    }

    if (options.create) {
      await this.createRoadmap();
    } else if (options.edit) {
      await this.editRoadmap();
    } else if (options.milestone) {
      await this.createMilestone(options.milestone);
    } else {
      await this.viewRoadmap();
    }
  }

  /**
   * Create a new roadmap
   */
  async createRoadmap() {
    header('Create Project Roadmap');
    console.log();

    // Check for existing roadmap
    const roadmapFile = join(this.momentumDir, 'ROADMAP.md');
    if (existsSync(roadmapFile)) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'A roadmap already exists. What would you like to do?',
        choices: [
          { name: 'View existing roadmap', value: 'view' },
          { name: 'Replace with new roadmap', value: 'replace' },
          { name: 'Add new milestone', value: 'milestone' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }]);

      if (action === 'view') {
        return this.viewRoadmap();
      } else if (action === 'milestone') {
        return this.createMilestone();
      } else if (action === 'cancel') {
        return;
      }
    }

    // Load project info
    const projectFile = join(this.momentumDir, 'PROJECT.md');
    const projectContent = existsSync(projectFile)
      ? readFileSync(projectFile, 'utf8')
      : '';

    // Extract project name from PROJECT.md
    const projectNameMatch = projectContent.match(/^# (.+)$/m);
    const projectName = projectNameMatch ? projectNameMatch[1] : 'Project';

    info(`Creating roadmap for: ${projectName}`);
    console.log();

    // Milestone definition
    divider('Milestone Definition');

    const milestoneAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'milestoneName',
        message: 'What is this milestone called?',
        default: 'MVP',
        validate: input => input.length > 0 || 'Name required'
      },
      {
        type: 'input',
        name: 'milestoneGoal',
        message: 'What does this milestone achieve?',
        validate: input => input.length > 0 || 'Goal required'
      }
    ]);

    // Phase definition
    divider('Phase Planning');
    console.log(chalk.dim('Define the phases needed to complete this milestone.\n'));

    const phases = [];
    let addMore = true;
    let phaseNum = 1;

    while (addMore) {
      const phaseAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: `Phase ${phaseNum} name:`,
          validate: input => input.length > 0 || 'Name required'
        },
        {
          type: 'input',
          name: 'description',
          message: `Phase ${phaseNum} description (what will be built):`,
          validate: input => input.length > 0 || 'Description required'
        },
        {
          type: 'input',
          name: 'deliverables',
          message: `Phase ${phaseNum} deliverables (comma-separated):`
        },
        {
          type: 'list',
          name: 'complexity',
          message: `Phase ${phaseNum} complexity:`,
          choices: [
            { name: 'Low - Straightforward implementation', value: 'low' },
            { name: 'Medium - Some unknowns or complexity', value: 'medium' },
            { name: 'High - Complex or requires research', value: 'high' }
          ]
        },
        {
          type: 'confirm',
          name: 'addMore',
          message: 'Add another phase?',
          default: phaseNum < 4
        }
      ]);

      phases.push({
        number: phaseNum,
        name: phaseAnswers.name,
        description: phaseAnswers.description,
        deliverables: phaseAnswers.deliverables.split(',').map(d => d.trim()).filter(Boolean),
        complexity: phaseAnswers.complexity,
        status: 'pending'
      });

      addMore = phaseAnswers.addMore;
      phaseNum++;
    }

    // Generate roadmap
    const spinner = ora('Generating roadmap...').start();

    try {
      await this.writeRoadmapFiles(milestoneAnswers, phases);
      spinner.succeed('Roadmap created');

      // Create phase directories
      spinner.start('Creating phase directories...');
      for (const phase of phases) {
        const phaseName = phase.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const phaseDir = join(this.phasesDir, `${String(phase.number).padStart(2, '0')}-${phaseName}`);
        if (!existsSync(phaseDir)) {
          mkdirSync(phaseDir, { recursive: true });
        }
      }
      spinner.succeed('Phase directories created');

      // Update STATE.md
      spinner.start('Updating project state...');
      await this.updateState(milestoneAnswers, phases);
      spinner.succeed('Project state updated');

      // Git commit
      spinner.start('Committing changes...');
      await this.commitChanges('chore: create project roadmap');
      spinner.succeed('Changes committed');

      // Success output
      console.log();
      success('Roadmap created successfully!');
      console.log();
      divider('Summary');
      console.log(`
  ${chalk.cyan('Milestone:')} ${milestoneAnswers.milestoneName}
  ${chalk.cyan('Phases:')} ${phases.length}
  ${chalk.cyan('Next step:')} Run ${chalk.yellow(`momentum phase plan 1`)} to create your first plan
`);

    } catch (err) {
      spinner.fail('Roadmap creation failed');
      error(err.message);
      throw err;
    }
  }

  /**
   * Write roadmap files
   */
  async writeRoadmapFiles(milestone, phases) {
    const roadmapContent = `# Project Roadmap

> Strategic breakdown of project phases and milestones.

## Milestone: ${milestone.milestoneName}

**Goal:** ${milestone.milestoneGoal}

---

${phases.map(phase => `
### Phase ${phase.number}: ${phase.name}

**Description:** ${phase.description}

**Complexity:** ${phase.complexity.charAt(0).toUpperCase() + phase.complexity.slice(1)}

**Status:** ${phase.status === 'completed' ? '✅ Completed' : phase.status === 'in-progress' ? '🔄 In Progress' : '⏳ Pending'}

**Deliverables:**
${phase.deliverables.length > 0
  ? phase.deliverables.map(d => `- [ ] ${d}`).join('\n')
  : '- [ ] To be defined during planning'}

**Plans:**
- *Run \`momentum phase plan ${phase.number}\` to create execution plans*

---
`).join('\n')}

## Progress Tracking

| Phase | Status | Plans | Completion |
|-------|--------|-------|------------|
${phases.map(p => `| ${p.number}. ${p.name} | ${p.status} | 0/0 | 0% |`).join('\n')}

---

*Auto-updated by Momentum*
`;

    writeFileSync(join(this.momentumDir, 'ROADMAP.md'), roadmapContent);
  }

  /**
   * Update project state
   */
  async updateState(milestone, phases) {
    const stateFile = join(this.momentumDir, 'STATE.md');
    const content = existsSync(stateFile) ? readFileSync(stateFile, 'utf8') : '';

    // Update current position
    const updated = content.replace(
      /## Current Position[\s\S]*?(?=##|$)/,
      `## Current Position

- **Milestone:** ${milestone.milestoneName}
- **Phase:** 1 - ${phases[0].name}
- **Status:** Ready to plan
- **Total Phases:** ${phases.length}

`
    );

    writeFileSync(stateFile, updated);
  }

  /**
   * View existing roadmap
   */
  async viewRoadmap() {
    const roadmapFile = join(this.momentumDir, 'ROADMAP.md');

    if (!existsSync(roadmapFile)) {
      warning('No roadmap found. Run `momentum roadmap -c` to create one.');
      return;
    }

    const content = readFileSync(roadmapFile, 'utf8');

    // Parse and display with visual enhancements
    header('Project Roadmap');
    console.log();

    // Extract milestone
    const milestoneMatch = content.match(/## Milestone: (.+)/);
    if (milestoneMatch) {
      console.log(chalk.cyan.bold(`📍 ${milestoneMatch[1]}`));
      console.log();
    }

    // Extract and display phases
    const phasePattern = /### Phase (\d+): (.+)\n\n\*\*Description:\*\* (.+)\n\n\*\*Complexity:\*\* (.+)\n\n\*\*Status:\*\* (.+)/g;
    let match;
    const phases = [];

    while ((match = phasePattern.exec(content)) !== null) {
      phases.push({
        number: parseInt(match[1]),
        name: match[2],
        description: match[3],
        complexity: match[4],
        status: match[5]
      });
    }

    if (phases.length > 0) {
      const completed = phases.filter(p => p.status.includes('Completed')).length;
      const inProgress = phases.filter(p => p.status.includes('In Progress')).length;

      console.log(createProgressBar(completed, phases.length));
      console.log(chalk.dim(`${completed}/${phases.length} phases completed`));
      console.log();

      for (const phase of phases) {
        const icon = phase.status.includes('Completed') ? chalk.green(figures.tick) :
                     phase.status.includes('In Progress') ? chalk.yellow(figures.circleFilled) :
                     chalk.gray(figures.circle);

        const statusColor = phase.status.includes('Completed') ? chalk.green :
                           phase.status.includes('In Progress') ? chalk.yellow :
                           chalk.gray;

        console.log(`${icon} ${chalk.bold(`Phase ${phase.number}:`)} ${phase.name}`);
        console.log(`  ${chalk.dim(phase.description)}`);
        console.log(`  ${chalk.dim(`Complexity: ${phase.complexity}`)}`);
        console.log();
      }
    }

    divider('Actions');
    console.log(`
  ${chalk.yellow('momentum phase plan <n>')}     Create plan for phase n
  ${chalk.yellow('momentum phase discuss <n>')} Discuss phase before planning
  ${chalk.yellow('momentum roadmap -e')}        Edit roadmap
`);
  }

  /**
   * Handle phase actions
   */
  async handlePhase(action, number, options = {}) {
    if (!hasProject(this.dir)) {
      error('No Momentum project found. Run `momentum init` first.');
      return;
    }

    switch (action) {
      case 'plan':
        await this.planPhase(number, options);
        break;
      case 'discuss':
        await this.discussPhase(number);
        break;
      case 'research':
        await this.researchPhase(number);
        break;
      case 'add':
        await this.addPhase(number); // number is actually description here
        break;
      case 'insert':
        await this.insertPhase(number, options);
        break;
      default:
        error(`Unknown action: ${action}`);
        info('Valid actions: plan, discuss, research, add, insert');
    }
  }

  /**
   * Create execution plan for a phase
   */
  async planPhase(phaseNumber, options = {}) {
    header(`Plan Phase ${phaseNumber}`);
    console.log();

    // Find phase directory
    const phaseDirs = existsSync(this.phasesDir) ? readdirSync(this.phasesDir) : [];
    const phaseDir = phaseDirs.find(d => d.startsWith(`${String(phaseNumber).padStart(2, '0')}-`));

    if (!phaseDir) {
      error(`Phase ${phaseNumber} not found. Check your roadmap.`);
      return;
    }

    const fullPhaseDir = join(this.phasesDir, phaseDir);

    // Check for existing plans
    const existingPlans = existsSync(fullPhaseDir)
      ? readdirSync(fullPhaseDir).filter(f => f.endsWith('-PLAN.md'))
      : [];

    const planNumber = existingPlans.length + 1;
    const planName = `${String(phaseNumber).padStart(2, '0')}-${String(planNumber).padStart(2, '0')}-PLAN.md`;

    info(`Creating plan: ${planName}`);
    console.log();

    // Gather plan details
    const planAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'objective',
        message: 'What is the objective of this plan?',
        validate: input => input.length > 0 || 'Objective required'
      },
      {
        type: 'editor',
        name: 'tasks',
        message: 'Define the tasks (opens editor):',
        default: `# Tasks

## Task 1: [Name]
- Description:
- Files involved:
- Verification:

## Task 2: [Name]
- Description:
- Files involved:
- Verification:
`
      },
      {
        type: 'input',
        name: 'successCriteria',
        message: 'How will we know this plan succeeded?'
      },
      {
        type: 'confirm',
        name: 'hasCheckpoints',
        message: 'Add checkpoints for verification pauses?',
        default: false
      }
    ]);

    // Load context
    const projectContent = readFileSync(join(this.momentumDir, 'PROJECT.md'), 'utf8');
    const roadmapContent = readFileSync(join(this.momentumDir, 'ROADMAP.md'), 'utf8');

    // Generate plan
    const planContent = `# Execution Plan: ${planAnswers.objective}

> Phase ${phaseNumber}, Plan ${planNumber}

## Objective

${planAnswers.objective}

## Context

### Project Reference
*See .momentum/PROJECT.md for full project context*

### Phase Context
*Phase ${phaseNumber} from roadmap*

### Dependencies
- Previous plans completed: ${existingPlans.length > 0 ? existingPlans.join(', ') : 'None'}

## Tasks

${planAnswers.tasks}

## Verification Steps

1. [ ] All tasks completed successfully
2. [ ] No regressions introduced
3. [ ] Code follows project conventions
4. [ ] Tests pass (if applicable)

## Success Criteria

${planAnswers.successCriteria}

## Execution Strategy

**Mode:** ${options.parallel ? 'Parallel' : 'Sequential'}
**Checkpoints:** ${planAnswers.hasCheckpoints ? 'Yes' : 'No'}

---

## Execution Log

*This section updated during execution*

### Started: [timestamp]
### Completed: [timestamp]
### Duration: [duration]

---

*Generated by Momentum*
`;

    writeFileSync(join(fullPhaseDir, planName), planContent);

    // Commit
    await this.commitChanges(`chore: create plan ${planName}`);

    success(`Plan created: ${phaseDir}/${planName}`);
    console.log();
    info(`Run ${chalk.yellow(`momentum execute ${fullPhaseDir}/${planName}`)} to execute this plan`);
  }

  /**
   * Discuss a phase before planning
   */
  async discussPhase(phaseNumber) {
    header(`Discuss Phase ${phaseNumber}`);
    console.log(chalk.dim('\nCapturing your vision for this phase...\n'));

    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'vision',
        message: 'Describe how you imagine this phase working:',
        default: `# Phase ${phaseNumber} Vision

## How I imagine it working:


## Essential requirements:


## Nice to have:


## What to avoid:

`
      },
      {
        type: 'input',
        name: 'concerns',
        message: 'Any concerns or unknowns?'
      }
    ]);

    // Save context
    const phaseDirs = readdirSync(this.phasesDir);
    const phaseDir = phaseDirs.find(d => d.startsWith(`${String(phaseNumber).padStart(2, '0')}-`));

    if (phaseDir) {
      const contextFile = join(this.phasesDir, phaseDir, 'CONTEXT.md');
      writeFileSync(contextFile, `# Phase ${phaseNumber} Context\n\n${answers.vision}\n\n## Concerns\n\n${answers.concerns || 'None noted'}`);

      success('Phase context saved');
      info(`Run ${chalk.yellow(`momentum phase plan ${phaseNumber}`)} when ready to create the execution plan`);
    }
  }

  /**
   * Research a phase (for complex/niche domains)
   */
  async researchPhase(phaseNumber) {
    header(`Research Phase ${phaseNumber}`);
    info('This will conduct comprehensive research for complex/niche domains.');
    warning('Research mode not yet implemented. Use `momentum phase discuss` for now.');
  }

  /**
   * Add a new phase to the roadmap
   */
  async addPhase(description) {
    if (!description) {
      const { desc } = await inquirer.prompt([{
        type: 'input',
        name: 'desc',
        message: 'Phase description:',
        validate: input => input.length > 0 || 'Description required'
      }]);
      description = desc;
    }

    const roadmapFile = join(this.momentumDir, 'ROADMAP.md');
    const content = readFileSync(roadmapFile, 'utf8');

    // Find next phase number
    const phaseNumbers = content.match(/### Phase (\d+)/g) || [];
    const nextNumber = phaseNumbers.length + 1;

    // Add phase to roadmap
    const newPhase = `
### Phase ${nextNumber}: ${description}

**Description:** ${description}

**Complexity:** Medium

**Status:** ⏳ Pending

**Deliverables:**
- [ ] To be defined during planning

**Plans:**
- *Run \`momentum phase plan ${nextNumber}\` to create execution plans*

---
`;

    const updated = content.replace(/## Progress Tracking/, `${newPhase}\n## Progress Tracking`);
    writeFileSync(roadmapFile, updated);

    // Create directory
    const phaseName = description.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    mkdirSync(join(this.phasesDir, `${String(nextNumber).padStart(2, '0')}-${phaseName}`), { recursive: true });

    success(`Phase ${nextNumber} added: ${description}`);
  }

  /**
   * Insert a phase between existing phases
   */
  async insertPhase(afterPhase, options = {}) {
    warning('Insert phase not yet implemented. Use `momentum phase add` to append a phase.');
  }

  /**
   * Edit existing roadmap
   */
  async editRoadmap() {
    info('Opening roadmap for editing...');
    const { execSync } = await import('child_process');
    const editor = process.env.EDITOR || 'nano';
    execSync(`${editor} ${join(this.momentumDir, 'ROADMAP.md')}`, { stdio: 'inherit' });
  }

  /**
   * Create a new milestone
   */
  async createMilestone(name) {
    header('Create New Milestone');
    warning('Milestone creation not yet fully implemented.');
    info('Manually edit ROADMAP.md to add a new milestone section.');
  }

  /**
   * Commit changes
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
}

export default RoadmapManager;
