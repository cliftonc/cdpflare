import { CubeProvider, AnalysisBuilder } from 'drizzle-cube/client';

const apiOptions = { apiUrl: '/cubejs-api/v1' };
const features = { useAnalysisBuilder: true };

export default function AnalysisPage() {
  return (
    <CubeProvider apiOptions={apiOptions} features={features}>
      <div className="container mx-auto p-4 max-w-7xl">
        <h1 className="text-2xl font-bold mb-4">Event Analysis</h1>
        <AnalysisBuilder maxHeight="calc(100vh - 160px)" />
      </div>
    </CubeProvider>
  );
}
