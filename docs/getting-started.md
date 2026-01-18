# Getting Started with icelight

This guide walks you through setting up icelight from scratch.

## Prerequisites

1. **Cloudflare Account** with R2 enabled
2. **Node.js 18+** and **pnpm 8+**
3. **Wrangler CLI** authenticated with your Cloudflare account

```bash
# Install wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

## Step 1: Clone and Install

```bash
git clone https://github.com/your-org/icelight.git
cd icelight
pnpm install
pnpm build
```

## Step 2: Configure Environment

Copy the environment template:

```bash
cp templates/.env.example .env
```

Edit `.env` with your settings:

```bash
# Cloudflare credentials (for query worker)
CF_ACCOUNT_ID=your-account-id
CF_API_TOKEN=your-api-token

# Pipeline configuration
BUCKET_NAME=my-analytics-data
NAMESPACE=analytics
TABLE_NAME=events
```

## Step 3: Create Infrastructure

Run the setup script to create all Cloudflare resources:

```bash
pnpm launch
```

This creates:
- R2 bucket with Data Catalog enabled
- Pipeline stream with event schema
- Pipeline sink to R2 Data Catalog (Iceberg)
- Pipeline connecting stream to sink

## Step 4: Configure Workers

### Ingestion Worker

Edit `workers/event-ingest/wrangler.jsonc` to uncomment the pipeline binding:

```jsonc
{
  "pipelines": [
    {
      "pipeline": "icelight-events-pipeline",
      "binding": "PIPELINE"
    }
  ]
}
```

If you want authentication:

```bash
wrangler secret put AUTH_TOKEN --config workers/event-ingest/wrangler.jsonc
```

And set `AUTH_ENABLED=true` in the wrangler config.

### Query Worker

Set required secrets:

```bash
wrangler secret put CF_ACCOUNT_ID --config workers/query-api/wrangler.jsonc
wrangler secret put CF_API_TOKEN --config workers/query-api/wrangler.jsonc
```

Set the warehouse name in `workers/query-api/wrangler.jsonc`:

```jsonc
{
  "vars": {
    "WAREHOUSE_NAME": "your-warehouse-name"
  }
}
```

## Step 5: Deploy Workers

```bash
# Deploy ingestion worker
pnpm deploy:ingest

# Deploy query worker
pnpm deploy:query
```

## Step 6: Test the Setup

### Send a test event

```bash
curl -X POST https://icelight-event-ingest.your-subdomain.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "event": "Test Event",
    "properties": {
      "test": true
    }
  }'
```

### Query the data

Wait a minute for the pipeline to process, then:

```bash
curl -X POST https://icelight-query-api.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

## Next Steps

- [Configure an Analytics SDK](sdk-integration.md)
- [Learn about configuration options](configuration.md)
- [Query your data](querying.md)
