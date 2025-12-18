/**
 * Display Utilities - Rich terminal output with colors and formatting
 */

import chalk from 'chalk';
import boxen from 'boxen';
import figures from 'figures';
import Table from 'cli-table3';

const LOGO = `
  ╔╦╗╔═╗╔╦╗╔═╗╔╗╔╔╦╗╦ ╦╔╦╗
  ║║║║ ║║║║║╣ ║║║ ║ ║ ║║║║
  ╩ ╩╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝╩ ╩
`;

/**
 * Display the startup banner
 */
export function displayBanner(version) {
  const banner = boxen(
    chalk.cyan(LOGO) + '\n' +
    chalk.gray(`  v${version} • Intelligent AI-Assisted Development\n`) +
    chalk.dim(`  ${figures.pointer} Type 'momentum --help' for commands`),
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: 'cyan',
      borderStyle: 'round',
      dimBorder: true
    }
  );
  console.log(banner);
}

/**
 * Display help information
 */
export function displayHelp() {
  console.log(`
${chalk.cyan.bold('Quick Start:')}

  ${chalk.yellow('momentum init')}           Initialize new project with AI questioning
  ${chalk.yellow('momentum roadmap -c')}     Create project roadmap with phases
  ${chalk.yellow('momentum phase plan 1')}   Create execution plan for phase 1
  ${chalk.yellow('momentum execute')}        Execute current plan
  ${chalk.yellow('momentum status')}         View project status dashboard

${chalk.cyan.bold('Workflow:')}

  ${figures.arrowRight} ${chalk.dim('init')} ${figures.arrowRight} ${chalk.dim('roadmap')} ${figures.arrowRight} ${chalk.dim('plan')} ${figures.arrowRight} ${chalk.dim('execute')} ${figures.arrowRight} ${chalk.dim('complete')}

${chalk.cyan.bold('Key Features:')}

  ${figures.tick} Parallel task execution with dependency graphs
  ${figures.tick} Smart context optimization for AI models
  ${figures.tick} Automatic rollback points and recovery
  ${figures.tick} Learning from past projects
  ${figures.tick} Visual progress dashboards

${chalk.dim('Run "momentum <command> --help" for detailed options')}
`);
}

/**
 * Create a styled progress bar
 */
export function createProgressBar(current, total, width = 30) {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;

  const filledBar = chalk.cyan('█'.repeat(filled));
  const emptyBar = chalk.gray('░'.repeat(empty));

  let color = chalk.cyan;
  if (percentage >= 75) color = chalk.green;
  else if (percentage >= 50) color = chalk.yellow;
  else if (percentage >= 25) color = chalk.magenta;

  return `${filledBar}${emptyBar} ${color(`${percentage}%`)}`;
}

/**
 * Display a status table
 */
export function displayStatusTable(data) {
  const table = new Table({
    chars: {
      top: '─', 'top-mid': '┬', 'top-left': '╭', 'top-right': '╮',
      bottom: '─', 'bottom-mid': '┴', 'bottom-left': '╰', 'bottom-right': '╯',
      left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
      right: '│', 'right-mid': '┤', middle: '│'
    },
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  table.push(...data);
  console.log(table.toString());
}

/**
 * Display a success message
 */
export function success(message) {
  console.log(chalk.green(`${figures.tick} ${message}`));
}

/**
 * Display an error message
 */
export function error(message) {
  console.log(chalk.red(`${figures.cross} ${message}`));
}

/**
 * Display a warning message
 */
export function warning(message) {
  console.log(chalk.yellow(`${figures.warning} ${message}`));
}

/**
 * Display an info message
 */
export function info(message) {
  console.log(chalk.blue(`${figures.info} ${message}`));
}

/**
 * Display a step in a process
 */
export function step(number, message) {
  console.log(chalk.cyan(`${figures.pointer} Step ${number}:`) + ` ${message}`);
}

/**
 * Create a styled header
 */
export function header(text) {
  const line = '═'.repeat(text.length + 4);
  console.log(chalk.cyan(`╔${line}╗`));
  console.log(chalk.cyan(`║  ${text}  ║`));
  console.log(chalk.cyan(`╚${line}╝`));
}

/**
 * Create a section divider
 */
export function divider(text = '') {
  if (text) {
    const padding = Math.max(0, 30 - text.length);
    console.log(chalk.gray(`─── ${text} ${'─'.repeat(padding)}`));
  } else {
    console.log(chalk.gray('─'.repeat(50)));
  }
}

/**
 * Display task status with icon
 */
export function taskStatus(task, status) {
  const icons = {
    pending: chalk.gray(figures.circle),
    'in-progress': chalk.yellow(figures.circleFilled),
    completed: chalk.green(figures.tick),
    failed: chalk.red(figures.cross),
    blocked: chalk.red(figures.warning),
    skipped: chalk.gray(figures.line)
  };

  const statusColors = {
    pending: chalk.gray,
    'in-progress': chalk.yellow,
    completed: chalk.green,
    failed: chalk.red,
    blocked: chalk.red,
    skipped: chalk.gray
  };

  const icon = icons[status] || icons.pending;
  const colorFn = statusColors[status] || chalk.white;

  console.log(`  ${icon} ${colorFn(task)}`);
}

/**
 * Display a burndown chart in ASCII
 */
export function displayBurndown(data, options = {}) {
  const { width = 50, height = 15 } = options;
  const maxValue = Math.max(...data.map(d => d.remaining));

  console.log(chalk.cyan.bold('\n📊 Burndown Chart\n'));

  // Create Y-axis labels and chart
  for (let row = height; row >= 0; row--) {
    const threshold = (row / height) * maxValue;
    const label = Math.round(threshold).toString().padStart(4);

    let line = chalk.gray(`${label} │`);

    for (let col = 0; col < data.length && col < width; col++) {
      const value = data[col].remaining;
      const ideal = data[col].ideal;

      if (value >= threshold && value < threshold + (maxValue / height)) {
        line += chalk.cyan('█');
      } else if (ideal >= threshold && ideal < threshold + (maxValue / height)) {
        line += chalk.gray('░');
      } else if (value > threshold) {
        line += chalk.cyan('│');
      } else {
        line += ' ';
      }
    }

    console.log(line);
  }

  // X-axis
  console.log(chalk.gray('     └' + '─'.repeat(Math.min(data.length, width))));

  // Legend
  console.log(chalk.dim(`\n     ${chalk.cyan('█')} Actual  ${chalk.gray('░')} Ideal`));
}

/**
 * Display a dependency graph
 */
export function displayDependencyGraph(tasks) {
  console.log(chalk.cyan.bold('\n🔗 Task Dependencies\n'));

  const processed = new Set();

  function printTask(task, depth = 0) {
    if (processed.has(task.id)) return;
    processed.add(task.id);

    const indent = '  '.repeat(depth);
    const connector = depth > 0 ? '├─ ' : '';
    const statusIcon = task.completed ? chalk.green(figures.tick) : chalk.gray(figures.circle);

    console.log(`${indent}${connector}${statusIcon} ${task.name}`);

    if (task.dependencies) {
      task.dependencies.forEach(dep => {
        printTask(dep, depth + 1);
      });
    }
  }

  tasks.forEach(task => printTask(task));
}

export default {
  displayBanner,
  displayHelp,
  createProgressBar,
  displayStatusTable,
  success,
  error,
  warning,
  info,
  step,
  header,
  divider,
  taskStatus,
  displayBurndown,
  displayDependencyGraph
};
