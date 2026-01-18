import { useState, useCallback, type ChangeEvent } from 'react';

const STORAGE_KEY = 'icelight_api_token';

export default function TokenInput() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [isSaved, setIsSaved] = useState(() => !!localStorage.getItem(STORAGE_KEY));

  const handleSet = useCallback(() => {
    if (token.trim()) {
      localStorage.setItem(STORAGE_KEY, token.trim());
      setIsSaved(true);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsSaved(false);
    }
  }, [token]);

  const handleClear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken('');
    setIsSaved(false);
  }, []);

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        {isSaved ? (
          <>
            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs">Token Set</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">No Token</span>
          </>
        )}
      </div>
      <div
        tabIndex={0}
        className="dropdown-content z-10 card card-compact w-72 p-2 shadow-xl bg-base-100 border border-base-300"
      >
        <div className="card-body">
          <h3 className="font-semibold text-sm">API Token</h3>
          <p className="text-xs text-base-content/60">Optional authentication token for the query API</p>
          <div className="form-control mt-2">
            <input
              type="password"
              className="input input-bordered input-sm w-full"
              placeholder="Enter token..."
              value={token}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setToken(e.target.value);
                setIsSaved(false);
              }}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-sm btn-primary flex-1"
              onClick={handleSet}
              disabled={!token.trim() && !isSaved}
            >
              {isSaved ? 'Update' : 'Save'}
            </button>
            {isSaved && (
              <button className="btn btn-sm btn-ghost" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
