/**
 * RequirementsGatherer - Parses feature descriptions and structures requirements
 *
 * This class takes feature descriptions, generates clarifying questions,
 * and structures the gathered information into well-organized requirements.
 */
class RequirementsGatherer {
  constructor() {
    this.requirements = {
      functional: [],
      nonFunctional: [],
      constraints: [],
      assumptions: [],
      edgeCases: [],
      questions: []
    };
  }

  /**
   * Parse a feature description to extract initial requirements
   *
   * @param {string} featureDescription - Raw feature description
   * @returns {Object} Parsed feature with extracted entities and actions
   */
  parse(featureDescription) {
    const parsed = {
      description: featureDescription,
      entities: this._extractEntities(featureDescription),
      actions: this._extractActions(featureDescription),
      scope: this._determineScope(featureDescription),
      complexity: 'medium' // low, medium, high
    };

    // Estimate complexity based on entities and actions
    const totalElements = parsed.entities.length + parsed.actions.length;
    if (totalElements > 10) {
      parsed.complexity = 'high';
    } else if (totalElements < 5) {
      parsed.complexity = 'low';
    }

    return parsed;
  }

  /**
   * Generate clarifying questions based on feature description and context
   *
   * @param {Object} parsed - Parsed feature from parse()
   * @param {Object} context - Discovery context
   * @returns {Array<Object>} Array of categorized questions
   */
  generateQuestions(parsed, context = {}) {
    const questions = [];

    // Technical implementation questions
    questions.push({
      category: 'technical',
      question: `What programming language/framework should be used for ${parsed.entities.join(', ')}?`,
      priority: 'high'
    });

    if (parsed.actions.length > 0) {
      questions.push({
        category: 'technical',
        question: `How should ${parsed.actions.join(', ')} be implemented?`,
        priority: 'high'
      });
    }

    questions.push({
      category: 'technical',
      question: 'What data persistence mechanism is required (if any)?',
      priority: 'medium'
    });

    // User experience questions
    questions.push({
      category: 'ux',
      question: 'What is the primary user interface (CLI, GUI, API, web)?',
      priority: 'high'
    });

    questions.push({
      category: 'ux',
      question: 'What feedback should users receive during operation?',
      priority: 'medium'
    });

    questions.push({
      category: 'ux',
      question: 'How should errors be displayed to users?',
      priority: 'medium'
    });

    // Edge case questions
    questions.push({
      category: 'edge_cases',
      question: 'What should happen with invalid or missing inputs?',
      priority: 'high'
    });

    questions.push({
      category: 'edge_cases',
      question: 'How should the feature handle concurrent operations?',
      priority: 'medium'
    });

    questions.push({
      category: 'edge_cases',
      question: 'What are the boundary conditions (empty inputs, maximum values, null/undefined)?',
      priority: 'high'
    });

    // Integration questions
    if (context.relevantFiles && context.relevantFiles.length > 0) {
      questions.push({
        category: 'integration',
        question: `Should this integrate with existing components: ${context.relevantFiles.slice(0, 3).map(f => f.path).join(', ')}?`,
        priority: 'high'
      });
    }

    questions.push({
      category: 'integration',
      question: 'Are there any breaking changes to existing APIs or interfaces?',
      priority: 'high'
    });

    questions.push({
      category: 'integration',
      question: 'What external dependencies or services are required?',
      priority: 'medium'
    });

    // Performance questions
    if (parsed.complexity === 'high') {
      questions.push({
        category: 'performance',
        question: 'What are the performance requirements (response time, throughput)?',
        priority: 'high'
      });

      questions.push({
        category: 'performance',
        question: 'Are there scalability concerns for large datasets or high concurrency?',
        priority: 'medium'
      });
    }

    questions.push({
      category: 'performance',
      question: 'What are acceptable resource usage limits (memory, CPU, disk)?',
      priority: 'low'
    });

    // Security questions
    questions.push({
      category: 'security',
      question: 'Are there any security or privacy considerations?',
      priority: 'medium'
    });

    questions.push({
      category: 'security',
      question: 'Does this feature handle sensitive data?',
      priority: 'high'
    });

    return questions;
  }

  /**
   * Structure requirements into categories
   *
   * @param {Object} answers - Answers to generated questions
   * @param {Object} parsed - Parsed feature description
   * @returns {Object} Structured requirements
   */
  structure(answers, parsed) {
    const structured = {
      functional: [],
      nonFunctional: [],
      constraints: [],
      assumptions: [],
      edgeCases: []
    };

    // Process answers and categorize into requirements
    answers.forEach(answer => {
      if (!answer.answer || answer.answer.trim() === '') return;

      const requirement = {
        text: answer.answer,
        priority: answer.priority || 'medium',
        category: answer.category
      };

      switch (answer.category) {
        case 'technical':
        case 'ux':
          structured.functional.push(requirement);
          break;

        case 'performance':
        case 'security':
          structured.nonFunctional.push(requirement);
          break;

        case 'edge_cases':
          structured.edgeCases.push(requirement);
          break;

        case 'integration':
          // Integration answers might be constraints or functional requirements
          if (answer.answer.toLowerCase().includes('must') ||
              answer.answer.toLowerCase().includes('required')) {
            structured.constraints.push(requirement);
          } else {
            structured.functional.push(requirement);
          }
          break;

        default:
          structured.assumptions.push(requirement);
      }
    });

    // Add implicit requirements from parsed feature
    if (parsed.entities.length > 0) {
      structured.functional.push({
        text: `System must handle ${parsed.entities.join(', ')}`,
        priority: 'high',
        category: 'technical'
      });
    }

    if (parsed.actions.length > 0) {
      structured.functional.push({
        text: `System must support ${parsed.actions.join(', ')}`,
        priority: 'high',
        category: 'technical'
      });
    }

    return structured;
  }

  /**
   * Discover and add edge cases
   *
   * @param {Object} requirements - Structured requirements
   * @param {Object} parsed - Parsed feature
   * @returns {Array<Object>} Discovered edge cases
   */
  discoverEdgeCases(requirements, parsed) {
    const edgeCases = [];

    // Common edge cases for all features
    edgeCases.push({
      scenario: 'Empty input',
      description: 'What happens when required inputs are empty or null?',
      priority: 'high'
    });

    edgeCases.push({
      scenario: 'Invalid input',
      description: 'How should the system handle malformed or invalid inputs?',
      priority: 'high'
    });

    edgeCases.push({
      scenario: 'Maximum values',
      description: 'What are the upper limits for inputs, and how are they enforced?',
      priority: 'medium'
    });

    // Edge cases based on entities
    parsed.entities.forEach(entity => {
      edgeCases.push({
        scenario: `Missing ${entity}`,
        description: `What happens when ${entity} is not found or unavailable?`,
        priority: 'high'
      });

      edgeCases.push({
        scenario: `Duplicate ${entity}`,
        description: `How should the system handle duplicate ${entity}?`,
        priority: 'medium'
      });
    });

    // Edge cases based on actions
    parsed.actions.forEach(action => {
      edgeCases.push({
        scenario: `${action} fails`,
        description: `What happens when ${action} operation fails?`,
        priority: 'high'
      });

      if (action.includes('delete') || action.includes('remove')) {
        edgeCases.push({
          scenario: `${action} in use`,
          description: `Can ${action} be performed while the resource is in use?`,
          priority: 'high'
        });
      }

      if (action.includes('create') || action.includes('add')) {
        edgeCases.push({
          scenario: `${action} already exists`,
          description: `What happens when trying to ${action} something that already exists?`,
          priority: 'medium'
        });
      }
    });

    // Concurrency edge cases for complex features
    if (parsed.complexity === 'high') {
      edgeCases.push({
        scenario: 'Concurrent operations',
        description: 'How should the system handle multiple simultaneous operations?',
        priority: 'high'
      });

      edgeCases.push({
        scenario: 'Race conditions',
        description: 'Are there potential race conditions, and how are they prevented?',
        priority: 'high'
      });
    }

    // Resource constraint edge cases
    edgeCases.push({
      scenario: 'Low memory',
      description: 'How should the system behave under memory constraints?',
      priority: 'low'
    });

    edgeCases.push({
      scenario: 'Network failure',
      description: 'What happens if network connectivity is lost during operation?',
      priority: 'medium'
    });

    return edgeCases;
  }

  /**
   * Add a requirement to the internal requirements structure
   *
   * @param {string} type - Type of requirement (functional, nonFunctional, etc.)
   * @param {string} text - Requirement text
   * @param {string} priority - Priority level (high, medium, low)
   */
  addRequirement(type, text, priority = 'medium') {
    if (this.requirements[type]) {
      this.requirements[type].push({ text, priority });
    }
  }

  /**
   * Get all requirements
   *
   * @returns {Object} All requirements
   */
  getRequirements() {
    return this.requirements;
  }

  /**
   * Export requirements to a formatted object for saving
   *
   * @returns {Object} Formatted requirements for export
   */
  export() {
    return {
      timestamp: new Date().toISOString(),
      requirements: this.requirements,
      summary: {
        totalFunctional: this.requirements.functional.length,
        totalNonFunctional: this.requirements.nonFunctional.length,
        totalConstraints: this.requirements.constraints.length,
        totalAssumptions: this.requirements.assumptions.length,
        totalEdgeCases: this.requirements.edgeCases.length,
        totalQuestions: this.requirements.questions.length
      }
    };
  }

  // Private helper methods

  _extractEntities(description) {
    const entities = [];

    // Look for nouns that might be entities
    // Simple pattern: capitalized words or words after "a", "an", "the"
    const words = description.split(/\s+/);

    words.forEach((word, index) => {
      const cleaned = word.replace(/[^a-zA-Z]/g, '');
      if (!cleaned) return;

      // Capitalized words (likely entities)
      if (/^[A-Z][a-z]+/.test(cleaned) && cleaned.length > 2) {
        entities.push(cleaned);
      }

      // Words after articles
      if (index > 0 && /^(a|an|the)$/i.test(words[index - 1])) {
        if (cleaned.length > 2) {
          entities.push(cleaned.toLowerCase());
        }
      }
    });

    // Remove duplicates and common words
    const commonWords = new Set(['feature', 'system', 'user', 'data', 'file']);
    return [...new Set(entities)].filter(e => !commonWords.has(e.toLowerCase()));
  }

  _extractActions(description) {
    const actions = [];

    // Look for verbs (action words)
    const actionVerbs = [
      'create', 'read', 'update', 'delete', 'add', 'remove', 'modify',
      'generate', 'process', 'validate', 'check', 'verify', 'execute',
      'run', 'start', 'stop', 'pause', 'resume', 'cancel', 'save',
      'load', 'import', 'export', 'transform', 'filter', 'sort',
      'search', 'find', 'query', 'fetch', 'send', 'receive', 'display',
      'show', 'hide', 'enable', 'disable', 'configure', 'setup', 'install'
    ];

    const lowercaseDesc = description.toLowerCase();

    actionVerbs.forEach(verb => {
      if (lowercaseDesc.includes(verb)) {
        actions.push(verb);
      }
    });

    return [...new Set(actions)];
  }

  _determineScope(description) {
    const scope = {
      size: 'medium', // small, medium, large
      boundary: 'internal' // internal, external, both
    };

    // Determine size based on description length and complexity
    const wordCount = description.split(/\s+/).length;

    if (wordCount < 10) {
      scope.size = 'small';
    } else if (wordCount > 30) {
      scope.size = 'large';
    }

    // Determine boundary based on keywords
    const externalKeywords = ['api', 'service', 'external', 'third-party', 'integration'];
    const hasExternal = externalKeywords.some(keyword =>
      description.toLowerCase().includes(keyword)
    );

    if (hasExternal) {
      scope.boundary = 'both';
    }

    return scope;
  }
}

module.exports = RequirementsGatherer;
