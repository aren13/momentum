/**
 * MergeResolver - AI-powered merge conflict resolution
 *
 * Three-tier resolution strategy:
 * 1. Auto (git) - Standard git merge
 * 2. Conflict-only AI - Send just conflicted sections
 * 3. Full-file AI - Send entire file with context
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export class MergeResolver {
  constructor(repoDir = process.cwd()) {
    this.repoDir = repoDir;
    this.stats = {
      autoResolved: 0,
      aiResolvedConflictOnly: 0,
      aiResolvedFullFile: 0,
      manualRequired: 0
    };
  }

  /**
   * Analyze potential conflicts between worktree and target branch
   *
   * @param {string} worktreePath - Path to worktree
   * @param {string} targetBranch - Target branch to merge into
   * @returns {Object} - Conflict analysis results
   */
  async analyze(worktreePath, targetBranch = 'main') {
    const conflicts = [];

    try {
      // Try merge without commit to detect conflicts
      execSync(`git merge --no-commit --no-ff ${targetBranch}`, {
        cwd: worktreePath,
        stdio: 'pipe'
      });

      // No conflicts
      execSync('git merge --abort', { cwd: worktreePath, stdio: 'pipe' });
      return { hasConflicts: false, conflicts: [] };

    } catch (error) {
      // Conflicts detected - get conflicted files
      const output = execSync('git diff --name-only --diff-filter=U', {
        cwd: worktreePath,
        encoding: 'utf8'
      });

      const conflictedFiles = output.trim().split('\n').filter(Boolean);

      for (const file of conflictedFiles) {
        const filePath = join(worktreePath, file);
        const content = readFileSync(filePath, 'utf8');
        const parsedConflicts = this.parseConflict(content);

        conflicts.push({
          file,
          path: filePath,
          conflicts: parsedConflicts,
          context: this.getConflictContext(content, parsedConflicts)
        });
      }

      // Abort the test merge
      execSync('git merge --abort', { cwd: worktreePath, stdio: 'pipe' });

      return {
        hasConflicts: true,
        conflicts,
        targetBranch
      };
    }
  }

  /**
   * Parse git conflict markers in file content
   *
   * @param {string} content - File content with conflict markers
   * @returns {Array} - Array of parsed conflicts
   */
  parseConflict(content) {
    const conflicts = [];
    const lines = content.split('\n');
    let inConflict = false;
    let currentConflict = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('<<<<<<<')) {
        // Start of conflict - ours
        inConflict = true;
        currentConflict = {
          startLine: i,
          ours: [],
          theirs: [],
          base: line.substring(8).trim() // Branch name
        };
      } else if (line.startsWith('=======') && inConflict) {
        // Switch to theirs section
        currentConflict.dividerLine = i;
      } else if (line.startsWith('>>>>>>>') && inConflict) {
        // End of conflict
        currentConflict.endLine = i;
        currentConflict.theirBranch = line.substring(8).trim();
        conflicts.push(currentConflict);
        inConflict = false;
        currentConflict = null;
      } else if (inConflict) {
        // Content within conflict
        if (currentConflict.dividerLine === undefined) {
          currentConflict.ours.push(line);
        } else {
          currentConflict.theirs.push(line);
        }
      }
    }

    return conflicts;
  }

  /**
   * Get surrounding code context for a conflict
   *
   * @param {string} content - Full file content
   * @param {Array} conflicts - Parsed conflicts
   * @returns {Object} - Context information
   */
  getConflictContext(content, conflicts) {
    const lines = content.split('\n');
    const contextLines = 5; // Lines before/after conflict

    return conflicts.map(conflict => {
      const beforeStart = Math.max(0, conflict.startLine - contextLines);
      const afterEnd = Math.min(lines.length, conflict.endLine + contextLines + 1);

      return {
        before: lines.slice(beforeStart, conflict.startLine),
        after: lines.slice(conflict.endLine + 1, afterEnd),
        totalLines: lines.length,
        conflictSize: conflict.endLine - conflict.startLine + 1
      };
    });
  }

  /**
   * Generate AI resolution prompt for a conflict
   *
   * @param {Object} conflict - Conflict data with context
   * @returns {string} - AI prompt
   */
  generateResolutionPrompt(conflict) {
    const { file, conflicts, context } = conflict;

    let prompt = `# Merge Conflict Resolution\n\n`;
    prompt += `**File:** \`${file}\`\n\n`;
    prompt += `You are resolving a merge conflict. Analyze both sides and provide the correct merged version.\n\n`;

    conflicts.forEach((c, idx) => {
      prompt += `## Conflict ${idx + 1}\n\n`;
      prompt += `**Context Before:**\n\`\`\`\n${context[idx].before.join('\n')}\n\`\`\`\n\n`;

      prompt += `**Current Branch (${c.base}):**\n\`\`\`\n${c.ours.join('\n')}\n\`\`\`\n\n`;

      prompt += `**Target Branch (${c.theirBranch}):**\n\`\`\`\n${c.theirs.join('\n')}\n\`\`\`\n\n`;

      prompt += `**Context After:**\n\`\`\`\n${context[idx].after.join('\n')}\n\`\`\`\n\n`;
    });

    prompt += `## Instructions\n\n`;
    prompt += `1. Analyze the intent of both changes\n`;
    prompt += `2. Preserve functionality from both sides if possible\n`;
    prompt += `3. Follow existing code style and conventions\n`;
    prompt += `4. Provide ONLY the resolved code sections (without conflict markers)\n`;
    prompt += `5. If both changes are incompatible, choose the most appropriate one and explain why\n\n`;
    prompt += `**Provide your resolution as clean code without any markdown formatting.**`;

    return prompt;
  }

  /**
   * Attempt three-tier resolution strategy
   *
   * @param {string} worktreePath - Path to worktree
   * @param {string} targetBranch - Target branch
   * @returns {Object} - Resolution results
   */
  async resolve(worktreePath, targetBranch = 'main') {
    // Tier 1: Try auto git merge
    try {
      execSync(`git merge --no-edit ${targetBranch}`, {
        cwd: worktreePath,
        stdio: 'pipe'
      });
      this.stats.autoResolved++;
      return {
        strategy: 'auto',
        success: true,
        message: 'Auto-merged successfully'
      };
    } catch (error) {
      // Conflicts exist - analyze them
      const analysis = await this.analyze(worktreePath, targetBranch);

      if (!analysis.hasConflicts) {
        return {
          strategy: 'auto',
          success: true,
          message: 'No conflicts detected'
        };
      }

      // Return conflict data for AI resolution
      return {
        strategy: 'ai-required',
        success: false,
        conflicts: analysis.conflicts,
        message: `${analysis.conflicts.length} file(s) with conflicts require AI resolution`
      };
    }
  }

  /**
   * Get resolution statistics
   */
  getStats() {
    return {
      ...this.stats,
      total: this.stats.autoResolved +
             this.stats.aiResolvedConflictOnly +
             this.stats.aiResolvedFullFile +
             this.stats.manualRequired
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      autoResolved: 0,
      aiResolvedConflictOnly: 0,
      aiResolvedFullFile: 0,
      manualRequired: 0
    };
  }
}
