import { type CubeJsonConfig, mergeCubeConfig } from '@cdpflare/query';

/**
 * Cube JSON field configuration for this deployment
 *
 * Uses defaults from @cdpflare/query plus any custom fields below.
 * To replace defaults entirely, export createCubeConfig({...}) instead.
 */
export const cubeConfig: CubeJsonConfig = mergeCubeConfig({
  // Add custom properties fields (merged with defaults)
  properties: [
    // Example: { name: 'customField', title: 'Custom Field', path: '$.custom_field', type: 'string' },
  ],

  // Add custom traits fields (merged with defaults)
  traits: [
    // Example: { name: 'department', title: 'Department', path: '$.department', type: 'string' },
  ],

  // Add custom context fields (merged with defaults)
  context: [
    // Example: { name: 'region', title: 'Region', path: '$.geo.region', type: 'string' },
  ],
});

// Or to use only defaults:
// import { DEFAULT_CUBE_CONFIG } from '@cdpflare/query';
// export const cubeConfig = DEFAULT_CUBE_CONFIG;

// Or to completely replace defaults:
// import { createCubeConfig } from '@cdpflare/query';
// export const cubeConfig = createCubeConfig({
//   properties: [...],
//   traits: [...],
//   context: [...],
// });
