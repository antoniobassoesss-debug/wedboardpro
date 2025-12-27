// Vercel serverless function for Express app
// Import the compiled Express app from dist (built by npm run build:server)
import type { VercelRequest, VercelResponse } from '@vercel/node';

let app: any = null;

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Cache the app instance to avoid re-importing on every request
    if (!app) {
      console.log('[api/index] Importing Express app...');
      const imported = await import('../dist/app.js');
      app = imported.default;
      console.log('[api/index] Express app imported successfully');
    }

    // Call Express app as a function (standard Express handler pattern)
    return app(req, res);
  } catch (error) {
    console.error('[api/index] Error importing or running app:', error);
    return res.status(500).json({ error: 'Server initialization failed', details: String(error) });
  }
};
