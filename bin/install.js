#!/usr/bin/env node

/**
 * Momentum Installer
 * Installs slash commands for Claude Code integration
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ASCII banner
const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ╔╦╗╔═╗╔╦╗╔═╗╔╗╔╔╦╗╦ ╦╔╦╗                                  ║
║   ║║║║ ║║║║║╣ ║║║ ║ ║ ║║║║                                  ║
║   ╩ ╩╚═╝╩ ╩╚═╝╝╚╝ ╩ ╚═╝╩ ╩                                  ║
║                                                              ║
║   Intelligent AI-Assisted Project Management                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

const VERSION = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
).version;

/**
 * Copy directory recursively with path replacement
 */
function copyDir(src, dest, pathReplacements = {}) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, pathReplacements);
    } else {
      let content = readFileSync(srcPath, 'utf8');

      // Replace path references in markdown files
      if (entry.name.endsWith('.md')) {
        for (const [from, to] of Object.entries(pathReplacements)) {
          content = content.replace(new RegExp(from, 'g'), to);
        }
      }

      writeFileSync(destPath, content);
    }
  }
}

/**
 * Prompt user for input
 */
async function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Main installation function
 */
async function install() {
  console.log(BANNER);
  console.log(`  Version: ${VERSION}\n`);

  const args = process.argv.slice(2);
  const isGlobal = args.includes('--global') || args.includes('-g');
  const isLocal = args.includes('--local') || args.includes('-l');

  // Validate flags
  if (isGlobal && isLocal) {
    console.error('Error: Cannot use both --global and --local flags\n');
    process.exit(1);
  }

  let installType;

  if (isGlobal) {
    installType = 'global';
  } else if (isLocal) {
    installType = 'local';
  } else {
    // Interactive prompt
    console.log('  Where would you like to install Momentum commands?\n');
    console.log('  1. Global  (~/.claude/commands/mtm/)');
    console.log('     Available in all projects\n');
    console.log('  2. Local   (./.claude/commands/mtm/)');
    console.log('     Only in this project\n');

    const answer = await prompt('  Enter choice (1 or 2): ');
    installType = answer === '2' ? 'local' : 'global';
  }

  // Determine paths
  const sourceDir = join(__dirname, '..', 'commands');
  let targetDir;
  let pathPrefix;

  if (installType === 'global') {
    targetDir = join(homedir(), '.claude', 'commands', 'mtm');
    pathPrefix = '~/.claude/momentum/';
  } else {
    targetDir = join(process.cwd(), '.claude', 'commands', 'mtm');
    pathPrefix = './.momentum/';
  }

  console.log(`\n  Installing to: ${targetDir}\n`);

  // Check if source exists
  if (!existsSync(sourceDir)) {
    console.error('  Error: Command templates not found\n');
    console.error('  Expected at:', sourceDir);
    process.exit(1);
  }

  // Check for existing installation
  if (existsSync(targetDir)) {
    const overwrite = await prompt('  Commands already exist. Overwrite? (y/n): ');
    if (overwrite !== 'y' && overwrite !== 'yes') {
      console.log('\n  Installation cancelled.\n');
      process.exit(0);
    }
  }

  // Copy commands
  try {
    const replacements = {
      '~/.claude/momentum/': pathPrefix,
      '~/.momentum/': pathPrefix === '~/.claude/momentum/' ? '~/.momentum/' : './.momentum/'
    };

    copyDir(sourceDir, targetDir, replacements);

    console.log('  ✓ Commands installed successfully!\n');
    console.log('  Available commands:');
    console.log('    /mtm:init      - Initialize new project');
    console.log('    /mtm:roadmap   - Create project roadmap');
    console.log('    /mtm:plan      - Create execution plan');
    console.log('    /mtm:execute   - Execute a plan');
    console.log('    /mtm:status    - View project status');
    console.log('    /mtm:help      - Show all commands\n');

    if (installType === 'global') {
      console.log('  Commands are available in all projects.');
    } else {
      console.log('  Commands are available in this project only.');
    }

    console.log('\n  Get started: /mtm:init\n');

  } catch (err) {
    console.error(`  Error: ${err.message}\n`);
    process.exit(1);
  }
}

// Run installer
install().catch(err => {
  console.error(`\n  Error: ${err.message}\n`);
  process.exit(1);
});
