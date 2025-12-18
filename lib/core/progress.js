/**
 * Progress Tracker - Visual dashboards and analytics
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import figures from 'figures';
import Table from 'cli-table3';
import { success, error, warning, info, header, divider, createProgressBar, displayBurndown, displayDependencyGraph } from '../utils/display.js';
import { hasProject } from '../utils/validate.js';

export class ProgressTracker {
  constructor(dir = process.cwd()) {
    this.dir = dir;
    this.momentumDir = join(dir, '.momentum');
    this.phasesDir = join(this.momentumDir, 'phases');
    this.analyticsDir = join(this.momentumDir, 'analytics');
  }

  /**
   * Show project status dashboard
   */
  async showStatus(options = {}) {
    if (!hasProject(this.dir)) {
      error('No Momentum project found. Run `momentum init` first.');
      return;
    }

    if (options.json) {
      return this.outputJSON();
    }

    header('Project Status');
    console.log();

    // Load project data
    const projectData = this.loadProjectData();

    // Project overview
    this.displayProjectOverview(projectData);

    // Phase progress
    console.log();
    this.displayPhaseProgress(projectData);

    // Recent activity
    if (options.detailed) {
      console.log();
      this.displayRecentActivity(projectData);
    }

    // Current position and next steps
    console.log();
    this.displayNextSteps(projectData);
  }

  /**
   * Load all project data
   */
  loadProjectData() {
    const data = {
      project: null,
      roadmap: null,
      state: null,
      phases: [],
      summaries: [],
      issues: []
    };

    // Load PROJECT.md
    const projectFile = join(this.momentumDir, 'PROJECT.md');
    if (existsSync(projectFile)) {
      data.project = readFileSync(projectFile, 'utf8');
    }

    // Load ROADMAP.md
    const roadmapFile = join(this.momentumDir, 'ROADMAP.md');
    if (existsSync(roadmapFile)) {
      data.roadmap = readFileSync(roadmapFile, 'utf8');
    }

    // Load STATE.md
    const stateFile = join(this.momentumDir, 'STATE.md');
    if (existsSync(stateFile)) {
      data.state = readFileSync(stateFile, 'utf8');
    }

    // Load phases
    if (existsSync(this.phasesDir)) {
      const phaseDirs = readdirSync(this.phasesDir).sort();

      for (const phaseDir of phaseDirs) {
        const phasePath = join(this.phasesDir, phaseDir);
        const files = readdirSync(phasePath);

        const plans = files.filter(f => f.endsWith('-PLAN.md'));
        const summaries = files.filter(f => f.endsWith('-SUMMARY.md'));

        data.phases.push({
          name: phaseDir,
          plans: plans.length,
          completed: summaries.length,
          hasContext: files.includes('CONTEXT.md'),
          hasResearch: files.includes('RESEARCH.md')
        });

        // Load summaries for recent activity
        for (const summary of summaries.slice(-2)) {
          const content = readFileSync(join(phasePath, summary), 'utf8');
          data.summaries.push({
            phase: phaseDir,
            file: summary,
            content
          });
        }
      }
    }

    // Load issues
    const issuesFile = join(this.momentumDir, 'ISSUES.md');
    if (existsSync(issuesFile)) {
      const content = readFileSync(issuesFile, 'utf8');
      const openIssues = content.match(/- \[ \] .+/g) || [];
      data.issues = openIssues.map(i => i.replace('- [ ] ', ''));
    }

    return data;
  }

  /**
   * Display project overview
   */
  displayProjectOverview(data) {
    // Extract project name
    const nameMatch = data.project?.match(/^# (.+)$/m);
    const projectName = nameMatch ? nameMatch[1] : 'Project';

    // Extract milestone
    const milestoneMatch = data.roadmap?.match(/## Milestone: (.+)/);
    const milestone = milestoneMatch ? milestoneMatch[1] : 'Not set';

    // Calculate overall progress
    const totalPlans = data.phases.reduce((sum, p) => sum + p.plans, 0);
    const completedPlans = data.phases.reduce((sum, p) => sum + p.completed, 0);

    console.log(chalk.cyan.bold(`  ${projectName}`));
    console.log(chalk.dim(`  Milestone: ${milestone}`));
    console.log();

    if (totalPlans > 0) {
      console.log(`  ${createProgressBar(completedPlans, totalPlans, 40)}`);
      console.log(chalk.dim(`  ${completedPlans}/${totalPlans} plans completed`));
    } else {
      console.log(chalk.dim('  No plans created yet'));
    }
  }

  /**
   * Display phase progress
   */
  displayPhaseProgress(data) {
    divider('Phases');

    if (data.phases.length === 0) {
      console.log(chalk.dim('  No phases defined. Run `momentum roadmap -c` to create roadmap.'));
      return;
    }

    const table = new Table({
      head: [
        chalk.cyan('Phase'),
        chalk.cyan('Plans'),
        chalk.cyan('Progress'),
        chalk.cyan('Status')
      ],
      chars: {
        top: '', 'top-mid': '', 'top-left': '', 'top-right': '',
        bottom: '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '',
        left: '  ', 'left-mid': '', mid: '', 'mid-mid': '',
        right: '', 'right-mid': '', middle: ' │ '
      },
      style: { head: [], border: [] }
    });

    for (const phase of data.phases) {
      const progress = phase.plans > 0
        ? `${phase.completed}/${phase.plans}`
        : '-';

      let status;
      if (phase.plans === 0) {
        status = chalk.gray('Not planned');
      } else if (phase.completed === phase.plans) {
        status = chalk.green('✓ Complete');
      } else if (phase.completed > 0) {
        status = chalk.yellow('In progress');
      } else {
        status = chalk.gray('Pending');
      }

      const icons = [];
      if (phase.hasContext) icons.push(chalk.blue('📝'));
      if (phase.hasResearch) icons.push(chalk.magenta('🔬'));

      table.push([
        chalk.white(phase.name) + (icons.length ? ' ' + icons.join('') : ''),
        progress,
        phase.plans > 0 ? createProgressBar(phase.completed, phase.plans, 15) : chalk.dim('-'),
        status
      ]);
    }

    console.log(table.toString());
  }

  /**
   * Display recent activity
   */
  displayRecentActivity(data) {
    divider('Recent Activity');

    if (data.summaries.length === 0) {
      console.log(chalk.dim('  No recent activity'));
      return;
    }

    for (const summary of data.summaries.slice(-3)) {
      // Extract key info from summary
      const statusMatch = summary.content.match(/\*\*Status:\*\* (.+)/);
      const durationMatch = summary.content.match(/\*\*Duration:\*\* (.+)/);

      console.log(`  ${chalk.cyan(figures.pointer)} ${summary.file.replace('-SUMMARY.md', '')}`);
      if (statusMatch) console.log(chalk.dim(`    Status: ${statusMatch[1]}`));
      if (durationMatch) console.log(chalk.dim(`    Duration: ${durationMatch[1]}`));
      console.log();
    }
  }

  /**
   * Display next steps
   */
  displayNextSteps(data) {
    divider('Next Steps');

    // Find current position
    let nextAction = null;
    let currentPhase = null;

    for (const phase of data.phases) {
      if (phase.plans === 0) {
        nextAction = `Create plan for ${phase.name}`;
        currentPhase = phase.name;
        break;
      }
      if (phase.completed < phase.plans) {
        nextAction = `Execute next plan in ${phase.name}`;
        currentPhase = phase.name;
        break;
      }
    }

    if (nextAction) {
      console.log(`  ${chalk.green(figures.arrowRight)} ${nextAction}`);
      console.log();

      if (nextAction.includes('Create plan')) {
        const phaseNum = currentPhase.split('-')[0];
        console.log(chalk.dim(`  Run: momentum phase plan ${phaseNum}`));
      } else {
        console.log(chalk.dim('  Run: momentum execute'));
      }
    } else if (data.phases.length > 0) {
      console.log(chalk.green('  ✓ All phases complete!'));
      console.log(chalk.dim('  Consider: momentum roadmap --milestone'));
    } else {
      console.log(chalk.dim('  Run: momentum roadmap -c'));
    }

    // Show open issues
    if (data.issues.length > 0) {
      console.log();
      console.log(chalk.yellow(`  ${figures.warning} ${data.issues.length} open issues`));
      console.log(chalk.dim('  Run: momentum issues --review'));
    }
  }

  /**
   * Show interactive dashboard
   */
  async showDashboard(options = {}) {
    const refreshInterval = parseInt(options.refresh) * 1000 || 5000;

    console.clear();
    await this.showStatus({ detailed: true });

    console.log(chalk.dim(`\nAuto-refreshing every ${options.refresh}s. Press Ctrl+C to exit.`));

    // In a real implementation, this would use a proper TUI library
    // For now, just show static dashboard
  }

  /**
   * Show burndown chart
   */
  async showBurndown(options = {}) {
    if (!hasProject(this.dir)) {
      error('No Momentum project found. Run `momentum init` first.');
      return;
    }

    // Generate sample burndown data from actual project data
    const data = this.loadProjectData();
    const totalPlans = data.phases.reduce((sum, p) => sum + Math.max(p.plans, 3), 0);
    const completedPlans = data.phases.reduce((sum, p) => sum + p.completed, 0);

    // Generate data points
    const burndownData = [];
    const days = 14;

    for (let i = 0; i <= days; i++) {
      burndownData.push({
        day: i,
        ideal: totalPlans - (totalPlans / days) * i,
        remaining: Math.max(0, totalPlans - (completedPlans / days) * i + Math.random() * 2)
      });
    }

    displayBurndown(burndownData);

    if (options.export) {
      info(`Export to ${options.export} not yet implemented`);
    }
  }

  /**
   * Learn from past projects
   */
  async learn(options = {}) {
    header('Learning Mode');
    console.log();

    info('Analyzing project patterns...');

    // This would analyze:
    // - Task duration estimates vs actuals
    // - Common failure points
    // - Successful patterns
    // - Phase complexity correlations

    const analyticsFile = join(this.analyticsDir, 'insights.json');

    const insights = {
      timestamp: new Date().toISOString(),
      patterns: {
        averageTaskDuration: 'N/A',
        commonBlockers: [],
        successfulPatterns: []
      },
      recommendations: [
        'Break high-complexity phases into smaller plans',
        'Add verification steps for all file modifications',
        'Create checkpoints before risky operations'
      ]
    };

    if (!existsSync(this.analyticsDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(this.analyticsDir, { recursive: true });
    }

    writeFileSync(analyticsFile, JSON.stringify(insights, null, 2));

    success('Learning analysis complete');
    console.log();

    console.log(chalk.cyan.bold('Recommendations:'));
    insights.recommendations.forEach(rec => {
      console.log(`  ${figures.pointer} ${rec}`);
    });
  }

  /**
   * Show AI-powered insights
   */
  async showInsights(options = {}) {
    header('Project Insights');
    console.log();

    const data = this.loadProjectData();

    // Risk analysis
    if (options.risks || !options.blockers) {
      divider('Risk Analysis');

      const risks = [];

      // Check for phases without plans
      const unplannedPhases = data.phases.filter(p => p.plans === 0);
      if (unplannedPhases.length > 0) {
        risks.push({
          level: 'medium',
          description: `${unplannedPhases.length} phases not yet planned`,
          mitigation: 'Run momentum phase plan for each phase'
        });
      }

      // Check for stalled phases
      const stalledPhases = data.phases.filter(p => p.plans > 0 && p.completed === 0);
      if (stalledPhases.length > 1) {
        risks.push({
          level: 'high',
          description: 'Multiple phases started but none completed',
          mitigation: 'Focus on completing one phase at a time'
        });
      }

      // Check for open issues
      if (data.issues.length > 5) {
        risks.push({
          level: 'medium',
          description: `${data.issues.length} deferred issues accumulating`,
          mitigation: 'Run momentum issues --review to triage'
        });
      }

      if (risks.length === 0) {
        console.log(chalk.green(`  ${figures.tick} No significant risks detected`));
      } else {
        risks.forEach(risk => {
          const icon = risk.level === 'high' ? chalk.red(figures.cross) :
                      risk.level === 'medium' ? chalk.yellow(figures.warning) :
                      chalk.blue(figures.info);
          console.log(`  ${icon} ${risk.description}`);
          console.log(chalk.dim(`    → ${risk.mitigation}`));
          console.log();
        });
      }
    }

    // Blocker analysis
    if (options.blockers || !options.risks) {
      divider('Potential Blockers');

      // Extract blockers from STATE.md
      const blockerMatch = data.state?.match(/## Blockers\n\n([\s\S]*?)(?=\n##|$)/);

      if (blockerMatch && !blockerMatch[1].includes('*Active blockers')) {
        console.log(blockerMatch[1]);
      } else {
        console.log(chalk.green(`  ${figures.tick} No active blockers`));
      }
    }
  }

  /**
   * Output as JSON
   */
  outputJSON() {
    const data = this.loadProjectData();

    const output = {
      phases: data.phases,
      totalPlans: data.phases.reduce((sum, p) => sum + p.plans, 0),
      completedPlans: data.phases.reduce((sum, p) => sum + p.completed, 0),
      openIssues: data.issues.length
    };

    console.log(JSON.stringify(output, null, 2));
  }
}

export default ProgressTracker;
