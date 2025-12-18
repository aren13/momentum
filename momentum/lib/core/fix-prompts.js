/**
 * Fix Prompts - AI prompt templates for different fix strategies
 */

/**
 * Get fix prompt for a specific strategy
 * @param {string} strategy - Fix strategy type
 * @param {object} details - Error details
 * @param {object} context - Fix context
 * @returns {string} Formatted prompt
 */
export function getFixPrompt(strategy, details, context) {
  const promptGenerators = {
    'lint-fix': generateLintFixPrompt,
    'type-fix': generateTypeFixPrompt,
    'test-fix': generateTestFixPrompt,
    'import-fix': generateImportFixPrompt,
    'syntax-fix': generateSyntaxFixPrompt
  };

  const generator = promptGenerators[strategy] || generateLintFixPrompt;
  return generator(details, context);
}

/**
 * Generate lint fix prompt
 */
function generateLintFixPrompt(details, context) {
  return `You are a code fixing assistant. Your task is to fix linting errors in the codebase.

## Error Details
${formatErrorDetails(details)}

## File Context
${formatFileContext(context.files)}

## Task
Analyze the linting errors and provide fixes. For each fix:
1. Identify the exact code that needs to change
2. Provide the corrected code
3. Explain why this fix resolves the error

## Output Format
Return a JSON object with this structure:
{
  "actions": [
    {
      "type": "edit",
      "file": "path/to/file.js",
      "search": "exact code to find (multi-line ok)",
      "replace": "corrected code"
    }
  ],
  "explanation": "Brief explanation of what was fixed and why"
}

## Validation Criteria
- Fixes must resolve the reported lint errors
- Code must remain functionally equivalent
- Follow the existing code style
- Don't introduce new errors

Provide only the JSON output, no additional text.`;
}

/**
 * Generate type fix prompt
 */
function generateTypeFixPrompt(details, context) {
  return `You are a code fixing assistant. Your task is to fix type errors in the codebase.

## Error Details
${formatErrorDetails(details)}

## File Context
${formatFileContext(context.files)}

## Dependencies
${formatDependencies(context.dependencies)}

## Task
Analyze the type errors and provide fixes. Common type error fixes:
- Add missing type annotations
- Fix incorrect type definitions
- Add missing imports for types
- Correct generic type parameters
- Fix interface implementations

For each fix:
1. Identify the exact cause of the type error
2. Provide the minimal fix that resolves it
3. Explain the type issue and solution

## Output Format
Return a JSON object with this structure:
{
  "actions": [
    {
      "type": "edit",
      "file": "path/to/file.js",
      "search": "exact code to find",
      "replace": "corrected code"
    }
  ],
  "explanation": "Brief explanation of the type issue and fix"
}

## Validation Criteria
- Fixes must resolve the type errors
- Type annotations must be accurate
- Don't break existing functionality
- Follow TypeScript/JSDoc best practices

Provide only the JSON output, no additional text.`;
}

/**
 * Generate test fix prompt
 */
function generateTestFixPrompt(details, context) {
  return `You are a code fixing assistant. Your task is to fix failing tests in the codebase.

## Error Details
${formatErrorDetails(details)}

## File Context
${formatFileContext(context.files)}

## Dependencies
${formatDependencies(context.dependencies)}

## Task
Analyze the test failures and provide fixes. Common test fixes:
- Update assertions to match actual behavior (if correct)
- Fix the implementation code (if test is correct)
- Update mocks or fixtures
- Fix async/await issues
- Correct test setup/teardown

For each fix:
1. Determine if the test expectation is correct
2. Identify what needs to change (test or implementation)
3. Provide the fix
4. Explain your reasoning

## Output Format
Return a JSON object with this structure:
{
  "actions": [
    {
      "type": "edit",
      "file": "path/to/file.js",
      "search": "exact code to find",
      "replace": "corrected code"
    }
  ],
  "explanation": "Brief explanation of why test failed and how fix resolves it"
}

## Validation Criteria
- Fixes must make tests pass
- Don't weaken test assertions unless justified
- Maintain test coverage
- Follow testing best practices

Provide only the JSON output, no additional text.`;
}

/**
 * Generate import fix prompt
 */
function generateImportFixPrompt(details, context) {
  return `You are a code fixing assistant. Your task is to fix import/module resolution errors.

## Error Details
${formatErrorDetails(details)}

## File Context
${formatFileContext(context.files)}

## Dependencies
${formatDependencies(context.dependencies)}

## Task
Analyze the import errors and provide fixes. Common import fixes:
- Correct import paths (relative vs absolute)
- Fix file extensions
- Add missing imports
- Fix named vs default imports
- Install missing dependencies
- Update module specifiers

For each fix:
1. Identify what module/file is missing or incorrectly imported
2. Determine the correct import statement
3. Provide the fix
4. Explain the resolution

## Output Format
Return a JSON object with this structure:
{
  "actions": [
    {
      "type": "edit",
      "file": "path/to/file.js",
      "search": "exact import line to find",
      "replace": "corrected import line"
    },
    {
      "type": "command",
      "command": "npm install missing-package"
    }
  ],
  "explanation": "Brief explanation of import issue and fix"
}

## Validation Criteria
- Imports must resolve correctly
- Use correct import syntax for the module system (ESM/CommonJS)
- Don't add unnecessary dependencies
- Follow project import conventions

Provide only the JSON output, no additional text.`;
}

/**
 * Generate syntax fix prompt
 */
function generateSyntaxFixPrompt(details, context) {
  return `You are a code fixing assistant. Your task is to fix syntax errors in the codebase.

## Error Details
${formatErrorDetails(details)}

## File Context
${formatFileContext(context.files)}

## Task
Analyze the syntax errors and provide fixes. Common syntax fixes:
- Fix mismatched brackets/parens
- Add missing semicolons
- Fix string quote issues
- Correct operator usage
- Fix incomplete statements

For each fix:
1. Identify the exact syntax issue
2. Provide the minimal correction
3. Explain what was wrong

## Output Format
Return a JSON object with this structure:
{
  "actions": [
    {
      "type": "edit",
      "file": "path/to/file.js",
      "search": "exact code to find",
      "replace": "corrected code"
    }
  ],
  "explanation": "Brief explanation of syntax error and fix"
}

## Validation Criteria
- Code must be syntactically valid after fix
- Maintain intended functionality
- Follow language syntax rules
- Don't change more than necessary

Provide only the JSON output, no additional text.`;
}

/**
 * Format error details for prompt
 */
function formatErrorDetails(details) {
  let output = '';

  if (details.errors.length > 0) {
    output += 'Errors:\n';
    for (const error of details.errors) {
      output += `  - ${error}\n`;
    }
  }

  if (details.files.length > 0) {
    output += '\nAffected Files:\n';
    for (const file of details.files) {
      output += `  - ${file.path}:${file.line}:${file.column}\n`;
    }
  }

  if (details.rawOutput) {
    output += '\nRaw Error Output:\n```\n';
    output += details.rawOutput.slice(0, 1000); // Limit size
    output += '\n```\n';
  }

  return output || 'No specific error details available';
}

/**
 * Format file context for prompt
 */
function formatFileContext(files) {
  if (!files || Object.keys(files).length === 0) {
    return 'No file context available';
  }

  let output = '';

  for (const [filePath, fileData] of Object.entries(files)) {
    if (fileData.error) {
      output += `\n${filePath}: Error reading file - ${fileData.error}\n`;
      continue;
    }

    output += `\n${filePath}:\n`;

    if (fileData.errorLocation) {
      output += `Error at line ${fileData.errorLocation.line}, column ${fileData.errorLocation.column}\n`;
      output += 'Context:\n```\n';
      output += fileData.errorLocation.context;
      output += '\n```\n';
    }

    // Include full content if small enough
    if (fileData.fullContent && fileData.fullContent.length < 2000) {
      output += '\nFull file content:\n```\n';
      output += fileData.fullContent;
      output += '\n```\n';
    }
  }

  return output;
}

/**
 * Format dependencies for prompt
 */
function formatDependencies(deps) {
  if (!deps || (!deps.dependencies && !deps.devDependencies)) {
    return 'No dependency information available';
  }

  let output = '';

  if (deps.dependencies && Object.keys(deps.dependencies).length > 0) {
    output += 'Dependencies:\n';
    for (const [name, version] of Object.entries(deps.dependencies)) {
      output += `  - ${name}: ${version}\n`;
    }
  }

  if (deps.devDependencies && Object.keys(deps.devDependencies).length > 0) {
    output += '\nDev Dependencies:\n';
    for (const [name, version] of Object.entries(deps.devDependencies)) {
      output += `  - ${name}: ${version}\n`;
    }
  }

  return output || 'No dependencies found';
}

/**
 * Format validation criteria for prompt
 */
export function formatValidationCriteria(strategy) {
  const criteria = {
    'lint-fix': [
      'All linting errors are resolved',
      'Code style is consistent',
      'No new lint errors introduced'
    ],
    'type-fix': [
      'All type errors are resolved',
      'Type annotations are accurate',
      'No new type errors introduced'
    ],
    'test-fix': [
      'All tests pass',
      'Test assertions are correct',
      'No test coverage lost'
    ],
    'import-fix': [
      'All imports resolve correctly',
      'No circular dependencies created',
      'Correct module syntax used'
    ],
    'syntax-fix': [
      'Code is syntactically valid',
      'Functionality is preserved',
      'No new syntax errors introduced'
    ]
  };

  return criteria[strategy] || ['Fix resolves the reported error'];
}

export default {
  getFixPrompt,
  formatValidationCriteria
};
