---
description: Run quality assurance checks with self-healing
arguments:
  - name: path
    description: "Path to check (default: current directory)"
    required: false
  - name: iterations
    description: "Max fix iterations (default: 10)"
    required: false
---

# QA Runner

Run automated quality checks with self-healing fixes.

## Checks Performed
1. Lint (ESLint, Ruff, etc.)
2. Type checking (TypeScript, MyPy)
3. Tests (Jest, Pytest, etc.)
4. Build verification

## Self-Healing
For fixable issues (lint, formatting), attempts automatic fixes
up to the specified iteration limit.

## Context
@momentum/lib/core/qa-runner.js

Invoke QARunner and report results.
