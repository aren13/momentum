# Momentum

> Intelligent Project Management for AI-Assisted Development

A meta-prompting, context engineering, and spec-driven development system designed for solo developers using Claude Code or similar AI assistants. Build software reliably with structured workflows, parallel execution, and smart context management.

## Why Momentum?

Traditional AI-assisted development often produces inconsistent results. Momentum solves this by providing:

- **Structured Context** - Keep your AI informed with PROJECT.md, ROADMAP.md, STATE.md
- **Atomic Execution** - Break work into small, verifiable tasks
- **Smart Strategies** - Parallel execution where safe, sequential where needed
- **Learning System** - Improve estimates based on past projects
- **Rollback Safety** - Automatic checkpoints before risky operations

## Quick Start

### Installation

```bash
# Install globally
npm install -g momentum-dev

# Or use directly
npx momentum-dev init
```

### Initialize a Project

```bash
momentum init
```

This conducts an intelligent interview to understand your project, creating:
- `.momentum/PROJECT.md` - Vision and requirements
- `.momentum/ROADMAP.md` - Phase breakdown
- `.momentum/STATE.md` - Project memory
- `.momentum/config.json` - Configuration

### Create Your Roadmap

```bash
momentum roadmap --create
```

Define milestones and phases. Each phase should be:
- Completable in a focused work session
- Have clear deliverables
- Build on previous phases

### Plan a Phase

```bash
momentum phase plan 1
```

Creates a detailed execution plan with:
- Specific tasks and file targets
- Dependencies and verification steps
- Parallel execution opportunities

### Execute

```bash
momentum execute
```

Runs the plan with:
- Intelligent strategy selection
- Automatic checkpoints
- Progress tracking
- Summary generation

### Check Status

```bash
momentum status
```

Visual dashboard showing:
- Overall progress
- Phase breakdown
- Recent activity
- Next steps

## Commands

### Core Workflow

| Command | Description |
|---------|-------------|
| `momentum init` | Initialize new project |
| `momentum roadmap` | Create/view roadmap |
| `momentum phase plan <n>` | Create plan for phase |
| `momentum execute [path]` | Execute a plan |
| `momentum status` | View dashboard |

### Phase Management

| Command | Description |
|---------|-------------|
| `momentum phase discuss <n>` | Capture vision before planning |
| `momentum phase research <n>` | Deep research for complex domains |
| `momentum phase add <desc>` | Add new phase |

### Context Management

| Command | Description |
|---------|-------------|
| `momentum resume` | Resume with context restoration |
| `momentum pause` | Pause with handoff notes |
| `momentum context --optimize` | Optimize context size |

### Progress & Analytics

| Command | Description |
|---------|-------------|
| `momentum dashboard` | Interactive dashboard |
| `momentum burndown` | Visual burndown chart |
| `momentum insights` | AI-powered insights |
| `momentum learn` | Learn from past work |

### Utilities

| Command | Description |
|---------|-------------|
| `momentum issues` | Manage deferred issues |
| `momentum checkpoint` | Create rollback point |
| `momentum rollback` | Restore from checkpoint |
| `momentum config` | View/update config |

## Claude Code Integration

Install slash commands for Claude Code:

```bash
momentum install --global   # or --local for project-only
```

Then use in Claude Code:
- `/mtm:init` - Initialize project
- `/mtm:roadmap` - Create roadmap
- `/mtm:plan 1` - Plan phase 1
- `/mtm:execute` - Execute next plan
- `/mtm:status` - View status
- `/mtm:help` - Command reference

## Project Structure

```
.momentum/
├── PROJECT.md          # Project vision and requirements
├── ROADMAP.md          # Phase breakdown and progress
├── STATE.md            # Project memory and decisions
├── ISSUES.md           # Deferred enhancements
├── config.json         # Configuration
├── phases/
│   ├── 01-setup/
│   │   ├── CONTEXT.md      # Phase context (optional)
│   │   ├── 01-01-PLAN.md   # Execution plans
│   │   └── 01-01-SUMMARY.md
│   └── 02-features/
├── checkpoints/        # Rollback points
├── codebase/           # Brownfield analysis
└── analytics/          # Learning data
```

## Workflow Modes

Configure in `config.json`:

- **Interactive** - Confirm every major decision
- **Hybrid** - Confirm key decisions only (recommended)
- **Autonomous** - Full auto-pilot

```json
{
  "workflowMode": "hybrid"
}
```

## Key Features

### Parallel Execution

Momentum analyzes task dependencies and executes independent tasks in parallel:

```
Executing in parallel:
  ├─ Task 2: Add component A
  ├─ Task 3: Add component B
  └─ Task 4: Add component C

[All complete]

Continuing sequentially:
  ● Task 5: Integrate components
```

### Smart Context Management

Monitor and optimize context utilization:

```bash
momentum context

Context Utilization:
  ████████████░░░░░░░░░░░░░░░░░░ 40%
  ~72,000 / 180,000 tokens

Breakdown:
  PROJECT.md          12,000 tokens (17%)
  ROADMAP.md           8,000 tokens (11%)
  STATE.md            24,000 tokens (33%)
  phases/             28,000 tokens (39%)
```

### Learning System

Analyze past projects to improve future estimates:

```bash
momentum learn

Analyzing project patterns...
✓ Learning analysis complete

Recommendations:
  → Break high-complexity phases into smaller plans
  → Add verification steps for all file modifications
  → Create checkpoints before risky operations
```

### Rollback Safety

Automatic checkpoints before execution:

```bash
momentum rollback --list

Available Checkpoints:
  → pre-02-03-PLAN (2h ago)
  → pre-02-02-PLAN (yesterday)
  → milestone-1-complete (3 days ago)

momentum rollback pre-02-03-PLAN --preview
```

## Comparison with Alternatives

| Feature | Momentum | GSD | Manual |
|---------|----------|-----|--------|
| Parallel Execution | ✅ | ❌ | ❌ |
| Context Optimization | ✅ | ❌ | ❌ |
| Visual Dashboard | ✅ | ❌ | ❌ |
| Rollback Points | ✅ | ❌ | ❌ |
| Learning System | ✅ | ❌ | ❌ |
| Burndown Charts | ✅ | ❌ | ❌ |
| Risk Analysis | ✅ | ❌ | ❌ |
| Multi-Model Support | ✅ | ❌ | ✅ |

## Configuration

Full `config.json` options:

```json
{
  "version": "1.0.0",
  "projectName": "My Project",
  "projectType": "web",
  "workflowMode": "hybrid",
  "features": {
    "parallelExecution": true,
    "autoCheckpoints": true,
    "learningMode": true,
    "smartRetries": true
  },
  "git": {
    "autoCommit": true,
    "commitPrefix": "feat:",
    "branchStrategy": "feature"
  },
  "ai": {
    "preferredModel": "claude",
    "contextOptimization": true,
    "maxContextTokens": 180000
  }
}
```

## Best Practices

1. **Start with thorough init** - The questioning phase is your most leveraged moment
2. **Keep phases focused** - Each phase should be completable in one session
3. **Review status regularly** - Use `momentum status` between plans
4. **Address issues periodically** - Don't let deferred issues pile up
5. **Create checkpoints** - Before any risky changes
6. **Use discuss/research** - For complex phases, invest in context

## License

MIT

## Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

---

Built with ♥ for solo developers who want to ship faster with AI.
