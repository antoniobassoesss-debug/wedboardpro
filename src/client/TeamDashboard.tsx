import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek } from 'date-fns';
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

interface Availability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TeamDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bookings' | 'crm' | 'availability' | 'blog' | 'users'>('bookings');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<TeamUser | null>(null);

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
      const [bookingsRes, availabilityRes] = await Promise.all([
        fetch('/api/v1/team/bookings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/v1/team/availability', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings || []);
      }
      if (availabilityRes.ok) {
        const data = await availabilityRes.json();
        setAvailability(data.availability || []);
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

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(b => isSameDay(parseISO(b.booking_date), date));
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

  const isDayAvailable = (day: number) => {
    return availability.find(a => a.day_of_week === day)?.is_active ?? false;
  };

  const getDayAvailability = (day: number) => {
    return availability.find(a => a.day_of_week === day);
  };

  const calendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
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
                          {getTimeSlots().map(time => {
                            const booked = isSlotBooked(selectedDate, time);
                            const dayOfWeek = selectedDate.getDay();
                            const available = isDayAvailable(dayOfWeek);
                            
                            return (
                              <div
                                key={time}
                                className={`team-time-slot ${booked ? 'booked' : ''} ${available && !booked ? 'available' : ''}`}
                              >
                                {time}
                              </div>
                            );
                          })}
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
              <h2 className="team-section-title">Your Availability</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>
                Configure when you're available for demos
              </p>
            </div>

            <div className="team-availability-grid">
              {[0, 1, 2, 3, 4, 5, 6].map(day => {
                const dayAvail = getDayAvailability(day);
                const dayName = DAYS[day];
                const isActive = dayAvail?.is_active ?? false;
                const startTime = dayAvail?.start_time ?? '09:00';
                const endTime = dayAvail?.end_time ?? '17:00';

                return (
                  <div key={day} className="team-availability-day">
                    <div className="team-availability-day-name">{dayName}</div>
                    <div className="team-availability-toggle">
                      <div
                        className={`team-toggle-switch ${isActive ? 'active' : ''}`}
                        onClick={() => handleAvailabilityChange(day, 'is_active', !isActive)}
                      />
                    </div>
                    {isActive && (
                      <div className="team-availability-times">
                        <input
                          type="time"
                          className="team-time-input"
                          value={startTime}
                          onChange={(e) => handleAvailabilityChange(day, 'start_time', e.target.value)}
                        />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>to</span>
                        <input
                          type="time"
                          className="team-time-input"
                          value={endTime}
                          onChange={(e) => handleAvailabilityChange(day, 'end_time', e.target.value)}
                        />
                      </div>
                    )}
                    {!isActive && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                        Unavailable
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
              <button className="team-action-btn">Add Member</button>
            </div>
            
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
              Team members management coming soon...
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamDashboard;
