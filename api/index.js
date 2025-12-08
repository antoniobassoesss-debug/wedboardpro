// Vercel serverless function for Express app
export default async (req, res) => {
  // Import the compiled Express app
  const { default: app } = await import('../dist/app.js');
  return app(req, res);
};
