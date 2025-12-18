import fs from 'fs';
import path from 'path';

/**
 * SpecGenerator - Generates specifications with self-critique
 *
 * This class takes requirements and generates a comprehensive specification,
 * then critiques and refines it through multiple iterations.
 */
class SpecGenerator {
  constructor(options = {}) {
    this.maxIterations = options.maxIterations || 3;
    this.templatePath = options.templatePath || null;
  }

  /**
   * Generate initial specification from requirements and context
   *
   * @param {Object} requirements - Structured requirements
   * @param {Object} context - Discovery context
   * @returns {Object} Initial specification
   */
  generate(requirements, context = {}) {
    const spec = {
      metadata: {
        title: context.feature || 'Feature Specification',
        version: '1.0.0',
        created: new Date().toISOString(),
        status: 'draft'
      },
      overview: this._generateOverview(requirements, context),
      requirements: {
        functional: requirements.functional || [],
        nonFunctional: requirements.nonFunctional || [],
        constraints: requirements.constraints || [],
        assumptions: requirements.assumptions || []
      },
      edgeCases: requirements.edgeCases || [],
      dependencies: this._extractDependencies(requirements, context),
      successCriteria: this._generateSuccessCriteria(requirements),
      technicalDesign: this._generateTechnicalDesign(context),
      implementationNotes: this._generateImplementationNotes(context)
    };

    return spec;
  }

  /**
   * Critique a specification for gaps and issues
   *
   * @param {Object} spec - Specification to critique
   * @returns {Object} Critique results with issues and suggestions
   */
  critique(spec) {
    const critique = {
      timestamp: new Date().toISOString(),
      overallScore: 0,
      issues: [],
      suggestions: [],
      strengths: []
    };

    // Check overview
    if (!spec.overview || spec.overview.length < 100) {
      critique.issues.push({
        section: 'overview',
        severity: 'high',
        message: 'Overview is too brief or missing. Should provide comprehensive context.'
      });
    } else {
      critique.strengths.push('Overview provides good context');
    }

    // Check functional requirements
    if (!spec.requirements.functional || spec.requirements.functional.length === 0) {
      critique.issues.push({
        section: 'requirements.functional',
        severity: 'critical',
        message: 'No functional requirements defined. Specification must include functional requirements.'
      });
    } else if (spec.requirements.functional.length < 3) {
      critique.issues.push({
        section: 'requirements.functional',
        severity: 'medium',
        message: 'Very few functional requirements. Consider if all requirements are captured.'
      });
    } else {
      critique.strengths.push(`${spec.requirements.functional.length} functional requirements defined`);
    }

    // Check for ambiguous language in requirements
    const ambiguousWords = ['should', 'could', 'might', 'maybe', 'possibly', 'probably'];
    spec.requirements.functional.forEach((req, index) => {
      const reqText = req.text || req;
      ambiguousWords.forEach(word => {
        if (reqText.toLowerCase().includes(word)) {
          critique.issues.push({
            section: 'requirements.functional',
            severity: 'medium',
            message: `Requirement ${index + 1} uses ambiguous language ("${word}"). Use precise language like "must", "will", "shall".`,
            requirement: reqText
          });
        }
      });
    });

    // Check edge cases
    if (!spec.edgeCases || spec.edgeCases.length === 0) {
      critique.issues.push({
        section: 'edgeCases',
        severity: 'high',
        message: 'No edge cases defined. Specifications should identify potential edge cases and boundary conditions.'
      });
    } else if (spec.edgeCases.length < 3) {
      critique.suggestions.push({
        section: 'edgeCases',
        message: 'Consider adding more edge cases. Common edge cases include: null/empty inputs, maximum values, concurrent operations, network failures.'
      });
    } else {
      critique.strengths.push(`${spec.edgeCases.length} edge cases identified`);
    }

    // Check success criteria
    if (!spec.successCriteria || spec.successCriteria.length === 0) {
      critique.issues.push({
        section: 'successCriteria',
        severity: 'high',
        message: 'No success criteria defined. How will we know when this is complete?'
      });
    } else {
      // Check if success criteria are measurable
      const measurableKeywords = ['pass', 'verify', 'test', 'check', 'measure', 'validate'];
      const measurable = spec.successCriteria.some(criterion => {
        const text = criterion.text || criterion;
        return measurableKeywords.some(keyword => text.toLowerCase().includes(keyword));
      });

      if (!measurable) {
        critique.issues.push({
          section: 'successCriteria',
          severity: 'medium',
          message: 'Success criteria should be measurable and testable.'
        });
      } else {
        critique.strengths.push('Success criteria are measurable');
      }
    }

    // Check dependencies
    if (!spec.dependencies || spec.dependencies.length === 0) {
      critique.suggestions.push({
        section: 'dependencies',
        message: 'No dependencies listed. Consider if this feature depends on other features, services, or external systems.'
      });
    }

    // Check technical design
    if (!spec.technicalDesign || Object.keys(spec.technicalDesign).length === 0) {
      critique.issues.push({
        section: 'technicalDesign',
        severity: 'medium',
        message: 'No technical design provided. Consider adding architecture notes, data structures, or implementation approach.'
      });
    } else {
      critique.strengths.push('Technical design section present');
    }

    // Check for security considerations
    const hasSecurityReqs = spec.requirements.nonFunctional?.some(req => {
      const text = req.text || req;
      return text.toLowerCase().includes('security') || text.toLowerCase().includes('auth');
    });

    if (!hasSecurityReqs) {
      critique.suggestions.push({
        section: 'requirements.nonFunctional',
        message: 'Consider adding security requirements if this feature handles sensitive data or requires authentication.'
      });
    }

    // Check for performance requirements
    const hasPerformanceReqs = spec.requirements.nonFunctional?.some(req => {
      const text = req.text || req;
      return text.toLowerCase().includes('performance') || text.toLowerCase().includes('latency');
    });

    if (!hasPerformanceReqs) {
      critique.suggestions.push({
        section: 'requirements.nonFunctional',
        message: 'Consider adding performance requirements (latency, throughput, resource usage).'
      });
    }

    // Calculate overall score
    const criticalIssues = critique.issues.filter(i => i.severity === 'critical').length;
    const highIssues = critique.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = critique.issues.filter(i => i.severity === 'medium').length;

    let score = 100;
    score -= criticalIssues * 30;
    score -= highIssues * 15;
    score -= mediumIssues * 5;
    score -= critique.suggestions.length * 2;
    score = Math.max(0, score);

    critique.overallScore = score;

    // Determine if spec is ready
    critique.ready = criticalIssues === 0 && highIssues === 0 && score >= 70;

    return critique;
  }

  /**
   * Refine specification based on critique
   *
   * @param {Object} spec - Original specification
   * @param {Object} critique - Critique results
   * @returns {Object} Refined specification
   */
  refine(spec, critique) {
    const refined = JSON.parse(JSON.stringify(spec)); // Deep clone

    // Address critical and high severity issues
    critique.issues.forEach(issue => {
      if (issue.severity === 'critical' || issue.severity === 'high') {
        this._addressIssue(refined, issue);
      }
    });

    // Apply suggestions where applicable
    critique.suggestions.forEach(suggestion => {
      this._applySuggestion(refined, suggestion);
    });

    // Update metadata
    refined.metadata.updated = new Date().toISOString();
    refined.metadata.version = this._incrementVersion(refined.metadata.version);

    return refined;
  }

  /**
   * Finalize specification for output
   *
   * @param {Object} spec - Specification to finalize
   * @param {Object} critique - Final critique (optional)
   * @returns {string} Formatted specification as markdown
   */
  finalize(spec, critique = null) {
    let markdown = `# ${spec.metadata.title}\n\n`;
    markdown += `**Version:** ${spec.metadata.version}\n`;
    markdown += `**Created:** ${new Date(spec.metadata.created).toISOString().split('T')[0]}\n`;

    if (spec.metadata.updated) {
      markdown += `**Updated:** ${new Date(spec.metadata.updated).toISOString().split('T')[0]}\n`;
    }

    markdown += `**Status:** ${spec.metadata.status}\n\n`;

    if (critique) {
      markdown += `**Quality Score:** ${critique.overallScore}/100\n\n`;
    }

    markdown += `---\n\n`;

    // Overview
    markdown += `## Overview\n\n${spec.overview}\n\n`;

    // Requirements
    markdown += `## Requirements\n\n`;

    if (spec.requirements.functional && spec.requirements.functional.length > 0) {
      markdown += `### Functional Requirements\n\n`;
      spec.requirements.functional.forEach((req, index) => {
        const text = req.text || req;
        const priority = req.priority ? ` (Priority: ${req.priority})` : '';
        markdown += `${index + 1}. ${text}${priority}\n`;
      });
      markdown += `\n`;
    }

    if (spec.requirements.nonFunctional && spec.requirements.nonFunctional.length > 0) {
      markdown += `### Non-Functional Requirements\n\n`;
      spec.requirements.nonFunctional.forEach((req, index) => {
        const text = req.text || req;
        const priority = req.priority ? ` (Priority: ${req.priority})` : '';
        markdown += `${index + 1}. ${text}${priority}\n`;
      });
      markdown += `\n`;
    }

    if (spec.requirements.constraints && spec.requirements.constraints.length > 0) {
      markdown += `### Constraints\n\n`;
      spec.requirements.constraints.forEach((constraint, index) => {
        const text = constraint.text || constraint;
        markdown += `${index + 1}. ${text}\n`;
      });
      markdown += `\n`;
    }

    if (spec.requirements.assumptions && spec.requirements.assumptions.length > 0) {
      markdown += `### Assumptions\n\n`;
      spec.requirements.assumptions.forEach((assumption, index) => {
        const text = assumption.text || assumption;
        markdown += `${index + 1}. ${text}\n`;
      });
      markdown += `\n`;
    }

    // Edge Cases
    if (spec.edgeCases && spec.edgeCases.length > 0) {
      markdown += `## Edge Cases\n\n`;
      spec.edgeCases.forEach((edge, index) => {
        if (typeof edge === 'object') {
          markdown += `### ${index + 1}. ${edge.scenario}\n\n`;
          markdown += `${edge.description}\n\n`;
          if (edge.priority) {
            markdown += `**Priority:** ${edge.priority}\n\n`;
          }
        } else {
          markdown += `${index + 1}. ${edge}\n`;
        }
      });
      markdown += `\n`;
    }

    // Dependencies
    if (spec.dependencies && spec.dependencies.length > 0) {
      markdown += `## Dependencies\n\n`;
      spec.dependencies.forEach((dep, index) => {
        markdown += `${index + 1}. ${dep}\n`;
      });
      markdown += `\n`;
    }

    // Success Criteria
    if (spec.successCriteria && spec.successCriteria.length > 0) {
      markdown += `## Success Criteria\n\n`;
      spec.successCriteria.forEach((criterion, index) => {
        const text = criterion.text || criterion;
        markdown += `- [ ] ${text}\n`;
      });
      markdown += `\n`;
    }

    // Technical Design
    if (spec.technicalDesign && Object.keys(spec.technicalDesign).length > 0) {
      markdown += `## Technical Design\n\n`;

      if (spec.technicalDesign.architecture) {
        markdown += `### Architecture\n\n${spec.technicalDesign.architecture}\n\n`;
      }

      if (spec.technicalDesign.dataStructures) {
        markdown += `### Data Structures\n\n${spec.technicalDesign.dataStructures}\n\n`;
      }

      if (spec.technicalDesign.approach) {
        markdown += `### Implementation Approach\n\n${spec.technicalDesign.approach}\n\n`;
      }
    }

    // Implementation Notes
    if (spec.implementationNotes && spec.implementationNotes.length > 0) {
      markdown += `## Implementation Notes\n\n`;
      spec.implementationNotes.forEach(note => {
        markdown += `- ${note}\n`;
      });
      markdown += `\n`;
    }

    markdown += `---\n\n`;
    markdown += `*Generated by Momentum Spec Engine*\n`;

    return markdown;
  }

  // Private helper methods

  _generateOverview(requirements, context) {
    let overview = `This specification defines the requirements and design for `;
    overview += context.feature || 'the feature';
    overview += `.\n\n`;

    if (context.description) {
      overview += `${context.description}\n\n`;
    }

    if (context.analysis?.frameworks?.length > 0) {
      overview += `**Technology Stack:** ${context.analysis.frameworks.join(', ')}\n\n`;
    }

    if (requirements.functional?.length > 0) {
      overview += `This feature includes ${requirements.functional.length} functional requirements`;

      if (requirements.nonFunctional?.length > 0) {
        overview += ` and ${requirements.nonFunctional.length} non-functional requirements`;
      }

      overview += `.`;
    }

    return overview;
  }

  _extractDependencies(requirements, context) {
    const dependencies = [];

    if (context.analysis?.dependencies?.length > 0) {
      dependencies.push(...context.analysis.dependencies.slice(0, 5));
    }

    if (requirements.constraints) {
      requirements.constraints.forEach(constraint => {
        const text = constraint.text || constraint;
        if (text.includes('depend') || text.includes('require')) {
          dependencies.push(text);
        }
      });
    }

    return [...new Set(dependencies)];
  }

  _generateSuccessCriteria(requirements) {
    const criteria = [];

    criteria.push('All functional requirements are implemented and tested');
    criteria.push('All edge cases are handled appropriately');
    criteria.push('Code passes all quality checks (lint, type-check, tests)');

    if (requirements.nonFunctional?.length > 0) {
      criteria.push('All non-functional requirements are met');
    }

    criteria.push('Documentation is complete and accurate');

    return criteria;
  }

  _generateTechnicalDesign(context) {
    const design = {};

    if (context.analysis?.patterns?.architecture) {
      design.architecture = `Uses ${context.analysis.patterns.architecture.join(', ')} patterns consistent with existing codebase.`;
    }

    if (context.relevantFiles?.length > 0) {
      design.approach = `Implementation should follow patterns from existing files: ${context.relevantFiles.slice(0, 3).map(f => f.path).join(', ')}`;
    }

    return design;
  }

  _generateImplementationNotes(context) {
    const notes = [];

    if (context.analysis?.patterns?.naming) {
      notes.push(`Follow existing naming conventions: ${context.analysis.patterns.naming.join(', ')}`);
    }

    notes.push('Ensure backward compatibility with existing features');
    notes.push('Add appropriate error handling and logging');
    notes.push('Write unit tests for all new functionality');

    return notes;
  }

  _addressIssue(spec, issue) {
    switch (issue.section) {
      case 'overview':
        if (!spec.overview || spec.overview.length < 100) {
          spec.overview += '\n\nThis feature addresses a critical need in the system. ';
          spec.overview += 'Implementation should follow established patterns and best practices.';
        }
        break;

      case 'requirements.functional':
        if (!spec.requirements.functional) {
          spec.requirements.functional = [];
        }
        if (spec.requirements.functional.length === 0) {
          spec.requirements.functional.push({
            text: 'Define and implement core functionality',
            priority: 'high'
          });
        }
        break;

      case 'edgeCases':
        if (!spec.edgeCases) {
          spec.edgeCases = [];
        }
        spec.edgeCases.push(
          { scenario: 'Invalid Input', description: 'Handle invalid or malformed inputs gracefully', priority: 'high' },
          { scenario: 'Empty Input', description: 'Handle empty or null inputs appropriately', priority: 'high' },
          { scenario: 'Maximum Values', description: 'Handle boundary conditions and maximum values', priority: 'medium' }
        );
        break;

      case 'successCriteria':
        if (!spec.successCriteria) {
          spec.successCriteria = this._generateSuccessCriteria(spec.requirements);
        }
        break;

      case 'technicalDesign':
        if (!spec.technicalDesign) {
          spec.technicalDesign = {};
        }
        if (!spec.technicalDesign.approach) {
          spec.technicalDesign.approach = 'Follow existing architectural patterns and best practices.';
        }
        break;
    }
  }

  _applySuggestion(spec, suggestion) {
    // Apply suggestions based on section
    if (suggestion.section === 'dependencies' && (!spec.dependencies || spec.dependencies.length === 0)) {
      spec.dependencies = ['None identified - verify during implementation'];
    }

    if (suggestion.section === 'requirements.nonFunctional') {
      if (!spec.requirements.nonFunctional) {
        spec.requirements.nonFunctional = [];
      }

      if (suggestion.message.includes('security')) {
        spec.requirements.nonFunctional.push({
          text: 'Implement appropriate security measures for data protection',
          priority: 'medium'
        });
      }

      if (suggestion.message.includes('performance')) {
        spec.requirements.nonFunctional.push({
          text: 'Meet performance requirements for response time and resource usage',
          priority: 'medium'
        });
      }
    }
  }

  _incrementVersion(version) {
    const parts = version.split('.');
    parts[2] = parseInt(parts[2]) + 1;
    return parts.join('.');
  }
}

export default SpecGenerator;
