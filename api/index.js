// Vercel serverless function for Express app
// Import from TypeScript source - Vercel will compile it automatically
export default async (req, res) => {
  // Dynamically import the Express app
  const { default: app } = await import('../src/app.ts');
  return app(req, res);
};
