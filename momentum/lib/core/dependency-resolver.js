/**
 * DependencyResolver - Task dependency analysis and execution ordering
 */
export class DependencyResolver {
  constructor() {
    this.tasks = new Map();
    this.dependencies = new Map();
    this.graph = null;
  }

  /**
   * Add task with dependencies
   */
  addTask(task) {
    this.tasks.set(task.id, task);

    // Parse dependencies from task
    const deps = this.parseDependencies(task);
    this.dependencies.set(task.id, deps);

    return this;
  }

  /**
   * Add multiple tasks
   */
  addTasks(tasks) {
    tasks.forEach(task => this.addTask(task));
    return this;
  }

  /**
   * Parse dependencies from task metadata
   */
  parseDependencies(task) {
    const deps = [];

    // Check various dependency formats
    if (task.dependsOn) {
      // Array of task IDs
      if (Array.isArray(task.dependsOn)) {
        deps.push(...task.dependsOn);
      }
      // Single task ID
      else if (typeof task.dependsOn === 'string') {
        deps.push(task.dependsOn);
      }
    }

    // Check for dependencies in task description
    if (task.description) {
      // Pattern: "depends on: task-1, task-2"
      const match = task.description.match(/depends on:?\s*([^\n]+)/i);
      if (match) {
        const depIds = match[1].split(',').map(d => d.trim());
        deps.push(...depIds);
      }
    }

    // Check for dependencies in metadata
    if (task.metadata?.dependencies) {
      deps.push(...task.metadata.dependencies);
    }

    return [...new Set(deps)]; // Remove duplicates
  }

  /**
   * Build dependency graph
   */
  buildGraph() {
    const graph = {
      nodes: new Set(),
      edges: new Map(),
      inDegree: new Map()
    };

    // Add all tasks as nodes
    for (const taskId of this.tasks.keys()) {
      graph.nodes.add(taskId);
      graph.edges.set(taskId, new Set());
      graph.inDegree.set(taskId, 0);
    }

    // Add edges from dependencies
    for (const [taskId, deps] of this.dependencies) {
      for (const depId of deps) {
        // Validate dependency exists
        if (!this.tasks.has(depId)) {
          throw new Error(
            `Task "${taskId}" depends on unknown task "${depId}"`
          );
        }

        // Add edge: depId -> taskId (depId must complete before taskId)
        graph.edges.get(depId).add(taskId);
        graph.inDegree.set(taskId, graph.inDegree.get(taskId) + 1);
      }
    }

    this.graph = graph;
    return graph;
  }

  /**
   * Detect circular dependencies using DFS
   */
  detectCircular() {
    if (!this.graph) {
      this.buildGraph();
    }

    const visiting = new Set();
    const visited = new Set();
    const cycles = [];

    const dfs = (taskId, path = []) => {
      if (visiting.has(taskId)) {
        // Found a cycle
        const cycleStart = path.indexOf(taskId);
        cycles.push([...path.slice(cycleStart), taskId]);
        return true;
      }

      if (visited.has(taskId)) {
        return false;
      }

      visiting.add(taskId);
      path.push(taskId);

      const dependents = this.graph.edges.get(taskId) || new Set();
      for (const depId of dependents) {
        dfs(depId, [...path]);
      }

      visiting.delete(taskId);
      visited.add(taskId);
      return false;
    };

    for (const taskId of this.graph.nodes) {
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    }

    return cycles;
  }

  /**
   * Resolve execution order using topological sort (Kahn's algorithm)
   */
  resolve() {
    if (!this.graph) {
      this.buildGraph();
    }

    // Check for circular dependencies first
    const cycles = this.detectCircular();
    if (cycles.length > 0) {
      throw new Error(
        `Circular dependencies detected:\n${cycles.map(c => c.join(' -> ')).join('\n')}`
      );
    }

    const result = {
      stages: [],
      order: [],
      parallelizable: []
    };

    // Clone in-degree map for processing
    const inDegree = new Map(this.graph.inDegree);
    const processed = new Set();

    while (processed.size < this.graph.nodes.size) {
      // Find all tasks with no dependencies (in-degree = 0)
      const ready = [];
      for (const [taskId, degree] of inDegree) {
        if (degree === 0 && !processed.has(taskId)) {
          ready.push(taskId);
        }
      }

      if (ready.length === 0) {
        throw new Error('Unable to resolve dependencies - possible cycle');
      }

      // This stage can run in parallel
      result.stages.push(ready);
      result.parallelizable.push(ready.length > 1);

      // Process ready tasks
      for (const taskId of ready) {
        result.order.push(taskId);
        processed.add(taskId);

        // Reduce in-degree for dependent tasks
        const dependents = this.graph.edges.get(taskId) || new Set();
        for (const depId of dependents) {
          inDegree.set(depId, inDegree.get(depId) - 1);
        }
      }
    }

    return result;
  }

  /**
   * Get tasks ready to execute (no pending dependencies)
   */
  getReadyTasks(completedTaskIds = []) {
    const completed = new Set(completedTaskIds);
    const ready = [];

    for (const [taskId, deps] of this.dependencies) {
      if (completed.has(taskId)) {
        continue; // Already completed
      }

      // Check if all dependencies are completed
      const allDepsMet = deps.every(depId => completed.has(depId));
      if (allDepsMet) {
        ready.push(this.tasks.get(taskId));
      }
    }

    return ready;
  }

  /**
   * Visualize dependency graph
   */
  visualize() {
    if (!this.graph) {
      this.buildGraph();
    }

    const lines = [];
    lines.push('Dependency Graph:');
    lines.push('');

    for (const [taskId, deps] of this.dependencies) {
      const task = this.tasks.get(taskId);
      lines.push(`${taskId}: ${task.name || task.id}`);

      if (deps.length > 0) {
        lines.push(`  Depends on: ${deps.join(', ')}`);
      }

      const dependents = this.graph.edges.get(taskId) || new Set();
      if (dependents.size > 0) {
        lines.push(`  Required by: ${[...dependents].join(', ')}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get execution stages for visualization
   */
  getStages() {
    const resolution = this.resolve();
    return resolution.stages.map((stage, index) => ({
      stage: index + 1,
      tasks: stage.map(id => ({
        id,
        name: this.tasks.get(id)?.name || id
      })),
      parallel: stage.length > 1
    }));
  }

  /**
   * Reset resolver
   */
  reset() {
    this.tasks.clear();
    this.dependencies.clear();
    this.graph = null;
  }
}

export default DependencyResolver;
