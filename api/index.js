// Vercel serverless function for Express app
module.exports = async (req, res) => {
  // Import the compiled Express app
  const app = (await import('../dist/app.js')).default;
  return app(req, res);
};
