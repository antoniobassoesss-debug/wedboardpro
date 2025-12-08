// Vercel serverless function - using .js extension to avoid TypeScript runtime detection issues
const handler = async (req, res) => {
  // Dynamically import the Express app
  const { default: app } = await import('../dist/app.js');
  return app(req, res);
};

export default handler;

