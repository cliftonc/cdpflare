// Hono app factory
export { createQueryApp } from './handler.js';

// Types
export type { QueryEnv, QueryRequest, QueryResponse, QueryAppOptions } from './handler.js';

// SQL proxy utilities
export { executeQuery, listTables, describeTable } from './sql-proxy.js';
export type { R2SqlConfig, R2SqlResult } from './sql-proxy.js';

// Result formatting
export { formatResult } from './formatter.js';
export type { OutputFormat, FormattedResult } from './formatter.js';

// Drizzle schema for events
export { events } from './schema/events.js';
export type { Event, NewEvent } from './schema/events.js';

// Drizzle-cube definitions
export { createEventsCube, eventsCube, allCubes } from './cubes/events.js';

// JSON configuration for cubes
export {
  DEFAULT_CUBE_CONFIG,
  mergeCubeConfig,
  createCubeConfig,
} from './cubes/json-config.js';
export type { JsonFieldConfig, CubeJsonConfig } from './cubes/json-config.js';

// JSON helpers (for advanced usage)
export { jsonExtract, buildJsonDimension, buildJsonDimensions } from './cubes/json-helpers.js';
export type { JsonDimension } from './cubes/json-helpers.js';

// Default export - ready-to-use Hono app
export { default } from './handler.js';
