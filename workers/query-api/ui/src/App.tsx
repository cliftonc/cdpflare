import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navbar, { type Page } from './components/Navbar.tsx';
import QueryPage from './pages/QueryPage.tsx';
import DuckDbPage from './pages/DuckDbPage.tsx';
import EventSimulatorPage from './pages/EventSimulatorPage.tsx';
import AnalysisPage from './pages/AnalysisPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';

const queryClient = new QueryClient();

function getPageFromHash(): Page {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (hash === 'query') return 'query';
  if (hash === 'duckdb') return 'duckdb';
  if (hash === 'simulator') return 'simulator';
  if (hash === 'dashboard') return 'dashboard';
  return 'analysis';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>(getPageFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getPageFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handlePageChange = (page: Page) => {
    window.location.hash = page === 'analysis' ? '' : page;
    setCurrentPage(page);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-base-200">
        <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
        {currentPage === 'query' && <QueryPage />}
        {currentPage === 'duckdb' && <DuckDbPage />}
        {currentPage === 'simulator' && <EventSimulatorPage />}
        {currentPage === 'analysis' && <AnalysisPage />}
        {currentPage === 'dashboard' && <DashboardPage />}
      </div>
    </QueryClientProvider>
  );
}
