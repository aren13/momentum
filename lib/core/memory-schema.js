/**
 * MemorySchema - Schema versioning and migration for MemoryStore
 *
 * Manages schema versions and provides migration paths for database evolution
 */

export class MemorySchema {
  constructor(memoryStore) {
    this.store = memoryStore;
    this.currentVersion = 1;
  }

  /**
   * Get schema version from database
   * @returns {number} Current schema version
   */
  async getVersion() {
    await this.store.init();
    return this.store.data.version || 0;
  }

  /**
   * Set schema version in database
   * @param {number} version - Version number to set
   */
  async setVersion(version) {
    await this.store.init();
    this.store.data.version = version;
    await this.store.save();
  }

  /**
   * Run migrations to bring database up to current version
   * @returns {object} Migration result
   */
  async migrate() {
    await this.store.init();

    const currentVersion = await this.getVersion();
    const targetVersion = this.currentVersion;

    if (currentVersion >= targetVersion) {
      return {
        migrated: false,
        from: currentVersion,
        to: currentVersion,
        message: 'Schema is up to date'
      };
    }

    // Apply migrations in order
    const migrations = [];
    for (let v = currentVersion + 1; v <= targetVersion; v++) {
      const migration = this.getMigration(v);
      if (migration) {
        await migration.up(this.store);
        migrations.push(v);
      }
    }

    // Update version
    await this.setVersion(targetVersion);

    return {
      migrated: true,
      from: currentVersion,
      to: targetVersion,
      migrations,
      message: `Migrated from v${currentVersion} to v${targetVersion}`
    };
  }

  /**
   * Get migration for a specific version
   * @param {number} version - Version number
   * @returns {object} Migration object with up/down functions
   */
  getMigration(version) {
    const migrations = {
      1: {
        name: 'Initial schema',
        up: async (store) => {
          // v1 is the initial schema, ensure all tables exist
          if (!store.data.patterns) store.data.patterns = [];
          if (!store.data.decisions) store.data.decisions = [];
          if (!store.data.executions) store.data.executions = [];
          if (!store.data.files) store.data.files = [];
          await store.save();
        },
        down: async (store) => {
          // Cannot rollback from v1
          throw new Error('Cannot rollback initial schema');
        }
      }
      // Future migrations will be added here
      // 2: {
      //   name: 'Add embeddings table',
      //   up: async (store) => {
      //     store.data.embeddings = [];
      //     await store.save();
      //   },
      //   down: async (store) => {
      //     delete store.data.embeddings;
      //     await store.save();
      //   }
      // }
    };

    return migrations[version];
  }

  /**
   * Validate schema structure
   * @returns {object} Validation result
   */
  async validate() {
    await this.store.init();

    const issues = [];

    // Check that all required tables exist
    const requiredTables = ['patterns', 'decisions', 'executions', 'files'];
    for (const table of requiredTables) {
      if (!Array.isArray(this.store.data[table])) {
        issues.push({
          severity: 'error',
          table,
          message: `Table '${table}' is missing or invalid`
        });
      }
    }

    // Check version
    if (!this.store.data.version || typeof this.store.data.version !== 'number') {
      issues.push({
        severity: 'warning',
        table: 'schema',
        message: 'Schema version is missing or invalid'
      });
    }

    // Validate pattern records
    const patternIssues = this.validatePatterns();
    issues.push(...patternIssues);

    // Validate decision records
    const decisionIssues = this.validateDecisions();
    issues.push(...decisionIssues);

    // Validate execution records
    const executionIssues = this.validateExecutions();
    issues.push(...executionIssues);

    // Validate file records
    const fileIssues = this.validateFiles();
    issues.push(...fileIssues);

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      warnings: issues.filter(i => i.severity === 'warning').length,
      errors: issues.filter(i => i.severity === 'error').length
    };
  }

  /**
   * Validate pattern records
   * @returns {array} Array of issues
   */
  validatePatterns() {
    const issues = [];
    const patterns = this.store.data.patterns || [];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];

      if (!pattern.id) {
        issues.push({
          severity: 'error',
          table: 'patterns',
          index: i,
          message: 'Pattern missing required field: id'
        });
      }

      if (!pattern.type || !pattern.pattern) {
        issues.push({
          severity: 'error',
          table: 'patterns',
          index: i,
          message: 'Pattern missing required fields: type or pattern'
        });
      }

      if (typeof pattern.frequency !== 'number' || pattern.frequency < 1) {
        issues.push({
          severity: 'warning',
          table: 'patterns',
          index: i,
          message: 'Pattern has invalid frequency'
        });
      }
    }

    return issues;
  }

  /**
   * Validate decision records
   * @returns {array} Array of issues
   */
  validateDecisions() {
    const issues = [];
    const decisions = this.store.data.decisions || [];

    for (let i = 0; i < decisions.length; i++) {
      const decision = decisions[i];

      if (!decision.id || !decision.context_hash) {
        issues.push({
          severity: 'error',
          table: 'decisions',
          index: i,
          message: 'Decision missing required fields: id or context_hash'
        });
      }

      if (!decision.question || !decision.answer) {
        issues.push({
          severity: 'warning',
          table: 'decisions',
          index: i,
          message: 'Decision missing question or answer'
        });
      }
    }

    return issues;
  }

  /**
   * Validate execution records
   * @returns {array} Array of issues
   */
  validateExecutions() {
    const issues = [];
    const executions = this.store.data.executions || [];

    for (let i = 0; i < executions.length; i++) {
      const execution = executions[i];

      if (!execution.id || !execution.plan_path) {
        issues.push({
          severity: 'error',
          table: 'executions',
          index: i,
          message: 'Execution missing required fields: id or plan_path'
        });
      }

      if (typeof execution.success !== 'boolean') {
        issues.push({
          severity: 'warning',
          table: 'executions',
          index: i,
          message: 'Execution missing or invalid success field'
        });
      }
    }

    return issues;
  }

  /**
   * Validate file records
   * @returns {array} Array of issues
   */
  validateFiles() {
    const issues = [];
    const files = this.store.data.files || [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.id || !file.path) {
        issues.push({
          severity: 'error',
          table: 'files',
          index: i,
          message: 'File missing required fields: id or path'
        });
      }
    }

    return issues;
  }

  /**
   * Repair schema issues
   * @returns {object} Repair result
   */
  async repair() {
    await this.store.init();

    const validation = await this.validate();
    const repaired = [];

    // Repair missing tables
    const requiredTables = ['patterns', 'decisions', 'executions', 'files'];
    for (const table of requiredTables) {
      if (!Array.isArray(this.store.data[table])) {
        this.store.data[table] = [];
        repaired.push(`Created missing table: ${table}`);
      }
    }

    // Set version if missing
    if (!this.store.data.version) {
      this.store.data.version = 1;
      repaired.push('Set schema version to 1');
    }

    // Remove invalid records
    const cleanTable = (tableName, validator) => {
      const table = this.store.data[tableName];
      const originalLength = table.length;
      this.store.data[tableName] = table.filter(validator);
      const removed = originalLength - this.store.data[tableName].length;
      if (removed > 0) {
        repaired.push(`Removed ${removed} invalid records from ${tableName}`);
      }
    };

    cleanTable('patterns', p => p.id && p.type && p.pattern);
    cleanTable('decisions', d => d.id && d.context_hash);
    cleanTable('executions', e => e.id && e.plan_path);
    cleanTable('files', f => f.id && f.path);

    await this.store.save();

    return {
      repaired: repaired.length > 0,
      actions: repaired,
      validation: await this.validate()
    };
  }

  /**
   * Get schema definition
   * @returns {object} Schema definition
   */
  getSchemaDefinition() {
    return {
      version: this.currentVersion,
      tables: {
        patterns: {
          fields: {
            id: 'string (unique)',
            type: 'string (indexed)',
            pattern: 'string',
            frequency: 'number',
            last_seen: 'ISO datetime',
            created_at: 'ISO datetime'
          },
          indexes: ['type'],
          unique: ['type + pattern']
        },
        decisions: {
          fields: {
            id: 'string (unique)',
            context_hash: 'string (indexed)',
            question: 'string',
            answer: 'string',
            context: 'object',
            timestamp: 'ISO datetime'
          },
          indexes: ['context_hash']
        },
        executions: {
          fields: {
            id: 'string (unique)',
            plan_path: 'string',
            duration: 'number (milliseconds)',
            success: 'boolean',
            errors: 'array',
            patterns: 'array',
            timestamp: 'ISO datetime'
          },
          indexes: ['timestamp', 'success']
        },
        files: {
          fields: {
            id: 'string (unique)',
            path: 'string (unique, indexed)',
            last_analyzed: 'ISO datetime',
            summary_hash: 'string',
            patterns: 'array',
            created_at: 'ISO datetime'
          },
          indexes: ['path'],
          unique: ['path']
        }
      }
    };
  }
}

export default MemorySchema;
