import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDays, format, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval, isBefore, startOfDay, addMonths, subMonths, getDay, isSameMonth } from 'date-fns';

const Demo: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formStep, setFormStep] = useState<'calendar' | 'form' | 'confirmation'>('calendar');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    goal: '',
    teamSize: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [blockedDates, setBlockedDates] = useState<{date: string, type: string, reason?: string}[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<{date: string, time_slot: string}[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.position = 'relative';
      root.style.overflow = 'visible';
      root.style.height = 'auto';
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      html.style.overflow = '';
      body.style.overflow = '';
      body.style.height = '';
      if (root) {
        root.style.position = '';
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, []);

  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  useEffect(() => {
    // Fetch blocked dates, slots, and existing bookings
    Promise.all([
      fetch('/api/v1/team/availability'),
      fetch('/api/v1/team/blocked-slots'),
      fetch('/api/v1/team/bookings')
    ])
      .then(([datesRes, slotsRes, bookingsRes]) => Promise.all([datesRes.json(), slotsRes.json(), bookingsRes.json()]))
      .then(([datesData, slotsData, bookingsData]) => {
        if (datesData.availability) {
          setBlockedDates(datesData.availability);
        }
        if (slotsData.blockedSlots) {
          setBlockedSlots(slotsData.blockedSlots);
        }
        if (bookingsData.bookings) {
          setBookings(bookingsData.bookings);
        }
      })
      .catch(err => console.error('Failed to fetch availability:', err));
  }, []);

  const [bookings, setBookings] = useState<{id: string, booking_date: string, booking_time: string}[]>([]);

  const isDateAvailable = (date: Date) => {
    const today = startOfDay(new Date());
    const dayOfWeek = getDay(date);
    if (isBefore(date, today)) return false;
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Will check Supabase availability
      return true;
    }
    return false;
  };

  // Check if date is blocked in availability
  const isDateBlocked = (dateStr: string): boolean => {
    return blockedDates.some(blocked => blocked.date === dateStr && blocked.type === 'unavailable');
  };

  // Check if time slot is booked
  const isTimeBooked = (dateStr: string, time12: string): boolean => {
    const time24 = convertTo24Hour(time12);
    const hour = time24.split(':')[0];
    return bookings.some(booking => 
      booking.booking_date === dateStr && 
      booking.booking_time.startsWith(hour + ':')
    );
  };

  const convertTo24Hour = (time12: string): string => {
    const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!match) return '09:00';
    let hours = parseInt(match[1]!);
    const minutes = match[2]!;
    const period = match[3]!;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  const isSlotBlocked = (dateStr: string, time12: string): boolean => {
    const time24 = convertTo24Hour(time12);
    return blockedSlots.some(slot => slot.date === dateStr && slot.time_slot === time24);
  };

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
  ];

  const testimonials = [
    { name: 'Sarah M.', company: 'Amalfi Events', quote: 'Saved us 10+ hours per wedding.' },
    { name: 'James L.', company: 'Nordic Weddings', quote: 'Finally, a tool that understands our workflow.' },
    { name: 'Elena R.', company: 'Sunset Venues', quote: 'Game-changer for our team coordination.' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0 24px',
          height: isMobile ? '60px' : '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', textDecoration: 'none' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: isMobile ? '28px' : '36px', height: isMobile ? '28px' : '36px', objectFit: 'contain' }} />
            {!isMobile && <span style={{ fontSize: '20px', fontWeight: 600, color: '#111827', letterSpacing: '-0.025em' }}>WedBoardPro</span>}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '12px' }}>
            <Link to="/login" style={{ padding: isMobile ? '8px 12px' : '10px 20px', fontSize: isMobile ? '13px' : '14px', fontWeight: 500, color: '#374151', textDecoration: 'none', borderRadius: '8px' }}>
              Log in
            </Link>
            <Link to="/signup" style={{ padding: isMobile ? '8px 14px' : '10px 20px', fontSize: isMobile ? '13px' : '14px', fontWeight: 500, color: '#ffffff', textDecoration: 'none', borderRadius: '8px', backgroundColor: '#111827' }}>
              {isMobile ? 'Start trial' : 'Start free trial'}
            </Link>
          </div>
        </div>
      </header>

      <main style={{ paddingTop: isMobile ? '80px' : '100px', paddingBottom: isMobile ? '48px' : '80px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: isMobile ? '0 16px' : '0 24px' }}>
          {/* Hero Section */}
          <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '48px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '4px 10px' : '6px 14px',
              backgroundColor: '#f3f4f6',
              borderRadius: '100px',
              fontSize: isMobile ? '11px' : '13px',
              fontWeight: 500,
              color: '#4b5563',
              marginBottom: isMobile ? '16px' : '24px'
            }}>
              <svg width={isMobile ? "14" : "16"} height={isMobile ? "14" : "16"} viewBox="0 0 16 16" fill="none">
                <path d="M8 14.666C11.313 14.666 14 12.313 14 9.333H2C2 12.313 4.687 14.666 8 14.666Z" fill="#4b5563"/>
                <path d="M14 9.333V6.667C14 4.07 11.313 2 8 2C4.687 2 2 4.07 2 6.667V9.333" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {isMobile ? 'Limited spots available' : 'Limited availability — Book your spot today'}
            </div>

            <h1 style={{
              fontSize: isMobile ? '26px' : '42px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#111827',
              margin: 0,
              lineHeight: 1.15,
              marginBottom: isMobile ? '12px' : '20px'
            }}>
              See How WedBoardPro<br />
              <span style={{ color: '#2563eb' }}>Saves Your Team Hours</span>
            </h1>

            <p style={{
              fontSize: isMobile ? '15px' : '18px',
              color: '#6b7280',
              lineHeight: 1.6,
              maxWidth: isMobile ? '100%' : '600px',
              margin: '0 auto',
              marginBottom: isMobile ? '24px' : '32px',
              padding: isMobile ? '0 8px' : '0'
            }}>
              In just 20 minutes, get a personalized walkthrough tailored to your workflow. No generic slides — focused on your exact use case.
            </p>

            {/* Benefit Bullets */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: isMobile ? '8px' : '16px',
              marginBottom: isMobile ? '24px' : '40px'
            }}>
              {[
                'Discover features that fit',
                'Ask questions live',
                'Custom setup advice',
                'See ROI potential'
              ].map((benefit, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  fontSize: isMobile ? '13px' : '14px',
                  color: '#374151'
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13 4L6 11L3 8" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '24px' : '48px', alignItems: 'start' }}>
            {/* Left Column - Demo Scheduler */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: isMobile ? '12px' : '16px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)'
            }}>
              {/* Calendar Header */}
              <div style={{
                padding: isMobile ? '16px' : '24px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#fafafa'
              }}>
                <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
                  Choose a time
                </h2>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  20 min · Video call
                </p>
              </div>

              {/* Calendar Body */}
              <div style={{ padding: isMobile ? '16px' : '24px' }}>
                {formStep === 'calendar' && (
                  <>
                    {/* Date Selection */}
                    <div style={{ marginBottom: '24px' }}>
                      {/* Month Navigation */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <button
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#374151',
                            transition: 'all 0.2s'
                          }}
                        >
                          ← Previous
                        </button>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                          {format(currentMonth, 'MMMM yyyy')}
                        </h3>
                        <button
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#374151',
                            transition: 'all 0.2s'
                          }}
                        >
                          Next →
                        </button>
                      </div>

                      {/* Weekday Headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#9ca3af', padding: '8px 0' }}>
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                        {calendarDays.map((day, i) => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const weekdayAvailable = getDay(day) >= 1 && getDay(day) <= 5 && !isBefore(day, startOfDay(new Date()));
                          const isBlocked = isDateBlocked(dateStr);
                          const hasBookings = bookings.some(b => b.booking_date === dateStr);
                          const available = weekdayAvailable && !isBlocked;
                          const isSelected = selectedDate === dateStr;
                          const isToday = isSameDay(day, new Date());
                          const isPast = isBefore(day, startOfDay(new Date()));
                          const blockedReason = blockedDates.find(b => b.date === dateStr)?.reason;

                          return (
                            <div key={i} style={{ position: 'relative' }}>
                              <button
                                disabled={!available}
                                onClick={() => {
                                  if (available) {
                                    setSelectedDate(dateStr);
                                    setErrorMessage(null);
                                  } else if (isBlocked) {
                                    setErrorMessage('This date is unavailable for demos. Please select another date.');
                                    setTimeout(() => setErrorMessage(null), 4000);
                                  } else if (isPast) {
                                    setErrorMessage('You cannot select past dates.');
                                    setTimeout(() => setErrorMessage(null), 4000);
                                  } else {
                                    setErrorMessage('Weekends are not available for demos.');
                                    setTimeout(() => setErrorMessage(null), 4000);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  aspectRatio: '1',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '12px',
                                  border: isToday ? '2px solid #059669' : isSelected ? '2px solid #111827' : isBlocked ? '1px solid #e5e7eb' : '1px solid #e5e7eb',
                                  backgroundColor: isSelected ? '#111827' : isBlocked ? '#f3f4f6' : available ? '#ffffff' : '#f9fafb',
                                  color: isSelected ? '#ffffff' : isBlocked ? '#9ca3af' : '#111827',
                                  cursor: available ? 'pointer' : 'not-allowed',
                                  opacity: available ? 1 : isBlocked ? 0.7 : 0.5,
                                  transition: 'all 0.2s ease',
                                  fontWeight: isToday ? 700 : 500,
                                  fontSize: '14px'
                                }}
                              >
                                <span>{format(day, 'd')}</span>
                                {isToday && (
                                  <span style={{ fontSize: '8px', marginTop: '2px', color: isSelected ? '#fff' : '#059669' }}>TODAY</span>
                                )}
                                {isBlocked && (
                                  <span style={{ fontSize: '7px', marginTop: '2px', color: '#9ca3af' }}>BLOCKED</span>
                                )}
                                {hasBookings && !isBlocked && (
                                  <span style={{ fontSize: '7px', marginTop: '2px', color: '#059669' }}>BUSY</span>
                                )}
                              </button>
                              {blockedReason && isBlocked && (
                                <div 
                                  style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#374151',
                                    color: '#fff',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                    marginBottom: '6px',
                                    display: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                  }}
                                  className="blocked-tooltip"
                                >
                                  <div style={{ fontWeight: 500, marginBottom: '2px' }}>Blocked</div>
                                  <div style={{ opacity: 0.8 }}>{blockedReason}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '20px', 
                        marginTop: '16px',
                        padding: '12px 20px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#ffffff', border: '1px solid #e5e7eb' }}></div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Available</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#f3f4f6', border: '1px solid #e5e7eb' }}></div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Unavailable</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#dcfce7', border: '1px solid #86efac' }}></div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Booked</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: '#059669', border: '2px solid #059669' }}></div>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Today</span>
                        </div>
                      </div>

                      {errorMessage && (
                        <div style={{
                          marginTop: '16px',
                          padding: '12px 16px',
                          background: '#fef2f2',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          fontSize: '14px',
                          textAlign: 'center'
                        }}>
                          {errorMessage}
                        </div>
                      )}
                    </div>

                    {/* Time Selection */}
                    {selectedDate && (
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Available times (GMT)
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          {timeSlots.map((time, i) => {
                            const isBlocked = isSlotBlocked(selectedDate, time);
                            const isBooked = isTimeBooked(selectedDate, time);
                            const isUnavailable = isBlocked || isBooked;
                            
                            return (
                              <button
                                key={i}
                                disabled={isUnavailable}
                                onClick={() => {
                                  setSelectedTime(time);
                                  setFormStep('form');
                                }}
                                style={{
                                  padding: '12px 16px',
                                  borderRadius: '8px',
                                  border: selectedTime === time ? '2px solid #111827' : isBlocked ? '1px solid #e5e7eb' : isBooked ? '1px solid #86efac' : '1px solid #e5e7eb',
                                  backgroundColor: selectedTime === time ? '#111827' : isBlocked ? '#f3f4f6' : isBooked ? '#dcfce7' : '#ffffff',
                                  color: selectedTime === time ? '#ffffff' : isBlocked ? '#9ca3af' : isBooked ? '#166534' : '#374151',
                                  cursor: isUnavailable ? 'not-allowed' : 'pointer',
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  transition: 'all 0.2s ease',
                                  opacity: isUnavailable ? 0.7 : 1
                                }}
                              >
                                {time}
                                {isBlocked && <span style={{ fontSize: '10px', display: 'block', marginTop: '2px', color: '#9ca3af' }}>Unavailable</span>}
                                {isBooked && !isBlocked && <span style={{ fontSize: '10px', display: 'block', marginTop: '2px', color: '#166534' }}>Booked</span>}
                              </button>
                            );
                          })}
                        </div>
                        {(blockedSlots.filter(s => s.date === selectedDate).length > 0 || bookings.filter(b => b.booking_date === selectedDate).length > 0) && (
                          <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '12px', textAlign: 'center' }}>
                            Some time slots are unavailable or already booked
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {formStep === 'form' && (
                  <div>
                    <button
                      onClick={() => setFormStep('calendar')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 0',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginBottom: '16px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Back to calendar
                    </button>

                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M5.667 7.333H12.333M5.667 10.667H9M12.667 3V6M5.333 3V6M3.333 6H14.667M5 16H13C14.104 16 15 15.105 15 14V7C15 5.895 14.104 5 13 5H5C3.896 5 3 5.895 3 7V14C3 15.105 3.896 16 5 16Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>20 min · Video call</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                            {selectedDate} Feb, {selectedTime}
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setSubmitting(true);
                      try {
                        // Convert selectedDate and selectedTime to proper format
                        // selectedDate is day number, selectedTime is like "09:00 AM"
                        const currentYear = new Date().getFullYear();
                        // selectedDate is now in yyyy-MM-dd format
                        const booking_date = selectedDate || '';
                        const timeStr = selectedTime || '';
                        
                        // Convert time format: "09:00 AM" -> "09:00"
                        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
                        let hours = parseInt(timeMatch?.[1] || '9');
                        const minutes = timeMatch?.[2] || '00';
                        const period = timeMatch?.[3];
                        if (period === 'PM' && hours !== 12) hours += 12;
                        if (period === 'AM' && hours === 12) hours = 0;
                        const booking_time = `${hours.toString().padStart(2, '0')}:${minutes}`;

                        const res = await fetch('/api/v1/team/bookings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: formData.name,
                            email: formData.email,
                            company: formData.company || null,
                            booking_date,
                            booking_time,
                            goal: formData.goal || null,
                            team_size: formData.teamSize || null
                          })
                        });

                        if (res.ok) {
                          setFormStep('confirmation');
                        } else {
                          alert('Failed to book demo. Please try again.');
                        }
                      } catch (err) {
                        console.error('Booking error:', err);
                        alert('Failed to book demo. Please try again.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          Work Email *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="you@company.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          Company Name
                        </label>
                        <input
                          type="text"
                          placeholder="Your company name"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                        />
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                          What's your main goal?
                        </label>
                        <select
                          value={formData.goal}
                          onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '15px',
                            outline: 'none',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="">Select your goal</option>
                          <option value="workflow">Streamline document workflows</option>
                          <option value="collaboration">Improve team collaboration</option>
                          <option value="automation">Automate wedding planning</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                          Team size
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {['1-5', '6-20', '21+'].map((size) => (
                            <label
                              key={size}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                fontSize: '13px',
                                color: '#374151',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <input 
                                type="radio" 
                                name="teamSize" 
                                value={size}
                                checked={formData.teamSize === size}
                                onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                                style={{ marginRight: '4px' }} 
                              />
                              {size}
                            </label>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          width: '100%',
                          padding: '14px 24px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: '#111827',
                          color: '#ffffff',
                          fontSize: '15px',
                          fontWeight: 600,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.7 : 1,
                          transition: 'opacity 0.2s'
                        }}
                      >
                        {submitting ? 'Booking...' : 'Confirm Booking'}
                      </button>
                    </form>
                  </div>
                )}

                {formStep === 'confirmation' && (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path d="M7 14L11 18L21 8" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                      You're booked!
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
                      Check your email for the meeting link.
                    </p>
                    <div style={{
                      padding: '14px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                      fontSize: '14px',
                      color: '#374151'
                    }}>
                      <strong>{selectedDate ? format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy') : ''}</strong> at {selectedTime}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Trust & Info */}
            <div>
              {/* Product Preview */}
              <div style={{
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '24px',
                marginBottom: isMobile ? '20px' : '32px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '100%',
                  height: isMobile ? '120px' : '160px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <svg width={isMobile ? "36" : "48"} height={isMobile ? "36" : "48"} viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 8px' }}>
                      <rect x="8" y="8" width="32" height="32" rx="4" stroke="#9ca3af" strokeWidth="2"/>
                      <path d="M8 20H40M20 8V40" stroke="#9ca3af" strokeWidth="2"/>
                    </svg>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Product Preview</p>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  See it live during your demo
                </p>
              </div>

              {/* Social Proof */}
              <div style={{ marginBottom: isMobile ? '20px' : '32px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Join 50+ planners this month
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', opacity: 0.6 }}>
                  {['Lisbon & Co.', 'Amalfi Events', 'Nordic Weddings', 'Sunset Venues'].map((name) => (
                    <span key={name} style={{
                      padding: '4px 10px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#374151'
                    }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Testimonials */}
              <div style={{ marginBottom: isMobile ? '20px' : '32px' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  What planners say
                </p>
                {testimonials.map((t, i) => (
                  <div key={i} style={{
                    padding: '14px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '10px',
                    marginBottom: '8px'
                  }}>
                    <p style={{ fontSize: '13px', color: '#374151', margin: '0 0 6px 0', fontStyle: 'italic' }}>
                      "{t.quote}"
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      <strong style={{ color: '#111827' }}>{t.name}</strong> · {t.company}
                    </p>
                  </div>
                ))}
              </div>

              {/* What to Expect */}
              <div style={{
                padding: isMobile ? '16px' : '20px',
                backgroundColor: '#f0f9ff',
                borderRadius: '12px',
                border: '1px solid #bae6fd'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '10px', marginTop: 0 }}>
                  What to expect
                </h3>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li style={{ fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                    Quick intro (2 min)
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                    Live tour for your needs (10 min)
                  </li>
                  <li style={{ fontSize: '13px', color: '#374151' }}>
                    Your questions answered (5-8 min)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reassurance */}
          <div style={{ textAlign: 'center', marginTop: isMobile ? '32px' : '48px', padding: isMobile ? '20px' : '32px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
            <p style={{ fontSize: isMobile ? '14px' : '15px', color: '#6b7280', marginBottom: '16px' }}>
              No pressure, no obligation. Just valuable insights.
            </p>
            <Link
              to="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: isMobile ? '12px 20px' : '14px 28px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb'
              }}
            >
              Prefer to try it yourself?
              <span style={{ color: '#111827', fontWeight: 600 }}>Start Free Trial</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #f3f4f6' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '24px 16px' : '40px 32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '16px' : '24px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo/iconlogo.png" alt="WedBoardPro" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>WedBoardPro</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '24px', fontSize: '14px' }}>
            <Link to="/about" style={{ color: '#111827', textDecoration: 'none', fontWeight: 500 }}>About</Link>
            <Link to="/privacy" style={{ color: '#6b7280', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
            <Link to="/contact" style={{ color: '#6b7280', textDecoration: 'none' }}>Contact</Link>
          </div>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: '#9ca3af', margin: 0 }}>
            © {new Date().getFullYear()} WedBoardPro · António Basso, Portugal
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Demo;
