# SDK Integration Guide

icelight is compatible with RudderStack, Segment, and similar analytics SDKs.

## RudderStack JavaScript SDK

### Installation

```bash
npm install @rudderstack/analytics-js
```

### Configuration

```javascript
import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'your-write-key', // Any value if auth disabled, or your AUTH_TOKEN
  dataPlaneUrl: 'https://icelight-event-ingest.your-subdomain.workers.dev',
  plugins: [],
});

// Make available globally
window.rudderanalytics = analytics;
```

### Usage

```javascript
// Identify a user
analytics.identify('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium',
});

// Track an event
analytics.track('Order Completed', {
  orderId: '12345',
  revenue: 99.99,
  currency: 'USD',
  products: [
    { id: 'prod-1', name: 'Widget', price: 49.99, quantity: 2 }
  ]
});

// Page view
analytics.page('Home', {
  title: 'Welcome to Our App',
  url: window.location.href,
});
```

## Segment Analytics.js

### Installation

```html
<script>
  !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","screen","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware","register"];analytics.factory=function(e){return function(){if(window.analytics.initialized)return window.analytics[e].apply(window.analytics,arguments);var i=Array.prototype.slice.call(arguments);if(["track","screen","alias","group","page","identify"].indexOf(e)>-1){var c=document.querySelector("link[rel='canonical']");i.push({__t:"bpc",c:c&&c.getAttribute("href")||void 0,p:location.pathname,u:location.href,s:location.search,t:document.title,r:document.referrer})}i.unshift(e);analytics.push(i);return analytics}};for(var i=0;i<analytics.methods.length;i++){var key=analytics.methods[i];analytics[key]=analytics.factory(key)}analytics.load=function(key,i){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.setAttribute("data-global-segment-analytics-key",key);t.src="https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n);analytics._loadOptions=i};analytics._writeKey="YOUR_WRITE_KEY";analytics.SNIPPET_VERSION="5.2.1";
    analytics.load("YOUR_WRITE_KEY", {
      integrations: {
        "Segment.io": {
          apiHost: "icelight-event-ingest.your-subdomain.workers.dev/v1"
        }
      }
    });
    analytics.page();
  }}();
</script>
```

## Server-Side (Node.js)

### Using @segment/analytics-node

```javascript
import { Analytics } from '@segment/analytics-node';

const analytics = new Analytics({
  writeKey: 'your-write-key',
  host: 'https://icelight-event-ingest.your-subdomain.workers.dev',
});

// Track server-side events
analytics.track({
  userId: 'user-123',
  event: 'Subscription Renewed',
  properties: {
    plan: 'premium',
    mrr: 99,
  },
});

// Identify
analytics.identify({
  userId: 'user-123',
  traits: {
    email: 'user@example.com',
    subscriptionStatus: 'active',
  },
});
```

### Using fetch directly

```javascript
async function trackEvent(event) {
  const response = await fetch('https://icelight-event-ingest.your-subdomain.workers.dev/v1/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Include if AUTH_ENABLED=true
      // 'Authorization': 'Bearer your-auth-token',
    },
    body: JSON.stringify({
      userId: event.userId,
      event: event.name,
      properties: event.properties,
      timestamp: new Date().toISOString(),
    }),
  });

  return response.json();
}
```

## Batch Events

For high-volume scenarios, use the batch endpoint:

```javascript
async function sendBatch(events) {
  const response = await fetch('https://icelight-event-ingest.your-subdomain.workers.dev/v1/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      batch: events.map(e => ({
        type: e.type || 'track',
        userId: e.userId,
        anonymousId: e.anonymousId,
        event: e.event,
        properties: e.properties,
        timestamp: e.timestamp || new Date().toISOString(),
      })),
      sentAt: new Date().toISOString(),
    }),
  });

  return response.json();
}
```

## Event Schema

All events should include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Event type: track, identify, page, screen, group, alias |
| `userId` | string | One of userId/anonymousId | Logged-in user identifier |
| `anonymousId` | string | One of userId/anonymousId | Anonymous visitor identifier |
| `event` | string | For track | Event name |
| `properties` | object | No | Event properties |
| `traits` | object | No | User/group traits (for identify/group) |
| `context` | object | No | Additional context (auto-populated by SDKs) |
| `timestamp` | string | No | ISO 8601 timestamp (defaults to now) |

## Authentication

If `AUTH_ENABLED=true` on the ingestion worker, include authentication:

```javascript
// Bearer token
headers: {
  'Authorization': 'Bearer your-auth-token'
}

// Or Basic auth (token as username)
headers: {
  'Authorization': 'Basic ' + btoa('your-auth-token:')
}

// Or API key header
headers: {
  'X-API-Key': 'your-auth-token'
}
```
