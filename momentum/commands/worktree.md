---
description: Manage git worktrees for isolated development
arguments:
  - name: action
    description: "Action: create, list, delete, merge, clean"
    required: true
  - name: name
    description: "Worktree name (for create/delete/merge)"
    required: false
---

# Worktree Management

Execute the requested worktree action:

## Actions

### create <name>
Create a new isolated worktree for development.

### list
Show all active worktrees.

### delete <name>
Remove a worktree and its branch.

### merge <name>
Merge worktree back to main branch.

### clean
Remove completed/stale worktrees.

## Context
@momentum/lib/core/worktree.js

Invoke the appropriate WorktreeManager method based on the action.
