/**
 * FixStrategy - Intelligent error analysis and AI-powered fixes
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { getFixPrompt } from './fix-prompts.js';

export class FixStrategy {
  constructor(options = {}) {
    this.workDir = options.workDir || process.cwd();
    this.llmModel = options.llmModel || 'claude-sonnet-4-5-20250929';
    this.maxRetries = options.maxRetries || 3;
    this.stats = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      byStrategy: {}
    };
  }

  /**
   * Analyze error and identify fix approach
   * @param {object} error - Error from QA check
   * @param {object} context - Additional context
   * @returns {object} Analysis with strategy type and details
   */
  analyzeError(error, context = {}) {
    const { type, output } = error;

    // Determine strategy based on error type and content
    const strategy = this.identifyStrategy(type, output);

    // Extract error details
    const details = this.extractErrorDetails(output, strategy);

    // Gather context for fix
    const fixContext = this.gatherContext(details, context);

    return {
      strategy,
      details,
      context: fixContext,
      checkType: type
    };
  }

  /**
   * Identify which fix strategy to use
   * @param {string} checkType - Type of check (lint, typecheck, test, etc)
   * @param {string} output - Error output
   * @returns {string} Strategy type
   */
  identifyStrategy(checkType, output) {
    // Import errors
    if (output.match(/cannot find module|cannot resolve|import.*not found/i)) {
      return 'import-fix';
    }

    // Syntax errors
    if (output.match(/unexpected token|syntax error|parse error/i)) {
      return 'syntax-fix';
    }

    // Type errors
    if (checkType === 'typecheck' || output.match(/type error|property.*does not exist/i)) {
      return 'type-fix';
    }

    // Test failures
    if (checkType === 'test' || output.match(/test failed|assertion error|expected.*received/i)) {
      return 'test-fix';
    }

    // Lint errors (default for lint check)
    if (checkType === 'lint') {
      return 'lint-fix';
    }

    // Default to lint-fix for unknown
    return 'lint-fix';
  }

  /**
   * Extract structured error details from output
   * @param {string} output - Error output
   * @param {string} strategy - Fix strategy type
   * @returns {object} Structured error details
   */
  extractErrorDetails(output, strategy) {
    const details = {
      files: [],
      errors: [],
      rawOutput: output
    };

    // Parse file paths and line numbers
    const filePattern = /([^\s]+\.(?:js|ts|jsx|tsx|py)):(\d+):(\d+)/g;
    let match;

    while ((match = filePattern.exec(output)) !== null) {
      details.files.push({
        path: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3])
      });
    }

    // Extract error messages
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.match(/error|failed|expected/i)) {
        details.errors.push(line.trim());
      }
    }

    return details;
  }

  /**
   * Gather context for fixing the error
   * @param {object} details - Error details
   * @param {object} additionalContext - Additional context
   * @returns {object} Fix context
   */
  gatherContext(details, additionalContext = {}) {
    const context = {
      files: {},
      dependencies: {},
      ...additionalContext
    };

    // Read affected files
    for (const fileInfo of details.files) {
      const filePath = join(this.workDir, fileInfo.path);
      try {
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // Get surrounding context (±5 lines)
        const start = Math.max(0, fileInfo.line - 6);
        const end = Math.min(lines.length, fileInfo.line + 5);

        context.files[fileInfo.path] = {
          fullContent: content,
          errorLocation: {
            line: fileInfo.line,
            column: fileInfo.column,
            context: lines.slice(start, end).join('\n')
          }
        };
      } catch (err) {
        // File couldn't be read
        context.files[fileInfo.path] = { error: err.message };
      }
    }

    // Read package.json for dependency info
    try {
      const pkgPath = join(this.workDir, 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      context.dependencies = {
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {}
      };
    } catch (err) {
      // No package.json or can't read
    }

    return context;
  }

  /**
   * Generate fix using AI
   * @param {object} analysis - Error analysis
   * @returns {Promise<object>} Generated fix
   */
  async generateFix(analysis) {
    const { strategy, details, context, checkType } = analysis;

    // Get appropriate prompt for this strategy
    const prompt = getFixPrompt(strategy, details, context);

    // Call LLM to generate fix
    // Note: This is a placeholder - in production, integrate with actual LLM API
    const fix = await this.callLLM(prompt);

    // Track stats
    if (!this.stats.byStrategy[strategy]) {
      this.stats.byStrategy[strategy] = { attempted: 0, succeeded: 0, failed: 0 };
    }
    this.stats.byStrategy[strategy].attempted++;
    this.stats.attempted++;

    return {
      strategy,
      checkType,
      actions: fix.actions || [],
      explanation: fix.explanation || '',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Call LLM to generate fix
   * @param {string} prompt - Fix prompt
   * @returns {Promise<object>} LLM response with fix actions
   */
  async callLLM(prompt) {
    // Placeholder implementation
    // In production, this would call Claude API or similar
    return {
      actions: [
        {
          type: 'edit',
          file: 'example.js',
          search: 'old code',
          replace: 'new code'
        }
      ],
      explanation: 'Fix generated by AI'
    };
  }

  /**
   * Apply the generated fix
   * @param {object} fix - Generated fix
   * @returns {object} Application result
   */
  async applyFix(fix) {
    const results = {
      success: false,
      actionsApplied: [],
      errors: []
    };

    for (const action of fix.actions) {
      try {
        switch (action.type) {
          case 'edit':
            this.applyEdit(action);
            results.actionsApplied.push(action);
            break;

          case 'create':
            this.applyCreate(action);
            results.actionsApplied.push(action);
            break;

          case 'delete':
            this.applyDelete(action);
            results.actionsApplied.push(action);
            break;

          case 'command':
            this.applyCommand(action);
            results.actionsApplied.push(action);
            break;

          default:
            results.errors.push(`Unknown action type: ${action.type}`);
        }
      } catch (err) {
        results.errors.push({
          action,
          error: err.message
        });
      }
    }

    results.success = results.actionsApplied.length > 0 && results.errors.length === 0;
    return results;
  }

  /**
   * Apply edit action
   * @param {object} action - Edit action
   */
  applyEdit(action) {
    const filePath = join(this.workDir, action.file);
    const content = readFileSync(filePath, 'utf8');

    // Simple search/replace
    const newContent = content.replace(action.search, action.replace);

    if (newContent === content) {
      throw new Error(`Search pattern not found in ${action.file}`);
    }

    writeFileSync(filePath, newContent, 'utf8');
  }

  /**
   * Apply create action
   * @param {object} action - Create action
   */
  applyCreate(action) {
    const filePath = join(this.workDir, action.file);
    writeFileSync(filePath, action.content, 'utf8');
  }

  /**
   * Apply delete action
   * @param {object} action - Delete action
   */
  applyDelete(action) {
    const filePath = join(this.workDir, action.file);
    execSync(`rm -f "${filePath}"`, { cwd: this.workDir });
  }

  /**
   * Apply command action
   * @param {object} action - Command action
   */
  applyCommand(action) {
    execSync(action.command, {
      cwd: this.workDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
  }

  /**
   * Verify that the fix worked
   * @param {object} fix - Applied fix
   * @param {string} checkType - Type of check
   * @returns {Promise<object>} Verification result
   */
  async verifyFix(fix, checkType) {
    // Re-run the check that originally failed
    try {
      // This would call back to QARunner to re-run the specific check
      // For now, return placeholder
      const verified = true;

      if (verified) {
        this.stats.succeeded++;
        if (this.stats.byStrategy[fix.strategy]) {
          this.stats.byStrategy[fix.strategy].succeeded++;
        }
      } else {
        this.stats.failed++;
        if (this.stats.byStrategy[fix.strategy]) {
          this.stats.byStrategy[fix.strategy].failed++;
        }
      }

      return {
        verified,
        checkType,
        strategy: fix.strategy
      };
    } catch (err) {
      this.stats.failed++;
      if (this.stats.byStrategy[fix.strategy]) {
        this.stats.byStrategy[fix.strategy].failed++;
      }

      return {
        verified: false,
        checkType,
        strategy: fix.strategy,
        error: err.message
      };
    }
  }

  /**
   * Get fix statistics
   * @returns {object} Fix statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.attempted > 0
        ? (this.stats.succeeded / this.stats.attempted * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      byStrategy: {}
    };
  }
}

export default FixStrategy;
