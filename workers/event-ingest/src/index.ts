import { createIngestApp } from '@icelight/ingest';

// Create and export the Hono app
// The app handles all analytics SDK endpoints:
// - POST /v1/batch - Batch events (primary endpoint)
// - POST /v1/track - Single track event
// - POST /v1/identify - Single identify event
// - POST /v1/page - Single page event
// - POST /v1/screen - Single screen event
// - POST /v1/group - Single group event
// - POST /v1/alias - Single alias event
// - GET /health - Health check

export default createIngestApp();
