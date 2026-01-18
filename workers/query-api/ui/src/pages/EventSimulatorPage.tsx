import { useState, useCallback } from 'react';
// Use bundled version to avoid dynamic CDN plugin loading at runtime
import type { RudderAnalytics } from '@rudderstack/analytics-js/bundled';
import EndpointConfig from '../components/EndpointConfig.tsx';
import EventButtons, { type EventLogEntry } from '../components/EventButtons.tsx';
import EventLog from '../components/EventLog.tsx';

function generateUserId(): string {
  return `user-${Math.random().toString(36).substring(2, 10)}`;
}

export default function EventSimulatorPage() {
  const [analytics, setAnalytics] = useState<RudderAnalytics | null>(null);
  const [userId, setUserId] = useState(generateUserId);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);

  const handleSdkReady = useCallback((ready: boolean, analyticsInstance: RudderAnalytics | null) => {
    setAnalytics(ready ? analyticsInstance : null);
  }, []);

  const handleRegenerateUserId = useCallback(() => {
    setUserId(generateUserId());
  }, []);

  const handleEventSent = useCallback((entry: EventLogEntry) => {
    setEventLog((prev) => [...prev, entry]);
  }, []);

  const handleClearLog = useCallback(() => {
    setEventLog([]);
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Event Simulator</h1>
          <p className="text-base-content/60 mt-1">
            Send test events to your ingestion endpoint using the RudderStack SDK.
          </p>
        </div>

        {/* Info Alert */}
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Events may take a few minutes to flush through to Iceberg tables and appear in query results.
          </span>
        </div>

        {/* Endpoint Configuration */}
        <EndpointConfig onSdkReady={handleSdkReady} />

        {/* Event Buttons */}
        <EventButtons
          userId={userId}
          onRegenerateUserId={handleRegenerateUserId}
          onEventSent={handleEventSent}
          analytics={analytics}
        />

        {/* Event Log */}
        <EventLog entries={eventLog} onClear={handleClearLog} />
      </div>
    </div>
  );
}
