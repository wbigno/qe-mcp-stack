/**
 * Documentation Generator
 */

import { generateWithClaude } from './claudeClient.js';

/**
 * Generate documentation
 */
export async function generateDocumentation(params) {
  const {
    app,
    docType,
    content,
    format = 'markdown'
  } = params;

  validateInput(params);

  const generated = await generateWithClaude({
    docType,
    content,
    format
  });

  const formatted = formatDocumentation(generated, format);

  return {
    title: generated.title,
    sections: generated.sections,
    markdown: generated.markdown,
    formatted,
    tableOfContents: generateTableOfContents(generated.sections),
    metadata: {
      app,
      docType,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
      format
    }
  };
}

/**
 * Validate input
 */
function validateInput(params) {
  const { app, docType, content, format } = params;

  if (!app || typeof app !== 'string') {
    throw new Error('app must be a string');
  }

  if (!docType || typeof docType !== 'string') {
    throw new Error('docType must be a string');
  }

  const validTypes = ['api', 'architecture', 'setup', 'deployment', 'troubleshooting', 'general'];
  if (!validTypes.includes(docType)) {
    throw new Error(`docType must be one of: ${validTypes.join(', ')}`);
  }

  if (!content) {
    throw new Error('content is required');
  }

  if (format && !['markdown', 'html', 'json'].includes(format)) {
    throw new Error('format must be one of: markdown, html, json');
  }
}

/**
 * Format documentation
 */
function formatDocumentation(generated, format) {
  if (format === 'json') {
    return JSON.stringify(generated, null, 2);
  }

  if (format === 'html') {
    return convertToHtml(generated);
  }

  return generated.markdown;
}

/**
 * Convert to HTML
 */
function convertToHtml(generated) {
  let html = `<html><head><title>${generated.title}</title>`;
  html += '<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;line-height:1.6}';
  html += 'h1{border-bottom:2px solid #333}h2{color:#333;margin-top:30px}';
  html += 'code{background:#f4f4f4;padding:2px 6px;border-radius:3px}</style></head><body>';
  html += `<h1>${generated.title}</h1>`;

  generated.sections.forEach(section => {
    html += `<h2>${section.heading}</h2>`;
    html += `<p>${section.content}</p>`;
    
    if (section.subsections) {
      section.subsections.forEach(sub => {
        html += `<h3>${sub.heading}</h3>`;
        html += `<p>${sub.content}</p>`;
      });
    }
  });

  html += '</body></html>';
  return html;
}

/**
 * Generate table of contents
 */
function generateTableOfContents(sections) {
  const toc = [];
  
  sections.forEach((section, idx) => {
    toc.push({
      level: 1,
      heading: section.heading,
      anchor: `section-${idx + 1}`
    });
    
    if (section.subsections) {
      section.subsections.forEach((sub, subIdx) => {
        toc.push({
          level: 2,
          heading: sub.heading,
          anchor: `section-${idx + 1}-${subIdx + 1}`
        });
      });
    }
  });

  return toc;
}

export default {
  generateDocumentation
};
