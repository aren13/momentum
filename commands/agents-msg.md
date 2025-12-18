---
description: Send messages between agents and view message history
arguments:
  - name: action
    description: "Action: send, broadcast, history, clear"
    required: true
  - name: args
    description: "Action-specific arguments"
    required: false
---

# Agent Messaging

Send and receive messages between running agents.

## Actions

### send <from-agent> <to-agent> <message>
Send a direct message from one agent to another.

Example:
```
/agents-msg send agent-1 agent-2 "Share your progress on the API implementation"
```

### broadcast <from-agent> <message>
Broadcast a message to all agents.

Example:
```
/agents-msg broadcast coordinator "All agents: commit your current work"
```

### history [agent-id] [limit]
View message history. Optionally filter by agent ID and limit results.

Example:
```
/agents-msg history agent-1 50
```

### clear
Clear all message history.

## Context
@momentum/lib/core/agent-bus.js
@momentum/lib/core/agent-pool.js

## Implementation Notes

Messages are:
- Persisted to `.momentum/messages/` directory
- Kept for 24 hours by default
- Available across agent restarts
- Queryable by time, sender, recipient, or type
