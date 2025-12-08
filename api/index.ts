// Vercel serverless function wrapper for Express app
// Note: In Vercel, this will be compiled, so we import from source
// The build process will handle the compilation
import app from '../src/app.js';

export default app;

