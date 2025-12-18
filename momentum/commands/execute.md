---
description: Execute a plan with intelligent strategies
args:
  - name: path
    description: Path to PLAN.md file (optional, auto-detects next plan)
    required: false
allowed_tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

# Execute Plan

Execute a PLAN.md file with intelligent strategy selection.

## Arguments

- `$ARGUMENTS` - Path to plan file (optional)

## Pre-flight Checks

1. Verify `.momentum/` exists
2. Find or validate plan file
3. Check plan hasn't already been executed (no SUMMARY.md)
4. Load workflow configuration

## Process

### Step 1: Locate Plan

If path provided:
- Validate file exists
- Confirm it's a PLAN.md file

If no path:
- Find next unexecuted plan:
  ```bash
  # Find plans without corresponding summaries
  for plan in .momentum/phases/*/*-PLAN.md; do
    summary="${plan/-PLAN.md/-SUMMARY.md}"
    [ ! -f "$summary" ] && echo "$plan" && break
  done
  ```

### Step 2: Check Execution Status

```bash
ls "${PLAN_PATH/-PLAN.md/-SUMMARY.md}" 2>/dev/null
```

If SUMMARY.md exists:
- Ask: "This plan was already executed. View summary, re-execute, or cancel?"

### Step 3: Load Full Context

Read and synthesize:
1. The PLAN.md file
2. `.momentum/PROJECT.md`
3. `.momentum/STATE.md`
4. `.momentum/config.json`
5. Previous summaries in same phase
6. Relevant codebase files mentioned in plan

### Step 4: Determine Execution Strategy

Based on plan analysis:

**Strategy A - Autonomous (Subagent)**
Use when:
- No checkpoints in plan
- All tasks are straightforward
- Low risk of needing decisions

Execute via Task tool with full context delegation.

**Strategy B - Segmented**
Use when:
- Plan has verification checkpoints
- Some tasks need confirmation

Execute in segments, pause at checkpoints.

**Strategy C - Main Context**
Use when:
- Tasks require frequent decisions
- High complexity or risk
- Need to maintain conversation context

Execute directly in main context.

### Step 5: Create Checkpoint

Before executing:
```bash
mkdir -p .momentum/checkpoints/pre-$(basename $PLAN_PATH .md)
git rev-parse HEAD > .momentum/checkpoints/pre-$(basename $PLAN_PATH .md)/commit
```

### Step 6: Execute Tasks

For each task in the plan:

1. **Announce task:**
   ```
   ● Task 1/N: [Task Name]
   ```

2. **Execute steps:**
   - Read/modify files as specified
   - Follow task steps exactly
   - Handle errors gracefully

3. **Verify task:**
   - Check verification criteria
   - If failed, attempt fix or ask user

4. **Update progress:**
   ```
   ✓ Task 1/N: [Task Name] - Complete
   ```

5. **Handle checkpoints:**
   - If checkpoint reached, pause and ask user to verify
   - Show what was done, ask to continue

### Step 7: Handle Deviations

During execution, you may need to deviate from the plan:

**Auto-handle:**
- Bug fixes discovered during implementation
- Minor security improvements
- Obvious missing error handling

**Ask user:**
- Architectural changes
- Scope changes
- Major deviations from plan

**Log for later:**
- Enhancement ideas → ISSUES.md
- Technical debt → ISSUES.md

### Step 8: Generate SUMMARY.md

After all tasks complete, create `XX-YY-SUMMARY.md`:

```markdown
# Execution Summary

> [Plan objective]

## Results

- **Status:** ✅ Success / ⚠️ Partial / ❌ Failed
- **Duration:** [time]
- **Tasks:** [completed]/[total]

## Task Details

### Task 1: [Name]
- **Status:** ✅ Complete
- **Changes:**
  - Created `src/file.js`
  - Modified `src/other.js`
- **Notes:** [any notes]

[Repeat for each task]

## Files Changed

- `src/file1.js` - Created
- `src/file2.js` - Modified (added function X)
- `src/file3.js` - Modified (fixed bug Y)

## Verification Results

- [x] All tasks completed
- [x] No regressions
- [x] Tests pass
- [ ] [Any failed verification]

## Deviations from Plan

[List any deviations and why]

## Issues Discovered

[Any issues added to ISSUES.md]

## Next Steps

[What should happen next]

---

*Executed by Momentum at [timestamp]*
```

### Step 9: Update STATE.md

Add to session history:
```markdown
### [Date] - Plan Executed

- Executed: [plan name]
- Tasks: [N]/[N] completed
- Key changes: [summary]
```

### Step 10: Git Commit

Stage files individually (never `git add .`):

```bash
git add src/file1.js src/file2.js
git add .momentum/phases/XX-name/XX-YY-SUMMARY.md
git add .momentum/STATE.md
git commit -m "feat: [objective summary]"
```

### Step 11: Output

```
✓ Plan executed successfully!

Duration: [time]
Tasks: [N]/[N] completed

Changes:
  + src/new-file.js (created)
  ~ src/modified.js (modified)

Next: Run /mtm:status to see overall progress
   or Run /mtm:execute to run the next plan
```

## Error Handling

If a task fails:

1. Log the error
2. Check if it's recoverable
3. If recoverable: attempt fix, retry
4. If not:
   - In interactive mode: ask user what to do
   - In autonomous mode: pause and report

Options for user:
- Retry task
- Skip task (mark as skipped)
- Abort execution (checkpoint exists for rollback)
- Manual intervention then continue

## Parallel Execution

When tasks can run in parallel:

1. Identify independent tasks (no shared files, no dependencies)
2. Group into parallel batches
3. Execute batch with Task tool for each task
4. Wait for all to complete
5. Verify all succeeded
6. Continue to next batch

```
Executing in parallel:
  ├─ Task 2: Add component A
  ├─ Task 3: Add component B
  └─ Task 4: Add component C

[All complete]

Continuing sequentially:
  ● Task 5: Integrate components
```
