# WedBoardPro

A comprehensive SaaS platform for wedding planners to manage events, teams, suppliers, calendars, and more.

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Backend**: Express.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## Local Development

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- (Optional) OpenAI API key for AI features

### Setup

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <your-repo-url>
   cd layout-maker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   # Supabase Configuration (Backend)
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Supabase Configuration (Frontend - Vite)
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

   # OpenAI API Key (optional)
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up Supabase database**:
   - Run all SQL migration files in your Supabase SQL Editor (in order):
     - `supabase_team_schema.sql`
     - `supabase_chat_direct_messages.sql`
     - `supabase_calendar_events.sql`
     - `supabase_calendar_add_color_visibility.sql`
     - `supabase_tasks_schema.sql`
     - `supabase_notifications_schema.sql`
     - `supabase_events_pipeline.sql`
     - `supabase_teams_module.sql`
     - `supabase_suppliers_schema.sql`

5. **Run the development servers**:
   ```bash
   # Terminal 1: Backend (Express)
   npm run dev

   # Terminal 2: Frontend (Vite)
   npm run dev:client
   ```

   - Backend API: http://localhost:3000
   - Frontend: http://localhost:5173

## Deploy on Vercel

### Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase project with all migrations applied

### Step 1: Push to GitHub

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "chore: initial commit for deploy"
   ```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., `wedboardpro`)
   - **Do not** initialize with README, .gitignore, or license

3. **Push your code**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Connect to Vercel

1. **Go to Vercel**:
   - Visit https://vercel.com
   - Sign in with your GitHub account

2. **Import your project**:
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will auto-detect the project settings

3. **Configure build settings**:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist/client`
   - **Install Command**: `npm install`

4. **Add Environment Variables**:
   Click "Environment Variables" and add all the following:

   **Backend Variables:**
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key
   - `OPENAI_API_KEY` = your OpenAI API key (optional)
   - `NODE_ENV` = `production`

   **Frontend Variables (Vite):**
   - `VITE_SUPABASE_URL` = your Supabase project URL (same as above)
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key (same as above)

   > **Important**: Frontend variables must be prefixed with `VITE_` to be available in the browser build.

5. **Deploy**:
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Step 3: Update CORS Settings (if needed)

If you encounter CORS issues, you may need to update the CORS middleware in `src/app.ts` to allow your Vercel domain.

### Troubleshooting

- **Build fails**: Check the build logs in Vercel dashboard for specific errors
- **Environment variables not working**: Ensure `VITE_` prefix is used for frontend variables
- **API routes not found**: Verify `vercel.json` routes are correctly configured
- **Database connection issues**: Double-check Supabase credentials in Vercel environment variables

## Project Structure

```
.
├── api/                 # Vercel serverless function entry point
├── src/
│   ├── app.ts          # Express backend server
│   ├── client/         # React frontend components
│   └── supabaseClient.ts
├── public/             # Static assets
├── supabase_*.sql      # Database migration files
├── vercel.json         # Vercel deployment configuration
└── package.json
```

## Features

- **Teams & Collaboration**: Manage team members, roles, and permissions
- **Real-time Chat**: Team and direct messaging with Supabase Realtime
- **Calendar**: Event calendar with sharing, colors, and filters
- **Project Pipeline**: Wedding event management with stages and tasks
- **Suppliers**: Vendor directory and per-event supplier management
- **To-Do Lists**: Task management with assignments and notifications

## License

ISC

