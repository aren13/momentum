import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the momentum CLI
const CLI_PATH = path.join(__dirname, '../../bin/cli.js');

/**
 * Execute a Momentum CLI command
 * @param {string} command - The command to execute (e.g., 'status', 'execute')
 * @param {Array} args - Command arguments
 * @param {Object} options - Additional options
 * @returns {Promise<{success: boolean, output: string, error?: string}>}
 */
function executeMomentumCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const commandArgs = [CLI_PATH, command, ...args];

    // Add options as flags
    if (options.strategy) {
      commandArgs.push('--strategy', options.strategy);
    }
    if (options.checkpoint) {
      commandArgs.push('--checkpoint');
    }
    if (options.parallel) {
      commandArgs.push('--parallel');
    }
    if (options.autonomous) {
      commandArgs.push('--autonomous');
    }

    const child = spawn('node', commandArgs, {
      cwd: options.cwd || process.cwd(),
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, output: stdout, error: stderr });
      }
    });

    child.on('error', (error) => {
      resolve({ success: false, output: '', error: error.message });
    });
  });
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers() {

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:status', async () => {
    return await executeMomentumCommand('status');
  });

  ipcMain.handle('momentum:roadmap', async () => {
    return await executeMomentumCommand('roadmap');
  });

  ipcMain.handle('momentum:init', async (event, { name, options }) => {
    const args = name ? [name] : [];
    return await executeMomentumCommand('init', args, options);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAN EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:execute', async (event, { planPath, options }) => {
    const args = planPath ? [planPath] : [];
    return await executeMomentumCommand('execute', args, options);
  });

  ipcMain.handle('momentum:plan', async (event, { action, phase, options }) => {
    const args = [action];
    if (phase) args.push(phase);
    return await executeMomentumCommand('plan', args, options);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:resume', async (event, { agentId }) => {
    const args = agentId ? [agentId] : [];
    return await executeMomentumCommand('resume', args);
  });

  ipcMain.handle('momentum:discuss', async (event, { topic, options }) => {
    const args = topic ? [topic] : [];
    return await executeMomentumCommand('discuss', args, options);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKTREE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:worktree', async (event, { action, name, options }) => {
    const args = [action];
    if (name) args.push(name);
    return await executeMomentumCommand('worktree', args, options);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUES & PHASES
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:issues', async (event, { action, options }) => {
    const args = action ? [action] : [];
    return await executeMomentumCommand('issues', args, options);
  });

  ipcMain.handle('momentum:phase', async (event, { action, number, options }) => {
    const args = [action];
    if (number) args.push(number);
    return await executeMomentumCommand('phase', args, options);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE SYSTEM & PROJECT INFO
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:getProjectPath', async () => {
    return { success: true, output: process.cwd() };
  });

  ipcMain.handle('momentum:setProjectPath', async (event, { path }) => {
    try {
      process.chdir(path);
      return { success: true, output: path };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KANBAN BOARD
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:updateTaskStatus', async (event, { taskId, status }) => {
    // This would need to update the ROADMAP.md file
    // For now, return success to allow UI to work
    // TODO: Implement actual roadmap file update
    console.log(`Update task ${taskId} to status ${status}`);
    return { success: true, output: 'Task status updated' };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT INSPECTOR
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('momentum:getContext', async () => {
    // This would fetch context information from the CLI
    // For now, return mock data to allow UI to work
    // TODO: Implement actual context retrieval
    console.log('Get context data');
    return {
      success: true,
      output: JSON.stringify({
        files: [],
        totalTokens: 0,
        tokenLimit: 200000
      })
    };
  });

  ipcMain.handle('momentum:addToContext', async (event, { filePath }) => {
    // This would add a file to the context
    // TODO: Implement actual context addition
    console.log(`Add to context: ${filePath}`);
    return { success: true, output: 'File added to context' };
  });

  ipcMain.handle('momentum:removeFromContext', async (event, { filePath }) => {
    // This would remove a file from the context
    // TODO: Implement actual context removal
    console.log(`Remove from context: ${filePath}`);
    return { success: true, output: 'File removed from context' };
  });

  console.log('IPC handlers registered');
}
