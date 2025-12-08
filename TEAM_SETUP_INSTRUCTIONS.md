# Team Invitation System Setup

## Overview
I've implemented a complete team invitation system for WedBoarPro. Team owners can invite other users by email, and those users can accept invitations to join the team.

## What's Been Implemented

### 1. Database Schema (`supabase_team_schema.sql`)
- **teams** table: Stores team information
- **team_members** table: Many-to-many relationship between users and teams
- **team_invitations** table: Stores pending invitations
- Row Level Security (RLS) policies for secure access
- Auto-creation of a default team when a user signs up
- Database function to accept invitations

### 2. API Endpoints (`src/app.ts`)
- `GET /api/teams/my-team` - Get the current user's team
- `GET /api/teams/members` - Get all members of the user's team
- `POST /api/teams/invite` - Send an invitation to an email address
- `GET /api/teams/invitations/pending` - Get pending invitations for the current user
- `POST /api/teams/invitations/accept` - Accept an invitation by token

### 3. UI Components (`src/client/components/AccountModal.tsx`)
- Updated Team tab to fetch and display real team members
- "Invite" button opens a modal to invite by email
- Shows loading states and error messages
- Automatically refreshes team list after successful invitation

## Setup Instructions

### Step 1: Run the Database Schema
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase_team_schema.sql`
4. Run the SQL script
5. Verify that the tables were created:
   - `teams`
   - `team_members`
   - `team_invitations`

### Step 2: Test the System
1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```
   (This runs both the Express server on port 3000 and Vite on port 5173)

2. Log in to your dashboard
3. Click on your profile avatar in the sidebar
4. Go to the "Team" tab
5. Click "Invite" button
6. Enter an email address and send an invitation

### Step 3: Accepting Invitations (Future Enhancement)
Currently, invitations are created and stored. To fully implement acceptance:
- When a user signs up or logs in, check for pending invitations
- Show a notification or modal if they have pending invitations
- Use the `POST /api/teams/invitations/accept` endpoint with the invitation token

## How It Works

1. **Sending Invitations:**
   - Team owner clicks "Invite" in the Team tab
   - Enters an email address
   - System creates an invitation record with a unique token
   - Token expires after 7 days

2. **Accepting Invitations:**
   - User receives invitation (email notification can be added later)
   - User signs up/logs in (if they don't have an account)
   - System checks for pending invitations for their email
   - User accepts invitation using the token
   - User is added to the team as a "member"

3. **Team Roles:**
   - **owner**: Team creator, full access
   - **admin**: Can invite members and manage team
   - **member**: Regular team member

## Next Steps (Optional Enhancements)

1. **Email Notifications:**
   - Integrate with an email service (SendGrid, Resend, etc.)
   - Send invitation emails with acceptance links
   - Send welcome emails when users join

2. **Invitation Acceptance UI:**
   - Add a notification badge for pending invitations
   - Create a dedicated page for managing invitations
   - Show invitation history

3. **Team Management:**
   - Allow owners/admins to remove members
   - Allow role changes (promote to admin, etc.)
   - Show team activity/logs

4. **Project Assignment:**
   - Update project creation to allow assigning to team members
   - Show team member avatars in project cards
   - Filter projects by assigned team member

5. **Chat System:**
   - Create a messages table
   - Build a chat UI component
   - Enable real-time messaging with Supabase Realtime

## Notes

- The system automatically creates a team for each new user when they sign up
- Invitations expire after 7 days (configurable in the schema)
- Users can only see teams they own or are members of (enforced by RLS)
- The invitation token is unique and secure

## Troubleshooting

If invitations aren't working:
1. Check that the database schema was run successfully
2. Verify RLS policies are enabled
3. Check server logs for API errors
4. Ensure the user is authenticated (has a valid session token)
5. Verify the email format is correct

