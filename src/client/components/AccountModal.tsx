"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { CreditCard, Users, Bell, HardDrive, Shield, Edit2 } from "./ui/icons";
import { browserSupabaseClient } from "../browserSupabaseClient";
import { AvatarUploadModal } from "./AvatarUploadModal";
import { removeAvatar } from "../api/avatarApi";
import { useToast } from "./ui/toast";
import SubscriptionTab from "../dashboard/SubscriptionTab";
import UsageTab from "../dashboard/UsageTab";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

interface AccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountModal({ open, onOpenChange }: AccountModalProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"profile" | "team" | "billing" | "usage" | "preferences">("profile");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
    business_name?: string | null;
    phone?: string | null;
    address?: string | null;
  }>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{ id: string; name: string } | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [teamNameInput, setTeamNameInput] = useState("");
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteActionError, setInviteActionError] = useState<string | null>(null);
  const [acceptingToken, setAcceptingToken] = useState<string | null>(null);
  const [acceptSuccessMessage, setAcceptSuccessMessage] = useState<string | null>(null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const { showToast } = useToast();

  const getStoredSession = useCallback(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("wedboarpro_session");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const getAccessToken = useCallback(() => {
    const session = getStoredSession();
    return session?.access_token ?? null;
  }, [getStoredSession]);

  const fetchTeamMembers = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setTeamMembers([]);
      return;
    }

    setLoadingMembers(true);
    try {
      const response = await fetch("/api/teams/members", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.status === 404) {
        setTeamMembers([]);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load team members");
      }
      const data = await response.json();
      setTeamMembers(Array.isArray(data.members) ? data.members : []);
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [getAccessToken]);

  const fetchPendingInvitations = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setPendingInvites([]);
      return;
    }

    setLoadingInvites(true);
    try {
      const response = await fetch("/api/teams/invitations/pending", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load invitations");
      }
      const data = await response.json();
      setPendingInvites(Array.isArray(data.invitations) ? data.invitations : []);
    } catch (err) {
      console.error("Failed to fetch pending invitations:", err);
      setPendingInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  }, [getAccessToken]);

  const fetchTeamInfo = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setTeamInfo(null);
      return;
    }

    setTeamLoading(true);
    setTeamError(null);
    try {
      const response = await fetch("/api/teams/my-team", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.status === 404) {
        setTeamInfo(null);
        setTeamMembers([]);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load team info");
      }
      setTeamInfo(data.team);
      await fetchTeamMembers();
    } catch (err: any) {
      console.error("Failed to fetch team info:", err);
      setTeamError(err?.message || "Failed to load team info");
      setTeamInfo(null);
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [getAccessToken, fetchTeamMembers]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (typeof window === "undefined") return;
      
      // First, try to get display name from localStorage (same as sidebar uses)
      const displayName = window.localStorage.getItem("wedboarpro_display_name");
      
      const storedSessionRaw = window.localStorage.getItem("wedboarpro_session");
      if (!storedSessionRaw) {
        // Even without session, use display name if available
        if (displayName) {
          setProfile({
            full_name: displayName,
            avatar_url: null,
            email: null,
            business_name: null,
            phone: null,
            address: null,
          });
        }
        return;
      }
      
      let storedSession = null;
      try {
        storedSession = JSON.parse(storedSessionRaw);
      } catch {
        if (displayName) {
          setProfile({
            full_name: displayName,
            avatar_url: null,
            email: null,
            business_name: null,
            phone: null,
            address: null,
          });
        }
        return;
      }
      
      const accessToken = storedSession?.access_token;
      const userId = storedSession?.user?.id;
      const userEmail = storedSession?.user?.email;
      const userMetadata = storedSession?.user?.user_metadata;
      const userNameFromMetadata = userMetadata?.full_name || userMetadata?.name;
      
      // Use display name from localStorage, or metadata, or email
      const resolvedName = displayName || userNameFromMetadata || userEmail;
      
      if (!browserSupabaseClient || !accessToken || !userId) {
        // Set what we have from session/localStorage
        setProfile({
          full_name: resolvedName || null,
          avatar_url: null,
          email: userEmail ?? null,
          business_name: null,
          phone: null,
          address: null,
        });
        return;
      }

      setLoading(true);
      try {
        await browserSupabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: storedSession?.refresh_token,
        });
        const { data, error } = await browserSupabaseClient
          .from("profiles")
          .select("full_name, avatar_url, email, business_name, phone, address")
          .eq("id", userId)
          .single();
        if (!error && data) {
          setProfile({
            full_name: data.full_name || resolvedName || null,
            avatar_url: data.avatar_url ?? null,
            email: data.email ?? userEmail ?? null,
            business_name: data.business_name ?? null,
            phone: data.phone ?? null,
            address: data.address ?? null,
          });
        } else {
          // If profile doesn't exist, use what we have
          setProfile({
            full_name: resolvedName || null,
            avatar_url: null,
            email: userEmail ?? null,
            business_name: null,
            phone: null,
            address: null,
          });
        }
      } catch (e) {
        // If error, use what we have
        setProfile({
          full_name: resolvedName || null,
          avatar_url: null,
          email: userEmail ?? null,
          business_name: null,
          phone: null,
          address: null,
        });
      } finally {
        setLoading(false);
      }
    };

    if (open) fetchProfile();
  }, [open]);

  useEffect(() => {
    if (!open || activeTab !== "team") return;
    fetchTeamInfo();
    fetchPendingInvitations();
  }, [open, activeTab, fetchTeamInfo, fetchPendingInvitations]);

  const handleAvatarSuccess = (avatarUrl: string) => {
    setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Remove your profile picture?')) return;

    const result = await removeAvatar();
    if (result.success) {
      setProfile(prev => ({ ...prev, avatar_url: null }));
      showToast('Profile picture removed', 'success');
    } else {
      showToast(result.error || 'Failed to remove', 'error');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setInviteError("Please enter a valid email address");
      return;
    }

    if (!teamInfo) {
      setInviteError("Create a team before inviting members");
      return;
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      setInviteError("Not authenticated");
      return;
    }

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const response = await fetch("/api/teams/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteError(data.error || "Failed to send invitation");
        return;
      }

      setInviteSuccess(true);
      setInviteEmail("");
      await Promise.all([fetchTeamMembers(), fetchPendingInvitations()]);
    } catch (e: any) {
      setInviteError(e.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCreateTeam = async (nameOverride?: string | null) => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setTeamError("Not authenticated");
      return;
    }

    setCreatingTeam(true);
    setTeamError(null);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: nameOverride ?? teamNameInput }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create team");
      }
      if (!nameOverride) {
        setTeamNameInput("");
      }
      await fetchTeamInfo();
    } catch (error: any) {
      setTeamError(error?.message || "Failed to create team");
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleCreateTeamButton = () => {
    if (teamInfo) return;
    const entered = window.prompt("Team name", teamNameInput || "My Team");
    if (entered === null) return;
    setTeamNameInput(entered);
    handleCreateTeam(entered);
  };

  const handleAcceptInvite = async (token: string) => {
    if (!token) return;
    const accessToken = getAccessToken();
    if (!accessToken) {
      setInviteActionError("Not authenticated");
      return;
    }

    setAcceptingToken(token);
    setInviteActionError(null);
    setAcceptSuccessMessage(null);

    try {
      const response = await fetch("/api/teams/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to accept invitation");
      }

      setAcceptSuccessMessage("Invitation accepted. Welcome to the team!");
      setTimeout(() => setAcceptSuccessMessage(null), 4000);
      await fetchTeamInfo();
      await fetchPendingInvitations();
    } catch (error: any) {
      setInviteActionError(error?.message || "Failed to accept invitation");
    } finally {
      setAcceptingToken(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.4)",
          zIndex: 60,
        }}
        onClick={() => onOpenChange(false)}
      >
    <DialogContent
        style={{
          background: '#ffffff',
          padding: isMobile ? '20px' : '32px 40px',
          borderRadius: isMobile ? '24px 24px 0 0' : '32px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          maxWidth: isMobile ? '100%' : '700px',
          width: isMobile ? '100%' : '90vw',
          maxHeight: isMobile ? '90vh' : '85vh',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Geist', 'Inter', sans-serif",
          overflow: 'hidden',
          position: isMobile ? 'fixed' : 'relative',
          bottom: isMobile ? 0 : 'auto',
          left: isMobile ? 0 : 'auto',
          right: isMobile ? 0 : 'auto',
          margin: 0,
          animation: isMobile ? 'account-modal-slide-up 300ms ease' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes account-modal-slide-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
        <div style={{ marginBottom: isMobile ? 16 : 24 }}>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, margin: '0 0 8px 0', color: '#0c0c0c' }}>Account Settings</h2>
          <p style={{ fontSize: isMobile ? 13 : 14, color: '#7c7c7c', margin: 0 }}>Manage your account information</p>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: isMobile ? 6 : 8, 
          marginBottom: isMobile ? 20 : 32,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: isMobile ? 4 : 0,
          marginLeft: isMobile ? -20 : 0,
          paddingLeft: isMobile ? 20 : 0,
          marginRight: isMobile ? -20 : 0,
          paddingRight: isMobile ? 20 : 0,
          flexShrink: 0,
        }}>
          {[
            { id: "profile", label: "Profile" },
            { id: "team", label: "Team" },
            { id: "billing", label: "Billing" },
            { id: "usage", label: "Usage" },
            { id: "preferences", label: "Prefs" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                borderRadius: 999,
                padding: isMobile ? '8px 14px' : '10px 20px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.id ? '#0c0c0c' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#7c7c7c',
                fontWeight: 600,
                fontSize: isMobile ? 12 : 14,
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: isMobile ? 0 : '8px',
          marginRight: isMobile ? 0 : '-8px',
          minHeight: 0,
          paddingBottom: isMobile ? 20 : 0,
        }}>
          {activeTab === "profile" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 32, paddingBottom: isMobile ? 80 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 14 : 20 }}>
                <div
                  style={{
                    position: 'relative',
                    width: isMobile ? 72 : 64,
                    height: isMobile ? 72 : 64,
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: '#ebebeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? 24 : 20,
                    fontWeight: 700,
                    color: '#0c0c0c',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  onClick={() => setShowAvatarUpload(true)}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || profile.email || "Profile"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (profile.full_name || profile.email || "U")
                      .split(" ")
                      .map((s: string) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      gap: 4,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                  >
                    <span style={{ fontSize: isMobile ? 24 : 20 }}>📷</span>
                    <span style={{ fontSize: isMobile ? 12 : 11, color: '#fff', fontWeight: 600 }}>
                      {profile.avatar_url ? 'Change' : 'Upload'}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: '0 0 4px 0', color: '#0c0c0c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.full_name || profile.email || "Your name"}
                  </h3>
                  <p style={{ fontSize: isMobile ? 13 : 14, color: '#7c7c7c', margin: 0 }}>{profile.business_name ?? "Wedding Planner"}</p>
                </div>

                {profile.avatar_url && (
                  <button
                    onClick={handleRemoveAvatar}
                    style={{
                      padding: isMobile ? '8px 12' : '8px 16px',
                      border: '1px solid #e3e3e3',
                      borderRadius: 999,
                      background: '#fff',
                      fontSize: isMobile ? 12 : 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#dc2626',
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ height: 1, background: '#e3e3e3', margin: '0 -20px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 20 }}>
                {['Business Name', 'Email', 'Phone', 'Business Address'].map((label, idx) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: '#0c0c0c' }}>{label}</label>
                    <input
                      id={label.toLowerCase().replace(' ', '-')}
                      defaultValue={label === 'Business Name' ? profile.business_name ?? "" : label === 'Email' ? profile.email ?? "" : label === 'Phone' ? profile.phone ?? "" : profile.address ?? ""}
                      style={{
                        borderRadius: 999,
                        padding: '12px 18px',
                        border: '1px solid #e3e3e3',
                        background: '#fff',
                        fontSize: isMobile ? 16 : 14,
                        fontFamily: "'Geist', 'Inter', sans-serif",
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: '#e3e3e3', margin: isMobile ? '16px -20px' : '32px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, margin: '0 0 12px 0', color: '#0c0c0c' }}>Account Actions</h3>
                <button
                  onClick={async () => {
                    try {
                      if (browserSupabaseClient) await browserSupabaseClient.auth.signOut();
                      localStorage.removeItem('wedboarpro_session');
                      localStorage.removeItem('wedboarpro_user');
                      localStorage.removeItem('wedboarpro_display_name');
                      onOpenChange(false);
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Logout error:', error);
                      localStorage.removeItem('wedboarpro_session');
                      localStorage.removeItem('wedboarpro_user');
                      localStorage.removeItem('wedboarpro_display_name');
                      onOpenChange(false);
                      window.location.href = '/';
                    }
                  }}
                  style={{
                    width: '100%',
                    borderRadius: 999,
                    padding: '14px 18px',
                    border: '1px solid #e3e3e3',
                    background: '#fff',
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: isMobile ? 14 : 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Geist', 'Inter', sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#dc2626'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e3e3e3'; }}
                >
                  Log Out
                </button>
              </div>

              <AvatarUploadModal
                isOpen={showAvatarUpload}
                onClose={() => setShowAvatarUpload(false)}
                onSuccess={handleAvatarSuccess}
              />
            </div>
          )}

          {activeTab === "team" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
                <div>
                  <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: '0 0 4px 0', color: '#0c0c0c' }}>Team Members</h3>
                  <p style={{ fontSize: isMobile ? 12 : 14, color: '#7c7c7c', margin: 0 }}>
                    {teamInfo ? `Workspace: ${teamInfo.name}` : 'Create a team to start collaborating'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCreateTeamButton}
                    disabled={creatingTeam || Boolean(teamInfo)}
                    style={{
                      borderRadius: 999,
                      padding: '10px 18px',
                      border: '1px solid #0c0c0c',
                      background: teamInfo ? '#fafafa' : '#0c0c0c',
                      color: teamInfo ? '#0c0c0c' : '#fff',
                      fontWeight: 600,
                      fontSize: isMobile ? 13 : 14,
                      cursor: creatingTeam || teamInfo ? 'not-allowed' : 'pointer',
                      fontFamily: "'Geist', 'Inter', sans-serif",
                      flex: 1,
                      minWidth: isMobile ? 'calc(50% - 4px)' : 'auto',
                    }}
                  >
                    {creatingTeam ? 'Creating…' : 'Create Team'}
                  </button>
                  <button
                    onClick={() => teamInfo && setShowInviteModal(true)}
                    disabled={!teamInfo}
                    style={{
                      borderRadius: 999,
                      padding: '10px 18px',
                      border: 'none',
                      background: teamInfo ? '#0c0c0c' : '#d7d7d7',
                      color: teamInfo ? '#fff' : '#888',
                      fontWeight: 600,
                      fontSize: isMobile ? 13 : 14,
                      cursor: teamInfo ? 'pointer' : 'not-allowed',
                      fontFamily: "'Geist', 'Inter', sans-serif",
                      flex: 1,
                      minWidth: isMobile ? 'calc(50% - 4px)' : 'auto',
                    }}
                  >
                    Invite
                  </button>
                </div>
              </div>

              {teamError && (
                <div style={{ padding: 12, borderRadius: 999, background: '#fee2e2', color: '#b91c1c', fontSize: 13, fontWeight: 500 }}>
                  {teamError}
                </div>
              )}

              {teamLoading ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#7c7c7c', fontSize: 14 }}>Loading team information...</div>
              ) : !teamInfo ? (
                <div style={{ border: '1px dashed #cfcfcf', borderRadius: 20, padding: 24, background: '#fafafa', textAlign: 'center', color: '#6b6b6b', fontSize: isMobile ? 13 : 14 }}>
                  No team yet. Click "Create Team" to set up your workspace.
                </div>
              ) : null}

              {(inviteActionError || acceptSuccessMessage) && (
                <div style={{ padding: 12, borderRadius: 999, background: inviteActionError ? '#fee2e2' : '#ecfdf5', color: inviteActionError ? '#b91c1c' : '#065f46', fontSize: 13, fontWeight: 500 }}>
                  {inviteActionError || acceptSuccessMessage}
                </div>
              )}

              {loadingInvites ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#7c7c7c', fontSize: 14 }}>Checking for pending invitations...</div>
              ) : pendingInvites.length > 0 ? (
                <div style={{ border: '1px solid #e3e3e3', borderRadius: 20, padding: 20, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0c0c0c' }}>Pending invitations</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b6b6b' }}>Accept to join the shared workspace.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pendingInvites.map((invite) => {
                      const teamName = invite?.teams?.name || 'Unnamed team';
                      const inviterEmail = invite?.inviter?.email || 'Someone from WedBoarPro';
                      const expiresAt = invite?.expires_at ? new Date(invite.expires_at) : null;
                      const expiresLabel = expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : 'Expires soon';
                      const isProcessing = acceptingToken === invite?.token;
                      return (
                        <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, background: '#fff', border: '1px solid #e3e3e3', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 150 }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0c0c0c' }}>{teamName}</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#6b6b6b' }}>Invited by {inviterEmail} · {expiresLabel}</p>
                          </div>
                          <button onClick={() => handleAcceptInvite(invite.token)} disabled={isProcessing} style={{ borderRadius: 999, padding: '8px 18px', border: 'none', background: isProcessing ? '#9ca3af' : '#0c0c0c', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer' }}>
                            {isProcessing ? 'Joining...' : 'Accept'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {teamInfo && (loadingMembers ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#7c7c7c' }}>Loading team members...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {teamMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#7c7c7c', fontSize: isMobile ? 13 : 14 }}>No team members yet. Click "Invite" to add someone.</div>
                  ) : teamMembers.map((member) => {
                    const memberProfile = member.profile || member.profiles || {};
                    const memberName = member.displayName || memberProfile.full_name || memberProfile.email || "Unknown";
                    const initials = ((memberName || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("")).toUpperCase();
                    return (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? 12 : 16, borderRadius: 16, border: '1px solid #e3e3e3', background: '#fff', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 150 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 999, background: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#0c0c0c', flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px 0', color: '#0c0c0c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberName}</p>
                            <p style={{ fontSize: 12, color: '#7c7c7c', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberProfile.email || member.displayEmail}</p>
                          </div>
                        </div>
                        <span style={{ borderRadius: 999, padding: '4px 12px', background: '#ebebeb', fontSize: 12, fontWeight: 600, color: '#0c0c0c', textTransform: 'capitalize', flexShrink: 0 }}>{member.role}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {activeTab === "billing" && <SubscriptionTab onClose={() => onOpenChange(false)} />}
          {activeTab === "usage" && <UsageTab />}
          {activeTab === "preferences" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
                <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, margin: 0, color: '#0c0c0c' }}>Notifications</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {["Email notifications for new quotes", "Task reminders", "Client messages"].map((pref) => (
                    <label key={pref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? 12 : 12, borderRadius: 16, border: '1px solid #e3e3e3', background: '#fff', cursor: 'pointer', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: isMobile ? 13 : 14, color: '#0c0c0c' }}>{pref}</span>
                      <input type="checkbox" defaultChecked style={{ width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }} />
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: '#e3e3e3' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, margin: 0, color: '#0c0c0c' }}>Security</h3>
                {['Change Password', 'Enable Two-Factor Authentication'].map((action, idx) => (
                  <button key={action} style={{ width: '100%', borderRadius: 999, padding: '14px 18px', border: '1px solid #e3e3e3', background: '#fff', color: '#0c0c0c', fontWeight: 600, fontSize: isMobile ? 13 : 14, cursor: 'pointer', textAlign: 'left', fontFamily: "'Geist', 'Inter', sans-serif" }}>
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isMobile && <div style={{ height: 1, background: '#e3e3e3', margin: '32px -40px 0 -40px' }} />}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 12, 
          marginTop: isMobile ? 20 : 24,
          paddingTop: isMobile ? 16 : 0,
          borderTop: isMobile ? '1px solid #e3e3e3' : 'none',
          flexShrink: 0,
          paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : 0,
        }}>
          <button onClick={() => onOpenChange(false)} style={{ borderRadius: 999, padding: isMobile ? '14px 24px' : '10px 24px', border: '1px solid #e3e3e3', background: '#fff', color: '#0c0c0c', fontWeight: 600, fontSize: isMobile ? 14 : 14, cursor: 'pointer', fontFamily: "'Geist', 'Inter', sans-serif" }}>
            Cancel
          </button>
          <button onClick={() => onOpenChange(false)} style={{ borderRadius: 999, padding: isMobile ? '14px 24px' : '10px 24px', border: 'none', background: '#0c0c0c', color: '#fff', fontWeight: 600, fontSize: isMobile ? 14 : 14, cursor: 'pointer', fontFamily: "'Geist', 'Inter', sans-serif" }}>
            Save Changes
          </button>
        </div>
      </DialogContent>
    </div>

    {/* Invite Modal */}
    {showInviteModal && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.4)",
          zIndex: 70,
          padding: isMobile ? 0 : 16,
        }}
        onClick={() => {
          setShowInviteModal(false);
          setInviteEmail("");
          setInviteError(null);
          setInviteSuccess(false);
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: isMobile ? '20px' : "32px",
            borderRadius: isMobile ? '24px 24px 0 0' : "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            maxWidth: isMobile ? "100%" : "480px",
            width: isMobile ? "100%" : "90vw",
            fontFamily: "'Geist', 'Inter', sans-serif",
            animation: isMobile ? 'invite-modal-slide-up 300ms ease' : undefined,
            marginBottom: isMobile ? 0 : 0,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            @keyframes invite-modal-slide-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
          <h3 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, margin: "0 0 8px 0", color: "#0c0c0c" }}>
            Invite Team Member
          </h3>
          <p style={{ fontSize: isMobile ? 13 : 14, color: "#7c7c7c", margin: "0 0 20px 0" }}>
            Send an invitation to join your team. They'll need to sign up if they don't have an account yet.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, color: "#0c0c0c" }}>Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                placeholder="colleague@example.com"
                style={{
                  borderRadius: 999,
                  padding: "14px 18px",
                  border: inviteError ? "1px solid #ef4444" : "1px solid #e3e3e3",
                  background: "#fff",
                  fontSize: isMobile ? 16 : 14,
                  fontFamily: "'Geist', 'Inter', sans-serif",
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              />
              {inviteError && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{inviteError}</p>}
              {inviteSuccess && <p style={{ fontSize: 12, color: "#10b981", margin: 0 }}>Invitation sent successfully!</p>}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteError(null);
                  setInviteSuccess(false);
                }}
                style={{
                  borderRadius: 999,
                  padding: "14px 24px",
                  border: "1px solid #e3e3e3",
                  background: "#fff",
                  color: "#0c0c0c",
                  fontWeight: 600,
                  fontSize: isMobile ? 14 : 14,
                  cursor: "pointer",
                  fontFamily: "'Geist', 'Inter', sans-serif",
                  flex: 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                style={{
                  borderRadius: 999,
                  padding: "14px 24px",
                  border: "none",
                  background: (inviting || !inviteEmail) ? "#9ca3af" : "#0c0c0c",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: isMobile ? 14 : 14,
                  cursor: (inviting || !inviteEmail) ? "not-allowed" : "pointer",
                  fontFamily: "'Geist', 'Inter', sans-serif",
                  flex: 1,
                }}
              >
                {inviting ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </Dialog>
  );
}

