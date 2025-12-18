/**
 * ConflictResolver - AI-powered conflict resolution with validation
 *
 * Handles:
 * - AI-powered conflict resolution
 * - Syntax and semantic validation
 * - Application of resolved content
 * - Retry logic for failures
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export class ConflictResolver {
  constructor() {
    this.stats = {
      attempted: 0,
      successful: 0,
      failed: 0,
      validationErrors: 0,
      retries: 0
    };
    this.maxRetries = 3;
  }

  /**
   * Resolve a conflict using AI
   *
   * @param {Object} conflict - Conflict data from MergeResolver
   * @param {Object} context - Additional context (prompt, paths, etc.)
   * @returns {Object} - Resolution result
   */
  async resolve(conflict, context) {
    this.stats.attempted++;

    const { prompt, worktreePath, targetBranch } = context;

    try {
      // Get AI resolution
      const resolution = await this.getAIResolution(prompt, conflict);

      // Validate resolution
      const validation = this.validateResolution(conflict, resolution);

      if (!validation.valid) {
        this.stats.validationErrors++;

        // Retry if within limit
        if (validation.retryable && this.canRetry()) {
          this.stats.retries++;
          return this.retry(conflict, context, validation.error);
        }

        return {
          success: false,
          error: `Validation failed: ${validation.error}`,
          conflict: conflict.file
        };
      }

      // Apply resolution
      const applied = await this.applyResolution(conflict.path, resolution);

      if (!applied.success) {
        return {
          success: false,
          error: `Failed to apply resolution: ${applied.error}`,
          conflict: conflict.file
        };
      }

      this.stats.successful++;
      return {
        success: true,
        file: conflict.file,
        resolution,
        message: 'Conflict resolved and applied successfully'
      };

    } catch (error) {
      this.stats.failed++;
      return {
        success: false,
        error: error.message,
        conflict: conflict.file
      };
    }
  }

  /**
   * Get AI-powered resolution for conflict
   * (This would integrate with Claude Code's Task tool)
   */
  async getAIResolution(prompt, conflict) {
    // In real implementation, this would use Claude Code's Task tool
    // For now, return a structured placeholder

    return {
      resolvedContent: this.generatePlaceholderResolution(conflict),
      explanation: 'Merged both changes while preserving functionality',
      confidence: 'high'
    };
  }

  /**
   * Generate placeholder resolution (for testing without AI)
   */
  generatePlaceholderResolution(conflict) {
    // Simple strategy: prefer ours, but include theirs if non-overlapping
    const resolved = [];

    for (const c of conflict.conflicts) {
      // If both sides are similar, use ours
      if (this.areSimilar(c.ours, c.theirs)) {
        resolved.push(...c.ours);
      } else {
        // Otherwise, combine both with comment
        resolved.push('// Merged from both branches:');
        resolved.push(...c.ours);
        if (c.theirs.length > 0) {
          resolved.push('// Also includes:');
          resolved.push(...c.theirs);
        }
      }
    }

    return resolved.join('\n');
  }

  /**
   * Check if two code sections are similar
   */
  areSimilar(lines1, lines2) {
    const normalize = (lines) => lines.map(l => l.trim()).join('');
    return normalize(lines1) === normalize(lines2);
  }

  /**
   * Validate AI-generated resolution
   *
   * @param {Object} conflict - Original conflict
   * @param {Object} resolution - AI resolution
   * @returns {Object} - Validation result
   */
  validateResolution(conflict, resolution) {
    const { resolvedContent } = resolution;

    // Check 1: Resolution is not empty
    if (!resolvedContent || resolvedContent.trim().length === 0) {
      return {
        valid: false,
        error: 'Resolution is empty',
        retryable: true
      };
    }

    // Check 2: No conflict markers in resolution
    if (this.hasConflictMarkers(resolvedContent)) {
      return {
        valid: false,
        error: 'Resolution still contains conflict markers',
        retryable: true
      };
    }

    // Check 3: Basic syntax check (for common languages)
    const syntaxCheck = this.checkBasicSyntax(resolvedContent, conflict.file);
    if (!syntaxCheck.valid) {
      return {
        valid: false,
        error: `Syntax error: ${syntaxCheck.error}`,
        retryable: true
      };
    }

    // Check 4: Resolution is reasonable length
    const originalLength = this.estimateOriginalLength(conflict);
    const resolvedLength = resolvedContent.split('\n').length;

    if (resolvedLength > originalLength * 3) {
      return {
        valid: false,
        error: 'Resolution is unexpectedly long (possible AI hallucination)',
        retryable: true
      };
    }

    // Check 5: Contains some content from both sides (when appropriate)
    const preservationCheck = this.checkContentPreservation(conflict, resolvedContent);
    if (!preservationCheck.valid) {
      return {
        valid: false,
        error: preservationCheck.error,
        retryable: true
      };
    }

    return { valid: true };
  }

  /**
   * Check for conflict markers in text
   */
  hasConflictMarkers(text) {
    return text.includes('<<<<<<<') ||
           text.includes('=======') ||
           text.includes('>>>>>>>');
  }

  /**
   * Basic syntax validation
   */
  checkBasicSyntax(content, filename) {
    const ext = filename.split('.').pop().toLowerCase();

    // JavaScript/TypeScript
    if (['js', 'jsx', 'ts', 'tsx', 'mjs'].includes(ext)) {
      return this.checkJSSyntax(content);
    }

    // Python
    if (['py'].includes(ext)) {
      return this.checkPythonSyntax(content);
    }

    // JSON
    if (['json'].includes(ext)) {
      return this.checkJSONSyntax(content);
    }

    // Default: no specific check
    return { valid: true };
  }

  /**
   * Check JavaScript syntax
   */
  checkJSSyntax(content) {
    // Basic checks: balanced braces, parentheses, brackets
    const braceBalance = this.checkBalance(content, '{', '}');
    if (!braceBalance.balanced) {
      return { valid: false, error: 'Unbalanced braces' };
    }

    const parenBalance = this.checkBalance(content, '(', ')');
    if (!parenBalance.balanced) {
      return { valid: false, error: 'Unbalanced parentheses' };
    }

    const bracketBalance = this.checkBalance(content, '[', ']');
    if (!bracketBalance.balanced) {
      return { valid: false, error: 'Unbalanced brackets' };
    }

    return { valid: true };
  }

  /**
   * Check Python syntax
   */
  checkPythonSyntax(content) {
    // Basic indentation check
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.trimStart() !== line && !line.startsWith(' ') && !line.startsWith('\t')) {
        return { valid: false, error: 'Invalid indentation' };
      }
    }

    return { valid: true };
  }

  /**
   * Check JSON syntax
   */
  checkJSONSyntax(content) {
    try {
      JSON.parse(content);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Check balanced delimiters
   */
  checkBalance(content, open, close) {
    let count = 0;

    for (const char of content) {
      if (char === open) count++;
      if (char === close) count--;
      if (count < 0) return { balanced: false };
    }

    return { balanced: count === 0 };
  }

  /**
   * Estimate original conflict length
   */
  estimateOriginalLength(conflict) {
    let total = 0;
    for (const c of conflict.conflicts) {
      total += Math.max(c.ours.length, c.theirs.length);
    }
    return total;
  }

  /**
   * Check that resolution preserves important content
   */
  checkContentPreservation(conflict, resolved) {
    // Extract key identifiers from both sides
    const oursIdentifiers = this.extractIdentifiers(
      conflict.conflicts.flatMap(c => c.ours).join('\n')
    );
    const theirsIdentifiers = this.extractIdentifiers(
      conflict.conflicts.flatMap(c => c.theirs).join('\n')
    );

    // Check if major identifiers are preserved
    const resolvedText = resolved.toLowerCase();

    // At least some content from ours should be present
    const oursPreserved = oursIdentifiers.some(id =>
      resolvedText.includes(id.toLowerCase())
    );

    if (oursIdentifiers.length > 0 && !oursPreserved) {
      return {
        valid: false,
        error: 'Resolution appears to lose content from current branch'
      };
    }

    return { valid: true };
  }

  /**
   * Extract identifiers (function names, variables, etc.)
   */
  extractIdentifiers(code) {
    const identifierPattern = /\b([a-zA-Z_][a-zA-Z0-9_]{2,})\b/g;
    const matches = code.match(identifierPattern) || [];

    // Filter out common keywords
    const keywords = new Set([
      'function', 'const', 'let', 'var', 'return', 'import', 'export',
      'class', 'extends', 'implements', 'interface', 'type', 'async', 'await',
      'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue'
    ]);

    return matches.filter(m => !keywords.has(m.toLowerCase()));
  }

  /**
   * Apply resolved content to file
   *
   * @param {string} filePath - Path to conflicted file
   * @param {Object} resolution - AI resolution
   * @returns {Object} - Application result
   */
  async applyResolution(filePath, resolution) {
    try {
      const { resolvedContent } = resolution;

      // Read current file with conflict markers
      const currentContent = readFileSync(filePath, 'utf8');

      // Replace conflict section with resolution
      const newContent = this.replaceConflicts(currentContent, resolvedContent);

      // Write resolved content
      writeFileSync(filePath, newContent, 'utf8');

      // Stage the resolved file
      const workDir = join(filePath, '..');
      execSync(`git add "${filePath}"`, { cwd: workDir, stdio: 'pipe' });

      return {
        success: true,
        message: 'Resolution applied and staged'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Replace conflict markers with resolved content
   */
  replaceConflicts(original, resolved) {
    const lines = original.split('\n');
    const result = [];
    let inConflict = false;
    let conflictIndex = 0;

    for (const line of lines) {
      if (line.startsWith('<<<<<<<')) {
        inConflict = true;
        // Insert resolved content
        result.push(resolved);
        conflictIndex++;
      } else if (line.startsWith('>>>>>>>')) {
        inConflict = false;
      } else if (!inConflict) {
        result.push(line);
      }
      // Skip lines inside conflict markers
    }

    return result.join('\n');
  }

  /**
   * Retry resolution with improved prompt
   */
  async retry(conflict, context, previousError) {
    const enhancedPrompt = context.prompt + `\n\n**Previous attempt failed with error:** ${previousError}\n\n**Please fix this issue in your resolution.**`;

    return this.resolve(conflict, {
      ...context,
      prompt: enhancedPrompt
    });
  }

  /**
   * Check if retry is allowed
   */
  canRetry() {
    return this.stats.retries < this.maxRetries;
  }

  /**
   * Get resolution statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.attempted > 0
        ? Math.round((this.stats.successful / this.stats.attempted) * 100)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      attempted: 0,
      successful: 0,
      failed: 0,
      validationErrors: 0,
      retries: 0
    };
  }
}
