/**
 * Validation Utilities
 */

import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import figures from 'figures';

/**
 * Check if running in a valid environment
 */
export function validateEnvironment() {
  const issues = [];

  // Check Node version
  const nodeVersion = process.version.slice(1).split('.').map(Number);
  if (nodeVersion[0] < 18) {
    issues.push(`Node.js 18+ required (current: ${process.version})`);
  }

  // Check if git is available
  try {
    const { execSync } = await import('child_process');
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    issues.push('Git is not installed or not in PATH');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Check if current directory has a Momentum project
 */
export function hasProject(dir = process.cwd()) {
  return existsSync(join(dir, '.momentum'));
}

/**
 * Check if current directory has required files
 */
export function validateProjectStructure(dir = process.cwd()) {
  const required = {
    project: join(dir, '.momentum', 'PROJECT.md'),
    config: join(dir, '.momentum', 'config.json')
  };

  const optional = {
    roadmap: join(dir, '.momentum', 'ROADMAP.md'),
    state: join(dir, '.momentum', 'STATE.md'),
    issues: join(dir, '.momentum', 'ISSUES.md')
  };

  const missing = [];
  const existing = [];

  for (const [name, path] of Object.entries(required)) {
    if (existsSync(path)) {
      existing.push(name);
    } else {
      missing.push(name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    existing,
    hasRoadmap: existsSync(optional.roadmap),
    hasState: existsSync(optional.state),
    hasIssues: existsSync(optional.issues)
  };
}

/**
 * Validate a plan file structure
 */
export function validatePlanFile(content) {
  const issues = [];

  // Check required sections
  const requiredSections = [
    'Objective',
    'Context',
    'Tasks',
    'Success Criteria'
  ];

  for (const section of requiredSections) {
    if (!content.includes(`## ${section}`) && !content.includes(`# ${section}`)) {
      issues.push(`Missing required section: ${section}`);
    }
  }

  // Check for task format
  const taskPattern = /- \[ \]|\[pending\]|\[in-progress\]|\[completed\]/gi;
  if (!taskPattern.test(content)) {
    issues.push('No valid tasks found (expected checkbox format)');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Validate roadmap structure
 */
export function validateRoadmap(content) {
  const issues = [];

  // Check for milestone
  if (!content.includes('## Milestone') && !content.includes('# Milestone')) {
    issues.push('No milestone defined');
  }

  // Check for phases
  const phasePattern = /### Phase \d+|## Phase \d+/gi;
  const phases = content.match(phasePattern);
  if (!phases || phases.length === 0) {
    issues.push('No phases defined');
  }

  return {
    valid: issues.length === 0,
    issues,
    phaseCount: phases ? phases.length : 0
  };
}

/**
 * Validate git repository state
 */
export async function validateGitState(dir = process.cwd()) {
  const { execSync } = await import('child_process');

  try {
    // Check if git repo
    execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'ignore' });
  } catch {
    return { valid: false, isGitRepo: false, issues: ['Not a git repository'] };
  }

  const result = {
    valid: true,
    isGitRepo: true,
    issues: [],
    hasUncommitted: false,
    branch: '',
    ahead: 0,
    behind: 0
  };

  try {
    // Check for uncommitted changes
    const status = execSync('git status --porcelain', { cwd: dir, encoding: 'utf8' });
    result.hasUncommitted = status.trim().length > 0;

    // Get current branch
    result.branch = execSync('git branch --show-current', { cwd: dir, encoding: 'utf8' }).trim();

    // Get ahead/behind counts
    try {
      const tracking = execSync('git rev-list --left-right --count HEAD...@{upstream}', {
        cwd: dir,
        encoding: 'utf8'
      }).trim();
      const [ahead, behind] = tracking.split('\t').map(Number);
      result.ahead = ahead;
      result.behind = behind;
    } catch {
      // No upstream set
    }
  } catch (e) {
    result.issues.push(`Git status check failed: ${e.message}`);
  }

  return result;
}

/**
 * Display validation results
 */
export function displayValidation(result, label = 'Validation') {
  if (result.valid) {
    console.log(chalk.green(`${figures.tick} ${label}: Passed`));
  } else {
    console.log(chalk.red(`${figures.cross} ${label}: Failed`));
    result.issues.forEach(issue => {
      console.log(chalk.red(`  ${figures.pointer} ${issue}`));
    });
  }

  return result.valid;
}

export default {
  validateEnvironment,
  hasProject,
  validateProjectStructure,
  validatePlanFile,
  validateRoadmap,
  validateGitState,
  displayValidation
};
