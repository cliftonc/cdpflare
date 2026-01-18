/**
 * JSON extraction helpers for Drizzle Cube
 *
 * Builds SQL expressions for extracting fields from JSON columns
 * using DuckDB's JSON functions.
 */

import { sql, type SQL } from 'drizzle-orm';
import { events } from '../schema/events.js';
import type { JsonFieldConfig } from './json-config.js';

type JsonColumn = 'properties' | 'traits' | 'context';

/**
 * Build a SQL expression for extracting a JSON field using DuckDB syntax
 *
 * Note: The path is inlined as a literal string using sql.raw() rather than
 * being parameterized, because DuckDB's JSON functions expect literal paths.
 */
export function jsonExtract(
  column: JsonColumn,
  path: string,
  type: 'string' | 'number' | 'boolean' = 'string'
): SQL {
  const col = events[column];
  // Escape single quotes in path and inline as literal
  const safePath = path.replace(/'/g, "''");
  const pathLiteral = sql.raw(`'${safePath}'`);

  switch (type) {
    case 'number':
      return sql<number>`CAST(json_extract(${col}, ${pathLiteral}) AS DOUBLE)`;
    case 'boolean':
      return sql<boolean>`CAST(json_extract(${col}, ${pathLiteral}) AS BOOLEAN)`;
    case 'string':
    default:
      return sql<string>`json_extract_string(${col}, ${pathLiteral})`;
  }
}

/**
 * Dimension definition type for Drizzle Cube
 */
export interface JsonDimension {
  name: string;
  title: string;
  type: 'string' | 'number' | 'boolean';
  sql: SQL;
  shown?: boolean;
}

/**
 * Build dimension definition from JSON field config
 */
export function buildJsonDimension(
  column: JsonColumn,
  config: JsonFieldConfig
): JsonDimension {
  return {
    name: config.name,
    title: config.title ?? config.name,
    type: config.type,
    sql: jsonExtract(column, config.path, config.type),
    shown: config.shown ?? true,
  };
}

/**
 * Build all JSON dimensions for a column from config array
 */
export function buildJsonDimensions(
  column: JsonColumn,
  configs: JsonFieldConfig[]
): Record<string, JsonDimension> {
  const dimensions: Record<string, JsonDimension> = {};

  for (const config of configs) {
    dimensions[config.name] = buildJsonDimension(column, config);
  }

  return dimensions;
}
