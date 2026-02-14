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

// Simple line icons for tabs
const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);

const TeamIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BillingIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const UsageIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const SettingsIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

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
        // Only select columns that exist in the profiles table
        const { data, error } = await browserSupabaseClient
          .from("profiles")
          .select("full_name, avatar_url, email")
          .eq("id", userId)
          .single();
        if (!error && data) {
          setProfile({
            full_name: data.full_name || resolvedName || null,
            avatar_url: data.avatar_url ?? null,
            email: data.email ?? userEmail ?? null,
            business_name: null,
            phone: null,
            address: null,
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
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.5)",
          zIndex: isMobile ? 9999 : 60,
          padding: isMobile ? 0 : 16,
        }}
        onClick={() => onOpenChange(false)}
      >
    <DialogContent
        style={{
          background: '#ffffff',
          padding: isMobile ? '24px' : '32px 40px',
          borderRadius: isMobile ? '24px 24px 0 0' : '24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
          maxWidth: isMobile ? '100%' : '700px',
          width: isMobile ? '100%' : '90vw',
          maxHeight: isMobile ? '92vh' : '85vh',
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
        <div style={{ marginBottom: isMobile ? 20 : 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 700, margin: '0 0 6px 0', color: '#1a1a1a' }}>Account Settings</h2>
            </div>
            {isMobile && (
              <button 
                onClick={() => onOpenChange(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: 'none',
                  background: '#f5f5f5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  color: '#666',
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: 8, 
          marginBottom: isMobile ? 20 : 32,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: isMobile ? 8 : 0,
          marginLeft: isMobile ? -20 : 0,
          paddingLeft: isMobile ? 20 : 0,
          marginRight: isMobile ? -20 : 0,
          paddingRight: isMobile ? 20 : 0,
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
        }}>
          {[
            { id: "profile", label: "Profile", icon: ProfileIcon },
            { id: "team", label: "Team", icon: TeamIcon },
            { id: "billing", label: "Billing", icon: BillingIcon },
            { id: "usage", label: "Usage", icon: UsageIcon },
            { id: "preferences", label: "Settings", icon: SettingsIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                borderRadius: 10,
                padding: isMobile ? '12px 16px' : '12px 20px',
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.id ? '#f5f5f5' : 'transparent',
                color: activeTab === tab.id ? '#1a1a1a' : '#888',
                fontWeight: 600,
                fontSize: isMobile ? 13 : 14,
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <tab.icon active={activeTab === tab.id} />
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
          paddingBottom: isMobile ? 40 : 0,
          WebkitOverflowScrolling: 'touch',
        }}>
          {activeTab === "profile" && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 32, paddingBottom: isMobile ? 100 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 20 }}>
                <div
                  style={{
                    position: 'relative',
                    width: isMobile ? 88 : 64,
                    height: isMobile ? 88 : 64,
                    borderRadius: 999,
                    overflow: 'hidden',
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? 28 : 20,
                    fontWeight: 700,
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: '2px solid #f0f0f0',
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
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      gap: 2,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                  >
                    <span style={{ fontSize: isMobile ? 20 : 16 }}>📷</span>
                    <span style={{ fontSize: isMobile ? 11 : 10, color: '#fff', fontWeight: 600 }}>
                      {profile.avatar_url ? 'Change' : 'Add'}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: isMobile ? 20 : 18, fontWeight: 700, margin: '0 0 6px 0', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile.full_name || profile.email || "Your name"}
                  </h3>
                  <p style={{ fontSize: isMobile ? 14 : 14, color: '#666', margin: 0, fontWeight: 500 }}>{profile.business_name ?? "Wedding Planner"}</p>
                  <p style={{ fontSize: isMobile ? 13 : 13, color: '#888', margin: '4px 0 0 0' }}>{profile.email}</p>
                </div>
              </div>

              {profile.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #e5e5e5',
                    borderRadius: 12,
                    background: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#dc2626',
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                  }}
                >
                  Remove Photo
                </button>
              )}

              <div style={{ height: 1, background: '#f0f0f0', margin: '0 -20px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: isMobile ? 13 : 12, fontWeight: 600, color: '#1a1a1a' }}>Full Name</label>
                  <input
                    id="full-name"
                    defaultValue={profile.full_name ?? ""}
                    placeholder="Enter your full name"
                    style={{
                      borderRadius: 12,
                      padding: '14px 16px',
                      border: '1px solid #e5e5e5',
                      background: '#fafafa',
                      fontSize: 16,
                      fontFamily: "'Geist', 'Inter', sans-serif",
                      width: '100%',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s ease',
                    }}
                  />
                </div>
                {['Business Name', 'Phone', 'Business Address'].map((label) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: isMobile ? 13 : 12, fontWeight: 600, color: '#1a1a1a' }}>{label}</label>
                    <input
                      id={label.toLowerCase().replace(' ', '-')}
                      defaultValue={label === 'Business Name' ? profile.business_name ?? "" : label === 'Phone' ? profile.phone ?? "" : profile.address ?? ""}
                      placeholder={label === 'Phone' ? '+1 (555) 000-0000' : `Enter ${label.toLowerCase()}`}
                      style={{
                        borderRadius: 12,
                        padding: '14px 16px',
                        border: '1px solid #e5e5e5',
                        background: '#fafafa',
                        fontSize: 16,
                        fontFamily: "'Geist', 'Inter', sans-serif",
                        width: '100%',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease',
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: '#f0f0f0', margin: isMobile ? '20px -20px' : '32px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: isMobile ? 15 : 14, fontWeight: 700, margin: '0 0 4px 0', color: '#1a1a1a' }}>Account Actions</h3>
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
                    borderRadius: 12,
                    padding: '16px 18px',
                    border: '1px solid #fee2e2',
                    background: '#fff',
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontFamily: "'Geist', 'Inter', sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  Sign Out
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 16 }}>
                <div>
                  <h3 style={{ fontSize: isMobile ? 18 : 18, fontWeight: 700, margin: '0 0 6px 0', color: '#1a1a1a' }}>Team Members</h3>
                  <p style={{ fontSize: isMobile ? 13 : 14, color: '#666', margin: 0 }}>
                    {teamInfo ? `Workspace: ${teamInfo.name}` : 'Create a team to collaborate with others'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCreateTeamButton}
                    disabled={creatingTeam || Boolean(teamInfo)}
                    style={{
                      borderRadius: 12,
                      padding: '14px 20px',
                      border: '1px solid #1a1a1a',
                      background: teamInfo ? '#f5f5f5' : '#1a1a1a',
                      color: teamInfo ? '#1a1a1a' : '#fff',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: creatingTeam || teamInfo ? 'not-allowed' : 'pointer',
                      fontFamily: "'Geist', 'Inter', sans-serif",
                      flex: 1,
                      minWidth: isMobile ? 'calc(50% - 5px)' : 'auto',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {creatingTeam ? 'Creating...' : teamInfo ? 'Team Active' : 'Create Team'}
                  </button>
                  <button
                    onClick={() => teamInfo && setShowInviteModal(true)}
                    disabled={!teamInfo}
                    style={{
                      borderRadius: 12,
                      padding: '14px 20px',
                      border: 'none',
                      background: teamInfo ? '#1a1a1a' : '#e5e5e5',
                      color: teamInfo ? '#fff' : '#888',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: teamInfo ? 'pointer' : 'not-allowed',
                      fontFamily: "'Geist', 'Inter', sans-serif",
                      flex: 1,
                      minWidth: isMobile ? 'calc(50% - 5px)' : 'auto',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Invite
                  </button>
                </div>
              </div>

              {teamError && (
                <div style={{ padding: 14, borderRadius: 12, background: '#fef2f2', color: '#b91c1c', fontSize: 14, fontWeight: 500 }}>
                  {teamError}
                </div>
              )}

              {teamLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 14 }}>Loading team information...</div>
              ) : !teamInfo ? (
                <div style={{ border: '2px dashed #e5e5e5', borderRadius: 16, padding: 32, background: '#fafafa', textAlign: 'center', color: '#666', fontSize: 14 }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>No team yet</p>
                  <p style={{ margin: 0, color: '#888' }}>Click "Create Team" to set up your workspace and start collaborating.</p>
                </div>
              ) : null}

              {(inviteActionError || acceptSuccessMessage) && (
                <div style={{ padding: 14, borderRadius: 12, background: inviteActionError ? '#fef2f2' : '#ecfdf5', color: inviteActionError ? '#b91c1c' : '#065f46', fontSize: 14, fontWeight: 500 }}>
                  {inviteActionError || acceptSuccessMessage}
                </div>
              )}

              {loadingInvites ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#888', fontSize: 14 }}>Checking for pending invitations...</div>
              ) : pendingInvites.length > 0 ? (
                <div style={{ border: '1px solid #e5e5e5', borderRadius: 16, padding: 20, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Pending invitations</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#666' }}>Accept to join the shared workspace.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pendingInvites.map((invite) => {
                      const teamName = invite?.teams?.name || 'Unnamed team';
                      const inviterEmail = invite?.inviter?.email || 'Someone from WedBoarPro';
                      const expiresAt = invite?.expires_at ? new Date(invite.expires_at) : null;
                      const expiresLabel = expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : 'Expires soon';
                      const isProcessing = acceptingToken === invite?.token;
                      const inviterAvatar = invite?.inviter?.avatar_url || invite?.inviter?.profile?.avatar_url;
                      return (
                        <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, background: '#fff', border: '1px solid #e5e5e5', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 150 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 999, overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>
                              {inviterAvatar ? (
                                <img src={inviterAvatar} alt={inviterEmail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                (inviterEmail || "U").split("@")[0].slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{teamName}</p>
                              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#666' }}>Invited by {inviterEmail} · {expiresLabel}</p>
                            </div>
                          </div>
                          <button onClick={() => handleAcceptInvite(invite.token)} disabled={isProcessing} style={{ borderRadius: 10, padding: '10px 20px', border: 'none', background: isProcessing ? '#9ca3af' : '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}>
                            {isProcessing ? 'Joining...' : 'Accept'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {teamInfo && (loadingMembers ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading team members...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {teamMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: isMobile ? 13 : 14 }}>No team members yet. Click "Invite" to add someone.</div>
                  ) : teamMembers.map((member) => {
                    const memberProfile = member.profile || member.profiles || {};
                    const memberName = member.displayName || memberProfile.full_name || memberProfile.email || "Unknown";
                    const initials = ((memberName || "U").split(" ").map((s: string) => s[0]).slice(0, 2).join("")).toUpperCase();
                    const memberAvatar = memberProfile.avatar_url || member.avatar_url;
                    return (
                      <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? 14 : 16, borderRadius: 14, border: '1px solid #e5e5e5', background: '#fff', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 150 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 999, overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1a1a1a', flexShrink: 0 }}>
                            {memberAvatar ? (
                              <img src={memberAvatar} alt={memberName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              initials
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px 0', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberName}</p>
                            <p style={{ fontSize: 13, color: '#666', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberProfile.email || member.displayEmail}</p>
                          </div>
                        </div>
                        <span style={{ borderRadius: 999, padding: '6px 14px', background: '#f5f5f5', fontSize: 12, fontWeight: 600, color: '#1a1a1a', textTransform: 'capitalize', flexShrink: 0 }}>{member.role}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 24 : 32 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 16 }}>
                <h3 style={{ fontSize: isMobile ? 15 : 14, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>Notifications</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {["Email notifications for new quotes", "Task reminders", "Client messages"].map((pref) => (
                    <label key={pref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? 14 : 12, borderRadius: 14, border: '1px solid #e5e5e5', background: '#fff', cursor: 'pointer', flexWrap: 'wrap', gap: 12 }}>
                      <span style={{ fontSize: isMobile ? 14 : 14, color: '#1a1a1a', flex: 1 }}>{pref}</span>
                      <input type="checkbox" defaultChecked style={{ width: 22, height: 22, cursor: 'pointer', flexShrink: 0, accentColor: '#1a1a1a' }} />
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: '#f0f0f0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: isMobile ? 15 : 14, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>Security</h3>
                {['Change Password', 'Enable Two-Factor Authentication'].map((action) => (
                  <button key={action} style={{ width: '100%', borderRadius: 12, padding: '16px 18px', border: '1px solid #e5e5e5', background: '#fff', color: '#1a1a1a', fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', fontFamily: "'Geist', 'Inter', sans-serif", transition: 'all 0.15s ease' }}>
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 12, 
          marginTop: isMobile ? 24 : 24,
          paddingTop: isMobile ? 20 : 0,
          borderTop: isMobile ? '1px solid #f0f0f0' : 'none',
          flexShrink: 0,
          paddingBottom: isMobile ? 'calc(20px + env(safe-area-inset-bottom))' : 0,
        }}>
          <button onClick={() => onOpenChange(false)} style={{ borderRadius: 12, padding: isMobile ? '16px 28px' : '10px 24px', border: '1px solid #e5e5e5', background: '#fff', color: '#1a1a1a', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'Geist', 'Inter', sans-serif", transition: 'all 0.15s ease' }}>
            Cancel
          </button>
          <button onClick={() => onOpenChange(false)} style={{ borderRadius: 12, padding: isMobile ? '16px 28px' : '10px 24px', border: 'none', background: '#1a1a1a', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'Geist', 'Inter', sans-serif", transition: 'all 0.15s ease' }}>
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
          background: "rgba(0,0,0,0.5)",
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
            padding: isMobile ? '24px' : "32px",
            borderRadius: isMobile ? '24px 24px 0 0' : "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: isMobile ? 20 : 20, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>
              Invite Team Member
            </h3>
            <button 
              onClick={() => {
                setShowInviteModal(false);
                setInviteEmail("");
                setInviteError(null);
                setInviteSuccess(false);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                border: 'none',
                background: '#f5f5f5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#666',
              }}
            >
              ×
            </button>
          </div>
          <p style={{ fontSize: isMobile ? 14 : 14, color: "#666", margin: "0 0 20px 0" }}>
            Send an invitation to join your team. They'll need to sign up if they don't have an account yet.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: isMobile ? 13 : 12, fontWeight: 600, color: "#1a1a1a" }}>Email Address</label>
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
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: inviteError ? "1px solid #ef4444" : "1px solid #e5e5e5",
                  background: "#fafafa",
                  fontSize: 16,
                  fontFamily: "'Geist', 'Inter', sans-serif",
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease',
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              />
              {inviteError && <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>{inviteError}</p>}
              {inviteSuccess && <p style={{ fontSize: 13, color: "#10b981", margin: 0 }}>Invitation sent successfully!</p>}
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
                  borderRadius: 12,
                  padding: "14px 24px",
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  color: "#1a1a1a",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "'Geist', 'Inter', sans-serif",
                  flex: 1,
                  minWidth: isMobile ? '100px' : 'auto',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                style={{
                  borderRadius: 12,
                  padding: "14px 24px",
                  border: "none",
                  background: (inviting || !inviteEmail) ? "#9ca3af" : "#1a1a1a",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: (inviting || !inviteEmail) ? "not-allowed" : "pointer",
                  fontFamily: "'Geist', 'Inter', sans-serif",
                  flex: 1,
                  minWidth: isMobile ? '100px' : 'auto',
                  transition: 'all 0.15s ease',
                }}
              >
                {inviting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </Dialog>
  );
}

