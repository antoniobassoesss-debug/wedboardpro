import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, getDay, isBefore, startOfDay, addDays } from 'date-fns';
import TeamCRM from './TeamCRM';
import BlogDashboard from './blog/BlogDashboard';
import './team.css';

interface TeamUser {
  email: string;
  name: string;
  role: string;
}

interface Booking {
  id: string;
  name: string;
  email: string;
  company: string | null;
  booking_date: string;
  booking_time: string;
  goal: string | null;
  team_size: string | null;
  status: string;
  meeting_link: string | null;
}

interface UnavailableDate {
  id: string;
  date: string;
  type: string;
  reason?: string;
}

interface BlockedSlot {
  id: string;
  date: string;
  time_slot: string;
  reason?: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  phone?: string;
  department?: string;
  is_active: boolean;
  permissions?: Record<string, unknown>;
  created_at: string;
}

interface MemberFormData {
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  department: string;
  phone: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Member Modal Component
const MemberModal: React.FC<{
  member?: TeamMember;
  onClose: () => void;
  onSubmit: (data: MemberFormData) => Promise<void>;
  isLoading: boolean;
}> = ({ member, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<MemberFormData>({
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || 'member',
    department: member?.department || '',
    phone: member?.phone || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        maxWidth: 480,
        width: '90%'
      }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 24 }}>
          {member ? 'Edit Team Member' : 'Add Team Member'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                outline: 'none'
              }}
            />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                outline: 'none'
              }}
            />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'member' | 'viewer' })}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 14,
                outline: 'none',
                background: '#fff'
              }}
            >
              <option value="admin">Admin - Full access</option>
              <option value="manager">Manager - Manage bookings & leads</option>
              <option value="member">Member - View & edit</option>
              <option value="viewer">Viewer - Read only</option>
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Sales"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                fontSize: 14,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#111827',
                color: '#fff',
                fontSize: 14,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeamDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bookings' | 'crm' | 'availability' | 'blog' | 'users'>('bookings');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<UnavailableDate[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [user, setUser] = useState<TeamUser | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState<string | null>(null);
  const [showSlotModal, setShowSlotModal] = useState<{date: string, time: string} | null>(null);
  const [slotBlockReason, setSlotBlockReason] = useState('');
  const [selectedDateDetails, setSelectedDateDetails] = useState<{date: Date, blocked: boolean, bookings: Booking[]} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('team_token');
    const userData = sessionStorage.getItem('team_user');
    
    if (!token || !userData) {
      navigate('/team-login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      navigate('/team-login');
    }
  }, [navigate]);

  const fetchData = useCallback(async () => {
    const token = sessionStorage.getItem('team_token');
    if (!token) return;

    setLoading(true);
    try {
      const [bookingsRes, availabilityRes, blockedSlotsRes, membersRes] = await Promise.all([
        fetch('/api/v1/team/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/v1/team/availability'),
        fetch('/api/v1/team/blocked-slots'),
        fetch('/api/v1/team/members', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }
      if (availabilityRes.ok) {
        const data = await availabilityRes.json();
        setBlockedDates(data.availability || []);
      }
      if (blockedSlotsRes.ok) {
        const data = await blockedSlotsRes.json();
        setBlockedSlots(data.blockedSlots || []);
      }
      if (membersRes.ok) {
        const data = await membersRes.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    sessionStorage.removeItem('team_token');
    sessionStorage.removeItem('team_user');
    navigate('/team-login');
  };

  const handleAvailabilityChange = async (day: number, field: string, value: string | boolean) => {
    const token = sessionStorage.getItem('team_token');
    if (!token) return;

    try {
      await fetch('/api/v1/team/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ day_of_week: day, [field]: value })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const handleBookingStatus = async (bookingId: string, status: string) => {
    const token = sessionStorage.getItem('team_token');
    if (!token) return;

    try {
      await fetch(`/api/v1/team/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let h = 9; h < 17; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const isSlotBooked = (date: Date, time: string) => {
    return bookings.some(b => 
      isSameDay(parseISO(b.booking_date), date) && 
      b.booking_time.startsWith(time.slice(0, 2) + ':' + (time.includes(':30') ? '30' : '00'))
    );
  };

  const isDateBlocked = (dateStr: string) => {
    return blockedDates.some(b => b.date === dateStr && b.type === 'unavailable');
  };

  const handleBlockDate = async (dateStr: string, reason: string) => {
    try {
      const res = await fetch('/api/v1/team/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          type: 'unavailable',
          reason: reason || 'Unavailable'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBlockedDates(prev => [...prev.filter(b => b.date !== dateStr), data.availability]);
        setShowBlockModal(null);
        setBlockReason('');
      }
    } catch (error) {
      console.error('Failed to block date:', error);
    }
  };

  const handleUnblockDate = async (dateStr: string) => {
    const blocked = blockedDates.find(b => b.date === dateStr);
    if (!blocked) return;

    try {
      await fetch(`/api/v1/team/availability/${blocked.id}`, {
        method: 'DELETE'
      });
      setBlockedDates(prev => prev.filter(b => b.date !== dateStr));
    } catch (error) {
      console.error('Failed to unblock date:', error);
    }
  };

  const handleBlockSlot = async (dateStr: string, time: string, reason: string) => {
    try {
      const res = await fetch('/api/v1/team/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          time_slot: time,
          reason: reason || 'Blocked'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBlockedSlots(prev => [...prev, data.blockedSlot]);
        setShowSlotModal(null);
        setSlotBlockReason('');
      }
    } catch (error) {
      console.error('Failed to block slot:', error);
    }
  };

  const handleUnblockSlot = async (slotId: string) => {
    try {
      await fetch(`/api/v1/team/blocked-slots/${slotId}`, {
        method: 'DELETE'
      });
      setBlockedSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (error) {
      console.error('Failed to unblock slot:', error);
    }
  };

  const getBlockedSlotsForDate = (dateStr: string) => {
    return blockedSlots.filter(s => s.date === dateStr);
  };

  const isSlotBlocked = (dateStr: string, time: string) => {
    return blockedSlots.some(s => s.date === dateStr && s.time_slot === time);
  };

  const timeSlots = (): string[] => {
    return ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  };

  const formatTime = (time: string): string => {
    const parts = time.split(':');
    const hours = parts[0] || '09';
    const minutes = parts[1] || '00';
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleAddMember = async (data: MemberFormData) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const data = await res.json();
        setTeamMembers(prev => [data.member, ...prev]);
        setShowAddMember(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMember = async (data: MemberFormData) => {
    if (!selectedMember) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/team/members/${selectedMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? result.member : m));
        setShowEditMember(false);
        setSelectedMember(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update member');
      }
    } catch (error) {
      console.error('Failed to update member:', error);
      alert('Failed to update member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      const res = await fetch(`/api/v1/team/members/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== id));
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete member');
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
      alert('Failed to delete member');
    }
  };

  const calendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(b => 
      isSameDay(parseISO(b.booking_date), date) && 
      b.status !== 'cancelled'
    );
  };

  if (!user) return null;

  return (
    <div className="team-dashboard-page">
      <header className="team-header">
        <div className="team-header-left">
          <Link to="/" className="team-header-logo">
            <img src="/logo/iconlogo.png" alt="WedBoardPro" />
            <span>WedBoardPro</span>
          </Link>
          <span style={{ fontSize: 14, color: '#6b7280' }}>Team Dashboard</span>
        </div>
        <nav className="team-header-nav">
          <button 
            className={`team-nav-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Demo Bookings
          </button>
          <button 
            className={`team-nav-btn ${activeTab === 'crm' ? 'active' : ''}`}
            onClick={() => setActiveTab('crm')}
          >
            CRM
          </button>
          <button 
            className={`team-nav-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            Availability
          </button>
          <button
            className={`team-nav-btn ${activeTab === 'blog' ? 'active' : ''}`}
            onClick={() => setActiveTab('blog')}
          >
            Blog
          </button>
          <button
            className="team-nav-btn"
            onClick={() => navigate('/team/seo')}
          >
            SEO Intelligence
          </button>
          <button
            className={`team-nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </nav>
        <div className="team-header-right">
          <div className="team-user-info">
            <div className="team-user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="team-user-name">{user.name}</span>
          </div>
          <button className="team-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="team-content">
        {activeTab === 'bookings' && (
          <>
            <div className="team-stats-grid">
              <div className="team-stat-card">
                <div className="team-stat-label">Today's Bookings</div>
                <div className="team-stat-value">
                  {bookings.filter(b => isSameDay(parseISO(b.booking_date), new Date())).length}
                </div>
              </div>
              <div className="team-stat-card">
                <div className="team-stat-label">This Week</div>
                <div className="team-stat-value">
                  {bookings.filter(b => {
                    const d = parseISO(b.booking_date);
                    const now = new Date();
                    const weekEnd = new Date(now);
                    weekEnd.setDate(weekEnd.getDate() + 7);
                    return d >= now && d <= weekEnd;
                  }).length}
                </div>
              </div>
              <div className="team-stat-card">
                <div className="team-stat-label">Pending</div>
                <div className="team-stat-value">
                  {bookings.filter(b => b.status === 'pending').length}
                </div>
              </div>
              <div className="team-stat-card">
                <div className="team-stat-label">Confirmed</div>
                <div className="team-stat-value">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </div>
              </div>
            </div>

            <div className="team-section">
              <div className="team-section-header">
                <h2 className="team-section-title">Demo Calendar</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="team-calendar">
                  <div className="team-calendar-header">
                    <div className="team-calendar-nav">
                      <button 
                        className="team-calendar-nav-btn"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      >
                        ←
                      </button>
                      <span className="team-calendar-month">
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                      <button 
                        className="team-calendar-nav-btn"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <div className="team-calendar-grid">
                    {DAYS.map(day => (
                      <div key={day} className="team-calendar-day-header">{day}</div>
                    ))}
                    {calendarDays().map(day => {
                      const hasBookings = getBookingsForDate(day).length > 0;
                      return (
                        <div
                          key={day.toISOString()}
                          className={`team-calendar-day ${isSameDay(day, new Date()) ? 'today' : ''} ${selectedDate && isSameDay(day, selectedDate) ? 'selected' : ''} ${hasBookings ? 'has-bookings' : ''}`}
                          onClick={() => setSelectedDate(day)}
                        >
                          <div className="team-calendar-day-number">
                            {format(day, 'd')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                  </h3>
                  
                  {selectedDate && (
                    <>
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            Time Slots
                          </p>
                          <div className="team-time-slots">
                            {isDateBlocked(format(selectedDate, 'yyyy-MM-dd')) ? (
                              <div style={{ padding: 20, textAlign: 'center', color: '#ef4444', fontSize: 14, background: '#fef2f2', borderRadius: 8 }}>
                                This date is blocked - no bookings allowed
                              </div>
                            ) : (
                              getTimeSlots().map(time => {
                                const booked = isSlotBooked(selectedDate, time);
                                
                                return (
                                  <div
                                    key={time}
                                    className={`team-time-slot ${booked ? 'booked' : 'available'}`}
                                  >
                                    {time}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      <div>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                          Bookings ({getBookingsForDate(selectedDate).length})
                        </p>
                        <div className="team-bookings-list">
                          {getBookingsForDate(selectedDate).length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                              No bookings for this date
                            </div>
                          ) : (
                            getBookingsForDate(selectedDate).map(booking => (
                              <div key={booking.id} className="team-booking-item">
                                <div className="team-booking-avatar">
                                  {booking.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="team-booking-info">
                                  <div className="team-booking-name">{booking.name}</div>
                                  <div className="team-booking-details">
                                    {booking.email} {booking.company && `· ${booking.company}`}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                    Goal: {booking.goal || 'Not specified'}
                                  </div>
                                </div>
                                <div className="team-booking-meta">
                                  <span className="team-booking-time">{booking.booking_time}</span>
                                  <span className={`team-booking-status ${booking.status}`}>
                                    {booking.status}
                                  </span>
                                </div>
                                <div className="team-booking-actions">
                                  {booking.status === 'confirmed' && (
                                    <button 
                                      className="team-action-btn danger"
                                      onClick={() => handleBookingStatus(booking.id, 'cancelled')}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                  {booking.status === 'pending' && (
                                    <>
                                      <button 
                                        className="team-action-btn"
                                        onClick={() => handleBookingStatus(booking.id, 'confirmed')}
                                      >
                                        Confirm
                                      </button>
                                      <button 
                                        className="team-action-btn danger"
                                        onClick={() => handleBookingStatus(booking.id, 'cancelled')}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {booking.meeting_link && (
                                    <a 
                                      href={booking.meeting_link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="team-action-btn"
                                    >
                                      Join
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'availability' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">Availability Management</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                Block entire days or specific time slots - users won't be able to book on blocked dates/slots
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 24 }}>
              {/* Calendar */}
              <div>
                {/* Month Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    ← Previous
                  </button>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#fff',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    Next →
                  </button>
                </div>

                {/* Weekday Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '8px 0' }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {calendarDays().map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const blocked = isDateBlocked(dateStr);
                    const isToday = isSameDay(day, new Date());
                    const isPast = isBefore(day, startOfDay(new Date()));
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const bookings = getBookingsForDate(day);
                    const hasBookings = bookings.length > 0;
                    const blockedReason = blockedDates.find(b => b.date === dateStr)?.reason;
                    const dateBlockedSlots = getBlockedSlotsForDate(dateStr);

                    return (
                      <div key={i} style={{ position: 'relative' }}>
                        <button
                          onClick={() => {
                            if (!blocked && !isPast) {
                              setSelectedDateDetails({ date: day, blocked, bookings });
                            }
                          }}
                          disabled={isPast}
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                            border: isToday ? '2px solid #059669' : blocked ? '2px solid #ef4444' : '1px solid #e5e7eb',
                            backgroundColor: blocked ? '#fef2f2' : isCurrentMonth ? '#ffffff' : '#f9fafb',
                            color: isPast ? '#d1d5db' : blocked ? '#ef4444' : isCurrentMonth ? '#111827' : '#d1d5db',
                            cursor: isPast ? 'not-allowed' : 'pointer',
                            opacity: isPast ? 0.5 : 1,
                            fontSize: 13,
                            fontWeight: blocked || hasBookings ? 600 : 400
                          }}
                        >
                          {format(day, 'd')}
                          {blocked && <span style={{ fontSize: 7 }}>BLOCKED</span>}
                          {!blocked && hasBookings && (
                            <span style={{ fontSize: 7, color: '#059669' }}>{bookings.length} booking</span>
                          )}
                          {!blocked && !hasBookings && dateBlockedSlots.length > 0 && (
                            <span style={{ fontSize: 7, color: '#f59e0b' }}>{dateBlockedSlots.length} slot</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel - Blocked Items */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>
                  Blocked Items
                </h4>
                
                {/* Blocked Dates */}
                <div style={{ marginBottom: 20 }}>
                  <h5 style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
                    Blocked Dates
                  </h5>
                  {blockedDates.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 8 }}>
                      No blocked dates
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {blockedDates.map(blocked => (
                        <div
                          key={blocked.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 10,
                            background: '#fef2f2',
                            borderRadius: 8,
                            border: '1px solid #fecaca'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#991b1b' }}>
                              {format(parseISO(blocked.date), 'MMM d, yyyy')}
                            </div>
                            {blocked.reason && (
                              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
                                {blocked.reason}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleUnblockDate(blocked.date)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              border: 'none',
                              background: '#dc2626',
                              color: '#fff',
                              fontSize: 11,
                              cursor: 'pointer'
                            }}
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Blocked Slots */}
                <div>
                  <h5 style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>
                    Blocked Time Slots
                  </h5>
                  {blockedSlots.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 8 }}>
                      No blocked slots
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {blockedSlots.map(slot => (
                        <div
                          key={slot.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 8,
                            background: '#fffbeb',
                            borderRadius: 6,
                            border: '1px solid #fde68a'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#92400e' }}>
                              {format(parseISO(slot.date), 'MMM d')} · {formatTime(slot.time_slot)}
                            </div>
                            {slot.reason && (
                              <div style={{ fontSize: 10, color: '#d97706', marginTop: 1 }}>
                                {slot.reason}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleUnblockSlot(slot.id)}
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              border: 'none',
                              background: '#d97706',
                              color: '#fff',
                              fontSize: 10,
                              cursor: 'pointer'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date Details Modal/Panel */}
            {selectedDateDetails && (
              <div style={{
                marginTop: 24,
                padding: 20,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
                    {format(selectedDateDetails.date, 'EEEE, MMMM d, yyyy')}
                  </h4>
                  <button
                    onClick={() => setSelectedDateDetails(null)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    Close
                  </button>
                </div>

                {/* Time Slots */}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 10 }}>
                    Click on time slots to block/unblock them
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {timeSlots().map(time => {
                      const isBlocked = isSlotBlocked(format(selectedDateDetails.date, 'yyyy-MM-dd'), time);
                      const booking = bookings.find(b => 
                        b.booking_date === format(selectedDateDetails.date, 'yyyy-MM-dd') &&
                        b.booking_time.startsWith(time)
                      );

                      return (
                        <button
                          key={time}
                          onClick={() => {
                            if (!isBlocked && !booking) {
                              setShowSlotModal({ date: format(selectedDateDetails.date, 'yyyy-MM-dd'), time });
                            } else if (isBlocked) {
                              const slot = blockedSlots.find(s => 
                                s.date === format(selectedDateDetails.date, 'yyyy-MM-dd') && 
                                s.time_slot === time
                              );
                              if (slot) handleUnblockSlot(slot.id);
                            }
                          }}
                          disabled={!!booking}
                          style={{
                            padding: '10px 16px',
                            borderRadius: 8,
                            border: isBlocked ? '2px solid #ef4444' : booking ? '2px solid #059669' : '1px solid #e5e7eb',
                            backgroundColor: isBlocked ? '#fef2f2' : booking ? '#dcfce7' : '#fff',
                            color: isBlocked ? '#ef4444' : booking ? '#059669' : '#374151',
                            cursor: booking ? 'not-allowed' : 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                            minWidth: 90
                          }}
                        >
                          {formatTime(time)}
                          {isBlocked && <span style={{ fontSize: 10, display: 'block' }}>BLOCKED</span>}
                          {booking && <span style={{ fontSize: 10, display: 'block' }}>{booking.name}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Block/Unblock Whole Day */}
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                  {!isDateBlocked(format(selectedDateDetails.date, 'yyyy-MM-dd')) && (
                    <button
                      onClick={() => {
                        setShowBlockModal(format(selectedDateDetails.date, 'yyyy-MM-dd'));
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      Block Entire Day
                    </button>
                  )}
                  {isDateBlocked(format(selectedDateDetails.date, 'yyyy-MM-dd')) && (
                    <button
                      onClick={() => handleUnblockDate(format(selectedDateDetails.date, 'yyyy-MM-dd'))}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: '1px solid #ef4444',
                        background: '#fff',
                        color: '#ef4444',
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      Unblock Entire Day
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Block Date Modal */}
            {showBlockModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 24,
                  maxWidth: 400,
                  width: '90%'
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                    Block Entire Day
                  </h3>
                  <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                    Blocking {format(parseISO(showBlockModal), 'MMMM d, yyyy')}
                  </p>
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      marginBottom: 16,
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowBlockModal(null);
                        setBlockReason('');
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleBlockDate(showBlockModal, blockReason)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      Block Day
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Block Slot Modal */}
            {showSlotModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 24,
                  maxWidth: 400,
                  width: '90%'
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
                    Block Time Slot
                  </h3>
                  <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                    Blocking {formatTime(showSlotModal.time)} on {format(parseISO(showSlotModal.date), 'MMMM d, yyyy')}
                  </p>
                  <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={slotBlockReason}
                    onChange={(e) => setSlotBlockReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      marginBottom: 16,
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowSlotModal(null);
                        setSlotBlockReason('');
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleBlockSlot(showSlotModal.date, showSlotModal.time, slotBlockReason)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#f59e0b',
                        color: '#fff',
                        fontSize: 14,
                        cursor: 'pointer'
                      }}
                    >
                      Block Slot
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'crm' && (
          <TeamCRM onLogout={handleLogout} />
        )}

        {activeTab === 'blog' && (
          <BlogDashboard />
        )}

        {activeTab === 'users' && (
          <div className="team-section">
            <div className="team-section-header">
              <h2 className="team-section-title">Team Members</h2>
              <button 
                className="team-action-btn"
                onClick={() => setShowAddMember(true)}
              >
                + Add Member
              </button>
            </div>
            
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                Loading...
              </div>
            ) : teamMembers.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
                <p style={{ fontSize: 16, marginBottom: 8 }}>No team members yet</p>
                <p style={{ fontSize: 14, color: '#9ca3af' }}>Add team members to give them access to the dashboard</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {teamMembers.map(member => (
                  <div 
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: 16,
                      background: '#fff',
                      borderRadius: 12,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: member.role === 'admin' ? '#fef3c7' : member.role === 'manager' ? '#dbeafe' : '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 600,
                      color: member.role === 'admin' ? '#92400e' : member.role === 'manager' ? '#1e40af' : '#374151'
                    }}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{member.name}</span>
                        {!member.is_active && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                            background: '#fef2f2',
                            color: '#dc2626'
                          }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{member.email}</div>
                      {member.department && (
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{member.department}</div>
                      )}
                    </div>
                    
                    {/* Role Badge */}
                    <div style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      background: member.role === 'admin' ? '#fef3c7' : member.role === 'manager' ? '#dbeafe' : '#f3f4f6',
                      color: member.role === 'admin' ? '#92400e' : member.role === 'manager' ? '#1e40af' : '#374151',
                      textTransform: 'capitalize'
                    }}>
                      {member.role}
                    </div>
                    
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setSelectedMember(member);
                          setShowEditMember(true);
                        }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid #e5e7eb',
                          background: '#fff',
                          color: '#374151',
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: 'none',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Member Modal */}
            {showAddMember && (
              <MemberModal
                onClose={() => {
                  setShowAddMember(false);
                }}
                onSubmit={handleAddMember}
                isLoading={submitting}
              />
            )}
            
            {/* Edit Member Modal */}
            {showEditMember && selectedMember && (
              <MemberModal
                member={selectedMember}
                onClose={() => {
                  setShowEditMember(false);
                  setSelectedMember(null);
                }}
                onSubmit={handleUpdateMember}
                isLoading={submitting}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamDashboard;
