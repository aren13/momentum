import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import SpecDiscovery from '../lib/core/spec-discovery.js';
import RequirementsGatherer from '../lib/core/requirements-gatherer.js';
import SpecGenerator from '../lib/core/spec-generator.js';
import SpecCritic from '../lib/core/spec-critic.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Spec Discovery Command
 * Discovers context and gathers requirements for a feature
 */
export async function discover(feature, options = {}) {
  const projectRoot = process.cwd();

  console.log(chalk.blue.bold('\n🔍 Starting Feature Discovery\n'));
  console.log(chalk.gray(`Feature: ${feature}\n`));

  // Initialize discovery and gatherer
  const discovery = new SpecDiscovery(projectRoot);
  const gatherer = new RequirementsGatherer();

  // Phase 1: Discover Context
  const spinner = ora('Discovering relevant files...').start();

  try {
    const context = await discovery.discoverContext(feature);

    spinner.succeed(`Found ${context.relevantFiles.length} relevant files`);

    if (context.relevantFiles.length > 0) {
      console.log(chalk.cyan('\nTop relevant files:'));
      context.relevantFiles.slice(0, 5).forEach((file, index) => {
        console.log(chalk.gray(`  ${index + 1}. ${file.path} (score: ${file.score}, type: ${file.type})`));
      });
    }

    // Phase 2: Analyze Existing Code
    spinner.start('Analyzing existing patterns...');

    const analysis = await discovery.analyzeExisting(context.relevantFiles);

    spinner.succeed('Analysis complete');

    if (analysis.patterns.architecture.length > 0) {
      console.log(chalk.cyan('\nArchitectural patterns detected:'));
      analysis.patterns.architecture.slice(0, 5).forEach(pattern => {
        console.log(chalk.gray(`  • ${pattern}`));
      });
    }

    if (analysis.frameworks.length > 0) {
      console.log(chalk.cyan('\nFrameworks detected:'));
      analysis.frameworks.forEach(framework => {
        console.log(chalk.gray(`  • ${framework}`));
      });
    }

    // Phase 3: Generate Questions
    spinner.start('Generating questions...');

    const questions = await discovery.gatherRequirements(feature, context, analysis);

    spinner.succeed(`Generated ${Object.values(questions).flat().length} questions`);

    // Phase 4: Interactive Q&A (if not in non-interactive mode)
    let answers = [];

    if (!options.noInteractive) {
      console.log(chalk.blue.bold('\n📝 Requirements Gathering\n'));
      console.log(chalk.gray('Answer the following questions to refine the specification.'));
      console.log(chalk.gray('Press Enter to skip a question.\n'));

      // Functional questions
      if (questions.functional.length > 0) {
        console.log(chalk.cyan.bold('Functional Requirements:'));
        for (const question of questions.functional) {
          const answer = await inquirer.prompt([
            {
              type: 'input',
              name: 'answer',
              message: question,
              default: ''
            }
          ]);

          if (answer.answer.trim()) {
            answers.push({
              category: 'functional',
              question,
              answer: answer.answer,
              priority: 'high'
            });
          }
        }
      }

      // Technical questions
      if (questions.technical.length > 0) {
        console.log(chalk.cyan.bold('\nTechnical Requirements:'));
        for (const question of questions.technical.slice(0, 3)) { // Limit to avoid overwhelming
          const answer = await inquirer.prompt([
            {
              type: 'input',
              name: 'answer',
              message: question,
              default: ''
            }
          ]);

          if (answer.answer.trim()) {
            answers.push({
              category: 'technical',
              question,
              answer: answer.answer,
              priority: 'high'
            });
          }
        }
      }

      // Edge cases
      if (questions.edgeCases.length > 0) {
        console.log(chalk.cyan.bold('\nEdge Cases:'));
        for (const question of questions.edgeCases.slice(0, 3)) {
          const answer = await inquirer.prompt([
            {
              type: 'input',
              name: 'answer',
              message: question,
              default: ''
            }
          ]);

          if (answer.answer.trim()) {
            answers.push({
              category: 'edge_cases',
              question,
              answer: answer.answer,
              priority: 'medium'
            });
          }
        }
      }
    }

    // Phase 5: Structure Requirements
    const parsed = gatherer.parse(feature);
    const structured = gatherer.structure(answers, parsed);
    const edgeCases = gatherer.discoverEdgeCases(structured, parsed);

    // Phase 6: Research Feasibility
    spinner.start('Researching feasibility...');

    const feasibility = await discovery.researchFeasibility(structured);

    spinner.succeed(`Feasibility assessment complete (confidence: ${feasibility.confidence})`);

    // Phase 7: Save Discovery Results
    const outputDir = options.output || path.join(projectRoot, 'ae-cc', 'planning');
    const discoveryFile = path.join(outputDir, 'DISCOVERY.md');

    const discoveryContent = generateDiscoveryMarkdown({
      feature,
      context,
      analysis,
      questions,
      answers,
      structured,
      edgeCases,
      feasibility
    });

    fs.mkdirSync(path.dirname(discoveryFile), { recursive: true });
    fs.writeFileSync(discoveryFile, discoveryContent);

    console.log(chalk.green.bold('\n✓ Discovery Complete!\n'));
    console.log(chalk.gray(`Discovery saved to: ${discoveryFile}`));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray(`  • Review DISCOVERY.md`));
    console.log(chalk.gray(`  • Run: momentum spec generate`));

  } catch (error) {
    spinner.fail('Discovery failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    if (options.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Generate discovery markdown
 */
function generateDiscoveryMarkdown(data) {
  const {
    feature,
    context,
    analysis,
    questions,
    answers,
    structured,
    edgeCases,
    feasibility
  } = data;

  let content = `# Feature Discovery: ${feature}\n\n`;
  content += `**Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
  content += `---\n\n`;

  // Relevant Files
  content += `## Discovered Context\n\n`;
  content += `**Keywords:** ${context.keywords.join(', ')}\n\n`;

  if (context.relevantFiles.length > 0) {
    content += `### Relevant Files (${context.relevantFiles.length})\n\n`;
    context.relevantFiles.slice(0, 10).forEach((file, index) => {
      content += `${index + 1}. \`${file.path}\` (score: ${file.score}, type: ${file.type})\n`;
    });
    content += `\n`;
  }

  // Analysis
  content += `## Code Analysis\n\n`;

  if (analysis.patterns.architecture.length > 0) {
    content += `### Architectural Patterns\n\n`;
    analysis.patterns.architecture.forEach(pattern => {
      content += `- ${pattern}\n`;
    });
    content += `\n`;
  }

  if (analysis.frameworks.length > 0) {
    content += `### Frameworks & Libraries\n\n`;
    analysis.frameworks.forEach(framework => {
      content += `- ${framework}\n`;
    });
    content += `\n`;
  }

  if (analysis.dependencies.length > 0) {
    content += `### Dependencies\n\n`;
    analysis.dependencies.slice(0, 10).forEach(dep => {
      content += `- ${dep}\n`;
    });
    content += `\n`;
  }

  // Requirements
  if (structured.functional.length > 0) {
    content += `## Functional Requirements\n\n`;
    structured.functional.forEach((req, index) => {
      content += `${index + 1}. ${req.text}\n`;
    });
    content += `\n`;
  }

  if (structured.nonFunctional.length > 0) {
    content += `## Non-Functional Requirements\n\n`;
    structured.nonFunctional.forEach((req, index) => {
      content += `${index + 1}. ${req.text}\n`;
    });
    content += `\n`;
  }

  if (structured.constraints.length > 0) {
    content += `## Constraints\n\n`;
    structured.constraints.forEach((constraint, index) => {
      content += `${index + 1}. ${constraint.text}\n`;
    });
    content += `\n`;
  }

  // Edge Cases
  if (edgeCases.length > 0) {
    content += `## Edge Cases\n\n`;
    edgeCases.slice(0, 10).forEach((edge, index) => {
      content += `### ${index + 1}. ${edge.scenario}\n\n`;
      content += `${edge.description}\n\n`;
      content += `**Priority:** ${edge.priority}\n\n`;
    });
  }

  // Feasibility
  content += `## Feasibility Assessment\n\n`;
  content += `**Confidence:** ${feasibility.confidence}\n\n`;

  if (feasibility.blockers.length > 0) {
    content += `### Blockers\n\n`;
    feasibility.blockers.forEach(blocker => {
      content += `- ${blocker}\n`;
    });
    content += `\n`;
  }

  if (feasibility.risks.length > 0) {
    content += `### Risks\n\n`;
    feasibility.risks.forEach(risk => {
      content += `- ${risk}\n`;
    });
    content += `\n`;
  }

  if (feasibility.dependencies.length > 0) {
    content += `### Dependencies\n\n`;
    feasibility.dependencies.forEach(dep => {
      content += `- ${dep}\n`;
    });
    content += `\n`;
  }

  // Q&A Section
  if (answers.length > 0) {
    content += `## Questions & Answers\n\n`;
    answers.forEach((qa, index) => {
      content += `### ${index + 1}. ${qa.question}\n\n`;
      content += `**Answer:** ${qa.answer}\n\n`;
      content += `**Category:** ${qa.category} | **Priority:** ${qa.priority}\n\n`;
    });
  }

  content += `---\n\n`;
  content += `*Generated by Momentum Spec Discovery*\n`;

  return content;
}

/**
 * Spec Generation Command
 * Generates specification with critic review
 */
export async function generate(options = {}) {
  const projectRoot = process.cwd();

  console.log(chalk.blue.bold('\n📋 Starting Spec Generation\n'));

  // Locate discovery file
  const discoveryFile = options.input || path.join(projectRoot, 'ae-cc', 'planning', 'DISCOVERY.md');

  if (!fs.existsSync(discoveryFile)) {
    console.error(chalk.red(`\nError: Discovery file not found at ${discoveryFile}`));
    console.error(chalk.gray('\nRun discovery first: momentum spec discover <feature>'));
    process.exit(1);
  }

  console.log(chalk.gray(`Using discovery: ${discoveryFile}\n`));

  // Parse discovery file (simple markdown parsing)
  const discoveryContent = fs.readFileSync(discoveryFile, 'utf8');
  const discoveryData = parseDiscoveryFile(discoveryContent);

  // Initialize generator and critic
  const generator = new SpecGenerator({
    maxIterations: parseInt(options.iterations || '3')
  });
  const critic = new SpecCritic();

  // Phase 1: Generate Initial Spec
  const spinner = ora('Generating initial specification...').start();

  try {
    const initialSpec = generator.generate(discoveryData.requirements, {
      feature: discoveryData.feature,
      description: discoveryData.description,
      analysis: discoveryData.analysis,
      relevantFiles: discoveryData.relevantFiles
    });

    spinner.succeed('Initial specification generated');

    // Phase 2: Critique Loop
    let currentSpec = initialSpec;
    let iteration = 0;
    const maxIterations = parseInt(options.iterations || '3');

    while (iteration < maxIterations) {
      iteration++;

      spinner.start(`Critique iteration ${iteration}/${maxIterations}...`);

      const critique = critic.critique(currentSpec);

      spinner.succeed(`Critique complete (score: ${critique.overallScore}/100, confidence: ${critique.confidenceScore}/100)`);

      // Display critique results
      if (critique.ambiguities.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Found ${critique.ambiguities.length} ambiguities:`));
        critique.ambiguities.slice(0, 3).forEach(amb => {
          console.log(chalk.gray(`  • ${amb.location}: "${amb.word}" - ${amb.suggestion}`));
        });
      }

      if (critique.gaps.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Found ${critique.gaps.length} gaps:`));
        critique.gaps.slice(0, 3).forEach(gap => {
          console.log(chalk.gray(`  • [${gap.severity}] ${gap.message}`));
        });
      }

      // Check if spec is ready
      if (critique.ready) {
        console.log(chalk.green.bold('\n✓ Specification meets quality standards!\n'));
        currentSpec = currentSpec; // Use current spec
        break;
      }

      // Refine spec
      if (iteration < maxIterations) {
        spinner.start('Refining specification...');
        currentSpec = generator.refine(currentSpec, critique);
        spinner.succeed('Specification refined');
      } else {
        console.log(chalk.yellow('\n⚠️  Max iterations reached. Spec may need manual review.\n'));
      }
    }

    // Phase 3: Finalize and Output
    spinner.start('Finalizing specification...');

    const finalCritique = critic.critique(currentSpec);
    const markdown = generator.finalize(currentSpec, finalCritique);

    // Determine output path
    const outputFile = options.output || path.join(projectRoot, 'ae-cc', 'planning', 'SPEC.md');

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, markdown);

    spinner.succeed('Specification finalized');

    console.log(chalk.green.bold('\n✓ Spec Generation Complete!\n'));
    console.log(chalk.gray(`Specification saved to: ${outputFile}`));
    console.log(chalk.gray(`\nQuality Metrics:`));
    console.log(chalk.gray(`  • Overall Score: ${finalCritique.overallScore}/100`));
    console.log(chalk.gray(`  • Confidence: ${finalCritique.confidenceScore}/100`));
    console.log(chalk.gray(`  • Ambiguities: ${finalCritique.ambiguities.length}`));
    console.log(chalk.gray(`  • Iterations: ${iteration}`));

    if (finalCritique.recommendations.length > 0) {
      console.log(chalk.yellow('\n📝 Recommendations:'));
      finalCritique.recommendations.slice(0, 5).forEach(rec => {
        console.log(chalk.gray(`  • ${rec}`));
      });
    }

    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray(`  • Review ${outputFile}`));
    console.log(chalk.gray(`  • Address any recommendations`));
    console.log(chalk.gray(`  • Create implementation plan`));

  } catch (error) {
    spinner.fail('Spec generation failed');
    console.error(chalk.red(`\nError: ${error.message}`));
    if (options.debug) {
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Parse discovery markdown file
 * Simple parser to extract structured data from DISCOVERY.md
 */
function parseDiscoveryFile(content) {
  const data = {
    feature: '',
    description: '',
    relevantFiles: [],
    analysis: {
      frameworks: [],
      dependencies: [],
      patterns: {
        architecture: []
      }
    },
    requirements: {
      functional: [],
      nonFunctional: [],
      constraints: [],
      assumptions: [],
      edgeCases: []
    }
  };

  // Extract feature name from title
  const titleMatch = content.match(/# Feature Discovery: (.+)/);
  if (titleMatch) {
    data.feature = titleMatch[1].trim();
  }

  // Extract sections
  const sections = content.split(/^##\s+/m);

  sections.forEach(section => {
    const lines = section.split('\n');
    const heading = lines[0]?.trim();

    if (heading.includes('Functional Requirements')) {
      const reqLines = lines.slice(1).filter(line => line.match(/^\d+\./));
      data.requirements.functional = reqLines.map(line => ({
        text: line.replace(/^\d+\.\s*/, '').trim(),
        priority: 'medium'
      }));
    }

    if (heading.includes('Non-Functional Requirements')) {
      const reqLines = lines.slice(1).filter(line => line.match(/^\d+\./));
      data.requirements.nonFunctional = reqLines.map(line => ({
        text: line.replace(/^\d+\.\s*/, '').trim(),
        priority: 'medium'
      }));
    }

    if (heading.includes('Constraints')) {
      const constraintLines = lines.slice(1).filter(line => line.match(/^\d+\./));
      data.requirements.constraints = constraintLines.map(line => ({
        text: line.replace(/^\d+\.\s*/, '').trim(),
        priority: 'high'
      }));
    }

    if (heading.includes('Edge Cases')) {
      // Parse edge case subsections
      let currentEdgeCase = null;

      lines.forEach(line => {
        const edgeHeading = line.match(/^###\s+\d+\.\s+(.+)/);
        if (edgeHeading) {
          if (currentEdgeCase) {
            data.requirements.edgeCases.push(currentEdgeCase);
          }
          currentEdgeCase = {
            scenario: edgeHeading[1].trim(),
            description: '',
            priority: 'medium'
          };
        } else if (currentEdgeCase && line.trim() && !line.startsWith('**')) {
          currentEdgeCase.description += line.trim() + ' ';
        } else if (currentEdgeCase && line.includes('**Priority:**')) {
          const priorityMatch = line.match(/\*\*Priority:\*\*\s+(\w+)/);
          if (priorityMatch) {
            currentEdgeCase.priority = priorityMatch[1].toLowerCase();
          }
        }
      });

      if (currentEdgeCase) {
        data.requirements.edgeCases.push(currentEdgeCase);
      }
    }

    if (heading.includes('Frameworks & Libraries')) {
      const frameworkLines = lines.slice(1).filter(line => line.trim().startsWith('-'));
      data.analysis.frameworks = frameworkLines.map(line => line.replace(/^-\s*/, '').trim());
    }

    if (heading.includes('Dependencies') && heading.includes('Code Analysis')) {
      const depLines = lines.slice(1).filter(line => line.trim().startsWith('-'));
      data.analysis.dependencies = depLines.map(line => line.replace(/^-\s*/, '').trim());
    }

    if (heading.includes('Architectural Patterns')) {
      const patternLines = lines.slice(1).filter(line => line.trim().startsWith('-'));
      data.analysis.patterns.architecture = patternLines.map(line => line.replace(/^-\s*/, '').trim());
    }

    if (heading.includes('Relevant Files')) {
      const fileLines = lines.slice(1).filter(line => line.match(/^\d+\./));
      data.relevantFiles = fileLines.map(line => {
        const match = line.match(/`([^`]+)`/);
        return {
          path: match ? match[1] : '',
          score: 0,
          type: 'unknown'
        };
      }).filter(f => f.path);
    }
  });

  return data;
}
