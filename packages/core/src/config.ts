/**
 * Configuration types for icelight
 */

export interface IngestConfig {
  /** Enable authentication (default: false) */
  authEnabled?: boolean;
  /** Allowed origins for CORS (default: ['*']) */
  allowedOrigins?: string[];
}

export interface QueryConfig {
  /** Cloudflare account ID */
  accountId: string;
  /** Warehouse name for R2 SQL */
  warehouseName: string;
  /** Default result format */
  resultFormat?: 'json' | 'csv';
  /** Maximum query timeout in seconds */
  queryTimeout?: number;
}

export interface PipelineConfig {
  /** R2 bucket name */
  bucketName: string;
  /** Namespace for the Iceberg table */
  namespace: string;
  /** Table name */
  tableName: string;
  /** Compression type (default: zstd) */
  compression?: 'zstd' | 'snappy' | 'gzip' | 'none';
  /** Roll interval in seconds (default: 60) */
  rollInterval?: number;
}

export const DEFAULT_INGEST_CONFIG: IngestConfig = {
  authEnabled: false,
  allowedOrigins: ['*'],
};

export const DEFAULT_PIPELINE_CONFIG: Partial<PipelineConfig> = {
  compression: 'zstd',
  rollInterval: 60,
};
