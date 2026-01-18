import { useCallback } from 'react';
// Use bundled version to avoid dynamic CDN plugin loading at runtime
import type { RudderAnalytics } from '@rudderstack/analytics-js/bundled';

export interface EventLogEntry {
  id: string;
  timestamp: Date;
  type: string;
  userId: string;
  details: string;
  status: 'success' | 'error';
  errorMessage?: string;
}

interface EventButtonsProps {
  userId: string;
  onRegenerateUserId: () => void;
  onEventSent: (entry: EventLogEntry) => void;
  analytics: RudderAnalytics | null;
}

// Sample data generators
function randomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function randomRevenue(): number {
  return Math.round((Math.random() * 500 + 10) * 100) / 100;
}

function randomChoice<T>(choices: T[]): T {
  return choices[Math.floor(Math.random() * choices.length)];
}

const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const PAGE_NAMES = ['Home', 'Products', 'Checkout', 'Profile', 'Settings', 'Dashboard'];
const SCREEN_NAMES = ['HomeScreen', 'ProductList', 'CartView', 'UserProfile', 'SettingsScreen'];
const PLANS = ['free', 'starter', 'pro', 'enterprise'];
const COMPANIES = ['Acme Corp', 'TechStart Inc', 'Global Systems', 'DataFlow Ltd'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'];
const EVENTS = ['Purchase Completed', 'Item Added to Cart', 'Signup Started', 'Feature Used', 'Plan Upgraded'];
const PRODUCTS = ['Widget Pro', 'Super Gadget', 'Premium Service', 'Basic Plan', 'Enterprise Suite'];

function randomName(): string {
  return `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
}

export default function EventButtons({
  userId,
  onRegenerateUserId,
  onEventSent,
  analytics,
}: EventButtonsProps) {
  const createLogEntry = useCallback((
    type: string,
    details: string,
    status: 'success' | 'error' = 'success',
    errorMessage?: string
  ): EventLogEntry => ({
    id: randomId(),
    timestamp: new Date(),
    type,
    userId,
    details,
    status,
    errorMessage,
  }), [userId]);

  const handleTrack = useCallback(() => {
    if (!analytics) return;

    const eventName = randomChoice(EVENTS);
    const properties = {
      orderId: `order-${randomId()}`,
      revenue: randomRevenue(),
      currency: 'USD',
      product: randomChoice(PRODUCTS),
      quantity: Math.floor(Math.random() * 5) + 1,
    };

    try {
      analytics.track(eventName, properties);
      onEventSent(createLogEntry('track', eventName));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onEventSent(createLogEntry('track', eventName, 'error', message));
    }
  }, [analytics, createLogEntry, onEventSent]);

  const handleIdentify = useCallback(() => {
    if (!analytics) return;

    const name = randomName();
    const traits = {
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      name,
      plan: randomChoice(PLANS),
      createdAt: new Date().toISOString(),
    };

    try {
      analytics.identify(userId, traits);
      onEventSent(createLogEntry('identify', traits.email));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onEventSent(createLogEntry('identify', traits.email, 'error', message));
    }
  }, [userId, analytics, createLogEntry, onEventSent]);

  const handlePage = useCallback(() => {
    if (!analytics) return;

    const pageName = randomChoice(PAGE_NAMES);
    const properties = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer || 'direct',
    };

    try {
      // page(category, name, properties)
      analytics.page('App', pageName, properties);
      onEventSent(createLogEntry('page', pageName));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onEventSent(createLogEntry('page', pageName, 'error', message));
    }
  }, [analytics, createLogEntry, onEventSent]);

  const handleScreen = useCallback(() => {
    if (!analytics) return;

    const screenName = randomChoice(SCREEN_NAMES);
    const properties = {
      app_version: '2.1.0',
      platform: 'iOS',
      device_type: randomChoice(['iPhone', 'iPad', 'Android Phone', 'Android Tablet']),
    };

    try {
      // Use track with a screen event type since screen() isn't available in browser SDK
      analytics.track(`Screen Viewed: ${screenName}`, {
        screen_name: screenName,
        ...properties,
      });
      onEventSent(createLogEntry('screen', screenName));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onEventSent(createLogEntry('screen', screenName, 'error', message));
    }
  }, [analytics, createLogEntry, onEventSent]);

  const handleGroup = useCallback(() => {
    if (!analytics) return;

    const groupId = `group-${randomId()}`;
    const traits = {
      name: randomChoice(COMPANIES),
      industry: randomChoice(INDUSTRIES),
      employees: Math.floor(Math.random() * 10000) + 10,
      plan: randomChoice(PLANS),
    };

    try {
      analytics.group(groupId, traits);
      onEventSent(createLogEntry('group', `${traits.name} (${groupId})`));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onEventSent(createLogEntry('group', groupId, 'error', message));
    }
  }, [analytics, createLogEntry, onEventSent]);

  const handleAlias = useCallback(() => {
    if (!analytics) return;

    const newUserId = `user-${randomId()}`;

    try {
      analytics.alias(newUserId, userId);
      onEventSent(createLogEntry('alias', `${userId} -> ${newUserId}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onEventSent(createLogEntry('alias', `${userId} -> ${newUserId}`, 'error', message));
    }
  }, [userId, analytics, createLogEntry, onEventSent]);

  const handleBatch = useCallback(() => {
    if (!analytics) return;

    try {
      // Send multiple events in quick succession
      const batchId = randomId();

      // Identify
      analytics.identify(userId, {
        email: `batch-user-${batchId}@example.com`,
        name: randomName(),
      });

      // Track event 1
      analytics.track('Batch Event 1', {
        batchId,
        sequence: 1,
      });

      // Track event 2
      analytics.track('Batch Event 2', {
        batchId,
        sequence: 2,
      });

      // Page view
      analytics.page('App', 'Batch Test Page', {
        batchId,
      });

      onEventSent(createLogEntry('batch', `4 events (batch-${batchId})`));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      onEventSent(createLogEntry('batch', 'Failed', 'error', message));
    }
  }, [userId, analytics, createLogEntry, onEventSent]);

  const buttonClass = 'btn btn-outline btn-sm';
  const sdkReady = analytics !== null;
  const disabledProps = !sdkReady ? { disabled: true, title: 'SDK not initialized' } : {};

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-base-content/70">Current User ID:</span>
            <code className="bg-base-200 px-2 py-1 rounded text-sm font-mono">{userId}</code>
          </div>
          <button
            className="btn btn-ghost btn-xs"
            onClick={onRegenerateUserId}
            title="Generate new user ID"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Generate New
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button className={`${buttonClass} btn-primary`} onClick={handleTrack} {...disabledProps}>
            Track
          </button>
          <button className={`${buttonClass} btn-secondary`} onClick={handleIdentify} {...disabledProps}>
            Identify
          </button>
          <button className={`${buttonClass} btn-accent`} onClick={handlePage} {...disabledProps}>
            Page
          </button>
          <button className={`${buttonClass} btn-info`} onClick={handleScreen} {...disabledProps}>
            Screen
          </button>
          <button className={`${buttonClass} btn-success`} onClick={handleGroup} {...disabledProps}>
            Group
          </button>
          <button className={`${buttonClass} btn-warning`} onClick={handleAlias} {...disabledProps}>
            Alias
          </button>
          <button className={`${buttonClass} btn-error col-span-2`} onClick={handleBatch} {...disabledProps}>
            Batch (4 events)
          </button>
        </div>

        {!sdkReady && (
          <div className="text-center mt-2 text-sm text-base-content/60">
            Configure and initialize SDK above to send events
          </div>
        )}
      </div>
    </div>
  );
}
