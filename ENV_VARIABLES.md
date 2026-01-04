# Environment Variables

This document lists all environment variables required for WedBoardPro.

## Required Variables

### Supabase (Backend - Server-side)
These are used by the Express API server (email/password login, API endpoints):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)

### Supabase (Frontend - Client-side)
These are embedded in the browser build and used by React components (Google OAuth, client-side auth):
- `VITE_SUPABASE_URL` - Your Supabase project URL (same as above)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key (same as above)

> **Important**: 
> - Frontend variables must be prefixed with `VITE_` to be available in the browser build.
> - **Both sets of variables are required** - backend variables for email/password login, frontend variables for Google OAuth.

### Optional Variables
- `OPENAI_API_KEY` - OpenAI API key for AI assistant features
- `NODE_ENV` - Set to `production` for production builds

## Local Development

Create a `.env.local` file in the root directory with all the above variables:

```env
# Backend (Server-side)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend (Client-side - must have VITE_ prefix)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional
OPENAI_API_KEY=your-openai-key
```

## Vercel Deployment

**CRITICAL**: Add ALL these variables in the Vercel dashboard under:
**Project Settings → Environment Variables**

Make sure to add them for all environments (Production, Preview, Development).

### Troubleshooting Email/Password Login on Vercel

If Google OAuth works but email/password login doesn't:

1. **Check Backend Environment Variables**: 
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set (without `VITE_` prefix)
   - These are different from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

2. **Redeploy After Adding Variables**:
   - After adding/updating environment variables, trigger a new deployment
   - Vercel will rebuild with the new variables

3. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments → [Latest] → Functions
   - Look for errors mentioning "Supabase client unavailable" or missing environment variables

4. **Verify Variable Names**:
   - Backend: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - They should have the same values, but different names!

