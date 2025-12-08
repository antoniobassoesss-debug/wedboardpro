// Vercel serverless function wrapper for Express app
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Dynamically import the Express app
  const { default: app } = await import('../src/app.js');
  return app(req, res);
}

