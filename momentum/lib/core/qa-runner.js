/**
 * QARunner - Self-healing quality assurance loop
 */
import { execSync, exec } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { FixStrategy } from './fix-strategy.js';

export class QARunner {
  constructor(options = {}) {
    this.maxIterations = options.maxIterations || 10;
    this.workDir = options.workDir || process.cwd();
    this.checks = options.checks || ['lint', 'typecheck', 'test'];
    this.fixEnabled = options.fixEnabled !== false;
    this.history = [];
    this.fixStrategy = new FixStrategy({ workDir: this.workDir });
    this.fixAttempts = [];
  }

  /**
   * Run all QA checks
   */
  async run() {
    const results = {
      passed: true,
      checks: [],
      iterations: 0
    };

    for (const check of this.checks) {
      const result = await this.runCheck(check);
      results.checks.push(result);
      if (!result.passed) {
        results.passed = false;
      }
    }

    return results;
  }

  /**
   * Run a single check
   */
  async runCheck(checkType) {
    const result = {
      type: checkType,
      passed: false,
      output: '',
      fixable: false,
      fixCommand: null
    };

    try {
      switch (checkType) {
        case 'lint':
          result.output = this.runLint();
          result.passed = true;
          break;

        case 'typecheck':
          result.output = this.runTypecheck();
          result.passed = true;
          break;

        case 'test':
          result.output = this.runTests();
          result.passed = true;
          break;

        case 'build':
          result.output = this.runBuild();
          result.passed = true;
          break;

        default:
          result.output = `Unknown check type: ${checkType}`;
      }
    } catch (err) {
      result.passed = false;
      result.output = err.stdout || err.message;
      result.fixable = this.isFixable(checkType, result.output);
      result.fixCommand = this.getFixCommand(checkType);
    }

    return result;
  }

  /**
   * Run lint check
   */
  runLint() {
    // Detect linter
    if (existsSync(join(this.workDir, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(this.workDir, 'package.json')));

      if (pkg.scripts?.lint) {
        return execSync('npm run lint', {
          cwd: this.workDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }

      // Try common linters
      if (pkg.devDependencies?.eslint || pkg.dependencies?.eslint) {
        return execSync('npx eslint . --ext .js,.ts,.jsx,.tsx', {
          cwd: this.workDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }
    }

    // Python
    if (existsSync(join(this.workDir, 'pyproject.toml'))) {
      return execSync('ruff check .', {
        cwd: this.workDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }

    return 'No linter configured';
  }

  /**
   * Run typecheck
   */
  runTypecheck() {
    if (existsSync(join(this.workDir, 'tsconfig.json'))) {
      return execSync('npx tsc --noEmit', {
        cwd: this.workDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }

    if (existsSync(join(this.workDir, 'pyproject.toml'))) {
      return execSync('mypy .', {
        cwd: this.workDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }

    return 'No type checker configured';
  }

  /**
   * Run tests
   */
  runTests() {
    if (existsSync(join(this.workDir, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(this.workDir, 'package.json')));

      if (pkg.scripts?.test) {
        return execSync('npm test', {
          cwd: this.workDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }
    }

    if (existsSync(join(this.workDir, 'pytest.ini')) ||
        existsSync(join(this.workDir, 'pyproject.toml'))) {
      return execSync('pytest', {
        cwd: this.workDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
    }

    return 'No test runner configured';
  }

  /**
   * Run build
   */
  runBuild() {
    if (existsSync(join(this.workDir, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(this.workDir, 'package.json')));

      if (pkg.scripts?.build) {
        return execSync('npm run build', {
          cwd: this.workDir,
          encoding: 'utf8',
          stdio: 'pipe'
        });
      }
    }

    return 'No build script configured';
  }

  /**
   * Check if error is auto-fixable
   */
  isFixable(checkType, output) {
    const fixablePatterns = {
      lint: [
        /potentially fixable with/i,
        /--fix/i,
        /auto-fixable/i
      ],
      typecheck: [], // Usually not auto-fixable
      test: []       // Usually not auto-fixable
    };

    const patterns = fixablePatterns[checkType] || [];
    return patterns.some(p => p.test(output));
  }

  /**
   * Get fix command for check type
   */
  getFixCommand(checkType) {
    const fixCommands = {
      lint: 'npm run lint -- --fix',
      format: 'npx prettier --write .'
    };

    return fixCommands[checkType] || null;
  }

  /**
   * Attempt to fix failures
   */
  async fix(failures) {
    const fixed = [];

    for (const failure of failures) {
      const startTime = Date.now();
      let fixResult = null;

      // Try simple auto-fix first
      if (failure.fixable && failure.fixCommand) {
        try {
          execSync(failure.fixCommand, {
            cwd: this.workDir,
            encoding: 'utf8',
            stdio: 'pipe'
          });
          fixed.push(failure.type);

          this.fixAttempts.push({
            checkType: failure.type,
            strategy: 'simple-auto-fix',
            success: true,
            duration: Date.now() - startTime
          });

          continue;
        } catch (err) {
          // Simple fix failed, try AI-powered fix
        }
      }

      // Try AI-powered fix strategy
      try {
        const analysis = this.fixStrategy.analyzeError(failure);
        const fix = await this.fixStrategy.generateFix(analysis);
        const applyResult = await this.fixStrategy.applyFix(fix);

        if (applyResult.success) {
          const verification = await this.fixStrategy.verifyFix(fix, failure.type);

          this.fixAttempts.push({
            checkType: failure.type,
            strategy: analysis.strategy,
            success: verification.verified,
            duration: Date.now() - startTime,
            explanation: fix.explanation
          });

          if (verification.verified) {
            fixed.push(failure.type);
          }
        } else {
          this.fixAttempts.push({
            checkType: failure.type,
            strategy: analysis.strategy,
            success: false,
            duration: Date.now() - startTime,
            errors: applyResult.errors
          });
        }
      } catch (err) {
        // AI fix failed
        this.fixAttempts.push({
          checkType: failure.type,
          strategy: 'ai-fix',
          success: false,
          duration: Date.now() - startTime,
          error: err.message
        });
      }
    }

    return fixed;
  }

  /**
   * Run the self-healing loop
   */
  async loop() {
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      // Run all checks
      const results = await this.run();
      this.history.push({ iteration, results });

      // All passed?
      if (results.passed) {
        return {
          success: true,
          iterations: iteration,
          history: this.history
        };
      }

      // Try to fix
      const failures = results.checks.filter(c => !c.passed);
      const fixableFailures = failures.filter(f => f.fixable);

      if (fixableFailures.length === 0) {
        // Nothing we can auto-fix
        return {
          success: false,
          iterations: iteration,
          unfixable: failures,
          history: this.history
        };
      }

      // Attempt fixes
      const fixed = await this.fix(fixableFailures);

      if (fixed.length === 0) {
        // No progress made
        return {
          success: false,
          iterations: iteration,
          unfixable: failures,
          history: this.history
        };
      }

      // Loop continues...
    }

    // Max iterations reached
    return {
      success: false,
      iterations: this.maxIterations,
      reason: 'max_iterations',
      history: this.history
    };
  }

  /**
   * Generate QA report
   */
  generateReport() {
    const lastRun = this.history[this.history.length - 1];

    // Calculate fix statistics
    const fixStats = this.calculateFixStatistics();

    return {
      summary: lastRun?.results.passed ? 'PASSED' : 'FAILED',
      totalIterations: this.history.length,
      checks: lastRun?.results.checks || [],
      timeline: this.history.map(h => ({
        iteration: h.iteration,
        passed: h.results.passed,
        failedChecks: h.results.checks.filter(c => !c.passed).map(c => c.type)
      })),
      fixStatistics: fixStats,
      fixStrategyStats: this.fixStrategy.getStats()
    };
  }

  /**
   * Calculate fix statistics from attempts
   */
  calculateFixStatistics() {
    const stats = {
      totalAttempts: this.fixAttempts.length,
      successful: 0,
      failed: 0,
      byStrategy: {},
      byCheckType: {},
      totalDuration: 0,
      averageDuration: 0
    };

    for (const attempt of this.fixAttempts) {
      // Overall stats
      if (attempt.success) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      stats.totalDuration += attempt.duration || 0;

      // By strategy
      if (!stats.byStrategy[attempt.strategy]) {
        stats.byStrategy[attempt.strategy] = {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          totalDuration: 0
        };
      }

      stats.byStrategy[attempt.strategy].attempted++;
      if (attempt.success) {
        stats.byStrategy[attempt.strategy].succeeded++;
      } else {
        stats.byStrategy[attempt.strategy].failed++;
      }
      stats.byStrategy[attempt.strategy].totalDuration += attempt.duration || 0;

      // By check type
      if (!stats.byCheckType[attempt.checkType]) {
        stats.byCheckType[attempt.checkType] = {
          attempted: 0,
          succeeded: 0,
          failed: 0
        };
      }

      stats.byCheckType[attempt.checkType].attempted++;
      if (attempt.success) {
        stats.byCheckType[attempt.checkType].succeeded++;
      } else {
        stats.byCheckType[attempt.checkType].failed++;
      }
    }

    // Calculate averages
    if (stats.totalAttempts > 0) {
      stats.averageDuration = Math.round(stats.totalDuration / stats.totalAttempts);
      stats.successRate = ((stats.successful / stats.totalAttempts) * 100).toFixed(1) + '%';
    } else {
      stats.successRate = '0%';
    }

    // Add success rates for each strategy
    for (const [strategy, data] of Object.entries(stats.byStrategy)) {
      data.successRate = data.attempted > 0
        ? ((data.succeeded / data.attempted) * 100).toFixed(1) + '%'
        : '0%';
      data.avgDuration = data.attempted > 0
        ? Math.round(data.totalDuration / data.attempted)
        : 0;
    }

    return stats;
  }
}

export default QARunner;
