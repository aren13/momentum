/**
 * ResolutionPrompts - Context-aware prompt templates for conflict resolution
 *
 * Provides specialized prompts for different conflict types:
 * - Import conflicts
 * - Function conflicts
 * - Data structure conflicts
 * - Comment conflicts
 * - Configuration conflicts
 */

export class ResolutionPrompts {
  constructor() {
    this.projectConventions = null;
  }

  /**
   * Set project-specific conventions
   */
  setConventions(conventions) {
    this.projectConventions = conventions;
  }

  /**
   * Generate context-aware prompt for conflict type
   *
   * @param {Object} conflict - Conflict data
   * @param {Object} context - Additional context (file type, commits, etc.)
   * @returns {string} - Formatted prompt
   */
  generate(conflict, context = {}) {
    const { file, conflicts } = conflict;
    const fileType = this.detectFileType(file);
    const conflictType = this.detectConflictType(conflicts, fileType);

    // Select appropriate template
    const template = this.getTemplate(conflictType, fileType);

    // Build prompt with context
    return this.buildPrompt(template, conflict, context);
  }

  /**
   * Detect file type from filename
   */
  detectFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();

    const typeMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'css': 'css',
      'scss': 'scss',
      'html': 'html'
    };

    return typeMap[ext] || 'text';
  }

  /**
   * Detect conflict type from conflict content
   */
  detectConflictType(conflicts, fileType) {
    // Analyze all conflicts to determine primary type
    let hasImports = false;
    let hasFunctions = false;
    let hasDataStructures = false;
    let hasComments = false;
    let hasConfig = false;

    for (const c of conflicts) {
      const allLines = [...c.ours, ...c.theirs];

      // Import detection
      if (this.hasImportStatements(allLines)) {
        hasImports = true;
      }

      // Function detection
      if (this.hasFunctionDefinitions(allLines)) {
        hasFunctions = true;
      }

      // Data structure detection
      if (this.hasDataStructures(allLines)) {
        hasDataStructures = true;
      }

      // Comment detection
      if (this.hasCommentConflicts(allLines)) {
        hasComments = true;
      }

      // Config detection
      if (fileType === 'json' || fileType === 'yaml' || fileType === 'yml') {
        hasConfig = true;
      }
    }

    // Prioritize conflict type
    if (hasImports) return 'import';
    if (hasFunctions) return 'function';
    if (hasDataStructures) return 'data-structure';
    if (hasConfig) return 'configuration';
    if (hasComments) return 'comment';

    return 'general';
  }

  /**
   * Get appropriate template for conflict type
   */
  getTemplate(conflictType, fileType) {
    const templates = {
      'import': this.importTemplate,
      'function': this.functionTemplate,
      'data-structure': this.dataStructureTemplate,
      'comment': this.commentTemplate,
      'configuration': this.configurationTemplate,
      'general': this.generalTemplate
    };

    return templates[conflictType] || templates.general;
  }

  /**
   * Build complete prompt from template
   */
  buildPrompt(template, conflict, context) {
    const { file, conflicts } = conflict;
    const fileType = this.detectFileType(file);

    let prompt = template.call(this, fileType);

    // Add file context
    prompt += `\n## File Information\n\n`;
    prompt += `**File:** \`${file}\`\n`;
    prompt += `**Language:** ${fileType}\n`;
    prompt += `**Conflicts:** ${conflicts.length}\n\n`;

    // Add commit context if available
    if (context.commits) {
      prompt += `## Commit Context\n\n`;
      prompt += `**Current Branch:**\n${context.commits.ours}\n\n`;
      prompt += `**Target Branch:**\n${context.commits.theirs}\n\n`;
    }

    // Add conflict details
    prompt += this.formatConflicts(conflicts, context);

    // Add project conventions if available
    if (this.projectConventions) {
      prompt += `\n## Project Conventions\n\n`;
      prompt += this.projectConventions;
      prompt += `\n\n`;
    }

    // Add resolution guidelines
    prompt += this.getResolutionGuidelines(fileType);

    return prompt;
  }

  /**
   * Format conflicts for prompt
   */
  formatConflicts(conflicts, context) {
    let output = `## Conflicts to Resolve\n\n`;

    conflicts.forEach((c, idx) => {
      output += `### Conflict ${idx + 1}\n\n`;

      // Context before
      if (context.before && context.before[idx]) {
        output += `**Code Before Conflict:**\n\`\`\`\n${context.before[idx].join('\n')}\n\`\`\`\n\n`;
      }

      // Ours
      output += `**Current Branch (${c.base || 'ours'}):**\n\`\`\`\n${c.ours.join('\n')}\n\`\`\`\n\n`;

      // Theirs
      output += `**Target Branch (${c.theirBranch || 'theirs'}):**\n\`\`\`\n${c.theirs.join('\n')}\n\`\`\`\n\n`;

      // Context after
      if (context.after && context.after[idx]) {
        output += `**Code After Conflict:**\n\`\`\`\n${context.after[idx].join('\n')}\n\`\`\`\n\n`;
      }
    });

    return output;
  }

  /**
   * Template: Import conflicts
   */
  importTemplate(fileType) {
    return `# Merge Conflict Resolution: Import Statements

You are resolving a merge conflict involving import/require statements.

## Task

Merge import statements from both branches intelligently:

1. **Combine unique imports** - Include all unique imports from both sides
2. **Remove duplicates** - Keep only one instance of identical imports
3. **Preserve grouping** - Maintain logical grouping (external, internal, types)
4. **Sort appropriately** - Follow ${fileType} conventions for import ordering
5. **Preserve aliases** - Keep import aliases if they don't conflict

## Considerations

- Ensure all imported modules are actually used in the code
- Check for conflicting aliases (same alias for different modules)
- Maintain consistent import style (named vs default)
- Group related imports together
`;
  }

  /**
   * Template: Function conflicts
   */
  functionTemplate(fileType) {
    return `# Merge Conflict Resolution: Function Definitions

You are resolving a merge conflict involving function definitions or logic.

## Task

Analyze the intent of both changes and create a unified function that:

1. **Preserves functionality** - Maintain behavior from both branches when possible
2. **Understands intent** - Determine what each change was trying to accomplish
3. **Merges logic** - Combine logic paths appropriately
4. **Maintains signatures** - Preserve function signatures unless intentionally changed
5. **Keeps error handling** - Include error handling from both versions

## Considerations

- Are both changes fixing the same bug? (choose better fix)
- Are they adding different features? (combine features)
- Do they conflict fundamentally? (choose more complete implementation)
- Check for breaking changes in function signature
- Preserve comments explaining the logic
`;
  }

  /**
   * Template: Data structure conflicts
   */
  dataStructureTemplate(fileType) {
    return `# Merge Conflict Resolution: Data Structures

You are resolving a merge conflict involving object, array, or data structure definitions.

## Task

Merge data structures intelligently:

1. **Combine properties** - Include all unique properties/fields from both sides
2. **Resolve type conflicts** - If same field has different types, choose appropriate one
3. **Preserve defaults** - Keep default values that make sense
4. **Maintain schema** - Keep data structure valid and consistent
5. **Consider hierarchy** - Preserve nested structure from both sides

## Considerations

- Are both adding new fields? (include both)
- Are they changing the same field? (choose better change)
- Check for type compatibility
- Ensure no circular references
- Maintain data integrity
`;
  }

  /**
   * Template: Comment conflicts
   */
  commentTemplate(fileType) {
    return `# Merge Conflict Resolution: Comments

You are resolving a merge conflict involving code comments or documentation.

## Task

Merge comments and documentation:

1. **Combine information** - Include valuable information from both comments
2. **Remove redundancy** - Don't repeat the same information
3. **Preserve clarity** - Keep comments clear and concise
4. **Maintain accuracy** - Ensure comments match the actual code
5. **Follow style** - Use consistent comment style

## Considerations

- Are comments describing the same thing? (merge descriptions)
- Are they documenting different aspects? (keep both)
- Check for outdated comments
- Preserve important warnings or notes
`;
  }

  /**
   * Template: Configuration conflicts
   */
  configurationTemplate(fileType) {
    return `# Merge Conflict Resolution: Configuration

You are resolving a merge conflict in a configuration file.

## Task

Merge configuration settings:

1. **Combine settings** - Include all unique settings from both sides
2. **Prioritize correctly** - Understand which setting should take precedence
3. **Maintain validity** - Ensure resulting config is valid JSON/YAML
4. **Preserve structure** - Keep logical grouping of related settings
5. **Check dependencies** - Ensure dependent settings are consistent

## Considerations

- Are both adding new settings? (include both)
- Are they changing the same setting? (choose appropriate value)
- Check for environment-specific settings
- Maintain configuration schema
- Ensure no conflicting settings
`;
  }

  /**
   * Template: General conflicts
   */
  generalTemplate(fileType) {
    return `# Merge Conflict Resolution

You are resolving a general merge conflict.

## Task

Analyze both sides of the conflict and provide a resolution that:

1. **Understands intent** - Determine what each change was trying to accomplish
2. **Preserves functionality** - Keep working code from both branches
3. **Maintains quality** - Follow best practices for ${fileType}
4. **Ensures consistency** - Keep code style and patterns consistent
5. **Avoids bugs** - Don't introduce new issues

## Considerations

- What problem was each side trying to solve?
- Can both changes coexist?
- Which change is more complete or correct?
- Are there any side effects to consider?
`;
  }

  /**
   * Get resolution guidelines for file type
   */
  getResolutionGuidelines(fileType) {
    return `
## Resolution Guidelines

**Output Requirements:**
1. Provide ONLY the resolved code (no conflict markers)
2. Do not include markdown code fences
3. Ensure syntax is valid for ${fileType}
4. Preserve indentation and formatting
5. Include brief explanation of your resolution approach

**Quality Checks:**
- [ ] Functionality from both sides preserved when possible
- [ ] Code follows ${fileType} best practices
- [ ] No syntax errors introduced
- [ ] Consistent with surrounding code style
- [ ] Changes are well-integrated

**Important:** Your resolution will be validated for syntax and applied automatically. Make sure it is complete and correct.
`;
  }

  /**
   * Helper: Detect import statements
   */
  hasImportStatements(lines) {
    const importPattern = /^(import|from|require|using|include)\s+/;
    return lines.some(l => importPattern.test(l.trim()));
  }

  /**
   * Helper: Detect function definitions
   */
  hasFunctionDefinitions(lines) {
    const funcPattern = /function\s+\w+|=>\s*{|def\s+\w+|func\s+\w+/;
    return lines.some(l => funcPattern.test(l));
  }

  /**
   * Helper: Detect data structures
   */
  hasDataStructures(lines) {
    const structPattern = /class\s+\w+|interface\s+\w+|type\s+\w+|struct\s+\w+|{[\s\S]*:|^\s*[\w]+:/;
    return lines.some(l => structPattern.test(l));
  }

  /**
   * Helper: Detect comment-only conflicts
   */
  hasCommentConflicts(lines) {
    const commentPattern = /^[\s]*(\/\/|\/\*|\*|#|<!--)/;
    return lines.every(l => l.trim() === '' || commentPattern.test(l));
  }
}
