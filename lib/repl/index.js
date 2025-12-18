/**
 * REPL Engine - Conversational AI interface for Momentum
 */

import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import figures from 'figures';
import { divider, success, error, info, warning } from '../utils/display.js';
import { hasProject } from '../utils/validate.js';
import { ChatClient } from './chat-client.js';
import { CommandMapper } from './command-mapper.js';
import { ConversationHistory } from './history.js';
import { buildSystemPrompt } from './system-prompt.js';

const LOGO = `
  ╔╦╗╔═╗╔╦╗╔═╗╔╗╔╔╦╗╦ ╦╔╦╗
  ║║║║ ║║║║║╣ ║║║ ║ ║ ║║║║
  ╩ ╩╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝╩ ╩
`;

export class ReplEngine {
  constructor(options = {}) {
    this.dir = options.dir || process.cwd();
    this.history = new ConversationHistory();
    this.chatClient = null;
    this.commandMapper = new CommandMapper();
    this.running = false;
    this.rl = null;
  }

  /**
   * Start the REPL
   */
  async start() {
    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      this.displayWelcomeBanner();
      console.log();
      error('ANTHROPIC_API_KEY environment variable not set');
      info('Set your API key: export ANTHROPIC_API_KEY="your-key-here"');
      console.log();
      console.log(chalk.dim('Get your API key at: https://console.anthropic.com/'));
      process.exit(1);
    }

    // Initialize chat client
    this.chatClient = new ChatClient(process.env.ANTHROPIC_API_KEY);

    // Build system prompt with project context
    const systemPrompt = await buildSystemPrompt(this.dir);
    this.chatClient.setSystemPrompt(systemPrompt);

    // Display welcome
    this.displayWelcome();

    // Start input loop
    this.running = true;
    await this.inputLoop();
  }

  /**
   * Display ASCII banner only
   */
  displayWelcomeBanner() {
    console.log(chalk.cyan(LOGO));
  }

  /**
   * Display welcome message with instructions
   */
  displayWelcome() {
    const isProject = hasProject(this.dir);

    const welcomeBox = boxen(
      chalk.cyan(LOGO) + '\n' +
      chalk.gray('  AI-Powered Project Management\n'),
      {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderColor: 'cyan',
        borderStyle: 'round',
        dimBorder: true
      }
    );

    console.log(welcomeBox);
    console.log();
    divider('Momentum AI Assistant');
    console.log();
    console.log(chalk.white('  Ask me anything about your project, or tell me what to do.'));
    console.log(chalk.dim(`  Commands: ${chalk.cyan('/clear')} reset conversation, ${chalk.cyan('/exit')} quit, ${chalk.cyan('/help')} show commands`));
    console.log();

    if (isProject) {
      success('Project detected');
    } else {
      warning('No project found. Say "init" to get started.');
    }

    console.log();
  }

  /**
   * Main input loop
   */
  async inputLoop() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      console.log(chalk.dim('\n\nGoodbye!'));
      this.rl.close();
      process.exit(0);
    });

    // Handle close
    this.rl.on('close', () => {
      this.running = false;
    });

    const prompt = () => {
      if (!this.running) return;

      this.rl.question(chalk.cyan('momentum') + chalk.gray('> '), async (input) => {
        input = input.trim();

        if (!input) {
          prompt();
          return;
        }

        // Handle special commands
        const handled = await this.handleSpecialCommand(input);
        if (handled) {
          prompt();
          return;
        }

        // Process through AI
        await this.processInput(input);
        prompt();
      });
    };

    prompt();
  }

  /**
   * Handle special commands like /exit, /clear, /help
   * @returns {boolean} True if command was handled
   */
  async handleSpecialCommand(input) {
    const cmd = input.toLowerCase();

    if (cmd === '/exit' || cmd === 'quit' || cmd === 'exit') {
      console.log(chalk.dim('\nGoodbye!'));
      this.rl.close();
      process.exit(0);
    }

    if (cmd === '/clear') {
      this.history.clear();
      console.log(chalk.dim('Conversation cleared.\n'));
      return true;
    }

    if (cmd === '/help') {
      this.displayHelp();
      return true;
    }

    if (cmd === '/status') {
      const summary = this.history.getSummary();
      console.log();
      console.log(chalk.cyan('Session Status:'));
      console.log(chalk.gray(`  Messages: ${summary.messageCount}`));
      console.log(chalk.gray(`  Est. tokens: ~${summary.estimatedTokens}`));
      console.log(chalk.gray(`  Project: ${hasProject(this.dir) ? 'Yes' : 'No'}`));
      console.log();
      return true;
    }

    return false;
  }

  /**
   * Display help for REPL commands
   */
  displayHelp() {
    console.log(`
${chalk.cyan.bold('REPL Commands:')}

  ${chalk.yellow('/clear')}    Clear conversation history
  ${chalk.yellow('/exit')}     Exit the REPL (or type 'quit')
  ${chalk.yellow('/status')}   Show session status
  ${chalk.yellow('/help')}     Show this help

${chalk.cyan.bold('Example Requests:')}

  ${chalk.dim('"Show me the project status"')}
  ${chalk.dim('"Initialize a new project called my-app"')}
  ${chalk.dim('"Create a roadmap for my project"')}
  ${chalk.dim('"What commands are available?"')}
  ${chalk.dim('"Run the security ideation analysis"')}

${chalk.dim('Just describe what you want to do in natural language!')}
`);
  }

  /**
   * Process user input through AI
   */
  async processInput(input) {
    const spinner = ora({
      text: 'Thinking...',
      color: 'cyan'
    }).start();

    try {
      // Add user message to history
      this.history.addMessage('user', input);

      // Send to Claude API
      const response = await this.chatClient.sendMessage(
        this.history.getMessages()
      );

      spinner.stop();

      // Add assistant response to history
      this.history.addMessage('assistant', response.content);

      // Check if response contains a command to execute
      const command = this.commandMapper.extractCommand(response.content);

      if (command) {
        // Display the explanation text (before command block)
        const displayText = this.commandMapper.getDisplayText(response.content);
        if (displayText) {
          console.log();
          console.log(chalk.white(displayText));
        }

        // Show what we're executing
        console.log();
        console.log(chalk.dim(`Executing: ${command.action}${command.args?.length ? ' ' + command.args.join(' ') : ''}`));
        console.log();

        // Execute the command
        const execSpinner = ora({
          text: 'Running...',
          color: 'yellow'
        }).start();

        try {
          const result = await this.commandMapper.execute(command);
          execSpinner.stop();

          // Add result to conversation context if meaningful
          if (result && typeof result === 'string') {
            this.history.addMessage('system', `Command result: ${result.substring(0, 500)}`);
          }
        } catch (execErr) {
          execSpinner.stop();
          error(`Execution failed: ${execErr.message}`);
          this.history.addMessage('system', `Command failed: ${execErr.message}`);
        }
      } else {
        // Just display the response (no command to execute)
        console.log();
        console.log(chalk.white(response.content));
      }

      console.log();

    } catch (err) {
      spinner.stop();
      console.log();
      error(`Error: ${err.message}`);

      if (err.message.includes('API key') || err.message.includes('401')) {
        info('Check your ANTHROPIC_API_KEY environment variable');
      } else if (err.message.includes('Rate limited') || err.message.includes('429')) {
        info('Wait a moment and try again');
      }

      console.log();
    }
  }

  /**
   * Stop the REPL
   */
  stop() {
    this.running = false;
    if (this.rl) {
      this.rl.close();
    }
  }
}

/**
 * Start the REPL (convenience function)
 */
export async function startRepl(options = {}) {
  const engine = new ReplEngine(options);
  await engine.start();
}

export default {
  ReplEngine,
  startRepl
};
