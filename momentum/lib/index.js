/**
 * Momentum - Intelligent Project Management for AI-Assisted Development
 *
 * A meta-prompting, context engineering, and spec-driven development system
 * with parallel execution, smart learning, and multi-model support.
 */

export { ProjectManager } from './core/project.js';
export { RoadmapManager } from './core/roadmap.js';
export { PlanExecutor } from './core/executor.js';
export { ProgressTracker } from './core/progress.js';
export { ContextEngine } from './core/context.js';

export * as display from './utils/display.js';
export * as validate from './utils/validate.js';

export const VERSION = '1.0.0';
