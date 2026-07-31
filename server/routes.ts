import { Express } from 'express';

/**
 * API routes are intentionally minimal.
 * Auth is Firebase-only (client). Legacy Google OAuth routes were removed for security.
 */
export async function seedDatabaseIfEmpty() {
  // Client-side seed lives in src/services/seedService.ts when needed.
}

export function registerApiRoutes(app: Express) {
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, auth: 'firebase' });
  });
}
