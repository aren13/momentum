/**
 * AgentPool - Multi-agent parallel execution orchestrator
 */
import { spawn, fork } from 'child_process';
import { EventEmitter } from 'events';
import { WorktreeManager } from './worktree.js';

export class AgentPool extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxAgents = options.maxAgents || 4;
    this.agents = new Map();
    this.taskQueue = [];
    this.results = new Map();
    this.worktreeManager = null;
  }

  /**
   * Initialize the pool with a repository
   */
  async init(repoDir) {
    this.repoDir = repoDir;
    this.worktreeManager = new WorktreeManager(repoDir);
    this.worktreeManager.init();
    return this;
  }

  /**
   * Add tasks to the queue
   */
  addTasks(tasks) {
    this.taskQueue.push(...tasks);
    return this;
  }

  /**
   * Spawn an agent for a specific task
   */
  async spawn(task) {
    const taskId = task.id || `task-${Date.now()}`;

    // Create worktree for this agent
    const worktree = await this.worktreeManager.create(taskId);

    // Prepare agent process
    const agent = {
      id: taskId,
      task,
      worktree,
      process: null,
      status: 'starting',
      output: [],
      startTime: Date.now()
    };

    // Spawn Claude Code process
    // Uses claude CLI in the worktree directory
    const process = spawn('claude', [
      '--dangerously-skip-permissions',
      '--print',
      task.prompt || `Execute task: ${task.name}`
    ], {
      cwd: worktree.path,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    agent.process = process;
    agent.status = 'running';

    // Capture output
    process.stdout.on('data', (data) => {
      agent.output.push(data.toString());
      this.emit('agent:output', { taskId, data: data.toString() });
    });

    process.stderr.on('data', (data) => {
      agent.output.push(`[stderr] ${data.toString()}`);
      this.emit('agent:error', { taskId, data: data.toString() });
    });

    // Handle completion
    process.on('close', async (code) => {
      agent.status = code === 0 ? 'completed' : 'failed';
      agent.endTime = Date.now();
      agent.exitCode = code;

      this.results.set(taskId, {
        success: code === 0,
        output: agent.output.join(''),
        duration: agent.endTime - agent.startTime,
        worktree: worktree.path
      });

      this.emit('agent:complete', { taskId, code, agent });
      this.agents.delete(taskId);

      // Process next task if available
      this.processQueue();
    });

    this.agents.set(taskId, agent);
    this.emit('agent:spawn', { taskId, task });

    return agent;
  }

  /**
   * Distribute tasks across available agents
   */
  async distribute(tasks) {
    this.addTasks(tasks);
    return this.start();
  }

  /**
   * Start processing the queue
   */
  async start() {
    const promises = [];

    // Initial batch
    while (this.agents.size < this.maxAgents && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      promises.push(this.spawn(task));
    }

    await Promise.all(promises);

    // Wait for all to complete
    return new Promise((resolve) => {
      const checkComplete = () => {
        if (this.agents.size === 0 && this.taskQueue.length === 0) {
          resolve(this.getResults());
        }
      };

      this.on('agent:complete', checkComplete);
      checkComplete(); // In case already done
    });
  }

  /**
   * Process next task in queue
   */
  processQueue() {
    if (this.agents.size < this.maxAgents && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      this.spawn(task);
    }
  }

  /**
   * Get all results
   */
  getResults() {
    return Object.fromEntries(this.results);
  }

  /**
   * Monitor agent health
   */
  monitor() {
    const status = [];
    for (const [id, agent] of this.agents) {
      status.push({
        id,
        status: agent.status,
        runtime: Date.now() - agent.startTime,
        worktree: agent.worktree.name
      });
    }
    return status;
  }

  /**
   * Kill all agents
   */
  async killAll() {
    for (const [id, agent] of this.agents) {
      if (agent.process) {
        agent.process.kill('SIGTERM');
      }
    }
    this.agents.clear();
  }

  /**
   * Merge all completed worktrees back to main
   */
  async mergeAll(target = 'main') {
    const results = [];
    for (const [taskId, result] of this.results) {
      if (result.success) {
        const mergeResult = await this.worktreeManager.merge(taskId, target);
        results.push({ taskId, ...mergeResult });
      }
    }
    return results;
  }

  /**
   * Cleanup all worktrees
   */
  async cleanup() {
    for (const [taskId] of this.results) {
      try {
        await this.worktreeManager.delete(taskId);
      } catch {
        // Already cleaned
      }
    }
  }
}

export default AgentPool;
