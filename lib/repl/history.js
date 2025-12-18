/**
 * Conversation History Manager
 * Manages multi-turn conversation state with token limit management
 */

export class ConversationHistory {
  constructor(options = {}) {
    this.messages = [];
    this.maxMessages = options.maxMessages || 50;
    this.maxTokensEstimate = options.maxTokens || 100000;
  }

  /**
   * Add a message to history
   * @param {string} role - 'user', 'assistant', or 'system'
   * @param {string} content - Message content
   */
  addMessage(role, content) {
    this.messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    this.trimIfNeeded();
  }

  /**
   * Get messages formatted for API
   * @returns {Array} Messages with role and content
   */
  getMessages() {
    return this.messages.map(({ role, content }) => ({ role, content }));
  }

  /**
   * Clear all conversation history
   */
  clear() {
    this.messages = [];
  }

  /**
   * Trim history if exceeding limits
   */
  trimIfNeeded() {
    // Trim by message count
    if (this.messages.length > this.maxMessages) {
      const systemMsgs = this.messages.filter(m => m.role === 'system');
      const otherMsgs = this.messages.filter(m => m.role !== 'system');

      const keepCount = this.maxMessages - systemMsgs.length;
      this.messages = [...systemMsgs, ...otherMsgs.slice(-keepCount)];
    }

    // Trim by estimated token count
    while (this.estimateTokens() > this.maxTokensEstimate && this.messages.length > 2) {
      const idx = this.messages.findIndex(m => m.role !== 'system');
      if (idx >= 0) {
        this.messages.splice(idx, 1);
      } else {
        break;
      }
    }
  }

  /**
   * Estimate token count (rough: 1 token ~ 4 chars)
   * @returns {number} Estimated token count
   */
  estimateTokens() {
    const totalChars = this.messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.round(totalChars / 4);
  }

  /**
   * Get the last user message
   * @returns {string|null}
   */
  getLastUserMessage() {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') {
        return this.messages[i].content;
      }
    }
    return null;
  }

  /**
   * Get conversation summary stats
   * @returns {Object}
   */
  getSummary() {
    return {
      messageCount: this.messages.length,
      estimatedTokens: this.estimateTokens(),
      roles: {
        user: this.messages.filter(m => m.role === 'user').length,
        assistant: this.messages.filter(m => m.role === 'assistant').length,
        system: this.messages.filter(m => m.role === 'system').length
      }
    };
  }
}
