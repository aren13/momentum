/**
 * SpecCritic - Critiques specifications for quality and completeness
 *
 * This class provides detailed analysis of specifications, identifying
 * ambiguities, gaps, missing edge cases, and assigning confidence scores.
 */
class SpecCritic {
  constructor(options = {}) {
    this.strictMode = options.strictMode || false;
  }

  /**
   * Perform comprehensive critique of a specification
   *
   * @param {Object} spec - Specification to critique
   * @returns {Object} Detailed critique with scores and recommendations
   */
  critique(spec) {
    const critique = {
      timestamp: new Date().toISOString(),
      sections: {
        overview: this.checkOverview(spec.overview),
        requirements: this.verifyCompleteness(spec.requirements),
        edgeCases: this.identifyEdgeCases(spec.edgeCases),
        dependencies: this.checkDependencies(spec.dependencies),
        successCriteria: this.checkSuccessCriteria(spec.successCriteria),
        technicalDesign: this.checkTechnicalDesign(spec.technicalDesign)
      },
      ambiguities: this.checkAmbiguities(spec),
      gaps: [],
      recommendations: [],
      overallScore: 0,
      confidenceScore: 0,
      ready: false
    };

    // Calculate overall score
    const sectionScores = Object.values(critique.sections).map(s => s.score);
    critique.overallScore = Math.round(
      sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length
    );

    // Calculate confidence score
    critique.confidenceScore = this.scoreConfidence(spec, critique);

    // Determine if spec is ready
    critique.ready = critique.overallScore >= 70 && critique.confidenceScore >= 70;

    // Collect all issues and recommendations
    Object.values(critique.sections).forEach(section => {
      if (section.issues) {
        critique.gaps.push(...section.issues);
      }
      if (section.recommendations) {
        critique.recommendations.push(...section.recommendations);
      }
    });

    if (critique.ambiguities.length > 0) {
      critique.recommendations.push(
        'Address all identified ambiguities with precise, unambiguous language'
      );
    }

    return critique;
  }

  /**
   * Check for ambiguities in specification text
   *
   * @param {Object} spec - Specification
   * @returns {Array<Object>} List of ambiguities found
   */
  checkAmbiguities(spec) {
    const ambiguities = [];

    // Words that indicate ambiguity
    const ambiguousWords = [
      { word: 'should', severity: 'medium', suggestion: 'Use "must" or "will" for requirements' },
      { word: 'could', severity: 'medium', suggestion: 'Use "must" or "will" for requirements' },
      { word: 'might', severity: 'high', suggestion: 'Be specific about what will happen' },
      { word: 'maybe', severity: 'high', suggestion: 'Be specific about what will happen' },
      { word: 'possibly', severity: 'high', suggestion: 'Be specific about what will happen' },
      { word: 'probably', severity: 'high', suggestion: 'Be specific about what will happen' },
      { word: 'somehow', severity: 'high', suggestion: 'Specify the exact mechanism' },
      { word: 'etc', severity: 'medium', suggestion: 'List all items explicitly' },
      { word: 'and so on', severity: 'medium', suggestion: 'List all items explicitly' },
      { word: 'various', severity: 'medium', suggestion: 'Specify exactly which items' },
      { word: 'several', severity: 'low', suggestion: 'Specify the exact number or list' },
      { word: 'some', severity: 'low', suggestion: 'Specify exactly which or how many' }
    ];

    // Check all text sections
    const sectionsToCheck = [
      { name: 'overview', text: spec.overview },
      { name: 'functional requirements', items: spec.requirements?.functional },
      { name: 'non-functional requirements', items: spec.requirements?.nonFunctional },
      { name: 'constraints', items: spec.requirements?.constraints }
    ];

    sectionsToCheck.forEach(section => {
      if (section.text) {
        this._findAmbiguousWords(section.text, section.name, ambiguities, ambiguousWords);
      }

      if (section.items && Array.isArray(section.items)) {
        section.items.forEach((item, index) => {
          const text = item.text || item;
          this._findAmbiguousWords(
            text,
            `${section.name} #${index + 1}`,
            ambiguities,
            ambiguousWords
          );
        });
      }
    });

    return ambiguities;
  }

  /**
   * Verify completeness of requirements
   *
   * @param {Object} requirements - Requirements section
   * @returns {Object} Completeness analysis
   */
  verifyCompleteness(requirements) {
    const analysis = {
      score: 100,
      issues: [],
      recommendations: [],
      coverage: {
        functional: false,
        nonFunctional: false,
        constraints: false,
        assumptions: false
      }
    };

    // Check functional requirements
    if (!requirements?.functional || requirements.functional.length === 0) {
      analysis.score -= 40;
      analysis.issues.push({
        severity: 'critical',
        message: 'No functional requirements defined'
      });
    } else {
      analysis.coverage.functional = true;

      if (requirements.functional.length < 3) {
        analysis.score -= 10;
        analysis.recommendations.push('Consider if all functional requirements are captured (only ' + requirements.functional.length + ' found)');
      }

      // Check for testability
      const testableCount = requirements.functional.filter(req => {
        const text = (req.text || req).toLowerCase();
        return text.includes('must') || text.includes('will') || text.includes('shall');
      }).length;

      if (testableCount < requirements.functional.length / 2) {
        analysis.score -= 10;
        analysis.recommendations.push('Many functional requirements lack testable language (use "must", "will", "shall")');
      }
    }

    // Check non-functional requirements
    if (!requirements?.nonFunctional || requirements.nonFunctional.length === 0) {
      analysis.score -= 15;
      analysis.recommendations.push('No non-functional requirements defined (consider performance, security, scalability)');
    } else {
      analysis.coverage.nonFunctional = true;

      // Check for common non-functional categories
      const categories = {
        performance: false,
        security: false,
        scalability: false,
        reliability: false,
        usability: false
      };

      requirements.nonFunctional.forEach(req => {
        const text = (req.text || req).toLowerCase();
        Object.keys(categories).forEach(category => {
          if (text.includes(category)) {
            categories[category] = true;
          }
        });
      });

      const missingCategories = Object.entries(categories)
        .filter(([_, covered]) => !covered)
        .map(([cat, _]) => cat);

      if (missingCategories.length > 3) {
        analysis.score -= 5;
        analysis.recommendations.push(`Consider adding ${missingCategories.slice(0, 3).join(', ')} requirements`);
      }
    }

    // Check constraints
    if (requirements?.constraints && requirements.constraints.length > 0) {
      analysis.coverage.constraints = true;
    } else {
      analysis.score -= 5;
      analysis.recommendations.push('No constraints defined (technical, business, or regulatory)');
    }

    // Check assumptions
    if (requirements?.assumptions && requirements.assumptions.length > 0) {
      analysis.coverage.assumptions = true;
    } else {
      analysis.score -= 5;
      analysis.recommendations.push('No assumptions documented (document what is assumed to be true)');
    }

    analysis.score = Math.max(0, analysis.score);

    return analysis;
  }

  /**
   * Check overview section
   *
   * @param {string} overview - Overview text
   * @returns {Object} Overview analysis
   */
  checkOverview(overview) {
    const analysis = {
      score: 100,
      issues: [],
      recommendations: []
    };

    if (!overview || overview.trim().length === 0) {
      analysis.score = 0;
      analysis.issues.push({
        severity: 'critical',
        message: 'Overview section is missing'
      });
      return analysis;
    }

    // Check length
    if (overview.length < 100) {
      analysis.score -= 30;
      analysis.issues.push({
        severity: 'high',
        message: 'Overview is too brief (< 100 characters). Should provide comprehensive context.'
      });
    } else if (overview.length < 200) {
      analysis.score -= 10;
      analysis.recommendations.push('Overview could be more detailed');
    }

    // Check for key elements
    const hasWhy = overview.toLowerCase().includes('why') ||
                   overview.toLowerCase().includes('purpose') ||
                   overview.toLowerCase().includes('goal');

    const hasWhat = overview.toLowerCase().includes('what') ||
                    overview.toLowerCase().includes('feature') ||
                    overview.toLowerCase().includes('functionality');

    if (!hasWhy) {
      analysis.score -= 10;
      analysis.recommendations.push('Overview should explain why this feature is needed');
    }

    if (!hasWhat) {
      analysis.score -= 10;
      analysis.recommendations.push('Overview should clearly describe what the feature does');
    }

    analysis.score = Math.max(0, analysis.score);

    return analysis;
  }

  /**
   * Identify edge cases coverage
   *
   * @param {Array} edgeCases - Edge cases
   * @returns {Object} Edge case analysis
   */
  identifyEdgeCases(edgeCases) {
    const analysis = {
      score: 100,
      issues: [],
      recommendations: [],
      coverage: {
        invalidInput: false,
        emptyInput: false,
        boundaryConditions: false,
        concurrency: false,
        errorHandling: false,
        resourceConstraints: false
      }
    };

    if (!edgeCases || edgeCases.length === 0) {
      analysis.score = 20;
      analysis.issues.push({
        severity: 'high',
        message: 'No edge cases defined'
      });
      analysis.recommendations.push('Add edge cases for: invalid input, empty input, boundary conditions, concurrent operations, error scenarios');
      return analysis;
    }

    // Check coverage of common edge case categories
    edgeCases.forEach(edge => {
      const text = ((edge.scenario || '') + ' ' + (edge.description || edge)).toLowerCase();

      if (text.includes('invalid') || text.includes('malformed')) {
        analysis.coverage.invalidInput = true;
      }
      if (text.includes('empty') || text.includes('null') || text.includes('missing')) {
        analysis.coverage.emptyInput = true;
      }
      if (text.includes('boundary') || text.includes('maximum') || text.includes('minimum') || text.includes('limit')) {
        analysis.coverage.boundaryConditions = true;
      }
      if (text.includes('concurrent') || text.includes('parallel') || text.includes('race')) {
        analysis.coverage.concurrency = true;
      }
      if (text.includes('error') || text.includes('fail') || text.includes('exception')) {
        analysis.coverage.errorHandling = true;
      }
      if (text.includes('memory') || text.includes('resource') || text.includes('network')) {
        analysis.coverage.resourceConstraints = true;
      }
    });

    // Calculate score based on coverage
    const uncovered = Object.entries(analysis.coverage)
      .filter(([_, covered]) => !covered)
      .map(([category, _]) => category);

    analysis.score -= uncovered.length * 10;

    if (uncovered.length > 0) {
      analysis.recommendations.push(`Consider edge cases for: ${uncovered.join(', ')}`);
    }

    if (edgeCases.length < 5) {
      analysis.score -= 10;
      analysis.recommendations.push(`Only ${edgeCases.length} edge cases defined. Consider adding more.`);
    }

    analysis.score = Math.max(0, analysis.score);

    return analysis;
  }

  /**
   * Check dependencies section
   *
   * @param {Array} dependencies - Dependencies
   * @returns {Object} Dependencies analysis
   */
  checkDependencies(dependencies) {
    const analysis = {
      score: 100,
      issues: [],
      recommendations: []
    };

    if (!dependencies || dependencies.length === 0) {
      analysis.score = 70;
      analysis.recommendations.push('No dependencies listed. Verify if this feature is truly standalone.');
    }

    return analysis;
  }

  /**
   * Check success criteria
   *
   * @param {Array} successCriteria - Success criteria
   * @returns {Object} Success criteria analysis
   */
  checkSuccessCriteria(successCriteria) {
    const analysis = {
      score: 100,
      issues: [],
      recommendations: []
    };

    if (!successCriteria || successCriteria.length === 0) {
      analysis.score = 0;
      analysis.issues.push({
        severity: 'critical',
        message: 'No success criteria defined. How will completion be verified?'
      });
      return analysis;
    }

    // Check if criteria are measurable
    const measurableKeywords = ['test', 'verify', 'check', 'pass', 'measure', 'validate', 'confirm'];

    const measurableCount = successCriteria.filter(criterion => {
      const text = (criterion.text || criterion).toLowerCase();
      return measurableKeywords.some(keyword => text.includes(keyword));
    }).length;

    if (measurableCount === 0) {
      analysis.score -= 40;
      analysis.issues.push({
        severity: 'high',
        message: 'Success criteria are not measurable. Use testable, verifiable criteria.'
      });
    } else if (measurableCount < successCriteria.length / 2) {
      analysis.score -= 20;
      analysis.recommendations.push('Make more success criteria measurable and testable');
    }

    if (successCriteria.length < 3) {
      analysis.score -= 10;
      analysis.recommendations.push('Consider adding more success criteria to ensure comprehensive verification');
    }

    analysis.score = Math.max(0, analysis.score);

    return analysis;
  }

  /**
   * Check technical design section
   *
   * @param {Object} technicalDesign - Technical design
   * @returns {Object} Technical design analysis
   */
  checkTechnicalDesign(technicalDesign) {
    const analysis = {
      score: 100,
      issues: [],
      recommendations: []
    };

    if (!technicalDesign || Object.keys(technicalDesign).length === 0) {
      analysis.score = 50;
      analysis.recommendations.push('No technical design provided. Consider adding architecture notes or implementation approach.');
      return analysis;
    }

    // Check for key design elements
    if (!technicalDesign.architecture && !technicalDesign.approach) {
      analysis.score -= 20;
      analysis.recommendations.push('Add architectural approach or implementation strategy');
    }

    if (!technicalDesign.dataStructures && !technicalDesign.approach) {
      analysis.score -= 10;
      analysis.recommendations.push('Consider documenting key data structures');
    }

    analysis.score = Math.max(0, analysis.score);

    return analysis;
  }

  /**
   * Calculate overall confidence score
   *
   * @param {Object} spec - Specification
   * @param {Object} critique - Critique results
   * @returns {number} Confidence score (0-100)
   */
  scoreConfidence(spec, critique) {
    let confidence = 100;

    // Reduce confidence based on ambiguities
    confidence -= critique.ambiguities.length * 5;

    // Reduce confidence based on missing sections
    const missingSections = Object.values(critique.sections)
      .filter(section => section.score < 50).length;

    confidence -= missingSections * 15;

    // Reduce confidence based on critical issues
    const criticalIssues = Object.values(critique.sections)
      .flatMap(section => section.issues || [])
      .filter(issue => issue.severity === 'critical').length;

    confidence -= criticalIssues * 20;

    // Reduce confidence based on high severity issues
    const highIssues = Object.values(critique.sections)
      .flatMap(section => section.issues || [])
      .filter(issue => issue.severity === 'high').length;

    confidence -= highIssues * 10;

    return Math.max(0, Math.min(100, confidence));
  }

  // Private helper methods

  _findAmbiguousWords(text, location, ambiguities, ambiguousWords) {
    if (!text) return;

    const lowerText = text.toLowerCase();

    ambiguousWords.forEach(({ word, severity, suggestion }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);

      if (matches) {
        ambiguities.push({
          location,
          word,
          severity,
          suggestion,
          occurrences: matches.length,
          context: this._extractContext(text, word)
        });
      }
    });
  }

  _extractContext(text, word, contextLength = 50) {
    const index = text.toLowerCase().indexOf(word.toLowerCase());
    if (index === -1) return text.substring(0, 100);

    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + word.length + contextLength);

    let context = text.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
  }
}

export default SpecCritic;
