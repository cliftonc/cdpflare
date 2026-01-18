# Querying Data

cdpflare stores events in Apache Iceberg tables that can be queried via multiple methods.

## Query API Worker

The simplest way to query data is via the included query worker.

### Execute SQL Query

```bash
curl -X POST https://cdpflare-query-api.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM analytics.events WHERE type = '\''track'\'' LIMIT 100",
    "format": "json"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sql` | string | Yes | SQL query to execute |
| `format` | string | No | Output format: `json` (default) or `csv` |

**Response (JSON):**

```json
{
  "success": true,
  "data": [
    {
      "message_id": "abc123",
      "type": "track",
      "user_id": "user-123",
      "event": "Purchase Completed",
      "properties": {"revenue": 99.99},
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "columns": [
      {"name": "message_id", "type": "string"},
      {"name": "type", "type": "string"}
    ],
    "rowCount": 1,
    "executionTime": 150
  }
}
```

### List Tables

```bash
curl https://cdpflare-query-api.your-subdomain.workers.dev/tables/analytics
```

### Describe Table

```bash
curl https://cdpflare-query-api.your-subdomain.workers.dev/tables/analytics/events
```

## Drizzle Cube Semantic API

The query worker includes a semantic layer powered by [Drizzle Cube](https://github.com/nickmitchko/drizzle-cube) that provides a structured query API with automatic JSON field extraction.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/cubejs-api/v1/meta` | Get available cubes, dimensions, and measures |
| POST | `/cubejs-api/v1/load` | Execute a semantic query |
| POST | `/cubejs-api/v1/dry-run` | Validate query and preview SQL |

### Example Query

```bash
curl -X POST https://cdpflare-query-api.your-subdomain.workers.dev/cubejs-api/v1/load \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "dimensions": ["Events.type", "Events.product", "Events.email"],
      "measures": ["Events.count", "Events.totalRevenue"],
      "filters": [
        {"dimension": "Events.type", "operator": "equals", "values": ["track"]}
      ],
      "limit": 100
    }
  }'
```

### Configuring JSON Field Extraction

The semantic API automatically extracts fields from the `properties`, `traits`, and `context` JSON columns. Each deployment can customize which fields are exposed as dimensions.

#### Configuration File

Edit `workers/query-api/src/cube-config.ts` to customize JSON field extraction:

```typescript
import { type CubeJsonConfig, mergeCubeConfig } from '@cdpflare/query';

// Merge custom fields with defaults
export const cubeConfig: CubeJsonConfig = mergeCubeConfig({
  // Add custom properties fields
  properties: [
    { name: 'customField', title: 'Custom Field', path: '$.custom_field', type: 'string' },
    { name: 'score', title: 'Score', path: '$.score', type: 'number' },
  ],

  // Add custom traits fields
  traits: [
    { name: 'department', title: 'Department', path: '$.department', type: 'string' },
  ],

  // Add custom context fields
  context: [
    { name: 'region', title: 'Region', path: '$.geo.region', type: 'string' },
  ],
});
```

#### Field Configuration Options

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Dimension name (camelCase, used in queries) |
| `title` | string | No | Human-readable title for UI |
| `path` | string | Yes | JSONPath to extract (e.g., `$.field`, `$.nested.field`) |
| `type` | string | Yes | Data type: `string`, `number`, or `boolean` |
| `shown` | boolean | No | Whether to show in UI (default: true) |

#### Using Defaults Only

To use only the built-in defaults without customization:

```typescript
import { DEFAULT_CUBE_CONFIG } from '@cdpflare/query';
export const cubeConfig = DEFAULT_CUBE_CONFIG;
```

#### Replacing Defaults Entirely

To completely replace the default configuration:

```typescript
import { createCubeConfig } from '@cdpflare/query';

export const cubeConfig = createCubeConfig({
  properties: [
    { name: 'myField', title: 'My Field', path: '$.my_field', type: 'string' },
  ],
  traits: [],
  context: [],
});
```

### Default Dimensions

The following JSON fields are extracted by default:

**Properties (from track/page/screen events):**
- `orderId`, `revenue`, `currency`, `product`, `quantity`
- `url`, `title`, `referrer` (page events)
- `batchId`, `sequence` (batch events)
- `screenName`, `appVersion`, `platform`, `deviceType` (screen events)

**Traits (from identify/group events):**
- `email`, `traitName`, `plan`, `createdAt`
- `industry`, `employees` (group events)

**Context (environment data):**
- `ipAddress`, `userAgent`, `locale`, `timezone`
- `ctxDeviceType`, `ctxDeviceId`, `deviceManufacturer`, `deviceModel`
- `osName`, `osVersion`
- `pageUrl`, `pagePath`, `pageTitle`, `pageReferrer`
- `campaignSource`, `campaignMedium`, `campaignName`, `campaignTerm`, `campaignContent`
- `libraryName`, `libraryVersion`
- `screenWidth`, `screenHeight`, `screenDensity`

### Default Measures

| Measure | Description |
|---------|-------------|
| `Events.count` | Total event count |
| `Events.uniqueUsers` | Count of distinct user IDs |
| `Events.uniqueAnonymous` | Count of distinct anonymous IDs |
| `Events.totalRevenue` | Sum of revenue (when revenue field exists) |
| `Events.avgRevenue` | Average revenue (when revenue field exists) |

## Wrangler CLI

Query directly via the Wrangler CLI:

```bash
npx wrangler r2 sql query "your-warehouse-name" \
  "SELECT type, COUNT(*) as count FROM analytics.events GROUP BY type"
```

## External Query Engines

### PyIceberg (Python)

```python
from pyiceberg.catalog import load_catalog

catalog = load_catalog(
    "cloudflare",
    **{
        "type": "rest",
        "uri": "https://your-warehouse.r2.cloudflarestorage.com",
        "token": "your-cloudflare-api-token"
    }
)

# Load table
table = catalog.load_table("analytics.events")

# Query with filters
df = table.scan(
    row_filter="type = 'track' AND timestamp > '2024-01-01'"
).to_pandas()

print(df.head())
```

### DuckDB

```python
import duckdb

# Connect to Iceberg catalog
conn = duckdb.connect()
conn.execute("""
    INSTALL iceberg;
    LOAD iceberg;
""")

# Query Iceberg table
df = conn.execute("""
    SELECT * FROM iceberg_scan(
        's3://your-bucket/analytics/events',
        allow_moved_paths = true
    )
    WHERE type = 'track'
    LIMIT 100
""").fetchdf()
```

### Apache Spark

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder \
    .appName("cdpflare-query") \
    .config("spark.sql.catalog.cloudflare", "org.apache.iceberg.spark.SparkCatalog") \
    .config("spark.sql.catalog.cloudflare.type", "rest") \
    .config("spark.sql.catalog.cloudflare.uri", "https://your-warehouse.r2.cloudflarestorage.com") \
    .config("spark.sql.catalog.cloudflare.token", "your-token") \
    .getOrCreate()

df = spark.sql("""
    SELECT user_id, event, properties, timestamp
    FROM cloudflare.analytics.events
    WHERE type = 'track'
    ORDER BY timestamp DESC
    LIMIT 1000
""")

df.show()
```

## Event Schema

The events table has the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `message_id` | string | Unique event identifier |
| `type` | string | Event type (track, identify, page, etc.) |
| `user_id` | string | User identifier (nullable) |
| `anonymous_id` | string | Anonymous identifier (nullable) |
| `event` | string | Event name (for track events) |
| `name` | string | Page/screen name |
| `properties` | json | Event properties |
| `traits` | json | User/group traits |
| `context` | json | Event context |
| `timestamp` | timestamp | When event occurred |
| `sent_at` | timestamp | When SDK sent event |
| `received_at` | timestamp | When server received event |

## Example Queries

### Event Counts by Type

```sql
SELECT type, COUNT(*) as count
FROM analytics.events
GROUP BY type
ORDER BY count DESC
```

### Daily Active Users

```sql
SELECT
  DATE(timestamp) as date,
  COUNT(DISTINCT COALESCE(user_id, anonymous_id)) as dau
FROM analytics.events
GROUP BY DATE(timestamp)
ORDER BY date DESC
LIMIT 30
```

### Top Events

```sql
SELECT event, COUNT(*) as count
FROM analytics.events
WHERE type = 'track'
GROUP BY event
ORDER BY count DESC
LIMIT 20
```

### User Journey

```sql
SELECT timestamp, type, event, name, properties
FROM analytics.events
WHERE user_id = 'user-123'
ORDER BY timestamp
LIMIT 100
```

### Revenue by Day

```sql
SELECT
  DATE(timestamp) as date,
  SUM(CAST(JSON_EXTRACT(properties, '$.revenue') AS DECIMAL)) as revenue
FROM analytics.events
WHERE type = 'track' AND event = 'Purchase Completed'
GROUP BY DATE(timestamp)
ORDER BY date DESC
```

## Limitations

### R2 SQL (Current Beta)

- **Read-only**: Only SELECT queries supported
- **No joins**: Cannot join tables (coming H1 2026)
- **No aggregations**: GROUP BY, COUNT, SUM not yet supported (coming H1 2026)
- **Limited functions**: Basic SQL functions only

For complex queries, export data to PyIceberg, DuckDB, or Spark.

### Data Latency

- Events are batched and written to Parquet files based on `ROLL_INTERVAL` (default: 60 seconds)
- There may be a 1-2 minute delay between ingestion and query availability
- R2 Data Catalog compaction runs automatically (2GB/hour during beta)
