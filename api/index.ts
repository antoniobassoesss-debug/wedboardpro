// Vercel serverless function for Express app
// Import the compiled Express app from dist (built by npm run build:server)
import type { VercelRequest, VercelResponse } from '@vercel/node';

let appHandler: any = null;

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Cache the app instance to avoid re-importing on every request
    if (!appHandler) {
      console.log('[api/index] Importing Express app...');
      const imported = await import('../dist/app.js');
      const expressApp = imported.default;
      
      if (!expressApp) {
        throw new Error('Express app not found in dist/app.js');
      }
      
      console.log('[api/index] Express app imported successfully');
      
      // Wrap Express app to work with Vercel's request/response
      appHandler = (vercelReq: VercelRequest, vercelRes: VercelResponse) => {
        // Convert Vercel request/response to Express-compatible format
        // Express apps can handle Vercel's request/response directly in most cases
        return expressApp(vercelReq, vercelRes);
      };
    }

    // Call the wrapped handler
    return appHandler(req, res);
  } catch (error: any) {
    console.error('[api/index] Error importing or running app:', error);
    console.error('[api/index] Error stack:', error?.stack);
    return res.status(500).json({ 
      error: 'Server initialization failed', 
      details: String(error),
      message: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
};
