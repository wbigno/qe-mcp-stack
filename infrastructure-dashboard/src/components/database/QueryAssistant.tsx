import { useState, useCallback } from "react";
import type { QueryGenerationResponse, CommonQuery } from "../../types/schema";
import { commonQueries, queryCategories } from "../../data/commonQueries";

interface QueryAssistantProps {
  database: string;
  environment: string;
  orchestratorUrl?: string;
}

export function QueryAssistant({
  database,
  environment,
  orchestratorUrl = "http://localhost:3000",
}: QueryAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("patient");
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateQuery = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${orchestratorUrl}/api/ai/generate-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          database,
          environment,
          prompt: prompt.trim(),
          options: {
            includeExplanation: true,
            includeWarnings: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate query");
    } finally {
      setLoading(false);
    }
  }, [prompt, database, environment, orchestratorUrl]);

  const loadCommonQuery = (query: CommonQuery) => {
    setSelectedQueryId(query.id);
    setResult({
      success: true,
      query: { sql: query.sql, formatted: true },
      explanation: {
        summary: query.description,
        steps: [],
        tablesUsed: [],
      },
      warnings: [],
    });
    setPrompt(query.description);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      generateQuery();
    }
  };

  const filteredQueries = commonQueries.filter(
    (q) => q.category === activeCategory,
  );

  return (
    <div className="query-assistant">
      <div className="query-assistant-header">
        <h3>AI Query Assistant</h3>
        <span className="env-badge">
          {database} - {environment}
        </span>
      </div>

      {/* Natural Language Input */}
      <div className="query-input-section">
        <label htmlFor="query-prompt">Describe what you want to query:</label>
        <div className="query-input-wrapper">
          <textarea
            id="query-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Show me all patients with balance over $1000 who haven't made a payment in 60 days"
            rows={3}
            disabled={loading}
          />
          <button
            className="generate-btn"
            onClick={generateQuery}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>Generate SQL</>
            )}
          </button>
        </div>
        <div className="input-hint">Press Cmd+Enter to generate</div>
      </div>

      {/* Common Queries Section */}
      <div className="common-queries-section">
        <h4>Common Queries</h4>
        <div className="category-tabs">
          {queryCategories.map((cat) => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="category-icon">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
        <div className="common-queries-list">
          {filteredQueries.map((query) => (
            <button
              key={query.id}
              className={`common-query-btn ${selectedQueryId === query.id ? "selected" : ""}`}
              onClick={() => loadCommonQuery(query)}
              title={query.description}
            >
              {query.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="query-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Section */}
      {result && result.success && (
        <div className="query-result">
          <div className="result-header">
            <h4>Generated SQL</h4>
            <button
              className={`copy-btn ${copied ? "copied" : ""}`}
              onClick={() => copyToClipboard(result.query.sql)}
            >
              {copied ? "Copied!" : "Copy SQL"}
            </button>
          </div>

          <pre className="sql-output">
            <code>{result.query.sql}</code>
          </pre>

          {/* Explanation */}
          {result.explanation && (
            <div className="query-explanation">
              <h5>Explanation</h5>
              <p className="summary">{result.explanation.summary}</p>

              {result.explanation.steps &&
                result.explanation.steps.length > 0 && (
                  <div className="steps">
                    <strong>Steps:</strong>
                    <ol>
                      {result.explanation.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

              {result.explanation.tablesUsed &&
                result.explanation.tablesUsed.length > 0 && (
                  <div className="tables-used">
                    <strong>Tables Used:</strong>
                    <ul>
                      {result.explanation.tablesUsed.map((table, i) => (
                        <li key={i}>
                          <code>
                            {table.schema}.{table.table}
                          </code>
                          {table.purpose && <span> - {table.purpose}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="query-warnings">
              <h5>Warnings</h5>
              {result.warnings.map((warning, i) => (
                <div key={i} className={`warning warning-${warning.type}`}>
                  <span className="warning-type">{warning.type}</span>
                  {warning.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .query-assistant {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .query-assistant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .query-assistant-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #f0f0f0;
        }

        .env-badge {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .query-input-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .query-input-section label {
          font-size: 0.875rem;
          color: #a1a1a1;
        }

        .query-input-wrapper {
          display: flex;
          gap: 0.75rem;
        }

        .query-input-wrapper textarea {
          flex: 1;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: #f0f0f0;
          font-family: inherit;
          font-size: 0.875rem;
          resize: vertical;
        }

        .query-input-wrapper textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .query-input-wrapper textarea::placeholder {
          color: #666;
        }

        .generate-btn {
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .generate-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .generate-btn:disabled {
          background: #4b5563;
          cursor: not-allowed;
        }

        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .input-hint {
          font-size: 0.75rem;
          color: #666;
        }

        .common-queries-section {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 0.75rem;
          padding: 1rem;
        }

        .common-queries-section h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: #a1a1a1;
        }

        .category-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .category-tab {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          color: #a1a1a1;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.2s;
        }

        .category-tab:hover {
          border-color: #3b82f6;
          color: #f0f0f0;
        }

        .category-tab.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .category-icon {
          font-size: 0.875rem;
        }

        .common-queries-list {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .common-query-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #a1a1a1;
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .common-query-btn:hover {
          border-color: #3b82f6;
          background: #0a0a0a;
          color: #f0f0f0;
        }

        .common-query-btn.selected {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .query-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 0.5rem;
          padding: 1rem;
          color: #ef4444;
        }

        .query-result {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid #2a2a2a;
        }

        .result-header h4 {
          margin: 0;
          font-size: 0.875rem;
          color: #f0f0f0;
        }

        .copy-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.375rem;
          padding: 0.375rem 0.75rem;
          color: #a1a1a1;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .copy-btn.copied {
          background: #22c55e;
          border-color: #22c55e;
          color: white;
        }

        .sql-output {
          margin: 0;
          padding: 1rem;
          background: #0a0a0a;
          overflow-x: auto;
        }

        .sql-output code {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 0.8125rem;
          color: #22c55e;
          white-space: pre-wrap;
        }

        .query-explanation {
          padding: 1rem;
          border-top: 1px solid #2a2a2a;
        }

        .query-explanation h5 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: #f0f0f0;
        }

        .query-explanation .summary {
          color: #a1a1a1;
          font-size: 0.875rem;
          margin: 0 0 0.75rem 0;
        }

        .query-explanation .steps,
        .query-explanation .tables-used {
          margin-top: 0.75rem;
        }

        .query-explanation strong {
          color: #f0f0f0;
          font-size: 0.8125rem;
        }

        .query-explanation ol,
        .query-explanation ul {
          margin: 0.5rem 0 0 1.5rem;
          padding: 0;
        }

        .query-explanation li {
          color: #a1a1a1;
          font-size: 0.8125rem;
          margin: 0.25rem 0;
        }

        .query-explanation code {
          background: #1a1a1a;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 0.75rem;
          color: #3b82f6;
        }

        .query-warnings {
          padding: 1rem;
          border-top: 1px solid #2a2a2a;
          background: rgba(234, 179, 8, 0.05);
        }

        .query-warnings h5 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: #eab308;
        }

        .warning {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.5rem;
          font-size: 0.8125rem;
          color: #a1a1a1;
        }

        .warning:last-child {
          margin-bottom: 0;
        }

        .warning-type {
          display: inline-block;
          background: #eab308;
          color: #0a0a0a;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          margin-right: 0.5rem;
        }

        .warning-performance .warning-type {
          background: #f97316;
        }

        .warning-safety .warning-type {
          background: #ef4444;
        }
      `}</style>
    </div>
  );
}
