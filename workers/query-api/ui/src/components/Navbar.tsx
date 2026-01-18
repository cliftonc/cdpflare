import TokenInput from './TokenInput.tsx';
import ThemeToggle from './ThemeToggle.tsx';

type Page = 'query' | 'duckdb' | 'simulator' | 'analysis';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  return (
    <div className="bg-base-100 shadow-lg border-b border-base-300">
      <div className="navbar container mx-auto max-w-7xl px-4">
        <div className="flex-1 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="icelight" className="h-12 w-auto" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              icelight
            </span>
          </div>
          <div role="tablist" className="tabs tabs-boxed bg-base-200">
            <button
              role="tab"
              className={`tab ${currentPage === 'analysis' ? 'tab-active' : ''}`}
              onClick={() => onPageChange('analysis')}
            >
              Analysis
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'query' ? 'tab-active' : ''}`}
              onClick={() => onPageChange('query')}
            >
              R2 SQL
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'duckdb' ? 'tab-active' : ''}`}
              onClick={() => onPageChange('duckdb')}
            >
              DuckDB
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'simulator' ? 'tab-active' : ''}`}
              onClick={() => onPageChange('simulator')}
            >
              Event Simulator
            </button>
          </div>
        </div>
        <div className="flex-none flex items-center gap-2">
          <TokenInput />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export type { Page };
