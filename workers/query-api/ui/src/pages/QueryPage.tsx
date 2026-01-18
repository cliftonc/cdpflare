import { useState, useCallback, useRef } from 'react';
import QueryEditor from '../components/QueryEditor.tsx';
import ResultsTable from '../components/ResultsTable.tsx';
import StatusBar from '../components/StatusBar.tsx';
import SchemaExplorer from '../components/SchemaExplorer.tsx';
import { useExecuteQuery, type QueryResult } from '../api/query.ts';

const R2_SQL_STORAGE_KEY = 'icelight_r2_sql';
const DEFAULT_SQL = 'SELECT * FROM analytics.events LIMIT 100';

export default function QueryPage() {
  const [sql, setSql] = useState(() => localStorage.getItem(R2_SQL_STORAGE_KEY) ?? DEFAULT_SQL);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useExecuteQuery();

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
    const token = localStorage.getItem('icelight_api_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql, format: 'csv' }),
    });

    if (!response.ok) {
      throw new Error('Failed to export CSV');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-results.csv';
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
    localStorage.setItem(R2_SQL_STORAGE_KEY, sql);
  }, [sql]);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex gap-4">
        {/* Schema Explorer Sidebar */}
        <div className="w-72 flex-shrink-0">
          <SchemaExplorer onInsert={handleInsertText} />
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
