# Environment Variables

This document lists all environment variables required for WedBoardPro.

## Required Variables

### Supabase (Backend)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

### Supabase (Frontend - Vite)
- `VITE_SUPABASE_URL` - Your Supabase project URL (same as above)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key (same as above)

> **Important**: Frontend variables must be prefixed with `VITE_` to be available in the browser build.

### Optional Variables
- `OPENAI_API_KEY` - OpenAI API key for AI assistant features
- `NODE_ENV` - Set to `production` for production builds

## Local Development

Create a `.env.local` file in the root directory with all the above variables.

## Vercel Deployment

Add all these variables in the Vercel dashboard under:
**Project Settings → Environment Variables**

Make sure to add them for all environments (Production, Preview, Development).

