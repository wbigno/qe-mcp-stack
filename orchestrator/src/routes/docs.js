/**
 * Documentation Routes
 * Serves markdown documentation for MCPs
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Docs directory path
const DOCS_ROOT = path.join(__dirname, '../..', 'docs', 'mcps');

/**
 * Serve markdown documentation for MCPs
 * GET /docs/:category/:mcpName
 */
router.get('/:category/:mcpName', async (req, res) => {
  try {
    const { category, mcpName } = req.params;

    logger.info(`[Docs] Request for ${category}/${mcpName}`);

    // Construct file path
    const docPath = path.join(DOCS_ROOT, `${mcpName}.md`);

    // Read markdown file
    const content = await fs.readFile(docPath, 'utf-8');

    // Send as HTML with markdown styling
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${mcpName} Documentation</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown.min.css">
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background: #f6f8fa;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 980px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 1px solid #e1e4e8;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .back-link {
            display: inline-block;
            padding: 8px 16px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
          }
          .back-link:hover {
            background: #5568d3;
          }
          code {
            background: #f6f8fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 85%;
          }
          pre code {
            background: #f6f8fa;
            display: block;
            padding: 16px;
            overflow-x: auto;
            line-height: 1.45;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="http://localhost:8000" class="back-link">← Back to Dashboard</a>
          </div>
          <div class="markdown-body" id="content"></div>
        </div>
        <script>
          const markdown = ${JSON.stringify(content)};
          document.getElementById('content').innerHTML = marked.parse(markdown);
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    logger.error(`[Docs] Error serving docs: ${error.message}`);

    if (error.code === 'ENOENT') {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Documentation Not Found</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 100px auto;
              text-align: center;
              padding: 20px;
            }
            .error {
              background: #fee;
              border: 1px solid #fcc;
              border-radius: 8px;
              padding: 30px;
              color: #c33;
            }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>📚 Documentation Not Found</h1>
            <p>The documentation for "${req.params.mcpName}" could not be found.</p>
            <a href="http://localhost:8000">← Back to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error Loading Documentation</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 100px auto;
              text-align: center;
              padding: 20px;
            }
            .error {
              background: #fee;
              border: 1px solid #fcc;
              border-radius: 8px;
              padding: 30px;
              color: #c33;
            }
            a {
              display: inline-block;
              margin-top: 20px;
              padding: 10px 20px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>⚠️ Error Loading Documentation</h1>
            <p>${error.message}</p>
            <a href="http://localhost:8000">← Back to Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }
  }
});

export default router;
