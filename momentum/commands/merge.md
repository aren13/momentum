---
command: /merge
description: Merge worktree branches with AI-powered conflict resolution
tools:
  - Read
  - Write
  - Edit
  - Bash
arguments:
  - name: worktree
    type: string
    required: false
    description: Worktree name to merge (defaults to current worktree)
  - name: target
    type: string
    required: false
    description: Target branch to merge into (defaults to 'main')
  - name: preview
    type: boolean
    required: false
    description: Preview conflicts without merging
  - name: auto
    type: boolean
    required: false
    description: Auto-resolve conflicts when possible
  - name: strategy
    type: string
    required: false
    description: Resolution strategy (auto|ai|manual)
---

# Merge Worktree Command

You are helping merge a worktree branch back into the target branch with AI-powered conflict resolution.

## Context

**Arguments:**
- Worktree: {{worktree}} (or current worktree)
- Target: {{target}} (default: main)
- Preview: {{preview}} (default: false)
- Auto-resolve: {{auto}} (default: false)
- Strategy: {{strategy}} (default: auto)

## Workflow

### 1. Identify Worktree

If no worktree specified, detect current worktree:
```bash
git rev-parse --show-toplevel
```

If not in a worktree, list available worktrees:
```bash
git worktree list
```

### 2. Preview Conflicts (if --preview)

Use `ConflictDetector` to analyze conflicts before merging:

```javascript
import { ConflictDetector } from '../lib/core/conflict-detector.js';

const detector = new ConflictDetector();
const analysis = await detector.detectConflicts(worktreePath, targetBranch);

if (analysis.hasConflicts) {
  console.log(`\n⚠️  Conflicts Detected:\n`);
  console.log(`Total files: ${analysis.summary.totalFiles}`);
  console.log(`Trivial: ${analysis.summary.byCategory.trivial}`);
  console.log(`Moderate: ${analysis.summary.byCategory.moderate}`);
  console.log(`Complex: ${analysis.summary.byCategory.complex}`);
  console.log(`\nAverage difficulty: ${analysis.summary.averageDifficulty}/100`);
  console.log(`\nRecommendation: ${analysis.summary.recommendation}\n`);

  // Show file-by-file breakdown
  for (const file of analysis.files) {
    console.log(`\n📄 ${file.file}`);
    console.log(`   Category: ${file.category}`);
    console.log(`   Difficulty: ${file.difficulty}/100`);
    console.log(`   Conflicts: ${file.conflictCount}`);
  }
} else {
  console.log('✅ No conflicts detected - safe to merge');
}
```

**Exit after preview** - don't proceed with merge.

### 3. Attempt Merge

Use `MergeResolver` for three-tier resolution:

```javascript
import { MergeResolver } from '../lib/core/merge-resolver.js';

const resolver = new MergeResolver();
const result = await resolver.resolve(worktreePath, targetBranch);

if (result.success) {
  console.log(`✅ ${result.message}`);
  console.log(`Strategy: ${result.strategy}`);
} else {
  // Conflicts require AI resolution
  console.log(`\n⚠️  ${result.message}\n`);

  if (strategy === 'manual' || !auto) {
    // Show conflicts and exit
    for (const conflict of result.conflicts) {
      console.log(`\n📄 ${conflict.file}`);
      console.log(`   Conflicts: ${conflict.conflicts.length}`);
    }
    console.log('\nRun with --auto flag to attempt AI resolution');
    return;
  }

  // Proceed to AI resolution
  console.log('🤖 Attempting AI resolution...\n');
  // Continue to step 4
}
```

### 4. AI Resolution (if --auto or strategy=ai)

For each conflicted file, use AI to resolve:

```javascript
import { ConflictResolver } from '../lib/core/conflict-resolver.js';

const conflictResolver = new ConflictResolver();

for (const conflict of result.conflicts) {
  console.log(`\nResolving: ${conflict.file}`);

  // Generate resolution prompt
  const prompt = resolver.generateResolutionPrompt(conflict);

  // Get AI resolution
  const resolution = await conflictResolver.resolve(conflict, {
    prompt,
    worktreePath,
    targetBranch
  });

  if (resolution.success) {
    console.log(`✅ Resolved ${conflict.file}`);
  } else {
    console.log(`❌ Failed to resolve ${conflict.file}: ${resolution.error}`);
  }
}

// Show final statistics
const stats = resolver.getStats();
console.log('\n📊 Merge Statistics:');
console.log(`   Auto-resolved: ${stats.autoResolved}`);
console.log(`   AI-resolved (conflict-only): ${stats.aiResolvedConflictOnly}`);
console.log(`   AI-resolved (full-file): ${stats.aiResolvedFullFile}`);
console.log(`   Manual required: ${stats.manualRequired}`);
```

### 5. Verify and Commit

After resolution, verify the merge:

```bash
# Check for remaining conflicts
git diff --check

# Show merge status
git status

# If clean, commit merge
git commit -m "Merge worktree/{{worktree}} into {{target}}"
```

### 6. Cleanup (optional)

After successful merge:
```bash
# Return to main repo
cd /path/to/main/repo

# Delete worktree
git worktree remove .worktrees/{{worktree}}
```

## Resolution Strategies

### Auto (default)
1. Try standard git merge
2. If conflicts, use AI for moderate conflicts
3. Queue complex conflicts for review

### AI
1. Skip git auto-merge
2. Use AI for all conflicts
3. Apply resolutions immediately

### Manual
1. Detect conflicts only
2. Show conflict preview
3. Exit without resolving (user handles manually)

## Error Handling

### Merge Conflicts
- Show clear conflict locations
- Provide resolution suggestions
- Allow rollback with `git merge --abort`

### AI Resolution Failures
- Fall back to manual resolution
- Preserve original conflict markers
- Log failure reason

### Validation Errors
- Check syntax after AI resolution
- Reject invalid resolutions
- Keep conflict markers if validation fails

## Examples

**Preview conflicts:**
```bash
momentum merge --preview
```

**Auto-merge with AI:**
```bash
momentum merge --auto
```

**Merge specific worktree:**
```bash
momentum merge task-123 --target develop --auto
```

**Force manual resolution:**
```bash
momentum merge --strategy manual
```

## Success Criteria

- Clear conflict visualization
- High-quality AI resolutions
- No data loss
- Graceful error handling
- Rollback capability

---

**Remember:**
1. Always preview before merging complex changes
2. Use AI resolution for moderate conflicts
3. Manual review for complex conflicts
4. Validate all resolutions before committing
5. Provide clear feedback at each step
