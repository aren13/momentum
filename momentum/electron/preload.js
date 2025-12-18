import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Secure bridge between main and renderer processes
 * Exposes a limited, secure API to the renderer process via contextBridge
 */

// Event emitter for agent events
const eventHandlers = new Map();

// Listen for agent events from main process
ipcRenderer.on('agent:start', (event, data) => {
  const handlers = eventHandlers.get('agent:start') || [];
  handlers.forEach(handler => handler(event, data));
});

ipcRenderer.on('agent:end', (event, data) => {
  const handlers = eventHandlers.get('agent:end') || [];
  handlers.forEach(handler => handler(event, data));
});

ipcRenderer.on('agent:output', (event, data) => {
  const handlers = eventHandlers.get('agent:output') || [];
  handlers.forEach(handler => handler(event, data));
});

ipcRenderer.on('roadmap:changed', (event, data) => {
  const handlers = eventHandlers.get('roadmap:changed') || [];
  handlers.forEach(handler => handler(event, data));
});

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

  // ═══════════════════════════════════════════════════════════════════════════
  // KANBAN BOARD
  // ═══════════════════════════════════════════════════════════════════════════

  updateTaskStatus: (taskId, status) => ipcRenderer.invoke('momentum:updateTaskStatus', { taskId, status }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTEXT INSPECTOR
  // ═══════════════════════════════════════════════════════════════════════════

  getContext: () => ipcRenderer.invoke('momentum:getContext'),

  addToContext: (filePath) => ipcRenderer.invoke('momentum:addToContext', filePath),

  removeFromContext: (filePath) => ipcRenderer.invoke('momentum:removeFromContext', filePath),

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT EMITTER
  // ═══════════════════════════════════════════════════════════════════════════

  on: (eventName, handler) => {
    if (!eventHandlers.has(eventName)) {
      eventHandlers.set(eventName, []);
    }
    eventHandlers.get(eventName).push(handler);
  },

  off: (eventName, handler) => {
    if (!eventHandlers.has(eventName)) return;
    const handlers = eventHandlers.get(eventName);
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  },

});

console.log('Preload script loaded - Momentum API available');
