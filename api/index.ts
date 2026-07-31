import express from 'express';
import { registerApiRoutes, seedDatabaseIfEmpty } from '../server/routes';

const app = express();
app.use(express.json());

registerApiRoutes(app);

// Seed database asynchronously on serverless function boot
seedDatabaseIfEmpty().catch(err => {
  console.error('Error during Vercel serverless seed:', err);
});

export default app;
