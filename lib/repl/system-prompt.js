/**
 * System Prompt Builder
 * Generates comprehensive system prompt with command registry and project context
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { hasProject } from '../utils/validate.js';

/**
 * Command registry with descriptions and parameters
 */
export const COMMAND_REGISTRY = {
  init: {
    description: 'Initialize a new Momentum project',
    parameters: {
      name: 'Project name (optional)',
      template: 'web|api|cli|library|fullstack',
      mode: 'interactive|autonomous|hybrid'
    },
    examples: ['init my-app', 'init --template api']
  },
  map: {
    description: 'Map existing codebase structure and patterns',
    parameters: {
      depth: 'quick|standard|deep',
      focus: 'arch,stack,patterns,tests'
    },
    examples: ['map', 'map --depth deep']
  },
  roadmap: {
    description: 'Create or view project roadmap',
    parameters: {
      create: 'Create new roadmap (-c)',
      edit: 'Edit existing roadmap (-e)',
      milestone: 'Create new milestone'
    },
    examples: ['roadmap', 'roadmap -c']
  },
  phase: {
    description: 'Manage project phases',
    subcommands: {
      plan: 'Create execution plan for a phase',
      discuss: 'Discuss phase requirements',
      research: 'Research for a phase',
      add: 'Add a new phase',
      insert: 'Insert a phase at position'
    },
    examples: ['phase plan 1', 'phase discuss 2', 'phase add']
  },
  execute: {
    description: 'Execute a plan with smart strategies',
    parameters: {
      path: 'Path to plan file (optional)',
      strategy: 'auto|sequential|parallel|hybrid',
      checkpoint: 'Resume from checkpoint',
      dryRun: 'Preview without executing'
    },
    examples: ['execute', 'execute --dry-run', 'execute ./plans/phase-1.md']
  },
  retry: {
    description: 'Retry failed tasks with smart error handling',
    parameters: {
      force: 'Force retry even if dependencies changed'
    },
    examples: ['retry', 'retry --force']
  },
  status: {
    description: 'Show project status with visual dashboard',
    parameters: {
      detailed: 'Show detailed breakdown (-d)',
      json: 'Output as JSON'
    },
    examples: ['status', 'status -d']
  },
  dashboard: {
    description: 'Interactive progress dashboard',
    parameters: {
      refresh: 'Auto-refresh interval in seconds'
    },
    examples: ['dashboard', 'dash']
  },
  burndown: {
    description: 'Display burndown chart for current milestone',
    parameters: {
      export: 'Export chart (ascii|svg|png)'
    },
    examples: ['burndown', 'burndown --export svg']
  },
  context: {
    description: 'Manage project context and state',
    parameters: {
      optimize: 'Optimize context for AI (-o)',
      summarize: 'Generate context summary (-s)',
      export: 'Export context for handoff (-e)'
    },
    examples: ['context', 'context -o']
  },
  resume: {
    description: 'Resume work with full context restoration',
    parameters: {
      from: 'Resume from specific checkpoint'
    },
    examples: ['resume', 'resume --from checkpoint-1']
  },
  pause: {
    description: 'Pause work and create handoff document',
    parameters: {
      note: 'Add note for next session'
    },
    examples: ['pause', 'pause -n "stopping for today"']
  },
  learn: {
    description: 'Analyze past projects to improve estimates',
    parameters: {
      project: 'Learn from specific project',
      all: 'Learn from all tracked projects'
    },
    examples: ['learn', 'learn --all']
  },
  insights: {
    description: 'Show AI-powered project insights',
    parameters: {
      risks: 'Focus on risk analysis',
      blockers: 'Focus on potential blockers'
    },
    examples: ['insights', 'insights --risks']
  },
  ideate: {
    description: 'AI-powered codebase analysis and improvement suggestions',
    parameters: {
      focus: 'security|performance|docs|debt',
      output: 'Output path for report',
      format: 'markdown|json'
    },
    examples: ['ideate', 'ideate --focus security']
  },
  spec: {
    description: 'Enhanced specification generation with discovery and critique',
    subcommands: {
      discover: 'Gather requirements for a feature',
      generate: 'Generate specification from discovery'
    },
    examples: ['spec discover "user auth"', 'spec generate']
  },
  memory: {
    description: 'Manage Momentum memory system',
    subcommands: {
      stats: 'Show memory usage statistics',
      export: 'Export memory to JSON',
      import: 'Import memory from JSON',
      clear: 'Clear memory data',
      validate: 'Validate memory schema',
      repair: 'Repair memory schema issues'
    },
    examples: ['memory stats', 'memory export', 'memory clear --patterns']
  },
  checkpoint: {
    description: 'Create a rollback checkpoint',
    parameters: {
      name: 'Checkpoint name',
      message: 'Checkpoint message'
    },
    examples: ['checkpoint "before refactor"', 'checkpoint -m "stable state"']
  },
  rollback: {
    description: 'Rollback to a previous checkpoint',
    parameters: {
      list: 'List available checkpoints',
      preview: 'Preview changes without applying'
    },
    examples: ['rollback --list', 'rollback my-checkpoint']
  },
  issues: {
    description: 'Manage deferred issues',
    parameters: {
      add: 'Add new issue',
      list: 'List all issues',
      review: 'Review issues with context'
    },
    examples: ['issues -l', 'issues -a "fix later"']
  },
  config: {
    description: 'View or update configuration',
    parameters: {
      global: 'Global configuration',
      set: 'Set configuration value',
      list: 'List all configuration'
    },
    examples: ['config -l', 'config -s key=value']
  }
};

/**
 * Format command registry for system prompt
 */
function formatCommandRegistry() {
  let output = '';

  for (const [name, cmd] of Object.entries(COMMAND_REGISTRY)) {
    output += `### ${name}\n`;
    output += `${cmd.description}\n`;

    if (cmd.parameters) {
      output += 'Parameters:\n';
      for (const [param, desc] of Object.entries(cmd.parameters)) {
        output += `  - ${param}: ${desc}\n`;
      }
    }

    if (cmd.subcommands) {
      output += 'Subcommands:\n';
      for (const [sub, desc] of Object.entries(cmd.subcommands)) {
        output += `  - ${sub}: ${desc}\n`;
      }
    }

    if (cmd.examples) {
      output += `Examples: ${cmd.examples.join(', ')}\n`;
    }

    output += '\n';
  }

  return output;
}

/**
 * Get project context if in a momentum project
 */
async function getProjectContext(dir) {
  const momentumDir = join(dir, '.momentum');
  let context = '\n## Current Project Context\n\n';

  // Load PROJECT.md summary
  const projectFile = join(momentumDir, 'PROJECT.md');
  if (existsSync(projectFile)) {
    try {
      const content = readFileSync(projectFile, 'utf8');
      const nameMatch = content.match(/^# (.+)$/m);
      const visionMatch = content.match(/> (.+)$/m);

      if (nameMatch) context += `Project: ${nameMatch[1]}\n`;
      if (visionMatch) context += `Vision: ${visionMatch[1]}\n`;
    } catch {
      // Ignore read errors
    }
  }

  // Load current state
  const stateFile = join(momentumDir, 'STATE.md');
  if (existsSync(stateFile)) {
    try {
      const content = readFileSync(stateFile, 'utf8');
      const positionMatch = content.match(/## Current Position\n\n([\s\S]*?)(?=\n##|$)/);

      if (positionMatch) {
        context += '\nCurrent Position:\n';
        context += positionMatch[1].trim() + '\n';
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check for roadmap
  const roadmapFile = join(momentumDir, 'ROADMAP.md');
  if (existsSync(roadmapFile)) {
    context += '\nRoadmap: Available (run "roadmap" to view)\n';
  }

  return context;
}

/**
 * Build comprehensive system prompt
 */
export async function buildSystemPrompt(dir) {
  const isProject = hasProject(dir);

  let prompt = `You are the Momentum AI Assistant, an intelligent project management assistant for AI-assisted development.

## Your Role
You help developers manage their projects using the Momentum CLI. You can:
1. Answer questions about Momentum commands and workflow
2. Execute commands when the user asks you to do something
3. Provide guidance on project planning and execution

## Response Format
When the user asks you to DO something (not just explain), respond with:
1. A brief explanation of what you'll do
2. A command block in this exact format:

\`\`\`momentum-command
{
  "action": "command-name",
  "args": ["arg1", "arg2"],
  "options": { "key": "value" }
}
\`\`\`

If the user is just asking a question, provide a helpful answer without command blocks.

## Available Commands

${formatCommandRegistry()}

## Important Guidelines
- Be concise but helpful
- For complex tasks, break them into steps
- If unsure what the user wants, ask clarifying questions
- Suggest relevant commands when appropriate
- Always confirm destructive operations before suggesting execution
- When a command has subcommands, include them in args (e.g., args: ["discover", "feature name"])

`;

  // Add project context if available
  if (isProject) {
    prompt += await getProjectContext(dir);
  } else {
    prompt += `
## Current State
No Momentum project detected in the current directory.
Suggest running 'init' to get started, or explain what Momentum can do.
`;
  }

  return prompt;
}

export default {
  COMMAND_REGISTRY,
  buildSystemPrompt
};
