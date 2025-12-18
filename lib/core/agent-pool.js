/**
 * AgentPool - Multi-agent parallel execution orchestrator
 */
import { spawn, fork } from 'child_process';
import { EventEmitter } from 'events';
import { WorktreeManager } from './worktree.js';
import { AgentBus } from './agent-bus.js';
import { DependencyResolver } from './dependency-resolver.js';

export class AgentPool extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxAgents = options.maxAgents || 4;
    this.agents = new Map();
    this.taskQueue = [];
    this.results = new Map();
    this.worktreeManager = null;
    this.bus = new AgentBus({ persistPath: '.momentum/messages' });
    this.resolver = new DependencyResolver();
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

      // Run QA if enabled and agent succeeded
      if (code === 0 && task.config?.features?.autoQA) {
        const { QARunner } = await import('./qa-runner.js');
        const qa = new QARunner({
          workDir: worktree.path,
          maxIterations: task.config?.features?.qaIterations || 10
        });

        const qaResult = await qa.loop();
        agent.qaResult = qaResult;

        if (!qaResult.success) {
          agent.status = 'qa_failed';
          this.emit('agent:qa_failed', { taskId, qaResult });
        }
      }

      this.results.set(taskId, {
        success: code === 0,
        output: agent.output.join(''),
        duration: agent.endTime - agent.startTime,
        worktree: worktree.path,
        qaResult: agent.qaResult
      });

      this.emit('agent:complete', { taskId, code, agent });
      this.agents.delete(taskId);

      // Process next task if available
      this.processQueue();
    });

    this.agents.set(taskId, agent);
    this.emit('agent:spawn', { taskId, task });

    // Set up message forwarding for this agent
    this.bus.on('message', (msg) => {
      if (msg.to === taskId || msg.to === 'all') {
        this.emit('agent:message', { taskId, message: msg });
      }
    });

    return agent;
  }

  /**
   * Broadcast message to all agents
   */
  broadcast(fromAgent, message) {
    return this.bus.broadcast(fromAgent, message);
  }

  /**
   * Send message to specific agent
   */
  send(fromAgent, toAgent, message) {
    return this.bus.send(fromAgent, toAgent, message);
  }

  /**
   * Subscribe to messages for agent
   */
  onMessage(agentId, callback) {
    return this.bus.onMessage(agentId, callback);
  }

  /**
   * Get messages for agent
   */
  getMessages(agentId, options) {
    return this.bus.getMessages(agentId, options);
  }

  /**
   * Get message history
   */
  getMessageHistory(limit) {
    return this.bus.getHistory(limit);
  }

  /**
   * Distribute tasks across available agents (dependency-aware)
   */
  async distribute(tasks, options = {}) {
    const respectDependencies = options.dependencies !== false;

    if (respectDependencies && tasks.some(t => t.dependsOn || t.metadata?.dependencies)) {
      return this.distributeWithDependencies(tasks, options);
    } else {
      // Original behavior - no dependency checking
      this.addTasks(tasks);
      return this.start();
    }
  }

  /**
   * Distribute tasks respecting dependencies
   */
  async distributeWithDependencies(tasks, options = {}) {
    // Build dependency graph
    this.resolver.reset();
    this.resolver.addTasks(tasks);

    // Get execution stages
    const resolution = this.resolver.resolve();

    this.emit('dependency:resolved', {
      stages: resolution.stages.length,
      order: resolution.order
    });

    // Execute stage by stage
    const allResults = {};

    for (let i = 0; i < resolution.stages.length; i++) {
      const stage = resolution.stages[i];
      const stageTasks = stage.map(taskId =>
        tasks.find(t => t.id === taskId)
      );

      this.emit('stage:start', {
        stage: i + 1,
        total: resolution.stages.length,
        tasks: stage,
        parallel: resolution.parallelizable[i]
      });

      // Execute this stage (can run in parallel)
      this.addTasks(stageTasks);
      const stageResults = await this.start();

      Object.assign(allResults, stageResults);

      this.emit('stage:complete', {
        stage: i + 1,
        results: stageResults
      });

      // Check for failures
      const failures = Object.values(stageResults).filter(r => !r.success);
      if (failures.length > 0 && options.stopOnFailure !== false) {
        throw new Error(
          `Stage ${i + 1} failed: ${failures.length} task(s) failed`
        );
      }
    }

    return allResults;
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
