/**
 * WorktreeContext - Worktree detection and context resolution
 *
 * Detects when running in a git worktree and provides context-aware
 * path resolution and metadata for seamless worktree operation.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execSync } from 'child_process';

export class WorktreeContext {
  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
    this.isWorktree = false;
    this.worktreeRoot = null;
    this.worktreeName = null;
    this.branch = null;
    this.mainRepoPath = null;

    this.detect();
  }

  /**
   * Detect if current directory is in a worktree
   */
  detect() {
    try {
      // Find the .git location
      const gitPath = this.findGitPath(this.cwd);

      if (!gitPath) {
        return;
      }

      // Check if .git is a file (worktree) or directory (main repo)
      const stat = statSync(gitPath);

      if (stat.isFile()) {
        // This is a worktree - parse the .git file
        this.isWorktree = true;
        this.parseWorktreeGitFile(gitPath);
      } else if (stat.isDirectory()) {
        // This is the main repository
        this.isWorktree = false;
        this.worktreeRoot = dirname(gitPath);
      }

      // Get current branch
      if (this.worktreeRoot) {
        try {
          this.branch = execSync('git branch --show-current', {
            cwd: this.worktreeRoot,
            encoding: 'utf8'
          }).trim();
        } catch {
          this.branch = null;
        }
      }
    } catch (err) {
      // Not in a git repository or error detecting
      this.isWorktree = false;
    }
  }

  /**
   * Find .git path by walking up directory tree
   */
  findGitPath(startDir) {
    let currentDir = startDir;
    const root = '/';

    while (currentDir !== root) {
      const gitPath = join(currentDir, '.git');

      if (existsSync(gitPath)) {
        return gitPath;
      }

      const parentDir = dirname(currentDir);
      if (parentDir === currentDir) {
        break; // Reached root
      }
      currentDir = parentDir;
    }

    return null;
  }

  /**
   * Parse .git file to extract worktree information
   */
  parseWorktreeGitFile(gitFilePath) {
    try {
      const content = readFileSync(gitFilePath, 'utf8');

      // Format: gitdir: /path/to/repo/.git/worktrees/name
      const match = content.match(/gitdir:\s*(.+)/);

      if (match) {
        const gitdir = match[1].trim();

        // Extract main repo path
        // gitdir format: /repo/.git/worktrees/name
        const worktreesMatch = gitdir.match(/(.+)\.git\/worktrees\/([^/]+)/);

        if (worktreesMatch) {
          this.mainRepoPath = worktreesMatch[1];
          this.worktreeName = worktreesMatch[2];
          this.worktreeRoot = dirname(gitFilePath);

          // Try to determine base branch by reading worktree metadata
          try {
            const headPath = join(gitdir, 'HEAD');
            if (existsSync(headPath)) {
              const headContent = readFileSync(headPath, 'utf8');
              const branchMatch = headContent.match(/ref:\s*refs\/heads\/(.+)/);
              if (branchMatch) {
                this.branch = branchMatch[1].trim();
              }
            }
          } catch {
            // Branch detection is optional
          }
        }
      }
    } catch (err) {
      // Failed to parse - not a valid worktree
      this.isWorktree = false;
    }
  }

  /**
   * Resolve a path relative to the current context
   * (worktree root or main repo root)
   */
  resolvePath(relativePath) {
    const root = this.worktreeRoot || this.cwd;
    return resolve(root, relativePath);
  }

  /**
   * Get the root directory for the current context
   */
  getRoot() {
    return this.worktreeRoot || this.cwd;
  }

  /**
   * Get worktree metadata
   */
  getMetadata() {
    return {
      isWorktree: this.isWorktree,
      name: this.worktreeName,
      branch: this.branch,
      root: this.worktreeRoot,
      mainRepoPath: this.mainRepoPath
    };
  }

  /**
   * Get formatted context string for prompts
   */
  getContextString() {
    if (!this.isWorktree) {
      return 'Working in main repository';
    }

    return `Working in worktree: ${this.worktreeName} (branch: ${this.branch || 'unknown'})`;
  }

  /**
   * Get base branch (main/master) from main repo
   */
  getBaseBranch() {
    if (!this.mainRepoPath) {
      return 'main';
    }

    try {
      // Try to get default branch from main repo
      const branch = execSync('git symbolic-ref refs/remotes/origin/HEAD', {
        cwd: this.mainRepoPath,
        encoding: 'utf8'
      }).trim();

      return branch.replace('refs/remotes/origin/', '');
    } catch {
      // Fall back to common defaults
      try {
        execSync('git rev-parse --verify main', {
          cwd: this.mainRepoPath,
          stdio: 'pipe'
        });
        return 'main';
      } catch {
        return 'master';
      }
    }
  }

  /**
   * Check if a path is within the worktree
   */
  isPathInContext(path) {
    const root = this.getRoot();
    const absPath = resolve(path);
    return absPath.startsWith(root);
  }

  /**
   * Get relative path from context root
   */
  getRelativePath(absPath) {
    const root = this.getRoot();
    const resolved = resolve(absPath);

    if (resolved.startsWith(root)) {
      return resolved.slice(root.length + 1);
    }

    return absPath;
  }

  /**
   * Format worktree info for display
   */
  formatInfo() {
    if (!this.isWorktree) {
      return {
        type: 'main',
        display: 'Main Repository'
      };
    }

    return {
      type: 'worktree',
      name: this.worktreeName,
      branch: this.branch,
      display: `Worktree: ${this.worktreeName} (${this.branch || 'unknown'})`
    };
  }
}

export default WorktreeContext;
