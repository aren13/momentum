---
description: Resume work with full context restoration
allowed_tools:
  - Read
  - Glob
  - AskUserQuestion
---

# Resume Work

Restore context and continue where you left off.

## Process

### Step 1: Load Context

Read project files:
- `.momentum/STATE.md` - Current position and history
- `.momentum/ROADMAP.md` - Phase progress
- `.continue-here` - Handoff notes (if exists)

### Step 2: Show Current Position

Display:
```
╔══════════════════════════════════════════════════╗
║              RESUMING WORK                        ║
╚══════════════════════════════════════════════════╝

  📍 Current Position
  ─────────────────────────────────────────────────
  Milestone: [name]
  Phase: [N] - [Phase Name]
  Status: [status]

  📋 Last Session
  ─────────────────────────────────────────────────
  Date: [date]
  Completed: [what was done]

  [If .continue-here exists:]
  📝 Handoff Notes
  ─────────────────────────────────────────────────
  [Contents of .continue-here]

```

### Step 3: Show Recent Progress

Display last 2-3 summaries briefly:
- What was accomplished
- Any issues noted
- Time spent

### Step 4: Analyze Next Steps

Determine what to do next:

1. **Has unexecuted plan?**
   → Suggest: "Ready to execute [plan name]. Run /mtm:execute"

2. **Phase needs more plans?**
   → Suggest: "Phase [N] needs planning. Run /mtm:plan [N]"

3. **Phase complete, next not started?**
   → Suggest: "Phase [N] complete! Start Phase [N+1] with /mtm:plan [N+1]"

4. **Has .continue-here?**
   → Show handoff notes, ask if ready to continue

5. **Has blockers in STATE.md?**
   → Show blockers, ask how to proceed

### Step 5: Offer Actions

```
─── Suggested Actions ────────────────────────────

  1. [Primary suggestion based on analysis]
  2. /mtm:status    View full dashboard
  3. /mtm:issues    Review deferred issues
  4. /mtm:context   Check context utilization

  What would you like to do?
```

### Step 6: Clean Up (Optional)

If .continue-here exists:
- Ask if they want to clear it
- If yes, delete the file
- Update STATE.md to note session resumed
