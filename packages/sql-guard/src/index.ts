// SQL validation
export {
  validateSql,
  isReadOnlyQuery,
  type SqlGuardConfig,
  type ValidationResult,
} from './validator.js';

// Identifier validation
export {
  validateIdentifier,
  validateNamespace,
  validateQualifiedTableName,
  type IdentifierValidationResult,
  type IdentifierConfig,
} from './identifier.js';
