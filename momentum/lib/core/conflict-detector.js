/**
 * ConflictDetector - Analyze and categorize merge conflicts
 *
 * Categorizes conflicts as:
 * - Trivial: Whitespace, formatting, imports
 * - Moderate: Non-overlapping logic changes
 * - Complex: Overlapping logic, architecture changes
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

export class ConflictDetector {
  constructor(repoDir = process.cwd()) {
    this.repoDir = repoDir;
  }

  /**
   * Detect conflicts before attempting merge
   *
   * @param {string} worktreePath - Path to worktree
   * @param {string} targetBranch - Target branch to merge
   * @returns {Object} - Detection results
   */
  async detectConflicts(worktreePath, targetBranch = 'main') {
    try {
      // Dry-run merge to detect conflicts
      execSync(`git merge --no-commit --no-ff ${targetBranch}`, {
        cwd: worktreePath,
        stdio: 'pipe'
      });

      // No conflicts
      execSync('git merge --abort', { cwd: worktreePath, stdio: 'pipe' });

      return {
        hasConflicts: false,
        files: [],
        summary: 'No conflicts detected - safe to merge'
      };

    } catch (error) {
      // Conflicts detected
      const conflictedFiles = this.getConflictedFiles(worktreePath);
      const analyzed = conflictedFiles.map(file => this.analyzeFile(worktreePath, file));

      // Abort test merge
      execSync('git merge --abort', { cwd: worktreePath, stdio: 'pipe' });

      return {
        hasConflicts: true,
        files: analyzed,
        summary: this.generateSummary(analyzed)
      };
    }
  }

  /**
   * Get list of conflicted files
   */
  getConflictedFiles(worktreePath) {
    const output = execSync('git diff --name-only --diff-filter=U', {
      cwd: worktreePath,
      encoding: 'utf8'
    });

    return output.trim().split('\n').filter(Boolean);
  }

  /**
   * Analyze a single conflicted file
   */
  analyzeFile(worktreePath, file) {
    const filePath = join(worktreePath, file);
    const content = readFileSync(filePath, 'utf8');
    const conflicts = this.parseConflicts(content);

    const categorized = conflicts.map(c => this.categorizeConflict(c, file));
    const difficulty = this.estimateDifficulty({ file, conflicts: categorized });

    return {
      file,
      path: filePath,
      conflictCount: conflicts.length,
      conflicts: categorized,
      difficulty,
      category: this.getOverallCategory(categorized)
    };
  }

  /**
   * Parse conflict markers from content
   */
  parseConflicts(content) {
    const conflicts = [];
    const lines = content.split('\n');
    let current = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('<<<<<<<')) {
        current = {
          startLine: i,
          ours: [],
          theirs: [],
          markers: { start: i }
        };
      } else if (line.startsWith('=======') && current) {
        current.markers.divider = i;
      } else if (line.startsWith('>>>>>>>') && current) {
        current.markers.end = i;
        conflicts.push(current);
        current = null;
      } else if (current) {
        if (current.markers.divider === undefined) {
          current.ours.push(line);
        } else {
          current.theirs.push(line);
        }
      }
    }

    return conflicts;
  }

  /**
   * Categorize a single conflict
   *
   * @param {Object} conflict - Parsed conflict
   * @param {string} file - File path
   * @returns {Object} - Categorized conflict
   */
  categorizeConflict(conflict, file) {
    const category = this.determineCategory(conflict, file);

    return {
      ...conflict,
      category,
      linesChanged: conflict.ours.length + conflict.theirs.length,
      complexity: this.calculateComplexity(conflict)
    };
  }

  /**
   * Determine conflict category
   */
  determineCategory(conflict, file) {
    const { ours, theirs } = conflict;

    // Check for trivial conflicts
    if (this.isTrivialConflict(ours, theirs, file)) {
      return 'trivial';
    }

    // Check for complex conflicts
    if (this.isComplexConflict(ours, theirs, file)) {
      return 'complex';
    }

    return 'moderate';
  }

  /**
   * Check if conflict is trivial
   */
  isTrivialConflict(ours, theirs, file) {
    // Whitespace only
    if (this.isWhitespaceOnly(ours, theirs)) {
      return true;
    }

    // Import/require statements
    if (this.isImportConflict(ours, theirs)) {
      return true;
    }

    // Comments only
    if (this.isCommentConflict(ours, theirs)) {
      return true;
    }

    // Formatting (single line differences)
    if (ours.length === 1 && theirs.length === 1) {
      const oursTrimmed = ours[0].trim();
      const theirsTrimmed = theirs[0].trim();

      // Same content, different formatting
      if (oursTrimmed === theirsTrimmed) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if conflict is complex
   */
  isComplexConflict(ours, theirs, file) {
    // Large number of lines
    if (ours.length > 20 || theirs.length > 20) {
      return true;
    }

    // Function signature changes
    if (this.hasFunctionSignatureChange(ours, theirs)) {
      return true;
    }

    // Class/interface structure changes
    if (this.hasStructureChange(ours, theirs)) {
      return true;
    }

    // Both sides have significant logic
    if (this.hasComplexLogic(ours) && this.hasComplexLogic(theirs)) {
      return true;
    }

    return false;
  }

  /**
   * Estimate difficulty score (0-100)
   */
  estimateDifficulty(fileConflict) {
    const { conflicts } = fileConflict;
    let score = 0;

    // Base score on conflict count
    score += Math.min(conflicts.length * 10, 30);

    // Add score based on complexity
    for (const conflict of conflicts) {
      if (conflict.category === 'trivial') {
        score += 5;
      } else if (conflict.category === 'moderate') {
        score += 15;
      } else if (conflict.category === 'complex') {
        score += 30;
      }

      // Add for line count
      score += Math.min(conflict.linesChanged, 20);

      // Add for code complexity
      score += conflict.complexity * 2;
    }

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate code complexity
   */
  calculateComplexity(conflict) {
    const allLines = [...conflict.ours, ...conflict.theirs];
    let complexity = 0;

    for (const line of allLines) {
      // Count nesting (braces, brackets)
      complexity += (line.match(/[{[(]/g) || []).length;

      // Count function definitions
      if (line.match(/function|=>|def |class /)) {
        complexity += 2;
      }

      // Count control flow
      if (line.match(/if|for|while|switch|try|catch/)) {
        complexity += 1;
      }
    }

    return complexity;
  }

  /**
   * Helper: Check if conflict is whitespace only
   */
  isWhitespaceOnly(ours, theirs) {
    const oursTrimmed = ours.map(l => l.trim()).join('');
    const theirsTrimmed = theirs.map(l => l.trim()).join('');
    return oursTrimmed === theirsTrimmed;
  }

  /**
   * Helper: Check if conflict is import statements
   */
  isImportConflict(ours, theirs) {
    const importPattern = /^(import|from|require|using|include)/;
    const allOursImports = ours.every(l => importPattern.test(l.trim()) || l.trim() === '');
    const allTheirsImports = theirs.every(l => importPattern.test(l.trim()) || l.trim() === '');
    return allOursImports && allTheirsImports;
  }

  /**
   * Helper: Check if conflict is comments only
   */
  isCommentConflict(ours, theirs) {
    const commentPattern = /^(\/\/|\/\*|\*|#|<!--)/;
    const allOursComments = ours.every(l => commentPattern.test(l.trim()) || l.trim() === '');
    const allTheirsComments = theirs.every(l => commentPattern.test(l.trim()) || l.trim() === '');
    return allOursComments && allTheirsComments;
  }

  /**
   * Helper: Check for function signature changes
   */
  hasFunctionSignatureChange(ours, theirs) {
    const funcPattern = /function\s+\w+\s*\(|=>\s*{|def\s+\w+\s*\(/;
    const oursHasFunc = ours.some(l => funcPattern.test(l));
    const theirsHasFunc = theirs.some(l => funcPattern.test(l));
    return oursHasFunc && theirsHasFunc;
  }

  /**
   * Helper: Check for structure changes
   */
  hasStructureChange(ours, theirs) {
    const structPattern = /class\s+\w+|interface\s+\w+|struct\s+\w+|enum\s+\w+/;
    const oursHasStruct = ours.some(l => structPattern.test(l));
    const theirsHasStruct = theirs.some(l => structPattern.test(l));
    return oursHasStruct && theirsHasStruct;
  }

  /**
   * Helper: Check for complex logic
   */
  hasComplexLogic(lines) {
    let complexity = 0;

    for (const line of lines) {
      if (line.match(/if|for|while|switch|async|await|promise/i)) {
        complexity++;
      }
    }

    return complexity >= 2;
  }

  /**
   * Get overall category for file
   */
  getOverallCategory(conflicts) {
    if (conflicts.every(c => c.category === 'trivial')) {
      return 'trivial';
    }
    if (conflicts.some(c => c.category === 'complex')) {
      return 'complex';
    }
    return 'moderate';
  }

  /**
   * Generate summary of conflicts
   */
  generateSummary(analyzedFiles) {
    const total = analyzedFiles.length;
    const trivial = analyzedFiles.filter(f => f.category === 'trivial').length;
    const moderate = analyzedFiles.filter(f => f.category === 'moderate').length;
    const complex = analyzedFiles.filter(f => f.category === 'complex').length;

    const avgDifficulty = Math.round(
      analyzedFiles.reduce((sum, f) => sum + f.difficulty, 0) / total
    );

    return {
      totalFiles: total,
      byCategory: { trivial, moderate, complex },
      averageDifficulty: avgDifficulty,
      recommendation: this.getRecommendation(avgDifficulty, complex)
    };
  }

  /**
   * Get resolution recommendation
   */
  getRecommendation(avgDifficulty, complexCount) {
    if (avgDifficulty < 20) {
      return 'Low difficulty - auto-resolution likely successful';
    }
    if (avgDifficulty < 50 && complexCount === 0) {
      return 'Moderate difficulty - AI resolution recommended';
    }
    if (avgDifficulty < 70) {
      return 'High difficulty - AI resolution with manual review recommended';
    }
    return 'Very high difficulty - manual resolution recommended';
  }
}
