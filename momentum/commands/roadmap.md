---
description: Create or view project roadmap with phases
allowed_tools:
  - Read
  - Write
  - Bash
  - AskUserQuestion
  - Glob
---

# Roadmap Management

Create or view the project roadmap with milestones and phases.

## Pre-flight Checks

1. Verify `.momentum/PROJECT.md` exists
2. Check for existing `.momentum/ROADMAP.md`

If no PROJECT.md:
```
ERROR: No project found. Run /mtm:init first.
```

## Create New Roadmap

### Step 1: Load Project Context

Read `.momentum/PROJECT.md` to understand:
- Project goals
- Technical stack
- Scope boundaries
- Constraints

### Step 2: Define Milestone

Ask the user:
- "What is this milestone called?" (default: "MVP")
- "What does completing this milestone achieve?"
- "What's the high-level definition of done?"

### Step 3: Plan Phases

Ask the user to define phases. Guide them with:

"Let's break this milestone into phases. Each phase should be:
- Completable in a focused work session
- Have clear deliverables
- Build on previous phases

For each phase, I'll ask:
1. What it's called
2. What gets built
3. Key deliverables
4. Complexity (low/medium/high)"

Add phases until the user says they're done.

**Suggested phase structure by project type:**

For Web Apps:
1. Setup & Foundation
2. Core Features
3. UI/UX Polish
4. Testing & Launch

For APIs:
1. Setup & Architecture
2. Core Endpoints
3. Auth & Security
4. Testing & Deployment

For CLI Tools:
1. Setup & Commands
2. Core Logic
3. Error Handling
4. Documentation & Release

### Step 4: Generate ROADMAP.md

```markdown
# Project Roadmap

> Strategic breakdown of project phases and milestones.

## Milestone: [Name]

**Goal:** [Goal]
**Definition of Done:** [DoD]

---

### Phase 1: [Name]

**Description:** [Description]
**Complexity:** [Low/Medium/High]
**Status:** ⏳ Pending

**Deliverables:**
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]

**Plans:**
- *Run `/mtm:plan 1` to create execution plans*

---

[Repeat for each phase]

## Progress Tracking

| Phase | Status | Plans | Completion |
|-------|--------|-------|------------|
| 1. [Name] | Pending | 0/0 | 0% |

---

*Auto-updated by Momentum*
```

### Step 5: Create Phase Directories

```bash
mkdir -p .momentum/phases/01-[phase-name]
mkdir -p .momentum/phases/02-[phase-name]
# etc.
```

### Step 6: Initialize STATE.md

Update `.momentum/STATE.md` with current position:

```markdown
## Current Position

- **Milestone:** [Name]
- **Phase:** 1 - [First Phase Name]
- **Status:** Ready to plan
- **Total Phases:** [N]
```

### Step 7: Commit

```bash
git add .momentum/
git commit -m "chore: create project roadmap"
```

### Step 8: Next Steps

```
✓ Roadmap created with [N] phases!

Milestone: [Name]

Phases:
  1. [Phase 1]
  2. [Phase 2]
  ...

Next: Run /mtm:plan 1 to create the execution plan for Phase 1
```

## View Existing Roadmap

If ROADMAP.md exists and user didn't specify --create:

1. Read and display the roadmap
2. Show progress summary
3. Highlight current phase
4. Suggest next action

## Output Format

Display phases with visual progress:

```
📍 Milestone: MVP

  ████████░░░░░░░░░░░░ 40%
  4/10 plans completed

  ✓ Phase 1: Setup & Foundation (Complete)
  ● Phase 2: Core Features (In Progress - 2/3 plans)
  ○ Phase 3: UI/UX Polish (Pending)
  ○ Phase 4: Testing & Launch (Pending)

  Next: Run /mtm:execute to continue Phase 2
```
