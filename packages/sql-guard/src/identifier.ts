/**
 * Result of identifier validation
 */
export interface IdentifierValidationResult {
  valid: boolean;
  error?: string;
  /** The sanitized identifier (quoted if necessary) */
  sanitized?: string;
}

/**
 * Configuration for identifier validation
 */
export interface IdentifierConfig {
  /** Allowlist of namespaces/schemas (default: ['analytics']) */
  allowedNamespaces?: string[];
  /** Maximum identifier length (default: 63, PostgreSQL standard) */
  maxLength?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_IDENTIFIER_CONFIG: Required<IdentifierConfig> = {
  allowedNamespaces: ['analytics'],
  maxLength: 63,
};

/**
 * SQL keywords that cannot be used as unquoted identifiers
 */
const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null',
  'true', 'false', 'like', 'between', 'exists', 'case', 'when', 'then',
  'else', 'end', 'join', 'inner', 'outer', 'left', 'right', 'full',
  'cross', 'on', 'as', 'order', 'by', 'group', 'having', 'limit',
  'offset', 'union', 'intersect', 'except', 'all', 'distinct',
  'insert', 'into', 'values', 'update', 'set', 'delete', 'drop',
  'create', 'alter', 'table', 'index', 'view', 'database', 'schema',
  'truncate', 'grant', 'revoke', 'primary', 'key', 'foreign', 'references',
  'constraint', 'default', 'check', 'unique', 'cascade', 'restrict',
]);

/**
 * Valid identifier pattern: starts with letter or underscore, followed by
 * letters, digits, or underscores
 */
const IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate a SQL identifier (table name, schema name, etc.)
 *
 * @param identifier - The identifier to validate
 * @param config - Optional configuration
 * @returns Validation result with sanitized identifier
 */
export function validateIdentifier(identifier: string, config?: IdentifierConfig): IdentifierValidationResult {
  const cfg: Required<IdentifierConfig> = { ...DEFAULT_IDENTIFIER_CONFIG, ...config };

  // Check for empty identifier
  if (!identifier || identifier.trim().length === 0) {
    return { valid: false, error: 'Identifier is empty' };
  }

  const trimmed = identifier.trim();

  // Check length
  if (trimmed.length > cfg.maxLength) {
    return { valid: false, error: `Identifier exceeds maximum length of ${cfg.maxLength} characters` };
  }

  // Check pattern
  if (!IDENTIFIER_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Identifier must start with a letter or underscore and contain only letters, digits, or underscores',
    };
  }

  // Check if it's a reserved keyword
  if (SQL_KEYWORDS.has(trimmed.toLowerCase())) {
    return { valid: false, error: `'${trimmed}' is a SQL reserved keyword` };
  }

  // The identifier is valid - return it as-is (no quoting needed for valid identifiers)
  return { valid: true, sanitized: trimmed };
}

/**
 * Validate a namespace (schema) identifier with allowlist check
 *
 * @param namespace - The namespace to validate
 * @param config - Optional configuration with allowlist
 * @returns Validation result
 */
export function validateNamespace(namespace: string, config?: IdentifierConfig): IdentifierValidationResult {
  const cfg: Required<IdentifierConfig> = { ...DEFAULT_IDENTIFIER_CONFIG, ...config };

  // First validate as a regular identifier
  const result = validateIdentifier(namespace, config);
  if (!result.valid) {
    return result;
  }

  // Check against allowlist if specified
  if (cfg.allowedNamespaces.length > 0) {
    const normalizedNamespace = namespace.toLowerCase();
    const allowed = cfg.allowedNamespaces.map(ns => ns.toLowerCase());
    if (!allowed.includes(normalizedNamespace)) {
      return {
        valid: false,
        error: `Namespace '${namespace}' is not in the allowed list: [${cfg.allowedNamespaces.join(', ')}]`,
      };
    }
  }

  return result;
}

/**
 * Validate a qualified table name (namespace.table)
 *
 * @param qualifiedName - The qualified name to validate (e.g., "analytics.events")
 * @param config - Optional configuration
 * @returns Validation result with sanitized qualified name
 */
export function validateQualifiedTableName(qualifiedName: string, config?: IdentifierConfig): IdentifierValidationResult {
  const parts = qualifiedName.split('.');

  if (parts.length !== 2) {
    return { valid: false, error: 'Qualified table name must be in format "namespace.table"' };
  }

  const [namespace, tableName] = parts;

  const nsResult = validateNamespace(namespace, config);
  if (!nsResult.valid) {
    return { valid: false, error: `Invalid namespace: ${nsResult.error}` };
  }

  const tableResult = validateIdentifier(tableName, config);
  if (!tableResult.valid) {
    return { valid: false, error: `Invalid table name: ${tableResult.error}` };
  }

  return {
    valid: true,
    sanitized: `${nsResult.sanitized}.${tableResult.sanitized}`,
  };
}
