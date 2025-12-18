/**
 * Command Mapper - Maps AI responses to Momentum commands
 */

import { ProjectManager } from '../core/project.js';
import { RoadmapManager } from '../core/roadmap.js';
import { PlanExecutor } from '../core/executor.js';
import { ProgressTracker } from '../core/progress.js';
import { ContextEngine } from '../core/context.js';

export class CommandMapper {
  constructor() {
    // Core modules are instantiated on-demand to avoid loading everything upfront
    this._modules = null;
  }

  /**
   * Get or create core modules
   */
  get modules() {
    if (!this._modules) {
      this._modules = {
        project: new ProjectManager(),
        roadmap: new RoadmapManager(),
        executor: new PlanExecutor(),
        progress: new ProgressTracker(),
        context: new ContextEngine()
      };
    }
    return this._modules;
  }

  /**
   * Extract command from AI response
   * Looks for momentum-command code blocks
   * @param {string} response - AI response text
   * @returns {Object|null} Parsed command or null
   */
  extractCommand(response) {
    const commandMatch = response.match(/```momentum-command\n([\s\S]*?)\n```/);

    if (!commandMatch) {
      return null;
    }

    try {
      return JSON.parse(commandMatch[1]);
    } catch (err) {
      console.error('Failed to parse command:', err.message);
      return null;
    }
  }

  /**
   * Get display text from AI response (text before command block)
   * @param {string} response - AI response text
   * @returns {string} Display text
   */
  getDisplayText(response) {
    const commandIndex = response.indexOf('```momentum-command');
    if (commandIndex > 0) {
      return response.substring(0, commandIndex).trim();
    }
    return response;
  }

  /**
   * Execute a parsed command
   * @param {Object} command - Parsed command object
   * @returns {*} Command result
   */
  async execute(command) {
    const { action, args = [], options = {} } = command;

    try {
      switch (action) {
        // Project commands
        case 'init':
          return await this.modules.project.initialize(args[0], options);

        case 'map':
          return await this.modules.project.mapCodebase(options);

        case 'checkpoint':
          return await this.modules.project.createCheckpoint(args[0], options);

        case 'rollback':
          return await this.modules.project.rollback(args[0], options);

        case 'issues':
          return await this.modules.project.manageIssues(options);

        case 'config':
          return await this.modules.project.manageConfig(options);

        case 'install':
          return await this.modules.project.installCommands(options);

        // Roadmap commands
        case 'roadmap':
          return await this.modules.roadmap.manage(options);

        case 'phase': {
          const [phaseAction, phaseNumber] = args;
          return await this.modules.roadmap.handlePhase(phaseAction, phaseNumber, options);
        }

        // Execution commands
        case 'execute':
          return await this.modules.executor.execute(args[0], options);

        case 'retry':
          return await this.modules.executor.retry(options);

        // Progress commands
        case 'status':
          return await this.modules.progress.showStatus(options);

        case 'dashboard':
        case 'dash':
          return await this.modules.progress.showDashboard(options);

        case 'burndown':
          return await this.modules.progress.showBurndown(options);

        case 'learn':
          return await this.modules.progress.learn(options);

        case 'insights':
          return await this.modules.progress.showInsights(options);

        // Context commands
        case 'context':
          return await this.modules.context.manage(options);

        case 'resume':
          return await this.modules.context.resume(options);

        case 'pause':
          return await this.modules.context.pause(options);

        // Dynamic imports for less common commands
        case 'ideate': {
          const { ideate } = await import('../../commands/ideation.js');
          return await ideate(options);
        }

        case 'spec': {
          const specModule = await import('../../commands/spec.js');
          if (args[0] === 'discover') {
            return await specModule.discover(args[1], options);
          } else if (args[0] === 'generate') {
            return await specModule.generate(options);
          }
          return 'Unknown spec subcommand. Use: discover <feature> or generate';
        }

        case 'memory': {
          const memoryModule = await import('../../commands/memory.js');
          const subcommand = args[0];

          switch (subcommand) {
            case 'stats':
              return await memoryModule.stats();
            case 'export':
              return await memoryModule.exportMemory(args[1]);
            case 'import':
              return await memoryModule.importMemory(args[1], options);
            case 'clear':
              return await memoryModule.clear(options);
            case 'validate':
              return await memoryModule.validate();
            case 'repair':
              return await memoryModule.repair();
            default:
              return 'Unknown memory subcommand. Use: stats, export, import, clear, validate, repair';
          }
        }

        default:
          return `Unknown command: ${action}. Type "help" for available commands.`;
      }
    } catch (err) {
      return `Command failed: ${err.message}`;
    }
  }
}

export default CommandMapper;
