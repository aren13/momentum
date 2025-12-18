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
   * Merge worktree back to target branch with AI-powered conflict resolution
   */
  async merge(name, target = 'main', options = {}) {
    const worktreePath = join(this.worktreesDir, name);
    const branchName = `worktree/${name}`;

    // Initialize statistics if not exists
    if (!this.mergeStats) {
      this.mergeStats = {
        totalMerges: 0,
        autoResolved: 0,
        aiResolved: 0,
        manualRequired: 0,
        failed: 0,
        conflictQueue: []
      };
    }

    this.mergeStats.totalMerges++;

    // Check for uncommitted changes
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf8'
    });

    if (status.trim()) {
      throw new Error(`Worktree has uncommitted changes: ${name}`);
    }

    // Run QA before merge
    if (options.qaRequired !== false) {
      const { QARunner } = await import('./qa-runner.js');

      const qa = new QARunner({ workDir: worktreePath });
      const qaResult = await qa.run();

      if (!qaResult.passed) {
        throw new Error(`QA failed in worktree ${name}. Fix issues before merging.`);
      }
    }

    // Try merge with AI resolution
    const { MergeResolver } = await import('./merge-resolver.js');
    const { ConflictResolver } = await import('./conflict-resolver.js');
    const { ConflictDetector } = await import('./conflict-detector.js');

    const resolver = new MergeResolver(this.repoDir);
    const conflictResolver = new ConflictResolver();
    const detector = new ConflictDetector(this.repoDir);

    // Detect conflicts first (if preview requested)
    if (options.preview) {
      const analysis = await detector.detectConflicts(worktreePath, target);
      return {
        success: false,
        preview: true,
        analysis
      };
    }

    // Switch to target branch in main repo
    execSync(`git checkout ${target}`, { cwd: this.repoDir, stdio: 'pipe' });

    // Attempt merge with three-tier strategy
    const mergeResult = await resolver.resolve(worktreePath, target);

    if (mergeResult.success) {
      // Auto-resolved successfully
      this.mergeStats.autoResolved++;
      return {
        success: true,
        strategy: mergeResult.strategy,
        message: mergeResult.message
      };
    }

    // Conflicts exist - check strategy
    if (options.strategy === 'manual' || (!options.auto && !options.strategy)) {
      // Queue for manual resolution
      this.mergeStats.manualRequired++;
      this.queueConflicts(name, mergeResult.conflicts);

      return {
        success: false,
        conflicts: mergeResult.conflicts,
        message: 'Conflicts require manual resolution',
        queue: this.mergeStats.conflictQueue.length
      };
    }

    // Attempt AI resolution
    const resolutionResults = [];
    let allResolved = true;

    for (const conflict of mergeResult.conflicts) {
      const prompt = resolver.generateResolutionPrompt(conflict);

      const resolution = await conflictResolver.resolve(conflict, {
        prompt,
        worktreePath,
        targetBranch: target
      });

      resolutionResults.push(resolution);

      if (!resolution.success) {
        allResolved = false;
      }
    }

    if (allResolved) {
      // All conflicts resolved by AI
      this.mergeStats.aiResolved++;

      // Commit the merge
      execSync(`git commit --no-edit`, {
        cwd: this.repoDir,
        stdio: 'pipe'
      });

      return {
        success: true,
        strategy: 'ai',
        resolutions: resolutionResults,
        message: `AI resolved ${resolutionResults.length} conflict(s)`
      };
    } else {
      // Some conflicts failed - queue for manual review
      const failed = resolutionResults.filter(r => !r.success);
      this.mergeStats.manualRequired++;
      this.queueConflicts(name, failed.map(r => r.conflict));

      return {
        success: false,
        partial: true,
        resolutions: resolutionResults,
        message: `${failed.length} conflict(s) require manual resolution`,
        queue: this.mergeStats.conflictQueue.length
      };
    }
  }

  /**
   * Queue conflicts for later resolution
   */
  queueConflicts(worktree, conflicts) {
    this.mergeStats.conflictQueue.push({
      worktree,
      conflicts,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get merge statistics
   */
  getMergeStats() {
    return {
      ...this.mergeStats,
      successRate: this.mergeStats.totalMerges > 0
        ? Math.round(
            ((this.mergeStats.autoResolved + this.mergeStats.aiResolved) /
              this.mergeStats.totalMerges) *
              100
          )
        : 0
    };
  }

  /**
   * Get conflict queue
   */
  getConflictQueue() {
    return this.mergeStats?.conflictQueue || [];
  }

  /**
   * Clear conflict queue
   */
  clearConflictQueue() {
    if (this.mergeStats) {
      this.mergeStats.conflictQueue = [];
    }
  }

  /**
   * Rollback failed merge
   */
  async rollbackMerge() {
    try {
      execSync('git merge --abort', { cwd: this.repoDir, stdio: 'pipe' });
      return { success: true, message: 'Merge rolled back successfully' };
    } catch (error) {
      return { success: false, error: error.message };
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
