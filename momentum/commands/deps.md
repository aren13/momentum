---
description: Visualize task dependencies and execution order
arguments:
  - name: action
    description: "Action: show, check, stages"
    required: true
  - name: plan
    description: "Path to plan file (optional)"
    required: false
---

# Dependency Visualization

Analyze and visualize task dependencies for a plan.

## Actions

### show [plan-path]
Display the dependency graph for tasks in a plan.

Example:
```
/deps show ./ae-cc/planning/phases/02-multi-agent/02-03-PLAN.md
```

Output:
```
Dependency Graph:

task-1: Create DependencyResolver Class
  Required by: task-2, task-3

task-2: Integrate with AgentPool
  Depends on: task-1
  Required by: task-3

task-3: Add Dependency Visualization
  Depends on: task-1, task-2
```

### check [plan-path]
Check for circular dependencies and validation errors.

Example:
```
/deps check
```

### stages [plan-path]
Show execution stages with parallel opportunities.

Example:
```
/deps stages
```

Output:
```
Execution Plan:

Stage 1 (parallel: no):
  - task-1: Create DependencyResolver Class

Stage 2 (parallel: yes):
  - task-2: Integrate with AgentPool
  - task-3: Add Dependency Visualization
```

## Context
@momentum/lib/core/dependency-resolver.js
@momentum/lib/core/agent-pool.js

## Implementation Notes

Dependency formats supported:
1. `dependsOn` field in task metadata
2. "depends on: task-1, task-2" in task description
3. `metadata.dependencies` array

Circular dependencies are detected and reported before execution.
