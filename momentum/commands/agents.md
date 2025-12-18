---
description: Manage the multi-agent execution pool
arguments:
  - name: action
    description: "Action: status, kill, config"
    required: true
---

# Agent Pool Management

Monitor and control the multi-agent execution pool.

## Actions

### status
Show running agents, queue depth, completed tasks.

### kill [id]
Kill a specific agent or all agents.

### config [key] [value]
Configure pool settings (maxAgents, timeout).

## Context
@momentum/lib/core/agent-pool.js
