import { useState, useSyncExternalStore } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';

function useTheme() {
  const subscribe = (callback: () => void) => {
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  };
  const getSnapshot = () =>
    document.documentElement.getAttribute('data-theme') || 'night';
  return useSyncExternalStore(subscribe, getSnapshot, () => 'night');
}

// Decorative flowing lines SVG for visual interest
function DecorativeCurve() {
  return (
    <svg
      className="w-full h-64"
      viewBox="0 0 1200 200"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      {/* Main flowing line - top */}
      <path
        d="M0 60 Q200 20 400 50 T800 30 T1200 55"
        stroke="url(#gradient1)"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Secondary wave - middle */}
      <path
        d="M0 100 Q300 60 600 100 T1200 80"
        stroke="url(#gradient2)"
        strokeWidth="2"
        fill="none"
        opacity="0.8"
      />
      {/* Third accent line - lower */}
      <path
        d="M0 140 Q250 100 500 130 T900 110 T1200 140"
        stroke="url(#gradient3)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      {/* Fourth subtle line */}
      <path
        d="M0 170 Q400 140 800 160 T1200 150"
        stroke="url(#gradient2)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      {/* Accent dots scattered across */}
      <circle cx="150" cy="45" r="5" fill="#818cf8" opacity="0.9" />
      <circle cx="400" cy="55" r="6" fill="#6366f1" opacity="0.8" />
      <circle cx="700" cy="35" r="4" fill="#a5b4fc" opacity="0.7" />
      <circle cx="1000" cy="50" r="5" fill="#818cf8" opacity="0.7" />
      <circle cx="250" cy="95" r="4" fill="#c7d2fe" opacity="0.6" />
      <circle cx="550" cy="105" r="5" fill="#6366f1" opacity="0.7" />
      <circle cx="850" cy="85" r="4" fill="#a5b4fc" opacity="0.6" />
      <circle cx="1100" cy="90" r="4" fill="#818cf8" opacity="0.5" />
      <circle cx="100" cy="135" r="3" fill="#6366f1" opacity="0.5" />
      <circle cx="450" cy="125" r="4" fill="#c7d2fe" opacity="0.5" />
      <circle cx="750" cy="115" r="3" fill="#818cf8" opacity="0.4" />
      <circle cx="950" cy="130" r="4" fill="#a5b4fc" opacity="0.5" />

      {/* Gradients */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#a5b4fc" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Flow connector between sections - curved path from center-bottom to center-top
function FlowConnector({ direction }: { direction: 'left-to-right' | 'right-to-left' }) {
  const isLeftToRight = direction === 'left-to-right';

  // viewBox is wide (1200) and tall (150) to match typical screen proportions
  // Path connects from ~25% width to ~75% width (or vice versa)

  const pathD = isLeftToRight
    ? "M 300 0 C 300 75, 900 75, 900 150"
    : "M 900 0 C 900 75, 300 75, 300 150";

  return (
    <div className="w-full h-32 md:h-40 relative overflow-visible">
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 150"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        {/* Main static path */}
        <path
          d={pathD}
          stroke="url(#flowGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
        {/* Secondary subtle path */}
        <path
          d={isLeftToRight
            ? "M 305 0 C 305 70, 905 80, 905 150"
            : "M 895 0 C 895 70, 295 80, 295 150"
          }
          stroke="url(#flowGradient2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />

        {/* Large slow particle */}
        <circle r="10" fill="url(#particleGradient)">
          <animateMotion dur="8s" repeatCount="indefinite" path={pathD} />
          <animate
            attributeName="opacity"
            values="0;0.7;0.7;0"
            keyTimes="0;0.1;0.9;1"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Medium particle */}
        <circle r="6" fill="url(#particleGradient2)">
          <animateMotion dur="5s" repeatCount="indefinite" path={pathD} begin="2s" />
          <animate
            attributeName="opacity"
            values="0;0.6;0.6;0"
            keyTimes="0;0.1;0.9;1"
            dur="5s"
            repeatCount="indefinite"
            begin="2s"
          />
        </circle>

        {/* Small fast particle */}
        <circle r="4" fill="url(#particleGradient)">
          <animateMotion dur="3.5s" repeatCount="indefinite" path={pathD} begin="0.5s" />
          <animate
            attributeName="opacity"
            values="0;0.5;0.5;0"
            keyTimes="0;0.1;0.9;1"
            dur="3.5s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </circle>

        {/* Tiny fastest particle */}
        <circle r="3" fill="url(#particleGradient2)">
          <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} begin="4s" />
          <animate
            attributeName="opacity"
            values="0;0.4;0.4;0"
            keyTimes="0;0.1;0.9;1"
            dur="2.5s"
            repeatCount="indefinite"
            begin="4s"
          />
        </circle>

        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="flowGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#c7d2fe" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="particleGradient">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="particleGradient2">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

// Architecture node - clickable with hover state
function ArchitectureNode({
  label,
  sublabel,
  beta,
  href
}: {
  label: string;
  sublabel?: string;
  beta?: boolean;
  href?: string;
}) {
  const content = (
    <div className={`relative w-[140px] h-[80px] flex flex-col items-center justify-center rounded-lg border-2 border-primary/40 bg-base-100 text-center px-3 transition-all ${href ? 'cursor-pointer hover:border-primary hover:shadow-md hover:shadow-primary/20' : ''}`}>
      <div className="text-sm font-semibold text-base-content">{label}</div>
      {sublabel && <div className="text-xs text-base-content/70 mt-0.5">{sublabel}</div>}
      {beta && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-medium bg-warning text-warning-content rounded">
          beta
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="no-underline" onClick={(e) => {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
      }}>
        {content}
      </a>
    );
  }

  return content;
}

// Arrow connector with primary color
function Arrow() {
  return (
    <div className="flex items-center px-2">
      <svg className="w-6 h-6 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </div>
  );
}

// Static architecture diagram with clickable nodes
function ArchitectureDiagram() {
  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="flex items-center justify-center gap-2 min-w-[900px] px-4">
        <ArchitectureNode label="Your App" sublabel="Analytics SDK" href="#client-sdk" />
        <Arrow />
        <ArchitectureNode label="Ingest Worker" sublabel="Cloudflare" href="#ingest-worker" />
        <Arrow />
        <ArchitectureNode label="Pipelines" sublabel="Cloudflare" beta href="#pipelines" />
        <Arrow />
        <ArchitectureNode label="R2 + Iceberg" sublabel="Cloudflare" beta href="#r2-iceberg" />
        <Arrow />
        <ArchitectureNode label="DuckDB" sublabel="Cloudflare Container" beta href="#duckdb" />
        <Arrow />
        <ArchitectureNode label="Drizzle-Cube" sublabel="Semantic Layer" href="#drizzle-cube" />
      </div>
    </div>
  );
}

// Clean code block with copy button
function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const grammar = Prism.languages[language] || Prism.languages.plain;
  const highlighted = Prism.highlight(code, grammar, language);

  return (
    <div className="relative">
      <pre className="rounded border border-base-300 bg-base-200/50 p-4 overflow-x-auto text-sm">
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      <button
        className="absolute top-2 right-2 p-1.5 rounded text-base-content/40 hover:text-base-content/70 hover:bg-base-300/50 transition-colors"
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// Detail section component - alternating left/right layout
interface DetailSectionProps {
  id: string;
  title: string;
  description: string;
  align: 'left' | 'right';
  beta?: boolean;
  children: React.ReactNode;
  image?: {
    light: string;
    dark: string;
    alt: string;
  };
  links?: Array<{ label: string; url: string }>;
}

function DetailSection({
  id,
  title,
  description,
  align,
  beta,
  children,
  image,
  links
}: DetailSectionProps) {
  const theme = useTheme();
  const isLeft = align === 'left';

  const textContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-2xl font-bold">{title}</h3>
        {beta && (
          <span className="px-2 py-0.5 text-xs font-medium bg-warning text-warning-content rounded">
            beta
          </span>
        )}
      </div>
      <p className="text-base-content/60 leading-relaxed">{description}</p>
      {children}
      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-2">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              {link.label}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );

  const imageContent = image && (
    <div className="rounded-lg overflow-hidden border border-base-300 shadow-sm">
      <img
        src={theme === 'light' ? image.light : image.dark}
        alt={image.alt}
        className="w-full"
      />
    </div>
  );

  return (
    <section id={id} className="scroll-mt-20">
      <div className="container mx-auto max-w-6xl px-4">
        {image ? (
          <div className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${!isLeft ? 'md:[direction:rtl]' : ''}`}>
            <div className={!isLeft ? 'md:[direction:ltr]' : ''}>{textContent}</div>
            <div className={!isLeft ? 'md:[direction:ltr]' : ''}>{imageContent}</div>
          </div>
        ) : (
          <div className={`max-w-2xl ${isLeft ? '' : 'md:ml-auto'}`}>
            {textContent}
          </div>
        )}
      </div>
    </section>
  );
}

// Quick start step with plain number
function QuickStartStep({ number, title, code }: { number: number; title: string; code: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-primary font-bold text-lg">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-medium mb-2 text-base-content/90">{title}</h4>
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
    <div className="min-h-screen bg-base-100">
      {/* Hero Section */}
      <section className="pt-20 pb-8 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-base-content">
            Stream Analytics Events
            <br />
            <span className="text-primary">to Iceberg on R2</span>
          </h1>
          <p className="text-lg text-base-content/60 mb-10 max-w-2xl mx-auto">
            Analytics.js compatible events to Iceberg tables on Cloudflare.
            Query with DuckDB or the semantic API.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              className="px-6 py-3 bg-primary text-primary-content rounded font-medium hover:bg-primary/90 transition-colors"
              onClick={() => onNavigate('dashboard')}
            >
              Try the Demo
            </button>
            <a
              href="https://github.com/cliftonc/icelight"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-base-300 rounded font-medium hover:bg-base-200 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Decorative flowing lines - below content */}
        <div className="mt-12 -mb-16 relative z-0">
          <DecorativeCurve />
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-base-200/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-2">How It Works</h2>
          <p className="text-center text-base-content/60 mb-6">Click any component to learn more</p>
          <ArchitectureDiagram />
        </div>
      </section>

      {/* Detailed Flow Sections */}
      <div className="py-16 space-y-4">
        {/* 1. Client SDK Integration */}
        <DetailSection
          id="client-sdk"
          title="Client SDK Integration"
          description="Send analytics events using any Analytics.js-compatible SDK or make direct HTTP calls. The ingest worker accepts RudderStack and Segment event formats out of the box."
          align="left"
          image={{
            light: '/event_simulator_light.png',
            dark: '/event_simulator_dark.png',
            alt: 'Event Simulator for testing analytics events',
          }}
          links={[
            { label: 'RudderStack JS SDK', url: 'https://www.rudderstack.com/docs/sources/event-streams/sdks/rudderstack-javascript-sdk/' },
            { label: 'Segment Analytics.js', url: 'https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/' },
          ]}
        >
          {/* Simple text tabs */}
          <div className="flex gap-6 mb-4">
            <button
              className={`pb-1 border-b-2 transition-colors ${
                sdkTab === 'rudderstack'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/60 hover:text-base-content'
              }`}
              onClick={() => setSdkTab('rudderstack')}
            >
              RudderStack / Segment
            </button>
            <button
              className={`pb-1 border-b-2 transition-colors ${
                sdkTab === 'http'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-base-content/60 hover:text-base-content'
              }`}
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
  dataPlaneUrl: 'https://your-worker.workers.dev'
});

analytics.track('Purchase Completed', { revenue: 99.99 });`}
            />
          )}

          {sdkTab === 'http' && (
            <CodeBlock
              language="bash"
              code={`curl -X POST https://your-worker.workers.dev/v1/track \\
  -H "Content-Type: application/json" \\
  -d '{"userId":"user-123","event":"Button Clicked"}'`}
            />
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('simulator')}
              className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try Event Simulator
            </button>
          </div>
        </DetailSection>

        <FlowConnector direction="left-to-right" />

        {/* 2. Ingest Worker */}
        <DetailSection
          id="ingest-worker"
          title="Ingest Worker"
          description="A Cloudflare Worker that receives analytics events, validates the payload, and forwards them to Cloudflare Pipelines. Handles CORS, authentication, and batch processing."
          align="right"
          links={[
            { label: 'Cloudflare Workers', url: 'https://developers.cloudflare.com/workers/' },
          ]}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-1">Available Endpoints</h4>
              <div className="flex flex-wrap gap-2">
                {['/v1/track', '/v1/identify', '/v1/page', '/v1/screen', '/v1/batch'].map((endpoint) => (
                  <code key={endpoint} className="px-2 py-1 text-xs bg-base-200 rounded">{endpoint}</code>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-1">Pipeline Binding</h4>
              <CodeBlock
                language="json"
                code={`{
  "pipelines": [{
    "binding": "PIPELINE",
    "pipeline": "icelight-events-pipeline"
  }]
}`}
              />
            </div>
          </div>
        </DetailSection>

        <FlowConnector direction="right-to-left" />

        {/* 3. Pipelines */}
        <DetailSection
          id="pipelines"
          title="Cloudflare Pipelines"
          description="Cloudflare's streaming data pipeline batches incoming events and writes them to R2 in Apache Iceberg format. Events are buffered and flushed periodically for efficient storage."
          align="left"
          beta
          links={[
            { label: 'Cloudflare Pipelines', url: 'https://developers.cloudflare.com/pipelines/' },
          ]}
        >
          <div>
            <h4 className="font-medium text-sm text-base-content/80 mb-1">Event Schema</h4>
            <CodeBlock
              language="json"
              code={`{
  "type": "object",
  "properties": {
    "message_id": { "type": "string" },
    "type": { "type": "string" },
    "user_id": { "type": "string", "nullable": true },
    "event": { "type": "string", "nullable": true },
    "properties": { "type": "string", "nullable": true },
    "timestamp": { "type": "string", "format": "date-time" }
  }
}`}
            />
          </div>
        </DetailSection>

        <FlowConnector direction="left-to-right" />

        {/* 4. R2 + Iceberg */}
        <DetailSection
          id="r2-iceberg"
          title="R2 + Apache Iceberg"
          description="Events are stored in Cloudflare R2 using the Apache Iceberg table format. This provides columnar storage for fast analytical queries, schema evolution, and time travel capabilities."
          align="right"
          beta
          links={[
            { label: 'R2 Data Catalog', url: 'https://developers.cloudflare.com/r2/data-catalog/' },
            { label: 'Apache Iceberg', url: 'https://iceberg.apache.org/' },
          ]}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Key Benefits</h4>
              <ul className="space-y-1 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Columnar storage</strong> — Fast analytical queries on specific columns</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Schema evolution</strong> — Add columns without rewriting data</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Time travel</strong> — Query historical snapshots of your data</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Open format</strong> — Compatible with Spark, DuckDB, PyIceberg</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('query')}
                className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try R2 SQL Query
              </button>
            </div>
          </div>
        </DetailSection>

        <FlowConnector direction="right-to-left" />

        {/* 5. DuckDB */}
        <DetailSection
          id="duckdb"
          title="DuckDB"
          description="DuckDB runs in a Cloudflare Container, providing full SQL capabilities including joins and aggregations. This overcomes the current R2 SQL beta limitations for complex analytical queries."
          align="left"
          beta
          image={{
            light: '/sql_query_light.png',
            dark: '/sql_query_dark.png',
            alt: 'DuckDB query interface with results',
          }}
          links={[
            { label: 'DuckDB Documentation', url: 'https://duckdb.org/docs/' },
            { label: 'Cloudflare Containers', url: 'https://developers.cloudflare.com/containers/' },
          ]}
        >
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('duckdb')}
              className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try DuckDB Query
            </button>
          </div>
        </DetailSection>

        <FlowConnector direction="left-to-right" />

        {/* 6. Drizzle-Cube */}
        <DetailSection
          id="drizzle-cube"
          title="Drizzle-Cube"
          description="A semantic layer that transforms business questions into optimized SQL queries. Define measures and dimensions once, then use them across dashboards, APIs, and ad-hoc analysis."
          align="right"
          image={{
            light: '/analysis_light.png',
            dark: '/analysis_dark.png',
            alt: 'Analysis page with Drizzle-Cube',
          }}
          links={[
            { label: 'Drizzle-Cube', url: 'https://try.drizzle-cube.dev' },
          ]}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Features</h4>
              <ul className="space-y-1 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Measures & Dimensions</strong> — Define metrics once, reuse everywhere</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Security Context</strong> — Row-level security built in</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Query Optimization</strong> — Automatic SQL generation</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('analysis')}
                className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Try Analysis
              </button>
            </div>
          </div>
        </DetailSection>

        <FlowConnector direction="right-to-left" />

        {/* 7. Analytics Dashboards - Final destination */}
        <DetailSection
          id="dashboards"
          title="Analytics Dashboards"
          description="The final destination for your analytics data. Build interactive dashboards that visualize user behavior, track conversions, and surface actionable insights. This repo provides a toolkit for you to use as a basis to build your own in-house MixPanel or Amplitude."
          align="left"
          image={{
            light: '/dashboard_light.png',
            dark: '/dashboard_dark.png',
            alt: 'Dashboard Preview',
          }}
        >
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm text-base-content/80 mb-2">Visualization Types</h4>
              <ul className="space-y-1 text-sm text-base-content/70">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Funnels</strong> — Track conversion rates through multi-step flows</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>User Journeys</strong> — Visualize paths users take through your app</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Activity Grids</strong> — See engagement patterns over time</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span><strong>Metrics Cards</strong> — Key numbers at a glance with trends</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 bg-primary text-primary-content rounded text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </DetailSection>
      </div>

      {/* Quick Start */}
      <section id="quickstart" className="py-16 px-4 scroll-mt-16">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-10">Quick Start</h2>
          <div className="space-y-6">
            <QuickStartStep
              number={1}
              title="Clone & Install"
              code={`git clone https://github.com/cliftonc/icelight.git
cd icelight && pnpm install`}
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
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16 px-4 bg-base-200/30">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold mb-4">About</h2>
          <p className="text-base-content/60 leading-relaxed">
            I built this to explore Cloudflare's data pipeline and DuckDB, wiring
            everything from Analytics.js to working dashboards. Most components are
            still in beta, so use at your own risk. Questions?{' '}
            <a href="mailto:clifton@guidemode.dev" className="text-primary hover:underline">
              Email me
            </a>{' '}
            or{' '}
            <a
              href="https://github.com/cliftonc/icelight/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              open an issue
            </a>.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-base-content/60">
            <a
              href="https://github.com/cliftonc/icelight"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://developers.cloudflare.com/pipelines/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              Cloudflare Pipelines
            </a>
            <a
              href="https://developers.cloudflare.com/r2/data-catalog/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              R2 Data Catalog
            </a>
            <a
              href="https://try.drizzle-cube.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-base-content transition-colors"
            >
              Drizzle-Cube
            </a>
          </div>
          <p className="mt-6 text-xs text-base-content/40">MIT License</p>
        </div>
      </footer>
    </div>
  );
}
