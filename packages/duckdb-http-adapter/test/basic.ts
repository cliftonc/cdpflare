/**
 * Basic test script for the HTTP DuckDB adapter
 *
 * This script tests the adapter against the deployed icelight DuckDB API worker.
 *
 * Usage:
 *   pnpm tsx test/basic.ts
 *
 * With authentication:
 *   API_TOKEN=your-token pnpm tsx test/basic.ts
 */

import { HttpDuckDBConnection } from '../src/index.js';

const ENDPOINT = 'https://icelight-duckdb-api.clifton-cunningham.workers.dev';
const API_TOKEN = process.env.API_TOKEN;

async function main() {
  console.log('Testing HttpDuckDBConnection');
  console.log('============================\n');

  // Create connection
  const connection = new HttpDuckDBConnection({
    endpoint: ENDPOINT,
    token: API_TOKEN,
    timeout: 60000, // 60 seconds for cold starts
  });

  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Auth: ${API_TOKEN ? 'Bearer token provided' : 'None'}\n`);

  // Test 1: Simple query using run()
  console.log('Test 1: Simple SELECT query via run()');
  console.log('--------------------------------------');
  try {
    const result = await connection.run('SELECT 1 as num, \'hello\' as greeting');
    console.log('Columns:', result.columnNames());
    console.log('Rows:', await result.getRowsJS());
    console.log('✓ Test 1 passed\n');
  } catch (error) {
    console.error('✗ Test 1 failed:', error);
  }

  // Test 2: Query R2 Data Catalog
  console.log('Test 2: Query R2 Data Catalog (Iceberg table)');
  console.log('----------------------------------------------');
  try {
    const result = await connection.run(
      'SELECT * FROM r2_datalake.analytics.events LIMIT 5'
    );
    console.log('Columns:', result.columnNames());
    const rows = await result.getRowsJS();
    console.log(`Row count: ${rows.length}`);
    if (rows.length > 0) {
      console.log('First row:', rows[0]);
    }
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('✗ Test 2 failed:', error);
    console.log('(This may fail if no events have been ingested yet)\n');
  }

  // Test 3: Stream results
  console.log('Test 3: Stream results');
  console.log('----------------------');
  try {
    const stream = await connection.stream('SELECT 1 as a, 2 as b UNION ALL SELECT 3, 4');
    console.log('Columns:', stream.columnNames());
    console.log('Streaming rows:');
    for await (const row of stream) {
      console.log('  Row:', row);
    }
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('✗ Test 3 failed:', error);
  }

  // Test 4: Prepared statement
  console.log('Test 4: Prepared statement');
  console.log('--------------------------');
  try {
    const stmt = await connection.prepare('SELECT $1::INTEGER as value');
    stmt.bind(42);
    const result = await stmt.run();
    console.log('Columns:', result.columnNames());
    console.log('Rows:', await result.getRowsJS());
    stmt.destroySync();
    console.log('✓ Test 4 passed\n');
  } catch (error) {
    console.error('✗ Test 4 failed:', error);
  }

  // Test 5: Error handling
  console.log('Test 5: Error handling (invalid SQL)');
  console.log('------------------------------------');
  try {
    await connection.run('SELECT * FROM nonexistent_table_xyz');
    console.log('✗ Test 5 failed: Expected error was not thrown\n');
  } catch (error) {
    if (error instanceof Error) {
      console.log('Error caught (expected):', error.message.substring(0, 100));
      console.log('✓ Test 5 passed\n');
    } else {
      console.log('✗ Test 5 failed: Unexpected error type\n');
    }
  }

  console.log('Tests complete!');
}

main().catch(console.error);
