"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { CreditCard, Users, Bell, HardDrive, Shield, Edit2 } from "./ui/icons";
import { browserSupabaseClient } from "../browserSupabaseClient";
export function AccountModal({ open, onOpenChange }) {
    const [activeTab, setActiveTab] = useState("profile");
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({});
    const [teamMembers, setTeamMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [teamInfo, setTeamInfo] = useState(null);
    const [teamLoading, setTeamLoading] = useState(false);
    const [teamError, setTeamError] = useState(null);
    const [creatingTeam, setCreatingTeam] = useState(false);
    const [teamNameInput, setTeamNameInput] = useState("");
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);
    const [inviteActionError, setInviteActionError] = useState(null);
    const [acceptingToken, setAcceptingToken] = useState(null);
    const [acceptSuccessMessage, setAcceptSuccessMessage] = useState(null);
    const getStoredSession = useCallback(() => {
        if (typeof window === "undefined")
            return null;
        const raw = window.localStorage.getItem("wedboarpro_session");
        if (!raw)
            return null;
        try {
            return JSON.parse(raw);
        }
        catch {
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
        }
        catch (error) {
            console.error("Failed to fetch team members:", error);
            setTeamMembers([]);
        }
        finally {
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
        }
        catch (err) {
            console.error("Failed to fetch pending invitations:", err);
            setPendingInvites([]);
        }
        finally {
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
        }
        catch (err) {
            console.error("Failed to fetch team info:", err);
            setTeamError(err?.message || "Failed to load team info");
            setTeamInfo(null);
            setTeamMembers([]);
        }
        finally {
            setTeamLoading(false);
        }
    }, [getAccessToken, fetchTeamMembers]);
    useEffect(() => {
        const fetchProfile = async () => {
            if (typeof window === "undefined")
                return;
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
            }
            catch {
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
                }
                else {
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
            }
            catch (e) {
                // If error, use what we have
                setProfile({
                    full_name: resolvedName || null,
                    avatar_url: null,
                    email: userEmail ?? null,
                    business_name: null,
                    phone: null,
                    address: null,
                });
            }
            finally {
                setLoading(false);
            }
        };
        if (open)
            fetchProfile();
    }, [open]);
    useEffect(() => {
        if (!open || activeTab !== "team")
            return;
        fetchTeamInfo();
        fetchPendingInvitations();
    }, [open, activeTab, fetchTeamInfo, fetchPendingInvitations]);
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
        }
        catch (e) {
            setInviteError(e.message || "Failed to send invitation");
        }
        finally {
            setInviting(false);
        }
    };
    const handleCreateTeam = async (nameOverride) => {
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
        }
        catch (error) {
            setTeamError(error?.message || "Failed to create team");
        }
        finally {
            setCreatingTeam(false);
        }
    };
    const handleCreateTeamButton = () => {
        if (teamInfo)
            return;
        const entered = window.prompt("Team name", teamNameInput || "My Team");
        if (entered === null)
            return;
        setTeamNameInput(entered);
        handleCreateTeam(entered);
    };
    const handleAcceptInvite = async (token) => {
        if (!token)
            return;
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
        }
        catch (error) {
            setInviteActionError(error?.message || "Failed to accept invitation");
        }
        finally {
            setAcceptingToken(null);
        }
    };
    return (_jsxs(Dialog, { open: open, onOpenChange: onOpenChange, children: [_jsx("div", { style: {
                    position: "fixed",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.4)",
                    zIndex: 60,
                }, onClick: () => onOpenChange(false), children: _jsxs(DialogContent, { style: {
                        background: '#ffffff',
                        padding: '32px 40px',
                        borderRadius: '32px',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                        maxWidth: '700px',
                        width: '90vw',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: "'Geist', 'Inter', sans-serif",
                        overflow: 'visible',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx("h2", { style: { fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', color: '#0c0c0c' }, children: "Account Settings" }), _jsx("p", { style: { fontSize: 14, color: '#7c7c7c', margin: 0 }, children: "Manage your account information" })] }), _jsx("div", { style: { display: 'flex', gap: 8, marginBottom: 32 }, children: [
                                { id: "profile", label: "Profile" },
                                { id: "team", label: "Team" },
                                { id: "billing", label: "Billing" },
                                { id: "preferences", label: "Preferences" },
                            ].map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.id), style: {
                                    borderRadius: 999,
                                    padding: '10px 20px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === tab.id ? '#0c0c0c' : 'transparent',
                                    color: activeTab === tab.id ? '#fff' : '#7c7c7c',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    transition: 'all 0.15s ease',
                                }, children: tab.label }, tab.id))) }), _jsxs("div", { style: { flex: 1, overflow: 'visible', paddingRight: 0 }, children: [activeTab === "profile" && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 32 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 20 }, children: [_jsx("div", { style: { width: 64, height: 64, borderRadius: 999, overflow: 'hidden', background: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#0c0c0c' }, children: profile.avatar_url ? (_jsx("img", { src: profile.avatar_url, alt: profile.full_name || profile.email || "Profile", style: { width: '100%', height: '100%', objectFit: 'cover' } })) : ((profile.full_name || profile.email || "U")
                                                        .split(" ")
                                                        .map((s) => s[0])
                                                        .slice(0, 2)
                                                        .join("")
                                                        .toUpperCase()) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("h3", { style: { fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: '#0c0c0c' }, children: profile.full_name || profile.email || "Your name" }), _jsx("p", { style: { fontSize: 14, color: '#7c7c7c', margin: 0 }, children: profile.business_name ?? "Wedding Planner" })] })] }), _jsx("div", { style: { height: 1, background: '#e3e3e3', margin: '0 -40px' } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 20 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, color: '#0c0c0c' }, children: "Business Name" }), _jsx("input", { id: "business-name", defaultValue: profile.business_name ?? "", style: {
                                                                borderRadius: 999,
                                                                padding: '12px 18px',
                                                                border: '1px solid #e3e3e3',
                                                                background: '#fff',
                                                                fontSize: 14,
                                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                                            } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, color: '#0c0c0c' }, children: "Email" }), _jsx("input", { id: "email", type: "email", defaultValue: profile.email ?? "", style: {
                                                                borderRadius: 999,
                                                                padding: '12px 18px',
                                                                border: '1px solid #e3e3e3',
                                                                background: '#fff',
                                                                fontSize: 14,
                                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                                            } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, color: '#0c0c0c' }, children: "Phone" }), _jsx("input", { id: "phone", type: "tel", defaultValue: profile.phone ?? "", style: {
                                                                borderRadius: 999,
                                                                padding: '12px 18px',
                                                                border: '1px solid #e3e3e3',
                                                                background: '#fff',
                                                                fontSize: 14,
                                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                                            } })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, color: '#0c0c0c' }, children: "Business Address" }), _jsx("input", { id: "address", defaultValue: profile.address ?? "", style: {
                                                                borderRadius: 999,
                                                                padding: '12px 18px',
                                                                border: '1px solid #e3e3e3',
                                                                background: '#fff',
                                                                fontSize: 14,
                                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                                            } })] })] })] })), activeTab === "team" && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }, children: [_jsxs("div", { children: [_jsx("h3", { style: { fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: '#0c0c0c' }, children: "Team Members" }), _jsx("p", { style: { fontSize: 14, color: '#7c7c7c', margin: 0 }, children: teamInfo ? `Workspace: ${teamInfo.name}` : 'Create a team to start collaborating' })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handleCreateTeamButton, disabled: creatingTeam || Boolean(teamInfo), style: {
                                                                borderRadius: 999,
                                                                padding: '10px 20px',
                                                                border: '1px solid #0c0c0c',
                                                                background: teamInfo ? '#fafafa' : '#0c0c0c',
                                                                color: teamInfo ? '#0c0c0c' : '#fff',
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                                cursor: creatingTeam || teamInfo ? 'not-allowed' : 'pointer',
                                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                                            }, children: creatingTeam ? 'Creating…' : 'Create Team' }), _jsx("button", { onClick: () => teamInfo && setShowInviteModal(true), disabled: !teamInfo, style: {
                                                                borderRadius: 999,
                                                                padding: '10px 20px',
                                                                border: 'none',
                                                                background: teamInfo ? '#0c0c0c' : '#d7d7d7',
                                                                color: teamInfo ? '#fff' : '#888',
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                                cursor: teamInfo ? 'pointer' : 'not-allowed',
                                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                                            }, children: "Invite" })] })] }), teamError && (_jsx("div", { style: {
                                                padding: 12,
                                                borderRadius: 999,
                                                background: '#fee2e2',
                                                color: '#b91c1c',
                                                fontSize: 13,
                                                fontWeight: 500,
                                            }, children: teamError })), teamLoading ? (_jsx("div", { style: { textAlign: 'center', padding: 32, color: '#7c7c7c', fontSize: 14 }, children: "Loading team information..." })) : !teamInfo ? (_jsx("div", { style: {
                                                border: '1px dashed #cfcfcf',
                                                borderRadius: 20,
                                                padding: 24,
                                                background: '#fafafa',
                                                textAlign: 'center',
                                                color: '#6b6b6b',
                                                fontSize: 14,
                                            }, children: "No team yet. Click the \"Create Team\" button above to set up your workspace." })) : null, (inviteActionError || acceptSuccessMessage) && (_jsx("div", { style: {
                                                padding: 12,
                                                borderRadius: 999,
                                                background: inviteActionError ? '#fee2e2' : '#ecfdf5',
                                                color: inviteActionError ? '#b91c1c' : '#065f46',
                                                fontSize: 13,
                                                fontWeight: 500,
                                            }, children: inviteActionError || acceptSuccessMessage })), loadingInvites ? (_jsx("div", { style: { textAlign: 'center', padding: 32, color: '#7c7c7c', fontSize: 14 }, children: "Checking for pending invitations..." })) : pendingInvites.length > 0 ? (_jsxs("div", { style: { border: '1px solid #e3e3e3', borderRadius: 20, padding: 20, background: '#fafafa', display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx("h4", { style: { margin: 0, fontSize: 14, fontWeight: 700, color: '#0c0c0c' }, children: "Pending invitations" }), _jsx("p", { style: { margin: '4px 0 0 0', fontSize: 13, color: '#6b6b6b' }, children: "Accept to join the shared workspace." })] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: pendingInvites.map((invite) => {
                                                        const teamName = invite?.teams?.name || 'Unnamed team';
                                                        const inviterEmail = invite?.inviter?.email || 'Someone from WedBoarPro';
                                                        const expiresAt = invite?.expires_at ? new Date(invite.expires_at) : null;
                                                        const expiresLabel = expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : 'Expires soon';
                                                        const isProcessing = acceptingToken === invite?.token;
                                                        return (_jsxs("div", { style: {
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: 16,
                                                                borderRadius: 16,
                                                                background: '#fff',
                                                                border: '1px solid #e3e3e3',
                                                                gap: 12,
                                                                flexWrap: 'wrap',
                                                            }, children: [_jsxs("div", { style: { flex: 1, minWidth: 200 }, children: [_jsx("p", { style: { margin: 0, fontSize: 14, fontWeight: 600, color: '#0c0c0c' }, children: teamName }), _jsxs("p", { style: { margin: '4px 0 0 0', fontSize: 12, color: '#6b6b6b' }, children: ["Invited by ", inviterEmail, " \u00B7 ", expiresLabel] })] }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: _jsx("button", { onClick: () => handleAcceptInvite(invite.token), disabled: isProcessing, style: {
                                                                            borderRadius: 999,
                                                                            padding: '8px 18px',
                                                                            border: 'none',
                                                                            background: isProcessing ? '#9ca3af' : '#0c0c0c',
                                                                            color: '#fff',
                                                                            fontSize: 13,
                                                                            fontWeight: 600,
                                                                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                                        }, children: isProcessing ? 'Joining...' : 'Accept invite' }) })] }, invite.id));
                                                    }) })] })) : null, teamInfo &&
                                            (loadingMembers ? (_jsx("div", { style: { textAlign: 'center', padding: 40, color: '#7c7c7c' }, children: "Loading team members..." })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: teamMembers.length === 0 ? (_jsx("div", { style: { textAlign: 'center', padding: 40, color: '#7c7c7c' }, children: "No team members yet. Click \"Invite\" to add someone to your team." })) : (teamMembers.map((member) => {
                                                    const memberProfile = member.profile || member.profiles || {};
                                                    const memberEmail = member.displayEmail || memberProfile.email || "";
                                                    const memberName = member.displayName ||
                                                        memberProfile.full_name ||
                                                        memberEmail ||
                                                        "Unknown";
                                                    const memberAvatar = memberProfile.avatar_url;
                                                    const initials = (memberName || "U")
                                                        .split(" ")
                                                        .map((s) => s[0])
                                                        .slice(0, 2)
                                                        .join("")
                                                        .toUpperCase();
                                                    return (_jsxs("div", { style: {
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: 16,
                                                            borderRadius: 16,
                                                            border: '1px solid #e3e3e3',
                                                            background: '#fff',
                                                        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [memberAvatar ? (_jsx("img", { src: memberAvatar, alt: memberName, style: {
                                                                            width: 40,
                                                                            height: 40,
                                                                            borderRadius: 999,
                                                                            objectFit: 'cover',
                                                                        } })) : (_jsx("div", { style: {
                                                                            width: 40,
                                                                            height: 40,
                                                                            borderRadius: 999,
                                                                            background: '#ebebeb',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: 14,
                                                                            fontWeight: 700,
                                                                            color: '#0c0c0c',
                                                                        }, children: initials })), _jsxs("div", { children: [_jsx("p", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 2px 0', color: '#0c0c0c' }, children: memberName }), _jsx("p", { style: { fontSize: 12, color: '#7c7c7c', margin: 0 }, children: memberEmail })] })] }), _jsx("span", { style: {
                                                                    borderRadius: 999,
                                                                    padding: '4px 12px',
                                                                    background: '#ebebeb',
                                                                    fontSize: 12,
                                                                    fontWeight: 600,
                                                                    color: '#0c0c0c',
                                                                    textTransform: 'capitalize',
                                                                }, children: member.role })] }, member.id));
                                                })) })))] })), activeTab === "billing" && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsx("div", { style: {
                                                padding: 24,
                                                borderRadius: 16,
                                                border: '1px solid #e3e3e3',
                                                background: '#f5f5f5',
                                            }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }, children: [_jsxs("div", { children: [_jsx("h3", { style: { fontSize: 18, fontWeight: 700, margin: '0 0 4px 0', color: '#0c0c0c' }, children: "Premium Plan" }), _jsx("p", { style: { fontSize: 14, color: '#7c7c7c', margin: '0 0 12px 0' }, children: "Unlimited projects and team" }), _jsx("p", { style: { fontSize: 28, fontWeight: 700, margin: 0, color: '#0c0c0c' }, children: "$99/month" })] }), _jsx("button", { style: {
                                                            borderRadius: 999,
                                                            padding: '8px 18px',
                                                            border: '1px solid #e3e3e3',
                                                            background: '#fff',
                                                            color: '#0c0c0c',
                                                            fontWeight: 600,
                                                            fontSize: 14,
                                                            cursor: 'pointer',
                                                            fontFamily: "'Geist', 'Inter', sans-serif",
                                                        }, children: "Change Plan" })] }) }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 700, margin: 0, color: '#0c0c0c' }, children: "Payment Method" }), _jsxs("div", { style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: 16,
                                                        borderRadius: 16,
                                                        border: '1px solid #e3e3e3',
                                                        background: '#fff',
                                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12 }, children: [_jsx("div", { style: {
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: 999,
                                                                        background: '#ebebeb',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                    }, children: "\uD83D\uDCB3" }), _jsxs("div", { children: [_jsx("p", { style: { fontSize: 14, fontWeight: 600, margin: '0 0 2px 0', color: '#0c0c0c' }, children: "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 4242" }), _jsx("p", { style: { fontSize: 12, color: '#7c7c7c', margin: 0 }, children: "Expires 12/2025" })] })] }), _jsx("button", { style: {
                                                                borderRadius: 999,
                                                                padding: '8px 18px',
                                                                border: '1px solid #e3e3e3',
                                                                background: '#fff',
                                                                color: '#0c0c0c',
                                                                fontWeight: 600,
                                                                fontSize: 14,
                                                                cursor: 'pointer',
                                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                                            }, children: "Update" })] })] })] })), activeTab === "preferences" && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 32 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 700, margin: 0, color: '#0c0c0c' }, children: "Notifications" }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [
                                                        { label: "Email notifications for new quotes", checked: true },
                                                        { label: "Task reminders", checked: true },
                                                        { label: "Client messages", checked: true },
                                                    ].map((pref) => (_jsxs("label", { style: {
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: 12,
                                                            borderRadius: 16,
                                                            border: '1px solid #e3e3e3',
                                                            background: '#fff',
                                                            cursor: 'pointer',
                                                        }, children: [_jsx("span", { style: { fontSize: 14, color: '#0c0c0c' }, children: pref.label }), _jsx("input", { type: "checkbox", defaultChecked: pref.checked, style: { width: 18, height: 18, cursor: 'pointer' } })] }, pref.label))) })] }), _jsx("div", { style: { height: 1, background: '#e3e3e3' } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsx("h3", { style: { fontSize: 14, fontWeight: 700, margin: 0, color: '#0c0c0c' }, children: "Security" }), _jsx("button", { style: {
                                                        width: '100%',
                                                        borderRadius: 999,
                                                        padding: '12px 18px',
                                                        border: '1px solid #e3e3e3',
                                                        background: '#fff',
                                                        color: '#0c0c0c',
                                                        fontWeight: 600,
                                                        fontSize: 14,
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        fontFamily: "'Geist', 'Inter', sans-serif",
                                                    }, children: "Change Password" }), _jsx("button", { style: {
                                                        width: '100%',
                                                        borderRadius: 999,
                                                        padding: '12px 18px',
                                                        border: '1px solid #e3e3e3',
                                                        background: '#fff',
                                                        color: '#0c0c0c',
                                                        fontWeight: 600,
                                                        fontSize: 14,
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        fontFamily: "'Geist', 'Inter', sans-serif",
                                                    }, children: "Enable Two-Factor Authentication" })] })] }))] }), _jsx("div", { style: { height: 1, background: '#e3e3e3', margin: '32px -40px 0 -40px' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }, children: [_jsx("button", { onClick: () => onOpenChange(false), style: {
                                        borderRadius: 999,
                                        padding: '10px 24px',
                                        border: '1px solid #e3e3e3',
                                        background: '#fff',
                                        color: '#0c0c0c',
                                        fontWeight: 600,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        fontFamily: "'Geist', 'Inter', sans-serif",
                                    }, children: "Cancel" }), _jsx("button", { onClick: () => onOpenChange(false), style: {
                                        borderRadius: 999,
                                        padding: '10px 24px',
                                        border: 'none',
                                        background: '#0c0c0c',
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: 14,
                                        cursor: 'pointer',
                                        fontFamily: "'Geist', 'Inter', sans-serif",
                                    }, children: "Save Changes" })] })] }) }), showInviteModal && (_jsx("div", { style: {
                    position: "fixed",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.4)",
                    zIndex: 70,
                }, onClick: () => {
                    setShowInviteModal(false);
                    setInviteEmail("");
                    setInviteError(null);
                    setInviteSuccess(false);
                }, children: _jsxs("div", { style: {
                        background: "#ffffff",
                        padding: "32px",
                        borderRadius: "24px",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                        maxWidth: "480px",
                        width: "90vw",
                        fontFamily: "'Geist', 'Inter', sans-serif",
                    }, onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { style: { fontSize: 20, fontWeight: 700, margin: "0 0 8px 0", color: "#0c0c0c" }, children: "Invite Team Member" }), _jsx("p", { style: { fontSize: 14, color: "#7c7c7c", margin: "0 0 24px 0" }, children: "Send an invitation to join your team. They'll need to sign up if they don't have an account yet." }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 16 }, children: [_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [_jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#0c0c0c" }, children: "Email Address" }), _jsx("input", { type: "email", value: inviteEmail, onChange: (e) => {
                                                setInviteEmail(e.target.value);
                                                setInviteError(null);
                                                setInviteSuccess(false);
                                            }, placeholder: "colleague@example.com", style: {
                                                borderRadius: 999,
                                                padding: "12px 18px",
                                                border: inviteError ? "1px solid #ef4444" : "1px solid #e3e3e3",
                                                background: "#fff",
                                                fontSize: 14,
                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                            }, onKeyDown: (e) => {
                                                if (e.key === "Enter") {
                                                    handleInvite();
                                                }
                                            } }), inviteError && (_jsx("p", { style: { fontSize: 12, color: "#ef4444", margin: 0 }, children: inviteError })), inviteSuccess && (_jsx("p", { style: { fontSize: 12, color: "#10b981", margin: 0 }, children: "Invitation sent successfully! They'll receive an email with instructions." }))] }), _jsxs("div", { style: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }, children: [_jsx("button", { onClick: () => {
                                                setShowInviteModal(false);
                                                setInviteEmail("");
                                                setInviteError(null);
                                                setInviteSuccess(false);
                                            }, style: {
                                                borderRadius: 999,
                                                padding: "10px 24px",
                                                border: "1px solid #e3e3e3",
                                                background: "#fff",
                                                color: "#0c0c0c",
                                                fontWeight: 600,
                                                fontSize: 14,
                                                cursor: "pointer",
                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                            }, children: "Cancel" }), _jsx("button", { onClick: handleInvite, disabled: inviting || !inviteEmail, style: {
                                                borderRadius: 999,
                                                padding: "10px 24px",
                                                border: "none",
                                                background: inviting || !inviteEmail ? "#9ca3af" : "#0c0c0c",
                                                color: "#fff",
                                                fontWeight: 600,
                                                fontSize: 14,
                                                cursor: inviting || !inviteEmail ? "not-allowed" : "pointer",
                                                fontFamily: "'Geist', 'Inter', sans-serif",
                                            }, children: inviting ? "Sending..." : "Send Invitation" })] })] })] }) }))] }));
}
//# sourceMappingURL=AccountModal.js.map