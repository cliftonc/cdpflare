import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CubeProvider } from 'drizzle-cube/client';
import Navbar, { type Page } from './components/Navbar.tsx';
import HomePage from './pages/HomePage.tsx';
import QueryPage from './pages/QueryPage.tsx';
import DuckDbPage from './pages/DuckDbPage.tsx';
import EventSimulatorPage from './pages/EventSimulatorPage.tsx';
import AnalysisPage from './pages/AnalysisPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';

const queryClient = new QueryClient();

// Shared Cube provider configuration
const cubeApiOptions = { apiUrl: '/cubejs-api/v1' };
const cubeFeatures = { useAnalysisBuilder: true, dashboardModes: ['rows', 'grid'] };

function getPageFromHash(): Page {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (hash === 'query') return 'query';
  if (hash === 'duckdb') return 'duckdb';
  if (hash === 'simulator') return 'simulator';
  if (hash === 'analysis') return 'analysis';
  if (hash === 'dashboard') return 'dashboard';
  return 'home';
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
    window.location.hash = page === 'home' ? '' : page;
    setCurrentPage(page);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <CubeProvider
        apiOptions={cubeApiOptions}
        features={cubeFeatures}
        enableBatching={false}
      >
        <div className="min-h-screen bg-base-200">
          <Navbar currentPage={currentPage} onPageChange={handlePageChange} />
          {currentPage === 'home' && <HomePage onNavigate={handlePageChange} />}
          {currentPage === 'query' && <QueryPage />}
          {currentPage === 'duckdb' && <DuckDbPage />}
          {currentPage === 'simulator' && <EventSimulatorPage />}
          {currentPage === 'analysis' && <AnalysisPage />}
          {currentPage === 'dashboard' && <DashboardPage />}
        </div>
      </CubeProvider>
    </QueryClientProvider>
  );
}
