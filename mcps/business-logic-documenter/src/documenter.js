/**
 * Business Logic Documenter
 * 
 * Documents business logic from code
 */

import { generateWithClaude } from './claudeClient.js';

/**
 * Document business logic from source code
 * 
 * @param {Object} params - Documentation parameters
 * @returns {Promise<Object>} Generated documentation
 */
export async function documentBusinessLogic(params) {
  const {
    app,
    className,
    sourceCode,
    format = 'markdown'
  } = params;

  // Validate input
  validateInput(params);

  // Generate documentation with Claude
  const generated = await generateWithClaude({
    className,
    sourceCode,
    format
  });

  // Generate additional formats if needed
  const formattedDocs = formatDocumentation(generated, format);

  return {
    overview: generated.overview,
    businessRules: generated.businessRules,
    workflows: generated.workflows,
    validationRules: generated.validationRules,
    integrations: generated.integrations,
    securityConsiderations: generated.securityConsiderations,
    dataFlow: generated.dataFlow,
    businessExceptions: generated.businessExceptions,
    decisionPoints: generated.decisionPoints,
    performanceConsiderations: generated.performanceConsiderations,
    documentation: generated.documentation,
    formattedOutput: formattedDocs,
    metadata: {
      app,
      className,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      format
    }
  };
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  const { app, className, sourceCode, format } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!className || typeof className !== 'string') {
    throw new Error('className must be a string');
  }

  if (!sourceCode || typeof sourceCode !== 'string') {
    throw new Error('sourceCode must be a string');
  }

  if (format && !['markdown', 'html', 'json'].includes(format)) {
    throw new Error('format must be one of: markdown, html, json');
  }
}

/**
 * Format documentation in requested format
 */
function formatDocumentation(generated, format) {
  if (format === 'json') {
    return JSON.stringify(generated, null, 2);
  }

  if (format === 'html') {
    return convertMarkdownToHtml(generated.documentation.markdown);
  }

  // Default: markdown
  return generated.documentation.markdown;
}

/**
 * Simple markdown to HTML conversion
 */
function convertMarkdownToHtml(markdown) {
  if (!markdown) return '';

  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Code blocks
    .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  return `<div class="documentation">${html}</div>`;
}

export default {
  documentBusinessLogic
};
