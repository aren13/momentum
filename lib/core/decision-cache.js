/**
 * DecisionCache - Cache decisions to avoid redundant work
 *
 * Hashes context and questions to create deterministic cache keys,
 * stores decisions with TTL-based expiration.
 */

import crypto from 'crypto';

export class DecisionCache {
  constructor(memoryStore, ttlHours = 24) {
    this.store = memoryStore;
    this.ttl = ttlHours * 60 * 60 * 1000; // Convert to milliseconds
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Cache a decision
   * @param {object} context - Context object
   * @param {string} question - The question asked
   * @param {string} answer - The answer given
   * @returns {object} The cached decision
   */
  async cacheDecision(context, question, answer) {
    const decision = await this.store.cacheDecision(context, question, answer);
    return decision;
  }

  /**
   * Get cached decision
   * @param {object} context - Context object
   * @param {string} question - The question
   * @returns {string|null} The cached answer or null
   */
  async getCachedDecision(context, question) {
    const cached = await this.store.getCachedDecision(context, question);

    if (!cached) {
      this.missCount++;
      return null;
    }

    // Check TTL
    const age = Date.now() - new Date(cached.timestamp).getTime();
    if (age > this.ttl) {
      await this.invalidate(cached.context_hash);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return cached.answer;
  }

  /**
   * Invalidate cache entry
   * @param {string} contextHash - The context hash to invalidate
   */
  async invalidate(contextHash) {
    await this.store.deleteCachedDecision(contextHash);
  }

  /**
   * Invalidate by context and question
   * @param {object} context - Context object
   * @param {string} question - The question
   */
  async invalidateByContext(context, question) {
    const hash = this.store.hashContext(context, question);
    await this.invalidate(hash);
  }

  /**
   * Clear expired cache entries
   * @returns {number} Number of entries cleared
   */
  async clearExpired() {
    const cutoff = new Date(Date.now() - this.ttl);
    const beforeCount = await this.store.countDecisions();

    await this.store.deleteExpiredDecisions(cutoff);

    const afterCount = await this.store.countDecisions();
    return beforeCount - afterCount;
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  async getStats() {
    const total = await this.store.countDecisions();
    const hitRate = this.hitCount + this.missCount > 0
      ? this.hitCount / (this.hitCount + this.missCount)
      : 0;

    // Calculate average age
    const decisions = await this.store.data.decisions || [];
    let totalAge = 0;
    for (const decision of decisions) {
      const age = Date.now() - new Date(decision.timestamp).getTime();
      totalAge += age;
    }
    const avgAge = decisions.length > 0 ? totalAge / decisions.length : 0;

    // Estimate size
    const size = await this.estimateSize();

    return {
      total,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate,
      avgAge: Math.floor(avgAge / (1000 * 60)), // Convert to minutes
      avgAgeFormatted: this.formatDuration(avgAge),
      size,
      sizeFormatted: this.formatBytes(size),
      ttl: this.ttl,
      ttlFormatted: `${this.ttl / (1000 * 60 * 60)} hours`
    };
  }

  /**
   * Estimate cache size in bytes
   * @returns {number} Estimated size
   */
  async estimateSize() {
    await this.store.init();

    const decisions = this.store.data.decisions || [];
    const json = JSON.stringify(decisions);
    return Buffer.byteLength(json, 'utf8');
  }

  /**
   * Calculate hit rate since last reset
   * @returns {number} Hit rate (0-1)
   */
  calculateHitRate() {
    const total = this.hitCount + this.missCount;
    return total > 0 ? this.hitCount / total : 0;
  }

  /**
   * Calculate average age of cached decisions
   * @returns {number} Average age in milliseconds
   */
  async calculateAverageAge() {
    await this.store.init();

    const decisions = this.store.data.decisions || [];
    if (decisions.length === 0) return 0;

    let totalAge = 0;
    for (const decision of decisions) {
      const age = Date.now() - new Date(decision.timestamp).getTime();
      totalAge += age;
    }

    return totalAge / decisions.length;
  }

  /**
   * Reset hit/miss counters
   */
  resetCounters() {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Set TTL
   * @param {number} ttlHours - TTL in hours
   */
  setTTL(ttlHours) {
    this.ttl = ttlHours * 60 * 60 * 1000;
  }

  /**
   * Warm up cache with common decisions
   * @param {array} commonDecisions - Array of {context, question, answer}
   */
  async warmUp(commonDecisions) {
    for (const { context, question, answer } of commonDecisions) {
      await this.cacheDecision(context, question, answer);
    }
  }

  /**
   * Get cache hit rate by context type
   * @returns {object} Hit rates by type
   */
  async getHitRateByType() {
    await this.store.init();

    const decisions = this.store.data.decisions || [];
    const typeStats = {};

    for (const decision of decisions) {
      const contextType = decision.context?.type || 'unknown';

      if (!typeStats[contextType]) {
        typeStats[contextType] = {
          total: 0,
          hits: 0
        };
      }

      typeStats[contextType].total++;
    }

    // Calculate rates
    for (const type of Object.keys(typeStats)) {
      const stats = typeStats[type];
      stats.hitRate = stats.total > 0 ? stats.hits / stats.total : 0;
    }

    return typeStats;
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

  /**
   * Format duration to human readable string
   * @param {number} ms - Milliseconds
   * @returns {string} Formatted string
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  /**
   * Prune cache to keep only most recent N entries
   * @param {number} maxEntries - Maximum number of entries to keep
   */
  async prune(maxEntries = 1000) {
    await this.store.init();

    const decisions = this.store.data.decisions || [];

    if (decisions.length <= maxEntries) {
      return 0;
    }

    // Sort by timestamp (newest first)
    decisions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Keep only the most recent entries
    const pruned = decisions.length - maxEntries;
    this.store.data.decisions = decisions.slice(0, maxEntries);

    await this.store.save();
    return pruned;
  }

  /**
   * Get most frequently accessed decisions
   * @param {number} limit - Number of decisions to return
   * @returns {array} Most frequent decisions
   */
  async getMostFrequent(limit = 10) {
    await this.store.init();

    const decisions = this.store.data.decisions || [];

    // Note: We don't track access frequency in the current implementation
    // This would return most recent as a proxy for "most frequent"
    return decisions
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Export cache statistics report
   * @returns {object} Detailed statistics report
   */
  async getDetailedReport() {
    const stats = await this.getStats();
    const hitRateByType = await getHitRateByType();

    return {
      summary: stats,
      byType: hitRateByType,
      performance: {
        hitRate: this.calculateHitRate(),
        totalRequests: this.hitCount + this.missCount,
        cacheEfficiency: this.calculateEfficiency()
      },
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * Calculate cache efficiency
   * @returns {number} Efficiency score (0-1)
   */
  calculateEfficiency() {
    // Efficiency is hit rate weighted by cache size
    const hitRate = this.calculateHitRate();
    // Lower size = better efficiency
    const sizeFactor = 0.5; // Placeholder

    return hitRate * (1 - sizeFactor);
  }

  /**
   * Generate recommendations based on cache stats
   * @param {object} stats - Cache statistics
   * @returns {array} Array of recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.hitRate < 0.3) {
      recommendations.push('Low hit rate - consider increasing TTL or caching more decision types');
    }

    if (stats.total > 10000) {
      recommendations.push('Large cache size - consider pruning old entries');
    }

    if (stats.avgAge > 7 * 24 * 60 * 60 * 1000) { // 7 days
      recommendations.push('Old cache entries detected - run clearExpired to clean up');
    }

    return recommendations;
  }
}

export default DecisionCache;
