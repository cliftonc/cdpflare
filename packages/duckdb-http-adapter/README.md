# @icelight/duckdb-http-adapter

HTTP adapter for drizzle-duckdb to query the icelight DuckDB API worker.

## Overview

This package provides an HTTP-based implementation of the DuckDB connection interface expected by drizzle-duckdb, allowing you to use drizzle with a remote DuckDB instance accessed via HTTP.

## Package Structure

```
packages/duckdb-http-adapter/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Public exports
│   ├── types.ts          # Interface definitions
│   ├── connection.ts     # HttpDuckDBConnection class
│   ├── result.ts         # HttpQueryResult/HttpStreamResult
│   └── prepared.ts       # HttpPreparedStatement
└── test/
    └── basic.ts          # Integration tests
```

## Features

- **HttpDuckDBConnection**: Main class implementing the DuckDB connection interface
- **run()**: Execute queries and return results
- **stream()**: Iterate over results asynchronously
- **prepare()**: Create prepared statements with parameter binding
- **Error handling**: Proper timeout and error message propagation
- **Authentication**: Optional Bearer token support

## Usage

```typescript
import { drizzle } from 'drizzle-duckdb';
import { HttpDuckDBConnection } from '@icelight/duckdb-http-adapter';

// Create connection to your DuckDB API worker
const connection = new HttpDuckDBConnection({
  endpoint: 'https://icelight-duckdb-api.example.workers.dev',
  token: process.env.API_TOKEN, // optional
});

// Use with drizzle
const db = drizzle(connection);

// Execute queries
const events = await db.execute(sql`
  SELECT * FROM r2_datalake.analytics.events LIMIT 10
`);
```

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `endpoint` | string | Yes | - | Base URL of the DuckDB API endpoint |
| `token` | string | No | - | Bearer token for API authentication |
| `timeout` | number | No | 30000 | Request timeout in milliseconds |
| `fetch` | function | No | globalThis.fetch | Custom fetch function |

## Direct Connection Usage

You can also use the connection directly without drizzle:

```typescript
import { HttpDuckDBConnection } from '@icelight/duckdb-http-adapter';

const connection = new HttpDuckDBConnection({
  endpoint: 'https://icelight-duckdb-api.example.workers.dev',
  timeout: 60000, // 60 seconds for cold starts
});

// Execute a query
const result = await connection.run('SELECT * FROM r2_datalake.analytics.events LIMIT 5');
console.log('Columns:', result.columnNames());
console.log('Rows:', await result.getRowsJS());

// Stream results
const stream = await connection.stream('SELECT * FROM large_table');
for await (const row of stream) {
  console.log(row);
}

// Prepared statements
const stmt = await connection.prepare('SELECT * FROM events WHERE user_id = $1');
stmt.bind('user-123');
const result = await stmt.run();
stmt.destroySync();
```

## Known Limitations

- **No prepared statement caching**: Each query execution makes an HTTP request
- **No true streaming**: Results are fully materialized before iteration
- **No transactions**: Single query per request
- **Parameter binding**: Basic support via string substitution; complex types may need work

## Build

```bash
pnpm build      # Compile TypeScript
pnpm typecheck  # Type check without emitting
pnpm clean      # Remove dist/
pnpm test       # Run integration tests
```

## Testing

The test script runs against the deployed DuckDB API worker:

```bash
# Run tests (no auth required for public endpoint)
pnpm test

# Run tests with authentication
API_TOKEN=your-token pnpm test
```
