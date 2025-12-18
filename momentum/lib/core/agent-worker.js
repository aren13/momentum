/**
 * Agent Worker - Isolated process for task execution
 *
 * This runs in its own process, receives task via IPC,
 * and executes via Claude Code CLI.
 */
import { execSync } from 'child_process';

// Receive task from parent
process.on('message', async (message) => {
  if (message.type === 'execute') {
    const { task, worktreePath } = message;

    try {
      // Execute task in worktree
      const result = execSync(`claude --print "${task.prompt}"`, {
        cwd: worktreePath,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      // Report success
      process.send({
        type: 'complete',
        taskId: task.id,
        success: true,
        output: result
      });

    } catch (err) {
      // Report failure
      process.send({
        type: 'complete',
        taskId: task.id,
        success: false,
        error: err.message,
        output: err.stdout || ''
      });
    }
  }
});

// Signal ready
process.send({ type: 'ready' });
