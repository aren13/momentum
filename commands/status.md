---
description: Show project status with visual dashboard
allowed_tools:
  - Read
  - Glob
  - Bash
---

# Project Status

Display comprehensive project status with visual progress tracking.

## Pre-flight Check

Verify `.momentum/` directory exists.

If not:
```
No Momentum project found in this directory.
Run /mtm:init to initialize a new project.
```

## Process

### Step 1: Load Project Data

Read all relevant files:
- `.momentum/PROJECT.md` - Project info
- `.momentum/ROADMAP.md` - Phase breakdown
- `.momentum/STATE.md` - Current position
- `.momentum/ISSUES.md` - Open issues
- `.momentum/phases/*/` - Phase progress

### Step 2: Calculate Progress

For each phase:
- Count PLAN.md files
- Count SUMMARY.md files (completed plans)
- Calculate completion percentage

Overall:
- Total plans across all phases
- Total completed plans
- Overall percentage

### Step 3: Generate Dashboard

Display in this format:

```
╔══════════════════════════════════════════════════╗
║              MOMENTUM STATUS                      ║
╚══════════════════════════════════════════════════╝

  📦 Project Name
  Milestone: MVP

  ████████████░░░░░░░░░░░░░░░░░░ 40%
  8/20 plans completed

─── Phases ────────────────────────────────────────

  ✓ Phase 1: Setup & Foundation
    3/3 plans │ ████████████████████ │ 100%

  ● Phase 2: Core Features
    2/5 plans │ ████████░░░░░░░░░░░░ │ 40%
    → Currently executing: 02-03-PLAN.md

  ○ Phase 3: UI/UX Polish
    0/4 plans │ ░░░░░░░░░░░░░░░░░░░░ │ 0%

  ○ Phase 4: Testing & Launch
    3/8 plans │ ░░░░░░░░░░░░░░░░░░░░ │ 0%
    📝 Has context file

─── Recent Activity ───────────────────────────────

  • 02-02-SUMMARY.md - Completed 2h ago
    Tasks: 4/4 | Duration: 12m

  • 02-01-SUMMARY.md - Completed yesterday
    Tasks: 3/3 | Duration: 8m

─── Current Position ──────────────────────────────

  Phase: 2 - Core Features
  Plan: 02-03-PLAN.md (ready to execute)
  Status: Ready

─── Open Issues ───────────────────────────────────

  ⚠ 3 deferred issues
  Run /mtm:issues to review

─── Next Steps ────────────────────────────────────

  → Run /mtm:execute to continue Phase 2
    or /mtm:plan 2 to create next plan

```

### Step 4: Smart Routing

Based on current state, suggest the most logical next action:

| State | Suggestion |
|-------|------------|
| No roadmap | `/mtm:roadmap` |
| Phase has no plans | `/mtm:plan [phase]` |
| Has unexecuted plan | `/mtm:execute` |
| Phase complete, next not started | `/mtm:plan [next]` |
| All phases complete | `/mtm:milestone --new` |
| Has blockers | Address blockers first |
| Many open issues | `/mtm:issues --review` |

## Output Sections

### Header
- Project name
- Current milestone
- Overall progress bar

### Phases
For each phase show:
- Status icon: ✓ (complete), ● (in progress), ○ (pending)
- Phase name
- Plan count (completed/total)
- Progress bar
- Special indicators (📝 has context, 🔬 has research)

### Recent Activity
- Last 2-3 completed summaries
- Task counts and durations

### Current Position
- Current phase and plan
- Execution status

### Open Issues
- Count of deferred issues
- Prompt to review if many

### Next Steps
- Clear actionable recommendation
- Alternative actions

## Flags

### --detailed
Show additional information:
- Full recent activity (last 5)
- Key decisions from STATE.md
- Blockers if any

### --json
Output as JSON for programmatic use:
```json
{
  "project": "Name",
  "milestone": "MVP",
  "phases": [
    {"name": "Phase 1", "plans": 3, "completed": 3, "progress": 100}
  ],
  "totalPlans": 20,
  "completedPlans": 8,
  "progress": 40,
  "openIssues": 3,
  "currentPhase": 2,
  "nextAction": "execute"
}
```

### --phase [N]
Show detailed status for specific phase:
- All plans in phase
- Each plan's status
- Summary excerpts
