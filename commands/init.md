---
description: Initialize a new Momentum project with intelligent questioning
allowed_tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

# Initialize Momentum Project

You are initializing a new Momentum project. This is the most critical step - deep questioning here leads to better plans, better execution, and better outcomes.

## Process

### Step 1: Environment Check

1. Check if `.momentum/` directory already exists
2. Check if this is a git repository
3. Detect if there's existing code (brownfield project)

```bash
ls -la .momentum/ 2>/dev/null || echo "No existing project"
git status 2>/dev/null || echo "Not a git repo"
ls -la src/ lib/ app/ package.json requirements.txt Cargo.toml 2>/dev/null || echo "No code detected"
```

### Step 2: Project Interview

Conduct a thorough interview to understand the project. Ask questions ONE AT A TIME to get thoughtful answers.

**Round 1 - Vision:**
- "What are you building? Describe it in one sentence."
- "Who is this for? Who will use it?"
- "What problem does this solve?"

**Round 2 - Scope:**
- "What are the 3-5 core features that MUST be in the first version?"
- "What features are explicitly OUT OF SCOPE for now?"
- "Any technical constraints? (platform, performance, security, etc.)"

**Round 3 - Technical:**
- "What technology stack will you use? (or should I suggest one?)"
- "Any existing code or dependencies to work with?"
- "Preferred workflow mode: Interactive (confirm each step), Hybrid (confirm key decisions), or Autonomous (auto-execute)?"

### Step 3: Create Project Structure

Create the `.momentum/` directory structure:

```
.momentum/
├── PROJECT.md      # Vision and requirements
├── STATE.md        # Project memory
├── ISSUES.md       # Deferred issues
├── config.json     # Configuration
├── phases/         # Phase directories
├── checkpoints/    # Rollback points
└── analytics/      # Learning data
```

### Step 4: Write PROJECT.md

Create a comprehensive PROJECT.md that includes:

```markdown
# [Project Name]

> [One-sentence description]

## Overview

**Type:** [web/api/cli/library/fullstack]
**Target Audience:** [who]
**Created:** [date]

## Goals

[Bullet list of goals from interview]

## Technical Stack

[Stack details]

## Constraints

[Any constraints mentioned]

## Scope

### In Scope
[List]

### Out of Scope
[List]

## Success Metrics

- [ ] [Metric 1]
- [ ] [Metric 2]
```

### Step 5: Write config.json

```json
{
  "version": "1.0.0",
  "projectName": "[name]",
  "projectType": "[type]",
  "workflowMode": "[mode]",
  "features": {
    "parallelExecution": true,
    "autoCheckpoints": true,
    "learningMode": true,
    "smartRetries": true
  },
  "git": {
    "autoCommit": true,
    "commitPrefix": "chore:"
  },
  "created": "[ISO date]"
}
```

### Step 6: Initialize Git (if needed)

If not already a git repo:
```bash
git init
```

Add `.momentum/checkpoints/` and `.momentum/analytics/` to `.gitignore`.

### Step 7: Commit

```bash
git add .momentum/
git commit -m "chore: initialize Momentum project"
```

### Step 8: Next Steps

Tell the user:
```
✓ Project initialized successfully!

Next steps:
1. Review .momentum/PROJECT.md to ensure accuracy
2. Run /mtm:roadmap to create your project roadmap
3. Run /mtm:status to view your dashboard
```

## Important

- Ask questions ONE AT A TIME
- Be thorough - this context drives everything
- Don't assume - ask for clarification
- Capture everything in PROJECT.md
