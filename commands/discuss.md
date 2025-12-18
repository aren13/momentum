---
description: Capture vision for a phase before planning
args:
  - name: phase
    description: Phase number to discuss
    required: true
allowed_tools:
  - Read
  - Write
  - AskUserQuestion
---

# Discuss Phase

Capture your vision and requirements for a phase before creating execution plans.

## Arguments

- `$ARGUMENTS` - Phase number to discuss

## Purpose

This is the most leveraged moment before planning. Deep discussion here means:
- Better execution plans
- Fewer surprises
- More accurate task breakdown

## Process

### Step 1: Validate Phase

1. Read `.momentum/ROADMAP.md`
2. Verify phase exists
3. Get phase name and description

### Step 2: Show Phase Context

Display:
```
╔══════════════════════════════════════════════════╗
║          PHASE DISCUSSION                        ║
╚══════════════════════════════════════════════════╝

  Phase [N]: [Phase Name]
  ─────────────────────────────────────────────────
  [Description from roadmap]

  Deliverables:
  - [Deliverable 1]
  - [Deliverable 2]

```

### Step 3: Vision Capture

Ask the user these questions ONE AT A TIME:

**Vision:**
- "How do you imagine this phase working when it's complete?"
- "Walk me through the user experience / flow"

**Requirements:**
- "What are the absolute must-haves for this phase?"
- "What features would be nice-to-have but not essential?"

**Technical:**
- "Any specific technical approaches you want to use?"
- "Any approaches you want to avoid?"

**Boundaries:**
- "What is explicitly NOT part of this phase?"
- "Any edge cases we should handle? Any we should ignore?"

**Unknowns:**
- "What questions or unknowns do you have?"
- "Anything you need to research first?"

### Step 4: Create CONTEXT.md

Write `.momentum/phases/XX-name/CONTEXT.md`:

```markdown
# Phase [N] Context

> Captured: [date]

## Vision

[User's description of how they imagine it working]

## Essential Requirements

- [Must-have 1]
- [Must-have 2]

## Nice-to-Have

- [Nice-to-have 1]

## Technical Approach

### Preferred
- [Approach to use]

### Avoid
- [Approach to avoid]

## Boundaries

### In Scope
- [In scope item]

### Out of Scope
- [Out of scope item]

## Edge Cases

### Handle
- [Edge case to handle]

### Ignore
- [Edge case to ignore for now]

## Open Questions

- [Question 1]
- [Question 2]

## Research Needed

- [Topic to research]

---

*This context informs all plans for Phase [N]*
```

### Step 5: Update STATE.md

Add entry to Key Decisions section noting discussion was completed.

### Step 6: Commit

```bash
git add .momentum/phases/XX-name/CONTEXT.md
git commit -m "docs: capture context for phase [N]"
```

### Step 7: Next Steps

```
✓ Phase [N] context captured!

  Created: .momentum/phases/XX-name/CONTEXT.md

  This context will inform all execution plans for this phase.

  Next options:
    /mtm:research [N]   Deep research for complex domains
    /mtm:plan [N]       Create execution plan
    /mtm:status         View overall progress
```

## Tips for Good Discussions

- Be specific about user flows
- Name concrete examples
- Identify technical constraints early
- Mark unknowns for research
- Set clear boundaries
