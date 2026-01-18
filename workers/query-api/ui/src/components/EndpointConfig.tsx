import { useState, useEffect, useCallback, useRef } from 'react';
// Use bundled version to avoid dynamic CDN plugin loading at runtime
import { RudderAnalytics } from '@rudderstack/analytics-js/bundled';

interface EndpointConfigProps {
  onSdkReady: (ready: boolean, analytics: RudderAnalytics | null) => void;
}

function deriveIngestUrl(): string {
  // Always use the current origin - both local dev and production proxy /v1/* routes
  // through the query-api worker, so we stay same-origin and avoid CORS issues
  const { hostname, protocol, port } = window.location;
  return `${protocol}//${hostname}${port ? ':' + port : ''}`;
}

const STORAGE_KEY_ENDPOINT = 'icelight_ingest_endpoint';
const STORAGE_KEY_WRITE_KEY = 'icelight_write_key';

export default function EndpointConfig({ onSdkReady }: EndpointConfigProps) {
  const [endpoint, setEndpoint] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_ENDPOINT) || deriveIngestUrl();
  });
  const [writeKey, setWriteKey] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_WRITE_KEY) || '';
  });
  const [sdkStatus, setSdkStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const analyticsRef = useRef<RudderAnalytics | null>(null);

  const initializeSdk = useCallback(async () => {
    if (!endpoint) {
      setErrorMessage('Data Plane URL is required');
      setSdkStatus('error');
      onSdkReady(false, null);
      return;
    }

    try {
      setSdkStatus('loading');
      setErrorMessage(null);

      // Use writeKey or a dummy value (SDK requires a writeKey but it's just an identifier)
      const key = writeKey || 'anonymous';

      // Create new analytics instance
      const analytics = new RudderAnalytics();
      analyticsRef.current = analytics;

      // Load the SDK with custom config to bypass control plane
      analytics.load(key, endpoint, {
        integrations: { All: false }, // Disable all cloud integrations
        loadIntegration: false, // Don't load any device mode destinations
        // Provide a minimal source config to bypass control plane fetch
        getSourceConfig: () => ({
          source: {
            id: 'local-source',
            name: 'Local Source',
            writeKey: key,
            enabled: true,
            workspaceId: 'local',
            updatedAt: new Date().toISOString(),
            destinations: [],
            config: { statsCollection: { errors: { enabled: false }, metrics: { enabled: false } } },
            sourceDefinition: { id: '', name: '', displayName: '', category: null, createdAt: '', updatedAt: '', options: null, config: null, configSchema: null, uiConfig: null },
            sourceDefinitionId: '',
            createdAt: new Date().toISOString(),
            createdBy: '',
            deleted: false,
            transient: false,
            secretVersion: null,
            liveEventsConfig: { eventUpload: false, eventUploadTS: 0 },
            connections: [],
          },
        }),
      });

      // Wait for ready state
      analytics.ready(() => {
        setSdkStatus('ready');
        onSdkReady(true, analytics);
      });

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
      if (writeKey) {
        localStorage.setItem(STORAGE_KEY_WRITE_KEY, writeKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_WRITE_KEY);
      }

      // Fallback timeout if ready doesn't fire
      setTimeout(() => {
        setSdkStatus((current) => {
          if (current === 'loading') {
            onSdkReady(true, analytics);
            return 'ready';
          }
          return current;
        });
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize SDK';
      setErrorMessage(message);
      setSdkStatus('error');
      onSdkReady(false, null);
    }
  }, [endpoint, writeKey, onSdkReady]);

  // Auto-initialize on mount
  useEffect(() => {
    initializeSdk();
  }, []); // Only run once on mount

  const statusBadge = () => {
    switch (sdkStatus) {
      case 'loading':
        return <span className="badge badge-warning">Initializing...</span>;
      case 'ready':
        return <span className="badge badge-success">SDK Ready</span>;
      case 'error':
        return <span className="badge badge-error">Error</span>;
      default:
        return <span className="badge badge-ghost">Not Initialized</span>;
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-sm font-semibold">
          Endpoint Configuration
          <span className="ml-2">{statusBadge()}</span>
        </h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Data Plane URL</span>
          </label>
          <input
            type="url"
            placeholder="https://icelight-event-ingest.example.workers.dev"
            className="input input-bordered w-full font-mono text-sm"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Write Key</span>
            <span className="label-text-alt text-base-content/60">Optional - for auth</span>
          </label>
          <input
            type="text"
            placeholder="your-write-key"
            className="input input-bordered w-full font-mono text-sm"
            value={writeKey}
            onChange={(e) => setWriteKey(e.target.value)}
          />
        </div>

        {errorMessage && (
          <div className="alert alert-error py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        <div className="card-actions justify-end mt-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={initializeSdk}
            disabled={sdkStatus === 'loading'}
          >
            {sdkStatus === 'loading' ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : null}
            Reinitialize SDK
          </button>
        </div>
      </div>
    </div>
  );
}

export type { RudderAnalytics };
