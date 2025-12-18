/**
 * MemoryStore - Portable memory persistence using JSON
 *
 * Stores patterns, decisions, executions, and file metadata in JSON format
 * for zero-dependency portability across systems.
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class MemoryStore {
  constructor(dbPath = '.momentum/memory.json') {
    this.dbPath = dbPath;
    this.data = {
      patterns: [],
      decisions: [],
      executions: [],
      files: [],
      version: 1
    };
    this.loaded = false;
  }

  /**
   * Initialize the memory store
   * Loads existing data or creates new database
   */
  async init() {
    if (this.loaded) return;

    // Ensure .momentum directory exists
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });

    // Load existing data if it exists
    try {
      const content = await fs.readFile(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);

      // Ensure all required tables exist
      this.data.patterns = this.data.patterns || [];
      this.data.decisions = this.data.decisions || [];
      this.data.executions = this.data.executions || [];
      this.data.files = this.data.files || [];
      this.data.version = this.data.version || 1;
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      await this.save();
    }

    this.loaded = true;
  }

  /**
   * Save data to disk
   */
  async save() {
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // ============================================================
  // PATTERNS
  // ============================================================

  /**
   * Add or update a pattern
   * @param {string} type - Pattern type (file-structure, naming-convention, etc.)
   * @param {string} pattern - The pattern content
   * @returns {object} The pattern record
   */
  async addPattern(type, pattern) {
    await this.init();

    // Check if pattern already exists
    const existing = this.data.patterns.find(
      p => p.type === type && p.pattern === pattern
    );

    if (existing) {
      // Increment frequency and update timestamp
      existing.frequency++;
      existing.last_seen = new Date().toISOString();
      await this.save();
      return existing;
    }

    // Create new pattern
    const newPattern = {
      id: this.generateId(),
      type,
      pattern,
      frequency: 1,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    this.data.patterns.push(newPattern);
    await this.save();
    return newPattern;
  }

  /**
   * Get patterns by type
   * @param {string} type - Pattern type to filter by
   * @param {number} limit - Maximum number of patterns to return
   * @returns {array} Array of patterns
   */
  async getPatterns(type = null, limit = 10) {
    await this.init();

    let patterns = this.data.patterns;

    // Filter by type if specified
    if (type) {
      patterns = patterns.filter(p => p.type === type);
    }

    // Sort by frequency (descending) and recency
    patterns = patterns.sort((a, b) => {
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return new Date(b.last_seen) - new Date(a.last_seen);
    });

    return patterns.slice(0, limit);
  }

  /**
   * Find similar patterns using fuzzy matching
   * @param {string} pattern - Pattern to match against
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {array} Array of similar patterns
   */
  async findSimilarPatterns(pattern, threshold = 0.7) {
    await this.init();

    const similar = this.data.patterns
      .map(p => ({
        ...p,
        similarity: this.calculateSimilarity(pattern, p.pattern)
      }))
      .filter(p => p.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return similar;
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get success rate by pattern type
   * @param {string} type - Pattern type
   * @returns {object} Success metrics
   */
  async getSuccessRate(type) {
    await this.init();

    const executions = this.data.executions.filter(e => {
      // Find executions that used patterns of this type
      return e.patterns && e.patterns.some(p => p.type === type);
    });

    const total = executions.length;
    const successful = executions.filter(e => e.success).length;

    return {
      type,
      total,
      successful,
      failed: total - successful,
      rate: total > 0 ? (successful / total) : 0
    };
  }

  // ============================================================
  // DECISIONS
  // ============================================================

  /**
   * Cache a decision
   * @param {object} context - Context object
   * @param {string} question - The question asked
   * @param {string} answer - The answer given
   * @returns {object} The decision record
   */
  async cacheDecision(context, question, answer) {
    await this.init();

    const contextHash = this.hashContext(context, question);

    const decision = {
      id: this.generateId(),
      context_hash: contextHash,
      question,
      answer,
      context,
      timestamp: new Date().toISOString()
    };

    this.data.decisions.push(decision);
    await this.save();
    return decision;
  }

  /**
   * Get cached decision
   * @param {object} context - Context object
   * @param {string} question - The question
   * @returns {object|null} The cached decision or null
   */
  async getCachedDecision(context, question) {
    await this.init();

    const contextHash = this.hashContext(context, question);

    const decision = this.data.decisions.find(
      d => d.context_hash === contextHash
    );

    return decision || null;
  }

  /**
   * Hash context for decision caching
   * @param {object} context - Context object
   * @param {string} question - The question
   * @returns {string} Hash string
   */
  hashContext(context, question) {
    const normalized = this.normalizeContext(context);
    const input = JSON.stringify({ context: normalized, question });
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Normalize context for consistent hashing
   * @param {object} context - Context object
   * @returns {object} Normalized context
   */
  normalizeContext(context) {
    if (!context || typeof context !== 'object') {
      return context;
    }

    // Clone the context
    const normalized = JSON.parse(JSON.stringify(context));

    // Remove timestamps and volatile data
    const volatileKeys = ['timestamp', 'date', 'time', 'id', 'uuid'];

    const removeVolatile = (obj) => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key of Object.keys(obj)) {
        if (volatileKeys.includes(key.toLowerCase())) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          removeVolatile(obj[key]);
        }
      }
    };

    removeVolatile(normalized);

    // Sort keys alphabetically for consistent ordering
    const sortKeys = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      }

      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = sortKeys(obj[key]);
          return sorted;
        }, {});
    };

    return sortKeys(normalized);
  }

  /**
   * Delete cached decision
   * @param {string} contextHash - The context hash to delete
   */
  async deleteCachedDecision(contextHash) {
    await this.init();

    this.data.decisions = this.data.decisions.filter(
      d => d.context_hash !== contextHash
    );

    await this.save();
  }

  /**
   * Delete expired decisions
   * @param {Date} cutoff - Delete decisions older than this date
   */
  async deleteExpiredDecisions(cutoff) {
    await this.init();

    const cutoffTime = new Date(cutoff).getTime();

    this.data.decisions = this.data.decisions.filter(d => {
      const timestamp = new Date(d.timestamp).getTime();
      return timestamp >= cutoffTime;
    });

    await this.save();
  }

  /**
   * Count total decisions
   * @returns {number} Total count
   */
  async countDecisions() {
    await this.init();
    return this.data.decisions.length;
  }

  // ============================================================
  // EXECUTIONS
  // ============================================================

  /**
   * Record an execution
   * @param {string} planPath - Path to the plan
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} success - Whether execution was successful
   * @param {array} errors - Array of error messages
   * @param {array} patterns - Patterns used in this execution
   * @returns {object} The execution record
   */
  async recordExecution(planPath, duration, success, errors = [], patterns = []) {
    await this.init();

    const execution = {
      id: this.generateId(),
      plan_path: planPath,
      duration,
      success,
      errors,
      patterns,
      timestamp: new Date().toISOString()
    };

    this.data.executions.push(execution);
    await this.save();
    return execution;
  }

  /**
   * Get execution history
   * @param {number} limit - Maximum number of records to return
   * @returns {array} Array of execution records
   */
  async getExecutionHistory(limit = 50) {
    await this.init();

    return this.data.executions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // ============================================================
  // FILES
  // ============================================================

  /**
   * Update file metadata
   * @param {string} filePath - Path to the file
   * @param {string} summary - File summary
   * @param {array} patterns - Patterns found in the file
   * @returns {object} The file record
   */
  async updateFile(filePath, summary, patterns = []) {
    await this.init();

    const summaryHash = crypto.createHash('sha256').update(summary).digest('hex');

    // Check if file already exists
    const existing = this.data.files.find(f => f.path === filePath);

    if (existing) {
      existing.last_analyzed = new Date().toISOString();
      existing.summary_hash = summaryHash;
      existing.patterns = patterns;
      await this.save();
      return existing;
    }

    // Create new file record
    const file = {
      id: this.generateId(),
      path: filePath,
      last_analyzed: new Date().toISOString(),
      summary_hash: summaryHash,
      patterns,
      created_at: new Date().toISOString()
    };

    this.data.files.push(file);
    await this.save();
    return file;
  }

  /**
   * Get file metadata
   * @param {string} filePath - Path to the file
   * @returns {object|null} The file record or null
   */
  async getFile(filePath) {
    await this.init();

    const file = this.data.files.find(f => f.path === filePath);
    return file || null;
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get overall memory statistics
   * @returns {object} Statistics object
   */
  async getStats() {
    await this.init();

    const fileSize = await this.getFileSize();

    // Count patterns by type
    const patternsByType = {};
    for (const pattern of this.data.patterns) {
      patternsByType[pattern.type] = (patternsByType[pattern.type] || 0) + 1;
    }

    // Calculate success rate
    const totalExecutions = this.data.executions.length;
    const successfulExecutions = this.data.executions.filter(e => e.success).length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) : 0;

    return {
      patterns: {
        total: this.data.patterns.length,
        byType: patternsByType,
        types: Object.keys(patternsByType).length
      },
      decisions: {
        total: this.data.decisions.length
      },
      executions: {
        total: totalExecutions,
        successful: successfulExecutions,
        failed: totalExecutions - successfulExecutions,
        successRate
      },
      files: {
        total: this.data.files.length
      },
      database: {
        size: fileSize,
        sizeFormatted: this.formatBytes(fileSize),
        lastUpdated: await this.getLastUpdated()
      },
      version: this.data.version
    };
  }

  /**
   * Get database file size
   * @returns {number} Size in bytes
   */
  async getFileSize() {
    try {
      const stats = await fs.stat(this.dbPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get last updated timestamp
   * @returns {string} ISO timestamp
   */
  async getLastUpdated() {
    try {
      const stats = await fs.stat(this.dbPath);
      return stats.mtime.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes to format
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ============================================================
  // EXPORT / IMPORT
  // ============================================================

  /**
   * Export memory to JSON
   * @returns {object} Complete memory data
   */
  async export() {
    await this.init();

    return {
      version: this.data.version,
      exported_at: new Date().toISOString(),
      patterns: this.data.patterns,
      decisions: this.data.decisions,
      executions: this.data.executions,
      files: this.data.files
    };
  }

  /**
   * Import memory from JSON
   * @param {object} importData - Data to import
   * @param {string} strategy - Merge strategy ('merge' or 'replace')
   */
  async import(importData, strategy = 'merge') {
    await this.init();

    if (strategy === 'replace') {
      // Replace all data
      this.data.patterns = importData.patterns || [];
      this.data.decisions = importData.decisions || [];
      this.data.executions = importData.executions || [];
      this.data.files = importData.files || [];
    } else {
      // Merge data

      // Merge patterns (combine frequencies)
      for (const pattern of importData.patterns || []) {
        const existing = this.data.patterns.find(
          p => p.type === pattern.type && p.pattern === pattern.pattern
        );

        if (existing) {
          existing.frequency += pattern.frequency;
          if (new Date(pattern.last_seen) > new Date(existing.last_seen)) {
            existing.last_seen = pattern.last_seen;
          }
        } else {
          this.data.patterns.push(pattern);
        }
      }

      // Merge decisions (keep newer by timestamp)
      for (const decision of importData.decisions || []) {
        const existing = this.data.decisions.find(
          d => d.context_hash === decision.context_hash
        );

        if (existing) {
          if (new Date(decision.timestamp) > new Date(existing.timestamp)) {
            Object.assign(existing, decision);
          }
        } else {
          this.data.decisions.push(decision);
        }
      }

      // Append all executions
      this.data.executions.push(...(importData.executions || []));

      // Merge files (keep newer by last_analyzed)
      for (const file of importData.files || []) {
        const existing = this.data.files.find(f => f.path === file.path);

        if (existing) {
          if (new Date(file.last_analyzed) > new Date(existing.last_analyzed)) {
            Object.assign(existing, file);
          }
        } else {
          this.data.files.push(file);
        }
      }
    }

    await this.save();
  }

  /**
   * Clear memory data
   * @param {object} options - Clear options
   */
  async clear(options = {}) {
    await this.init();

    if (options.patterns) {
      this.data.patterns = [];
    }

    if (options.decisions) {
      this.data.decisions = [];
    }

    if (options.executions) {
      this.data.executions = [];
    }

    if (options.files) {
      this.data.files = [];
    }

    if (options.all) {
      this.data.patterns = [];
      this.data.decisions = [];
      this.data.executions = [];
      this.data.files = [];
    }

    await this.save();
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }
}

export default MemoryStore;
