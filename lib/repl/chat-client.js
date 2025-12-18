/**
 * Chat Client - Anthropic Claude API wrapper
 */

import Anthropic from '@anthropic-ai/sdk';

export class ChatClient {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
    this.systemPrompt = '';
    this.model = 'claude-sonnet-4-20250514';
    this.maxTokens = 4096;
  }

  /**
   * Set the system prompt
   * @param {string} prompt
   */
  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }

  /**
   * Set the model to use
   * @param {string} model - Model identifier
   */
  setModel(model) {
    this.model = model;
  }

  /**
   * Send messages to Claude API
   * @param {Array} messages - Array of {role, content} objects
   * @returns {Object} Response with content and metadata
   */
  async sendMessage(messages) {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content
        }))
      });

      // Extract text content
      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      return {
        content,
        stopReason: response.stop_reason,
        usage: response.usage
      };
    } catch (err) {
      // Handle specific API errors
      if (err.status === 401) {
        throw new Error('Invalid API key. Check your ANTHROPIC_API_KEY.');
      }
      if (err.status === 429) {
        throw new Error('Rate limited. Please wait before trying again.');
      }
      if (err.status === 500 || err.status === 503) {
        throw new Error('Anthropic API error. Try again later.');
      }
      if (err.status === 400) {
        throw new Error(`Bad request: ${err.message}`);
      }

      // Re-throw unknown errors
      throw err;
    }
  }

  /**
   * Send a single message (convenience method)
   * @param {string} content - User message content
   * @returns {Object} Response
   */
  async chat(content) {
    return this.sendMessage([{ role: 'user', content }]);
  }
}

export default ChatClient;
