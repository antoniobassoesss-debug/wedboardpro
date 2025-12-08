// Vercel serverless function for Express app
// Import the compiled Express app from dist (built by npm run build:server)
export default async (req, res) => {
  try {
    const { default: app } = await import('../dist/app.js');
    return app(req, res);
  } catch (error) {
    console.error('Error importing app:', error);
    res.status(500).json({ error: 'Server initialization failed' });
  }
};
