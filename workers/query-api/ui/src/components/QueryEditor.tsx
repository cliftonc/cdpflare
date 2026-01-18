import { useCallback, type KeyboardEvent, type ChangeEvent, type RefObject } from 'react';

interface QueryEditorProps {
  sql: string;
  onSqlChange: (sql: string) => void;
  onRun: () => void;
  onClear: () => void;
  isLoading: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onBlur?: () => void;
}

export default function QueryEditor({
  sql,
  onSqlChange,
  onRun,
  onClear,
  isLoading,
  textareaRef,
  onBlur,
}: QueryEditorProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onRun();
      }
    },
    [onRun]
  );

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4">
        <textarea
          ref={textareaRef}
          className="textarea textarea-bordered w-full font-mono text-sm"
          rows={4}
          placeholder="Enter SQL query..."
          value={sql}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onSqlChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          disabled={isLoading}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={onClear}
            disabled={isLoading}
          >
            Clear
          </button>
          <button
            className="btn btn-sm btn-primary"
            onClick={onRun}
            disabled={isLoading || !sql.trim()}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              'Run'
            )}
          </button>
        </div>
        <p className="text-xs text-base-content/50 mt-1">
          Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to run
        </p>
      </div>
    </div>
  );
}
