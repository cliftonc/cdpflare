/**
 * Dashboard CRUD routes for Hono
 */
import { Hono } from 'hono';
import { eq, and, desc, asc, ne } from 'drizzle-orm';
import { createDb } from '../db/index.js';
import { dashboards } from '../db/schema.js';
import type {
  DashboardConfig,
  DashboardRecord,
  CreateDashboardInput,
  UpdateDashboardInput,
  DashboardListResponse,
  DashboardResponse,
} from './types.js';
import { defaultDashboardConfig } from './default-dashboard.js';

/**
 * Environment type for dashboard routes
 */
interface DashboardEnv {
  DB?: D1Database;
}

/**
 * Generate a unique ID for dashboards
 */
function generateId(): string {
  return `dash_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Parse dashboard row from database to record format
 */
function parseRow(row: typeof dashboards.$inferSelect): DashboardRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    config: JSON.parse(row.config) as DashboardConfig,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Create dashboard routes
 */
export function createDashboardRoutes() {
  const app = new Hono<{ Bindings: DashboardEnv }>();

  // Middleware to check D1 binding
  app.use('*', async (c, next) => {
    if (!c.env.DB) {
      return c.json({ success: false, error: 'Dashboard storage not configured (D1 binding missing)' }, 500);
    }
    await next();
  });

  // GET /api/dashboards - List all active dashboards
  app.get('/', async (c) => {
    const db = createDb(c.env.DB!);

    const rows = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.isActive, true))
      .orderBy(asc(dashboards.displayOrder), desc(dashboards.createdAt));

    const data = rows.map(parseRow);

    return c.json({ success: true, data } satisfies DashboardListResponse);
  });

  // GET /api/dashboards/default - Get the default dashboard
  app.get('/default', async (c) => {
    const db = createDb(c.env.DB!);

    const rows = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.isDefault, true), eq(dashboards.isActive, true)))
      .limit(1);

    if (rows.length === 0) {
      return c.json({ success: false, error: 'No default dashboard found' } satisfies DashboardResponse, 404);
    }

    return c.json({ success: true, data: parseRow(rows[0]) } satisfies DashboardResponse);
  });

  // POST /api/dashboards/default/reset - Reset the default dashboard to its original config
  app.post('/default/reset', async (c) => {
    const db = createDb(c.env.DB!);

    // Find the default dashboard
    const existing = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.isDefault, true), eq(dashboards.isActive, true)))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ success: false, error: 'No default dashboard found' } satisfies DashboardResponse, 404);
    }

    const timestamp = now();

    // Reset the config to the default
    await db
      .update(dashboards)
      .set({
        config: JSON.stringify(defaultDashboardConfig),
        updatedAt: timestamp,
      })
      .where(eq(dashboards.id, existing[0].id));

    // Fetch updated record
    const updated = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, existing[0].id))
      .limit(1);

    return c.json({ success: true, data: parseRow(updated[0]) } satisfies DashboardResponse);
  });

  // GET /api/dashboards/:id - Get a specific dashboard
  app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = createDb(c.env.DB!);

    const rows = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.isActive, true)))
      .limit(1);

    if (rows.length === 0) {
      return c.json({ success: false, error: 'Dashboard not found' } satisfies DashboardResponse, 404);
    }

    return c.json({ success: true, data: parseRow(rows[0]) } satisfies DashboardResponse);
  });

  // POST /api/dashboards - Create a new dashboard
  app.post('/', async (c) => {
    let body: CreateDashboardInput;
    try {
      body = await c.req.json<CreateDashboardInput>();
    } catch {
      return c.json({ success: false, error: 'Invalid JSON body' } satisfies DashboardResponse, 400);
    }

    if (!body.name || typeof body.name !== 'string') {
      return c.json({ success: false, error: 'Name is required' } satisfies DashboardResponse, 400);
    }

    if (!body.config || !body.config.portlets) {
      return c.json({ success: false, error: 'Config with portlets is required' } satisfies DashboardResponse, 400);
    }

    const db = createDb(c.env.DB!);
    const id = generateId();
    const timestamp = now();

    // If this is set as default, unset any existing default
    if (body.isDefault) {
      await db
        .update(dashboards)
        .set({ isDefault: false, updatedAt: timestamp })
        .where(eq(dashboards.isDefault, true));
    }

    const newDashboard = {
      id,
      name: body.name,
      description: body.description ?? null,
      config: JSON.stringify(body.config),
      displayOrder: body.displayOrder ?? 0,
      isActive: true,
      isDefault: body.isDefault ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db.insert(dashboards).values(newDashboard);

    const record: DashboardRecord = {
      id,
      name: body.name,
      description: body.description ?? null,
      config: body.config,
      displayOrder: body.displayOrder ?? 0,
      isActive: true,
      isDefault: body.isDefault ?? false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return c.json({ success: true, data: record } satisfies DashboardResponse, 201);
  });

  // PUT /api/dashboards/:id - Update a dashboard
  app.put('/:id', async (c) => {
    const id = c.req.param('id');

    let body: UpdateDashboardInput;
    try {
      body = await c.req.json<UpdateDashboardInput>();
    } catch {
      return c.json({ success: false, error: 'Invalid JSON body' } satisfies DashboardResponse, 400);
    }

    const db = createDb(c.env.DB!);

    // Check if dashboard exists
    const existing = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.isActive, true)))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ success: false, error: 'Dashboard not found' } satisfies DashboardResponse, 404);
    }

    const timestamp = now();

    // If setting this as default, unset any existing default
    if (body.isDefault === true) {
      await db
        .update(dashboards)
        .set({ isDefault: false, updatedAt: timestamp })
        .where(and(eq(dashboards.isDefault, true), ne(dashboards.id, id)));
    }

    // Build update object
    const updates: Partial<typeof dashboards.$inferInsert> = {
      updatedAt: timestamp,
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.config !== undefined) updates.config = JSON.stringify(body.config);
    if (body.displayOrder !== undefined) updates.displayOrder = body.displayOrder;
    if (body.isDefault !== undefined) updates.isDefault = body.isDefault;

    await db.update(dashboards).set(updates).where(eq(dashboards.id, id));

    // Fetch updated record
    const updated = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id))
      .limit(1);

    return c.json({ success: true, data: parseRow(updated[0]) } satisfies DashboardResponse);
  });

  // DELETE /api/dashboards/:id - Soft delete a dashboard
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = createDb(c.env.DB!);

    // Check if dashboard exists
    const existing = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.isActive, true)))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ success: false, error: 'Dashboard not found' } satisfies DashboardResponse, 404);
    }

    // Soft delete by setting isActive to false
    const timestamp = now();
    await db
      .update(dashboards)
      .set({ isActive: false, isDefault: false, updatedAt: timestamp })
      .where(eq(dashboards.id, id));

    return c.json({ success: true } satisfies DashboardResponse);
  });

  // POST /api/dashboards/:id/set-default - Set a dashboard as default
  app.post('/:id/set-default', async (c) => {
    const id = c.req.param('id');
    const db = createDb(c.env.DB!);

    // Check if dashboard exists
    const existing = await db
      .select()
      .from(dashboards)
      .where(and(eq(dashboards.id, id), eq(dashboards.isActive, true)))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ success: false, error: 'Dashboard not found' } satisfies DashboardResponse, 404);
    }

    const timestamp = now();

    // Unset all other defaults
    await db
      .update(dashboards)
      .set({ isDefault: false, updatedAt: timestamp })
      .where(eq(dashboards.isDefault, true));

    // Set this one as default
    await db
      .update(dashboards)
      .set({ isDefault: true, updatedAt: timestamp })
      .where(eq(dashboards.id, id));

    // Fetch updated record
    const updated = await db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, id))
      .limit(1);

    return c.json({ success: true, data: parseRow(updated[0]) } satisfies DashboardResponse);
  });

  return app;
}
