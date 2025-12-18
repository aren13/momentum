---
description: Show Momentum command reference
allowed_tools:
  - Read
---

# Momentum Command Reference

Display this help information:

```
╔══════════════════════════════════════════════════════════════╗
║  MOMENTUM - Intelligent AI-Assisted Project Management       ║
╚══════════════════════════════════════════════════════════════╝

Quick Start:
  /mtm:init              Initialize new project with intelligent questioning
  /mtm:roadmap           Create project roadmap with phases
  /mtm:plan [phase]      Create execution plan for a phase
  /mtm:execute [path]    Execute a plan
  /mtm:status            View project dashboard

────────────────────────────────────────────────────────────────

WORKFLOW

  /mtm:init              Initialize new Momentum project
                         - Conducts thorough project interview
                         - Creates PROJECT.md, STATE.md, config.json
                         - Detects brownfield projects

  /mtm:roadmap           Create or view project roadmap
                         --create    Create new roadmap
                         --edit      Edit existing roadmap
                         --milestone Create new milestone

  /mtm:plan [phase]      Create execution plan for phase
                         - Auto-detects next phase if not specified
                         - Breaks work into atomic tasks
                         - Identifies parallel execution opportunities

  /mtm:execute [path]    Execute a PLAN.md file
                         - Auto-detects next plan if not specified
                         - Intelligent execution strategies
                         - Creates SUMMARY.md on completion
                         --dry-run   Preview without executing
                         --strategy  Force strategy (sequential/parallel)

  /mtm:status            Show project status dashboard
                         --detailed  Show extended information
                         --json      Output as JSON
                         --phase N   Focus on specific phase

────────────────────────────────────────────────────────────────

PHASE MANAGEMENT

  /mtm:discuss [phase]   Capture vision before planning
                         - Records your ideas and requirements
                         - Creates CONTEXT.md for phase

  /mtm:research [phase]  Deep research for complex domains
                         - Investigates best practices
                         - Creates RESEARCH.md with findings

  /mtm:add-phase         Add new phase to end of milestone
                         - Appends to current roadmap
                         - Creates phase directory

────────────────────────────────────────────────────────────────

CONTEXT MANAGEMENT

  /mtm:resume            Resume work with context restoration
                         - Shows current position
                         - Suggests next action
                         - Restores session context

  /mtm:pause             Pause work with handoff notes
                         - Creates .continue-here file
                         - Updates STATE.md

  /mtm:context           Manage project context
                         --optimize  Reduce context size
                         --export    Create handoff document
                         --summarize Generate context summary

────────────────────────────────────────────────────────────────

PROGRESS & ANALYTICS

  /mtm:progress          Detailed progress view with burndown
                         - Visual progress chart
                         - Phase-by-phase breakdown

  /mtm:insights          AI-powered project insights
                         --risks     Focus on risk analysis
                         --blockers  Focus on blockers

  /mtm:learn             Analyze patterns from past work
                         - Improves future estimates
                         - Identifies successful patterns

────────────────────────────────────────────────────────────────

ISSUE MANAGEMENT

  /mtm:issues            Manage deferred issues
                         --add       Add new issue
                         --review    Review with context
                         --list      List all issues

────────────────────────────────────────────────────────────────

GIT INTEGRATION

  /mtm:checkpoint        Create rollback checkpoint
                         - Saves current git state
                         - Can restore later

  /mtm:rollback          Rollback to checkpoint
                         --list      Show available checkpoints
                         --preview   Preview changes

────────────────────────────────────────────────────────────────

FILES & STRUCTURE

  .momentum/
  ├── PROJECT.md         Project vision and requirements
  ├── ROADMAP.md         Phase breakdown and progress
  ├── STATE.md           Project memory and decisions
  ├── ISSUES.md          Deferred enhancements
  ├── config.json        Configuration
  ├── phases/            Phase directories
  │   ├── 01-setup/
  │   │   ├── CONTEXT.md     Phase context (optional)
  │   │   ├── RESEARCH.md    Research findings (optional)
  │   │   ├── 01-01-PLAN.md  Execution plans
  │   │   └── 01-01-SUMMARY.md  Execution summaries
  │   └── 02-features/
  │       └── ...
  ├── checkpoints/       Rollback points
  ├── codebase/          Codebase analysis (brownfield)
  └── analytics/         Learning data

────────────────────────────────────────────────────────────────

WORKFLOW MODES

  Interactive   Confirm every major decision
  Hybrid        Confirm key decisions only (recommended)
  Autonomous    Full auto-pilot

  Change in .momentum/config.json: "workflowMode": "hybrid"

────────────────────────────────────────────────────────────────

TYPICAL WORKFLOW

  1. /mtm:init           Set up project
  2. /mtm:roadmap        Plan milestones and phases
  3. /mtm:discuss 1      (optional) Discuss first phase
  4. /mtm:plan 1         Create execution plan
  5. /mtm:execute        Execute the plan
  6. /mtm:status         Check progress
  7. Repeat 3-6 for each phase

────────────────────────────────────────────────────────────────

TIPS

  • Use /mtm:discuss before complex phases
  • Check /mtm:status between plans
  • Review /mtm:issues periodically
  • Create checkpoints before risky changes
  • Use --dry-run to preview execution

────────────────────────────────────────────────────────────────

  For more info: https://github.com/yourusername/momentum-dev
```
