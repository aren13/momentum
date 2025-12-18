---
description: Manage deferred issues and enhancements
args:
  - name: action
    description: Action (add, list, review)
    required: false
allowed_tools:
  - Read
  - Write
  - Edit
  - AskUserQuestion
---

# Issue Management

Track and manage deferred issues and enhancement ideas.

## Arguments

- `$ARGUMENTS` - Action: add, list, or review

## Commands

### /mtm:issues (no args) or /mtm:issues --list

Display all open issues:

```
╔══════════════════════════════════════════════════╗
║              DEFERRED ISSUES                      ║
╚══════════════════════════════════════════════════╝

  Open: 5 │ Resolved: 12

─── Open Issues ───────────────────────────────────

  1. [ ] Add input validation for email field
     Added: 2024-01-15 │ Phase 2

  2. [ ] Consider caching API responses
     Added: 2024-01-16 │ Phase 2

  3. [ ] Improve error messages for auth failures
     Added: 2024-01-17 │ Phase 2

  4. [ ] Add loading states to all buttons
     Added: 2024-01-18 │ Phase 3

  5. [ ] Consider dark mode support
     Added: 2024-01-18 │ Future

─── Actions ───────────────────────────────────────

  /mtm:issues --add "description"   Add new issue
  /mtm:issues --review              Review with context
```

### /mtm:issues --add "description"

Add a new issue to ISSUES.md:

1. Parse the description from arguments
2. Add to Open Issues section with date
3. Categorize if possible (current phase, future, technical debt)

Format in ISSUES.md:
```markdown
- [ ] [Description] *(Added: YYYY-MM-DD | Phase: N)*
```

### /mtm:issues --review

Interactive review of issues:

1. Load all open issues
2. Load current codebase context
3. For each issue, analyze:
   - Is it still relevant?
   - Has it been accidentally resolved?
   - Should it be addressed now?
   - Which phase does it belong to?

4. Present findings:

```
─── Issue Review ──────────────────────────────────

  Issue 1: Add input validation for email field

  Status: Still Open
  Analysis: This should be addressed in Phase 3 (UI Polish)
  Recommendation: Add to Phase 3 planning

  [Mark as resolved?] [Add to phase?] [Keep deferred?] [Skip]

─────────────────────────────────────────────────

  Issue 2: Consider caching API responses

  Status: Possibly Resolved
  Analysis: Found caching implementation in src/utils/cache.js
  Recommendation: Verify and mark resolved

  [Mark as resolved?] [Keep open?] [Skip]
```

5. After review, update ISSUES.md with changes

## ISSUES.md Format

```markdown
# Deferred Issues

> Issues discovered during development that are deferred for later.

## Open Issues

### High Priority
- [ ] [Issue] *(Added: date | Phase: N)*

### Normal Priority
- [ ] [Issue] *(Added: date | Phase: N)*

### Future Considerations
- [ ] [Issue] *(Added: date)*

## Resolved Issues

### Phase 2
- [x] [Issue] *(Resolved: date)*

### Phase 1
- [x] [Issue] *(Resolved: date)*

---

*Auto-updated by Momentum*
```

## Issue Categories

During add/review, categorize issues:

- **High Priority**: Security, critical bugs, blockers
- **Normal Priority**: Enhancements, minor bugs, UX improvements
- **Future**: Nice-to-have, major features, architectural changes
- **Technical Debt**: Code quality, refactoring, performance

## Integration with Planning

When running /mtm:plan, check ISSUES.md for:
- Issues tagged to current phase
- High priority issues that should be addressed
- Suggest including relevant issues in the plan
