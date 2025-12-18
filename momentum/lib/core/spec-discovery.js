const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * SpecDiscovery - Discovers context and patterns for feature specification
 *
 * This class analyzes the existing codebase to find relevant files,
 * identify patterns, and generate structured questions for requirements gathering.
 */
class SpecDiscovery {
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Discover context for a feature
   * Finds relevant files and code related to the feature description
   *
   * @param {string} feature - Feature description or name
   * @returns {Promise<Object>} Discovery results with files and scores
   */
  async discoverContext(feature) {
    const results = {
      feature,
      relevantFiles: [],
      keywords: this._extractKeywords(feature),
      timestamp: new Date().toISOString()
    };

    // Extract keywords from feature description
    const keywords = results.keywords;

    // Search for files containing these keywords
    for (const keyword of keywords) {
      try {
        // Use git grep for fast searching in git repos
        const grepResults = this._gitGrep(keyword);

        grepResults.forEach(result => {
          const existing = results.relevantFiles.find(f => f.path === result.path);
          if (existing) {
            existing.score += result.matches;
            existing.keywords.add(keyword);
          } else {
            results.relevantFiles.push({
              path: result.path,
              score: result.matches,
              keywords: new Set([keyword]),
              type: this._detectFileType(result.path)
            });
          }
        });
      } catch (error) {
        // Fallback to filesystem search if git grep fails
        console.warn(`Git grep failed for "${keyword}", using filesystem search`);
        this._filesystemSearch(keyword, results.relevantFiles);
      }
    }

    // Sort by relevance score
    results.relevantFiles.sort((a, b) => b.score - a.score);

    // Convert Set to Array for serialization
    results.relevantFiles.forEach(file => {
      file.keywords = Array.from(file.keywords);
    });

    // Limit to top 20 most relevant files
    results.relevantFiles = results.relevantFiles.slice(0, 20);

    return results;
  }

  /**
   * Analyze existing files to understand patterns
   *
   * @param {Array<Object>} files - Files from discoverContext
   * @returns {Promise<Object>} Analysis results with patterns and conventions
   */
  async analyzeExisting(files) {
    const analysis = {
      patterns: {
        architecture: [],
        naming: [],
        structure: []
      },
      conventions: [],
      dependencies: new Set(),
      frameworks: new Set()
    };

    for (const fileInfo of files) {
      const filePath = path.join(this.projectRoot, fileInfo.path);

      if (!fs.existsSync(filePath)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Detect architectural patterns
        this._detectArchitecturePatterns(content, analysis.patterns.architecture);

        // Detect naming conventions
        this._detectNamingConventions(fileInfo.path, analysis.patterns.naming);

        // Detect dependencies and frameworks
        this._detectDependencies(content, analysis.dependencies, analysis.frameworks);

        // Detect structural patterns (classes, functions, exports)
        this._detectStructuralPatterns(content, analysis.patterns.structure);
      } catch (error) {
        console.warn(`Failed to analyze ${fileInfo.path}: ${error.message}`);
      }
    }

    // Convert Sets to Arrays
    analysis.dependencies = Array.from(analysis.dependencies);
    analysis.frameworks = Array.from(analysis.frameworks);

    // Deduplicate patterns
    analysis.patterns.architecture = [...new Set(analysis.patterns.architecture)];
    analysis.patterns.naming = [...new Set(analysis.patterns.naming)];
    analysis.patterns.structure = [...new Set(analysis.patterns.structure)];

    return analysis;
  }

  /**
   * Gather requirements through structured questions
   *
   * @param {string} feature - Feature description
   * @param {Object} context - Context from discoverContext
   * @param {Object} analysis - Analysis from analyzeExisting
   * @returns {Promise<Object>} Structured questions by category
   */
  async gatherRequirements(feature, context = {}, analysis = {}) {
    const questions = {
      functional: [],
      technical: [],
      userExperience: [],
      edgeCases: [],
      integration: [],
      performance: []
    };

    // Functional questions
    questions.functional.push(
      `What is the primary goal of ${feature}?`,
      `Who are the intended users of this feature?`,
      `What actions should users be able to perform?`,
      `What are the expected inputs and outputs?`
    );

    // Technical questions based on discovered patterns
    if (analysis.frameworks && analysis.frameworks.length > 0) {
      questions.technical.push(
        `Should this feature integrate with ${analysis.frameworks.join(', ')}?`
      );
    }

    questions.technical.push(
      `What data structures are needed?`,
      `Are there any external APIs or services to integrate?`,
      `What security considerations apply?`,
      `Should this feature be testable in isolation?`
    );

    // UX questions
    questions.userExperience.push(
      `How should users interact with this feature (CLI, GUI, API)?`,
      `What feedback should users receive during operation?`,
      `How should errors be communicated to users?`,
      `Are there any accessibility requirements?`
    );

    // Edge cases
    questions.edgeCases.push(
      `What should happen with invalid inputs?`,
      `How should the feature handle concurrent operations?`,
      `What are the boundary conditions (empty, max, null)?`,
      `How should the feature behave under resource constraints?`,
      `What happens if external dependencies are unavailable?`
    );

    // Integration questions based on context
    if (context.relevantFiles && context.relevantFiles.length > 0) {
      const types = new Set(context.relevantFiles.map(f => f.type));
      questions.integration.push(
        `Should this feature integrate with existing ${Array.from(types).join(', ')} components?`
      );
    }

    questions.integration.push(
      `What existing features might this affect?`,
      `Are there any breaking changes to existing APIs?`,
      `Does this require database migrations or schema changes?`
    );

    // Performance questions
    questions.performance.push(
      `What are the performance requirements (latency, throughput)?`,
      `Should this feature work offline or with poor connectivity?`,
      `Are there any scalability concerns?`,
      `What are acceptable resource usage limits (memory, CPU, disk)?`
    );

    return questions;
  }

  /**
   * Research technical feasibility
   *
   * @param {Object} requirements - Requirements gathered
   * @returns {Promise<Object>} Feasibility analysis
   */
  async researchFeasibility(requirements) {
    const feasibility = {
      blockers: [],
      risks: [],
      dependencies: [],
      alternatives: [],
      confidence: 'medium' // low, medium, high
    };

    // Check for potential blockers
    if (requirements.technical) {
      requirements.technical.forEach(req => {
        // Check if required dependencies exist
        if (req.includes('requires') || req.includes('depends on')) {
          feasibility.dependencies.push(req);
        }
      });
    }

    // Identify risks
    if (requirements.edgeCases && requirements.edgeCases.length > 5) {
      feasibility.risks.push('High number of edge cases may increase complexity');
    }

    if (requirements.integration && requirements.integration.length > 0) {
      feasibility.risks.push('Integration with existing systems requires careful coordination');
    }

    // Check for conflicts with existing code
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        feasibility.currentDependencies = Object.keys(pkg.dependencies || {});
      }
    } catch (error) {
      console.warn('Could not read package.json');
    }

    // Set confidence based on complexity
    const complexityFactors = [
      feasibility.blockers.length,
      feasibility.risks.length,
      feasibility.dependencies.length
    ];

    const totalComplexity = complexityFactors.reduce((a, b) => a + b, 0);

    if (totalComplexity === 0) {
      feasibility.confidence = 'high';
    } else if (totalComplexity > 5) {
      feasibility.confidence = 'low';
    } else {
      feasibility.confidence = 'medium';
    }

    return feasibility;
  }

  // Private helper methods

  _extractKeywords(feature) {
    // Remove common words and extract meaningful keywords
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
      'that', 'these', 'those'
    ]);

    return feature
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .map(word => word.replace(/[^a-z0-9]/g, ''))
      .filter(word => word.length > 0);
  }

  _gitGrep(keyword) {
    try {
      const output = execSync(
        `git grep -i -n "${keyword}" -- '*.js' '*.json' '*.md' '*.ts' '*.jsx' '*.tsx' 2>/dev/null || true`,
        { cwd: this.projectRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
      );

      const results = new Map();

      output.split('\n').forEach(line => {
        if (!line) return;

        const match = line.match(/^([^:]+):/);
        if (match) {
          const filePath = match[1];
          if (!results.has(filePath)) {
            results.set(filePath, { path: filePath, matches: 0 });
          }
          results.get(filePath).matches++;
        }
      });

      return Array.from(results.values());
    } catch (error) {
      return [];
    }
  }

  _filesystemSearch(keyword, relevantFiles) {
    // Simple fallback - just search in lib and commands directories
    const searchDirs = ['lib', 'commands', 'src'];

    searchDirs.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        this._searchDirectory(dirPath, keyword, relevantFiles);
      }
    });
  }

  _searchDirectory(dirPath, keyword, relevantFiles) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      entries.forEach(entry => {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this._searchDirectory(fullPath, keyword, relevantFiles);
        } else if (entry.isFile() && /\.(js|json|md|ts|jsx|tsx)$/.test(entry.name)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const matches = (content.toLowerCase().match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;

            if (matches > 0) {
              const relativePath = path.relative(this.projectRoot, fullPath);
              const existing = relevantFiles.find(f => f.path === relativePath);

              if (existing) {
                existing.score += matches;
              } else {
                relevantFiles.push({
                  path: relativePath,
                  score: matches,
                  keywords: new Set([keyword]),
                  type: this._detectFileType(relativePath)
                });
              }
            }
          } catch (error) {
            // Skip files that can't be read
          }
        }
      });
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  _detectFileType(filePath) {
    if (filePath.includes('/commands/')) return 'command';
    if (filePath.includes('/lib/core/')) return 'core';
    if (filePath.includes('/lib/')) return 'library';
    if (filePath.includes('/test/')) return 'test';
    if (filePath.endsWith('.md')) return 'documentation';
    if (filePath.endsWith('.json')) return 'config';
    return 'other';
  }

  _detectArchitecturePatterns(content, patterns) {
    if (content.includes('class ') && content.includes('constructor')) {
      patterns.push('ES6 Classes');
    }
    if (content.match(/async\s+\w+\s*\(/)) {
      patterns.push('Async/Await');
    }
    if (content.includes('module.exports') || content.includes('exports.')) {
      patterns.push('CommonJS Modules');
    }
    if (content.includes('import ') && content.includes('from ')) {
      patterns.push('ES6 Modules');
    }
    if (content.includes('EventEmitter') || content.includes('.on(')) {
      patterns.push('Event-Driven');
    }
    if (content.includes('Promise')) {
      patterns.push('Promises');
    }
  }

  _detectNamingConventions(filePath, patterns) {
    const fileName = path.basename(filePath, path.extname(filePath));

    if (fileName.includes('-')) {
      patterns.push('kebab-case files');
    }
    if (fileName.match(/^[A-Z]/)) {
      patterns.push('PascalCase files');
    }
    if (fileName.includes('_')) {
      patterns.push('snake_case files');
    }
  }

  _detectDependencies(content, dependencies, frameworks) {
    // Detect require statements
    const requireMatches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
    for (const match of requireMatches) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.add(dep);
      }
    }

    // Detect import statements
    const importMatches = content.matchAll(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.add(dep);
      }
    }

    // Detect common frameworks
    const frameworkKeywords = {
      'express': 'Express.js',
      'react': 'React',
      'vue': 'Vue.js',
      'commander': 'Commander.js',
      'inquirer': 'Inquirer.js',
      'chalk': 'Chalk',
      'ora': 'Ora'
    };

    dependencies.forEach(dep => {
      const framework = frameworkKeywords[dep];
      if (framework) {
        frameworks.add(framework);
      }
    });
  }

  _detectStructuralPatterns(content, patterns) {
    if (content.match(/class\s+\w+/g)) {
      const classCount = (content.match(/class\s+\w+/g) || []).length;
      patterns.push(`${classCount} class(es) per file`);
    }
    if (content.match(/function\s+\w+/g)) {
      patterns.push('Named functions');
    }
    if (content.match(/const\s+\w+\s*=\s*\([^)]*\)\s*=>/g)) {
      patterns.push('Arrow functions');
    }
    if (content.includes('module.exports = ')) {
      patterns.push('Single export');
    }
    if (content.match(/exports\.\w+/g)) {
      patterns.push('Multiple exports');
    }
  }
}

module.exports = SpecDiscovery;
