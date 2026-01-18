import { useState, useCallback, useRef } from 'react';
import QueryEditor from '../components/QueryEditor.tsx';
import ResultsTable from '../components/ResultsTable.tsx';
import StatusBar from '../components/StatusBar.tsx';
import { useExecuteDuckDbQuery, exportDuckDbCsv, type DuckDbQueryResult } from '../api/duckdb.ts';

const DUCKDB_SQL_STORAGE_KEY = 'icelight_duckdb_sql';
const DEFAULT_SQL = 'SELECT * FROM r2_datalake.analytics.events LIMIT 100';

export default function DuckDbPage() {
  const [sql, setSql] = useState(() => localStorage.getItem(DUCKDB_SQL_STORAGE_KEY) ?? DEFAULT_SQL);
  const [result, setResult] = useState<DuckDbQueryResult | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useExecuteDuckDbQuery();

  const handleRunQuery = useCallback(() => {
    const startTime = performance.now();
    mutation.mutate(
      { sql },
      {
        onSuccess: (data) => {
          setExecutionTime(Math.round(performance.now() - startTime));
          setResult(data);
        },
        onError: () => {
          setExecutionTime(null);
          setResult(null);
        },
      }
    );
  }, [sql, mutation]);

  const handleClear = useCallback(() => {
    setSql('');
    setResult(null);
    setExecutionTime(null);
    mutation.reset();
  }, [mutation]);

  const handleExportCsv = useCallback(async () => {
    const blob = await exportDuckDbCsv(sql);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'duckdb-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [sql]);

  const handleInsertText = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newSql = sql.slice(0, start) + text + sql.slice(end);
      setSql(newSql);
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    } else {
      // Fallback: append to end
      setSql((prev) => prev + text);
    }
  }, [sql]);

  const handleBlur = useCallback(() => {
    localStorage.setItem(DUCKDB_SQL_STORAGE_KEY, sql);
  }, [sql]);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex gap-4">
        {/* Info Panel */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-base-100 rounded-lg shadow p-4 space-y-4">
            <h2 className="font-semibold text-lg">DuckDB Query</h2>
            <p className="text-sm text-base-content/70">
              Query your R2 Iceberg tables using DuckDB with full SQL support including JOINs, aggregations, and window functions.
            </p>
            <div className="text-sm space-y-2">
              <h3 className="font-medium">Available Catalogs:</h3>
              <code className="block bg-base-200 p-2 rounded text-xs">
                r2_datalake
              </code>
            </div>
            <div className="text-sm space-y-2">
              <h3 className="font-medium">Example Queries:</h3>
              <div className="space-y-1">
                <button
                  className="btn btn-xs btn-ghost w-full justify-start text-left font-mono"
                  onClick={() => handleInsertText('SELECT * FROM r2_datalake.analytics.events LIMIT 10')}
                >
                  Basic SELECT
                </button>
                <button
                  className="btn btn-xs btn-ghost w-full justify-start text-left font-mono"
                  onClick={() => handleInsertText('SELECT type, COUNT(*) as count FROM r2_datalake.analytics.events GROUP BY type')}
                >
                  GROUP BY
                </button>
                <button
                  className="btn btn-xs btn-ghost w-full justify-start text-left font-mono"
                  onClick={() => handleInsertText("SELECT * FROM r2_datalake.analytics.events WHERE type = 'track' ORDER BY timestamp DESC LIMIT 50")}
                >
                  Filter + Order
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Query Area */}
        <div className="flex-1 space-y-4 min-w-0">
          <QueryEditor
            sql={sql}
            onSqlChange={setSql}
            onRun={handleRunQuery}
            onClear={handleClear}
            isLoading={mutation.isPending}
            textareaRef={textareaRef}
            onBlur={handleBlur}
          />

          <StatusBar
            rowCount={result?.data?.length ?? null}
            executionTime={executionTime}
            error={mutation.error?.message ?? null}
            onExportCsv={result ? handleExportCsv : undefined}
          />

          {result && <ResultsTable data={result.data} columns={result.columns} />}
        </div>
      </div>
    </div>
  );
}
