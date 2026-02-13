/**
 * Teams Database Module
 * Handles all team-related database operations
 */

import { browserSupabaseClient } from '../../client/browserSupabaseClient';
import type {
  Team,
  TeamMember,
  TeamInvitation,
  TeamMemberPermissions,
  UpdateTeamMemberInput,
} from './types';

export const teamsDb = {
  /**
   * Get the current user's team membership with team details
   */
  async getMyTeamMembership(): Promise<TeamMember & { teams: Team }> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use RPC to bypass PostgREST bug with team_members table
    const { data, error } = await browserSupabaseClient
      .rpc('get_my_team_membership');

    if (error) throw error;
    if (!data) throw new Error('No team membership found');

    return data as TeamMember & { teams: Team };
  },

  /**
   * Get all members of a specific team
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .rpc('get_team_members_list', { p_team_id: teamId });

    if (error) throw error;
    return data as TeamMember[];
  },

  /**
   * Get all members for the current user's team
   */
  async getMyTeamMembers(): Promise<TeamMember[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's team membership via RPC
    const { data: membership, error } = await browserSupabaseClient
      .rpc('get_my_team_membership');

    if (error) throw error;
    if (!membership) throw new Error('No team found');

    return this.getTeamMembers(membership.team_id);
  },

  /**
   * Get a single team member by ID
   */
  async getTeamMember(memberId: string): Promise<TeamMember> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (error) throw error;
    return data as TeamMember;
  },

  /**
   * Get team info with members (uses RPC to avoid PostgREST issues)
   * Returns team details with all members included
   */
  async getTeamInfo(teamId: string): Promise<Team & { members: TeamMember[] }> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: teamData, error } = await browserSupabaseClient
      .rpc('get_team_info', { p_team_id: teamId });

    if (error) throw new Error(`Failed to get team: ${error.message}`);
    if (!teamData) throw new Error('Team not found');

    return teamData as Team & { members: TeamMember[] };
  },

  /**
   * Create a team
   */
  async createTeam(name: string): Promise<Team> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await browserSupabaseClient
      .from('teams')
      .insert({
        name,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Create owner membership
    await browserSupabaseClient
      .from('team_members')
      .insert({
        team_id: data.id,
        user_id: user.id,
        role: 'owner',
        can_view_billing: true,
        can_manage_billing: true,
        can_view_usage: true,
        can_manage_team: true,
        can_manage_settings: true,
        can_create_events: true,
        can_view_all_events: true,
        can_delete_events: true,
      });

    return data as Team;
  },

  /**
   * Update team details
   */
  async updateTeam(teamId: string, updates: { name?: string }): Promise<Team> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;
    return data as Team;
  },

  /**
   * Invite a team member (creates an invitation record)
   */
  async inviteTeamMember(
    teamId: string,
    email: string,
    permissions: TeamMemberPermissions
  ): Promise<TeamInvitation> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await browserSupabaseClient
      .from('team_invitations')
      .insert({
        team_id: teamId,
        inviter_id: user.id,
        email,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        ...permissions,
      })
      .select()
      .single();

    if (error) throw error;
    return data as TeamInvitation;
  },

  /**
   * Get pending invitations for a team
   */
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'pending');

    if (error) throw error;
    return data as TeamInvitation[];
  },

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('team_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) throw error;
  },

  /**
   * Accept an invitation (creates team member record)
   */
  async acceptInvitation(invitationId: string): Promise<TeamMember> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get invitation details
    const { data: invitation, error: invError } = await browserSupabaseClient
      .from('team_invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (invError) throw invError;
    if (invitation.status !== 'pending') throw new Error('Invitation is not pending');

    // Create team member
    const { data: member, error: memberError } = await browserSupabaseClient
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: 'member',
        can_view_billing: invitation.can_view_billing,
        can_manage_billing: invitation.can_manage_billing,
        can_view_usage: invitation.can_view_usage,
        can_manage_team: invitation.can_manage_team,
        can_manage_settings: invitation.can_manage_settings,
        can_create_events: invitation.can_create_events,
        can_view_all_events: invitation.can_view_all_events,
        can_delete_events: invitation.can_delete_events,
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Mark invitation as accepted
    await browserSupabaseClient
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId);

    return member as TeamMember;
  },

  /**
   * Update team member permissions
   */
  async updateTeamMember(memberId: string, updates: UpdateTeamMemberInput): Promise<TeamMember> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data, error } = await browserSupabaseClient
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data as TeamMember;
  },

  /**
   * Remove a team member
   */
  async removeTeamMember(memberId: string): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { error } = await browserSupabaseClient
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  },

  /**
   * Leave team (remove self from team)
   */
  async leaveTeam(): Promise<void> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await browserSupabaseClient
      .from('team_members')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Check if user is team owner
   */
  async isTeamOwner(teamId: string): Promise<boolean> {
    if (!browserSupabaseClient) throw new Error('Supabase client not initialized');

    const { data: { user } } = await browserSupabaseClient.auth.getUser();
    if (!user) return false;

    const { data } = await browserSupabaseClient
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    return data?.owner_id === user.id;
  },
};
