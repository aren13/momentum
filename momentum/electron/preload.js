import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Secure bridge between main and renderer processes
 * Exposes a limited, secure API to the renderer process via contextBridge
 */

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('momentum', {

  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  status: () => ipcRenderer.invoke('momentum:status'),

  roadmap: () => ipcRenderer.invoke('momentum:roadmap'),

  init: (name, options = {}) => ipcRenderer.invoke('momentum:init', { name, options }),

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAN EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════

  execute: (planPath, options = {}) => ipcRenderer.invoke('momentum:execute', { planPath, options }),

  plan: (action, phase, options = {}) => ipcRenderer.invoke('momentum:plan', { action, phase, options }),

  // ═══════════════════════════════════════════════════════════════════════════
  // AGENT LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  resume: (agentId) => ipcRenderer.invoke('momentum:resume', { agentId }),

  discuss: (topic, options = {}) => ipcRenderer.invoke('momentum:discuss', { topic, options }),

  // ═══════════════════════════════════════════════════════════════════════════
  // WORKTREE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  worktree: (action, name, options = {}) => ipcRenderer.invoke('momentum:worktree', { action, name, options }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUES & PHASES
  // ═══════════════════════════════════════════════════════════════════════════

  issues: (action, options = {}) => ipcRenderer.invoke('momentum:issues', { action, options }),

  phase: (action, number, options = {}) => ipcRenderer.invoke('momentum:phase', { action, number, options }),

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE SYSTEM & PROJECT INFO
  // ═══════════════════════════════════════════════════════════════════════════

  getProjectPath: () => ipcRenderer.invoke('momentum:getProjectPath'),

  setProjectPath: (path) => ipcRenderer.invoke('momentum:setProjectPath', { path }),

});

console.log('Preload script loaded - Momentum API available');
