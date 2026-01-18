import { useState } from 'react';
import TokenInput from './TokenInput.tsx';
import ThemeToggle from './ThemeToggle.tsx';

type Page = 'query' | 'duckdb' | 'simulator' | 'analysis' | 'dashboard';

interface NavbarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handlePageChange = (page: Page) => {
    onPageChange(page);
    setMobileOpen(false);
  };

  const toggleMobile = () => setMobileOpen((open) => !open);

  return (
    <div className="bg-base-100 shadow-lg border-b border-base-300">
      <div className="navbar container mx-auto max-w-7xl px-4">
        {/* Left: Logo */}
        <div className="navbar-start">
          <img src="/logo.png" alt="icelight" className="h-10 w-auto" />
          <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            icelight
          </span>
        </div>

        {/* Center: Tabs (hidden on mobile) */}
        <div className="navbar-center hidden md:flex">
          <div role="tablist" className="tabs tabs-boxed bg-base-200">
            <button
              role="tab"
              className={`tab ${currentPage === 'analysis' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('analysis')}
            >
              Analysis
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'dashboard' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('dashboard')}
            >
              Dashboard
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'query' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('query')}
            >
              R2 SQL
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'duckdb' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('duckdb')}
            >
              DuckDB
            </button>
            <button
              role="tab"
              className={`tab ${currentPage === 'simulator' ? 'tab-active' : ''}`}
              onClick={() => handlePageChange('simulator')}
            >
              Event Simulator
            </button>
          </div>
        </div>

        {/* Right: Controls (hidden on mobile) + Mobile menu button */}
        <div className="navbar-end">
          <div className="hidden md:flex items-center gap-2">
            <TokenInput />
            <ThemeToggle />
          </div>
          <button
            className="btn btn-ghost btn-square md:hidden"
            aria-label="Toggle menu"
            onClick={toggleMobile}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

        {/* Mobile overlay + side panel */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div
          className={`fixed top-16 right-0 bottom-0 w-72 bg-base-100 shadow-lg z-30 transform transition-transform duration-200 md:hidden ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="p-4 flex flex-col gap-4 h-full">
            <div role="tablist" className="tabs tabs-boxed bg-base-200 flex-col items-start gap-2">
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'analysis' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('analysis')}
              >
                Analysis
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'dashboard' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('dashboard')}
              >
                Dashboard
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'query' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('query')}
              >
                R2 SQL
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'duckdb' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('duckdb')}
              >
                DuckDB
              </button>
              <button
                role="tab"
                className={`tab w-full justify-start ${currentPage === 'simulator' ? 'tab-active' : ''}`}
                onClick={() => handlePageChange('simulator')}
              >
                Event Simulator
              </button>
            </div>
            <div className="flex items-center gap-2">
              <TokenInput />
              <ThemeToggle />
            </div>
            <div className="flex-1" />
            <button className="btn btn-ghost w-full" onClick={() => setMobileOpen(false)}>
              Close
            </button>
          </div>
        </div>
    </div>
  );
}

export type { Page };
