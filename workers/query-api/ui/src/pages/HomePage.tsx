import { useState, useEffect } from 'react';

interface ArchitectureNodeProps {
  label: string;
  sublabel?: string;
  delay?: number;
  isHighlighted?: boolean;
}

function ArchitectureNode({ label, sublabel, delay = 0, isHighlighted }: ArchitectureNodeProps) {
  return (
    <div
      className={`relative px-4 py-3 rounded-lg border-2 transition-all duration-500 ${
        isHighlighted
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
          : 'border-base-300 bg-base-100'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-sm font-semibold">{label}</div>
      {sublabel && <div className="text-xs opacity-70">{sublabel}</div>}
    </div>
  );
}

function AnimatedArrow({ delay = 0, isActive }: { delay?: number; isActive?: boolean }) {
  return (
    <div className="flex items-center justify-center px-2">
      <svg
        className={`w-8 h-8 transition-all duration-300 ${
          isActive ? 'text-primary' : 'text-base-300'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7l5 5m0 0l-5 5m5-5H6"
          className={isActive ? 'animate-pulse' : ''}
          style={{ animationDelay: `${delay}ms` }}
        />
      </svg>
    </div>
  );
}

function ArchitectureDiagram() {
  const [activeStep, setActiveStep] = useState(0);

  // Auto-cycle through steps (6 steps now, faster animation)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden md:block w-full overflow-x-auto py-8">
      <div className="flex items-center justify-center gap-2 min-w-[850px] px-4">
        <ArchitectureNode
          label="Your App"
          sublabel="Analytics.js SDK"
          isHighlighted={activeStep === 0}
        />
        <AnimatedArrow isActive={activeStep === 1} />
        <ArchitectureNode
          label="Event Ingest"
          sublabel="Worker"
          isHighlighted={activeStep === 1}
        />
        <AnimatedArrow isActive={activeStep === 2} />
        <ArchitectureNode
          label="Cloudflare"
          sublabel="Pipeline"
          isHighlighted={activeStep === 2}
        />
        <AnimatedArrow isActive={activeStep === 3} />
        <ArchitectureNode
          label="R2 + Iceberg"
          sublabel="Data Catalog"
          isHighlighted={activeStep === 3}
        />
        <AnimatedArrow isActive={activeStep === 4} />
        <ArchitectureNode
          label="Query API"
          sublabel="Worker"
          isHighlighted={activeStep === 4}
        />
        <AnimatedArrow isActive={activeStep === 5} />
        <ArchitectureNode
          label="Drizzle-Cube"
          sublabel="Semantic Layer"
          isHighlighted={activeStep === 5}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body">
        <div className="text-primary text-4xl mb-2">{icon}</div>
        <h3 className="card-title">{title}</h3>
        <p className="text-base-content/70">{description}</p>
      </div>
    </div>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <pre className="bg-base-300 rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <button
        className="absolute top-2 right-2 btn btn-ghost btn-xs"
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

function QuickStartStep({
  number,
  title,
  code,
}: {
  number: number;
  title: string;
  code: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold mb-2">{title}</h4>
        <CodeBlock code={code} />
      </div>
    </div>
  );
}

type Page = 'home' | 'query' | 'duckdb' | 'simulator' | 'analysis' | 'dashboard';

interface HomePageProps {
  onNavigate: (page: Page) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [sdkTab, setSdkTab] = useState<'rudderstack' | 'http'>('rudderstack');

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-base-200 via-base-100 to-base-200">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Analytics Events
            </span>
            <br />
            <span className="text-base-content">to Apache Iceberg on Cloudflare</span>
          </h1>
          <p className="text-xl text-base-content/70 mb-8 max-w-2xl mx-auto">
            Stream Analytics.js compatible events to Apache Iceberg tables on Cloudflare's data
            platform. Query with R2 SQL, DuckDB, or the semantic API.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <a href="#quickstart" className="btn btn-primary btn-lg">
              Get Started
            </a>
            <button
              className="btn btn-outline btn-lg"
              onClick={() => onNavigate('dashboard')}
            >
              Try Demo
            </button>
          </div>

          {/* Animated Architecture Diagram */}
          <ArchitectureDiagram />
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-16 px-4 bg-base-200">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              }
              title="Event Ingestion"
              description="RudderStack/Segment-compatible HTTP endpoints. Drop-in replacement for your existing analytics pipeline."
            />
            <FeatureCard
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              }
              title="Apache Iceberg Storage"
              description="Automatic compaction, schema evolution, and time travel. Your data stored in open table format on R2."
            />
            <FeatureCard
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              title="Flexible Querying"
              description="R2 SQL for simple queries, DuckDB for full SQL support, and a semantic API for building dashboards."
            />
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="py-16 px-4 scroll-mt-16">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Quick Start</h2>
          <div className="space-y-8">
            <QuickStartStep
              number={1}
              title="Clone & Install"
              code={`git clone https://github.com/cliftonc/icelight.git
cd icelight
pnpm install`}
            />
            <QuickStartStep
              number={2}
              title="Login to Cloudflare"
              code="npx wrangler login"
            />
            <QuickStartStep
              number={3}
              title="Launch Everything"
              code="pnpm launch"
            />
            <QuickStartStep
              number={4}
              title="Open the Web UI"
              code="https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev"
            />
          </div>
        </div>
      </section>

      {/* SDK Integration */}
      <section className="py-16 px-4 bg-base-200">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">SDK Integration</h2>
          <div className="tabs tabs-boxed justify-center mb-6 bg-base-300">
            <button
              className={`tab ${sdkTab === 'rudderstack' ? 'tab-active' : ''}`}
              onClick={() => setSdkTab('rudderstack')}
            >
              RudderStack / Segment
            </button>
            <button
              className={`tab ${sdkTab === 'http' ? 'tab-active' : ''}`}
              onClick={() => setSdkTab('http')}
            >
              Direct HTTP
            </button>
          </div>

          {sdkTab === 'rudderstack' && (
            <CodeBlock
              language="javascript"
              code={`import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'any-value',
  dataPlaneUrl: 'https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev'
});

// Track events
analytics.track('Purchase Completed', {
  orderId: '12345',
  revenue: 99.99
});

// Identify users
analytics.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});`}
            />
          )}

          {sdkTab === 'http' && (
            <CodeBlock
              language="bash"
              code={`# Track event
curl -X POST https://YOUR-WORKER.workers.dev/v1/track \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"user-123","event":"Button Clicked","properties":{"button":"signup"}}'

# Batch events
curl -X POST https://YOUR-WORKER.workers.dev/v1/batch \\
  -H "Content-Type: application/json" \\
  -d '{"batch":[
    {"type":"track","userId":"u1","event":"Page View"},
    {"type":"identify","userId":"u1","traits":{"name":"John"}}
  ]}'`}
            />
          )}
        </div>
      </section>

      {/* API Reference */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">API Reference</h2>

          <div className="space-y-8">
            {/* Ingestion Endpoints */}
            <div className="collapse collapse-arrow bg-base-100 shadow-lg">
              <input type="checkbox" defaultChecked />
              <div className="collapse-title text-xl font-medium">Ingestion Worker</div>
              <div className="collapse-content">
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/v1/batch</code></td>
                        <td>Batch events (primary)</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/v1/track</code></td>
                        <td>Single track event</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/v1/identify</code></td>
                        <td>Single identify event</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/v1/page</code></td>
                        <td>Single page event</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/v1/screen</code></td>
                        <td>Single screen event</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/v1/group</code></td>
                        <td>Single group event</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/v1/alias</code></td>
                        <td>Single alias event</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-success">GET</code></td>
                        <td><code>/health</code></td>
                        <td>Health check</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Query Endpoints */}
            <div className="collapse collapse-arrow bg-base-100 shadow-lg">
              <input type="checkbox" defaultChecked />
              <div className="collapse-title text-xl font-medium">Query API Worker</div>
              <div className="collapse-content">
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/query</code></td>
                        <td>Execute R2 SQL query</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/duckdb</code></td>
                        <td>Execute DuckDB query (full SQL)</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-success">GET</code></td>
                        <td><code>/tables/:namespace</code></td>
                        <td>List tables in namespace</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-success">GET</code></td>
                        <td><code>/tables/:namespace/:table</code></td>
                        <td>Describe table schema</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-success">GET</code></td>
                        <td><code>/cubejs-api/v1/meta</code></td>
                        <td>Get semantic layer metadata</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-primary">POST</code></td>
                        <td><code>/cubejs-api/v1/load</code></td>
                        <td>Execute semantic query</td>
                      </tr>
                      <tr>
                        <td><code className="badge badge-success">GET</code></td>
                        <td><code>/health</code></td>
                        <td>Health check</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Links */}
      <section className="py-12 px-4 bg-base-200">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold mb-6">Resources</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://github.com/cliftonc/icelight"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
            <a
              href="https://developers.cloudflare.com/pipelines/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Cloudflare Pipelines
            </a>
            <a
              href="https://developers.cloudflare.com/r2/data-catalog/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              R2 Data Catalog
            </a>
            <a
              href="https://developers.cloudflare.com/r2-sql/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              R2 SQL
            </a>
            <a
              href="https://www.npmjs.com/package/drizzle-cube"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              Drizzle-Cube
            </a>
          </div>
          <p className="mt-8 text-base-content/50">MIT License</p>
        </div>
      </section>
    </div>
  );
}
