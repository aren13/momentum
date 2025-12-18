/**
 * AgentBus - Event-based message passing between agents
 */
import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

export class AgentBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.persistPath = options.persistPath || '.momentum/messages';
    this.messages = [];
    this.messageId = 0;
    this.subscribers = new Map();

    // Ensure persist directory exists
    if (!existsSync(this.persistPath)) {
      mkdirSync(this.persistPath, { recursive: true });
    }

    this.loadPersistedMessages();
  }

  /**
   * Broadcast message to all agents
   */
  broadcast(fromAgent, message) {
    const msg = {
      id: ++this.messageId,
      from: fromAgent,
      to: 'all',
      message,
      timestamp: Date.now(),
      type: 'broadcast'
    };

    this.messages.push(msg);
    this.persist(msg);
    this.emit('message', msg);
    this.emit('broadcast', msg);

    return msg.id;
  }

  /**
   * Send message to specific agent
   */
  send(fromAgent, toAgent, message) {
    const msg = {
      id: ++this.messageId,
      from: fromAgent,
      to: toAgent,
      message,
      timestamp: Date.now(),
      type: 'direct'
    };

    this.messages.push(msg);
    this.persist(msg);
    this.emit('message', msg);
    this.emit(`message:${toAgent}`, msg);

    return msg.id;
  }

  /**
   * Subscribe to messages for specific agent
   */
  onMessage(agentId, callback) {
    const handler = (msg) => {
      if (msg.to === agentId || msg.to === 'all') {
        callback(msg);
      }
    };

    this.on('message', handler);
    this.subscribers.set(agentId, handler);

    return () => this.off('message', handler);
  }

  /**
   * Get all messages for an agent
   */
  getMessages(agentId, options = {}) {
    let filtered = this.messages.filter(
      msg => msg.to === agentId || msg.to === 'all'
    );

    if (options.since) {
      filtered = filtered.filter(msg => msg.timestamp > options.since);
    }

    if (options.from) {
      filtered = filtered.filter(msg => msg.from === options.from);
    }

    if (options.type) {
      filtered = filtered.filter(msg => msg.type === options.type);
    }

    return filtered;
  }

  /**
   * Get message history
   */
  getHistory(limit = 100) {
    return this.messages.slice(-limit);
  }

  /**
   * Clear all messages
   */
  clear() {
    this.messages = [];
    this.messageId = 0;
  }

  /**
   * Persist message to disk
   */
  persist(message) {
    const filepath = join(this.persistPath, `${message.id}.json`);
    writeFileSync(filepath, JSON.stringify(message, null, 2));
  }

  /**
   * Load persisted messages from disk
   */
  loadPersistedMessages() {
    if (!existsSync(this.persistPath)) {
      return;
    }

    try {
      const files = readdirSync(this.persistPath);
      const messages = files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const content = readFileSync(join(this.persistPath, f), 'utf8');
            return JSON.parse(content);
          } catch {
            return null;
          }
        })
        .filter(m => m !== null)
        .sort((a, b) => a.id - b.id);

      this.messages = messages;
      this.messageId = messages.length > 0
        ? Math.max(...messages.map(m => m.id))
        : 0;
    } catch (err) {
      // Directory doesn't exist or can't be read, start fresh
      this.messages = [];
      this.messageId = 0;
    }
  }

  /**
   * Clean up old messages
   */
  cleanup(olderThan = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - olderThan;
    this.messages = this.messages.filter(msg => msg.timestamp > cutoff);
  }
}

export default AgentBus;
