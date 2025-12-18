/**
 * WorktreeManager - Git worktree isolation for zero-risk development
 */
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync, exec } from 'child_process';

export class WorktreeManager {
  constructor(repoDir = process.cwd()) {
    this.repoDir = repoDir;
    this.worktreesDir = join(repoDir, '.worktrees');
  }

  /**
   * Initialize worktrees directory
   */
  init() {
    if (!existsSync(this.worktreesDir)) {
      mkdirSync(this.worktreesDir, { recursive: true });
    }
    // Add to gitignore
    this.ensureGitignore();
  }

  /**
   * Create a new worktree for a task
   */
  async create(name, baseBranch = 'main') {
    const worktreePath = join(this.worktreesDir, name);
    const branchName = `worktree/${name}`;

    if (existsSync(worktreePath)) {
      throw new Error(`Worktree already exists: ${name}`);
    }

    // Create worktree with new branch
    execSync(
      `git worktree add -b "${branchName}" "${worktreePath}" "${baseBranch}"`,
      { cwd: this.repoDir, stdio: 'pipe' }
    );

    return {
      name,
      path: worktreePath,
      branch: branchName,
      baseBranch
    };
  }

  /**
   * List all active worktrees
   */
  list() {
    const output = execSync('git worktree list --porcelain', {
      cwd: this.repoDir,
      encoding: 'utf8'
    });

    return this.parseWorktreeList(output);
  }

  /**
   * Delete a worktree
   */
  async delete(name, force = false) {
    const worktreePath = join(this.worktreesDir, name);
    const branchName = `worktree/${name}`;

    if (!existsSync(worktreePath)) {
      throw new Error(`Worktree not found: ${name}`);
    }

    // Remove worktree
    execSync(
      `git worktree remove ${force ? '--force' : ''} "${worktreePath}"`,
      { cwd: this.repoDir, stdio: 'pipe' }
    );

    // Delete branch
    try {
      execSync(`git branch -D "${branchName}"`, {
        cwd: this.repoDir,
        stdio: 'pipe'
      });
    } catch {
      // Branch may already be deleted
    }

    return true;
  }

  /**
   * Merge worktree back to target branch
   */
  async merge(name, target = 'main') {
    const worktreePath = join(this.worktreesDir, name);
    const branchName = `worktree/${name}`;

    // Check for uncommitted changes
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf8'
    });

    if (status.trim()) {
      throw new Error(`Worktree has uncommitted changes: ${name}`);
    }

    // Switch to target and merge
    execSync(`git checkout ${target}`, { cwd: this.repoDir, stdio: 'pipe' });

    try {
      execSync(`git merge --no-ff "${branchName}" -m "Merge ${name}"`, {
        cwd: this.repoDir,
        stdio: 'pipe'
      });
      return { success: true, conflicts: false };
    } catch (err) {
      return { success: false, conflicts: true, error: err.message };
    }
  }

  /**
   * Clean up completed worktrees
   */
  async clean() {
    const worktrees = this.list();
    const cleaned = [];

    for (const wt of worktrees) {
      if (wt.path.includes('.worktrees') && wt.merged) {
        await this.delete(wt.name);
        cleaned.push(wt.name);
      }
    }

    // Prune stale worktrees
    execSync('git worktree prune', { cwd: this.repoDir, stdio: 'pipe' });

    return cleaned;
  }

  /**
   * Get worktree info
   */
  get(name) {
    const worktreePath = join(this.worktreesDir, name);

    if (!existsSync(worktreePath)) {
      return null;
    }

    const branch = execSync('git branch --show-current', {
      cwd: worktreePath,
      encoding: 'utf8'
    }).trim();

    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf8'
    });

    return {
      name,
      path: worktreePath,
      branch,
      clean: !status.trim(),
      status: status.trim().split('\n').filter(Boolean)
    };
  }

  /**
   * Parse git worktree list output
   */
  parseWorktreeList(output) {
    const worktrees = [];
    const entries = output.trim().split('\n\n');

    for (const entry of entries) {
      const lines = entry.split('\n');
      const wt = {};

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          wt.path = line.replace('worktree ', '');
          wt.name = wt.path.split('/').pop();
        } else if (line.startsWith('HEAD ')) {
          wt.head = line.replace('HEAD ', '');
        } else if (line.startsWith('branch ')) {
          wt.branch = line.replace('branch refs/heads/', '');
        }
      }

      if (wt.path) {
        worktrees.push(wt);
      }
    }

    return worktrees;
  }

  /**
   * Ensure .worktrees is in gitignore
   */
  ensureGitignore() {
    const gitignorePath = join(this.repoDir, '.gitignore');
    const ignoreEntry = '.worktrees/';

    if (existsSync(gitignorePath)) {
      const content = require('fs').readFileSync(gitignorePath, 'utf8');
      if (!content.includes(ignoreEntry)) {
        require('fs').appendFileSync(gitignorePath, `\n${ignoreEntry}\n`);
      }
    }
  }
}

export default WorktreeManager;
