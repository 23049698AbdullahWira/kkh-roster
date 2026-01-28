// src/UserHomePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UserNavbar from '../Nav/UserNavbar.js';

// --- CALENDAR IMPORTS ---
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// --- IMPORT THE CUSTOM CSS ---
import './UserHomePage.css';

// --- SETUP FOR CALENDAR ---
const localizer = momentLocalizer(moment);

// --- CUSTOM TOOLBAR COMPONENT ---
const CustomToolbar = (toolbar) => {
  const [publishedRosters, setPublishedRosters] = useState([]);

  // Fetch the list of published rosters when the component mounts
  useEffect(() => {
    const fetchPublishedRosters = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/rosters/published');
        const data = await response.json();
        setPublishedRosters(data);
      } catch (error) {
        console.error("Failed to fetch published rosters:", error);
      }
    };
    fetchPublishedRosters();
  }, []);

  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const handleRosterChange = (event) => {
    const [year, month] = event.target.value.split('-');
    const newDate = new Date(year, month - 1, 1);
    toolbar.onNavigate('DATE', newDate);
  };

  // Create a value for the select dropdown e.g., "2026-6"
  const currentRosterValue = `${toolbar.date.getFullYear()}-${toolbar.date.getMonth() + 1}`;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="rbc-toolbar">
      {/* Used unicode single angle quote for a cleaner centered look in the circle button */}
      <button onClick={goToBack}>&#8249;</button>

      {/* Conditionally render dropdown or plain label */}
      {publishedRosters.length > 0 ? (
        <select value={currentRosterValue} onChange={handleRosterChange}>
          {publishedRosters.map(roster => {
            const rosterValue = `${roster.year}-${roster.month}`;
            const rosterLabel = `${monthNames[roster.month - 1]} ${roster.year}`;
            return (
              <option key={roster.roster_id} value={rosterValue}>
                {rosterLabel}
              </option>
            );
          })}
        </select>
      ) : (
        // Fallback if no rosters are loaded or API fails
        <span className="rbc-toolbar-label">{toolbar.label}</span>
      )}

      <button onClick={goToNext}>&#8250;</button>
    </div>
  );
};


function UserHomePage({ user, onGoHome, onGoRoster, onGoShiftPreference, onGoApplyLeave, onGoAccount, onLogout }) {
  const [todayShift, setTodayShift] = useState(null);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // --- CUSTOM DATE CELL WRAPPER ---
  const CustomDateCellWrapper = useMemo(() => {
    const eventsByDate = new Map();
    calendarEvents.forEach(event => {
      const dateKey = moment(event.start).format('YYYY-MM-DD');
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey).push(event);
    });

    return ({ children, value }) => {
      const dateKey = moment(value).format('YYYY-MM-DD');
      const dayEvents = eventsByDate.get(dateKey) || [];
      const isToday = dateKey === moment().format('YYYY-MM-DD');

      return React.cloneElement(React.Children.only(children), {
        className: `${children.props.className} custom-date-cell-container`,
        children: (
          <div className={`custom-date-cell ${isToday ? 'today' : ''}`}>
            <div className="date-number">
              {moment(value).format('D')}
            </div>
            <div className="event-dots-container">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="event-dot"
                  style={{ backgroundColor: event.resource.shift_color_hex || '#3174ad' }}
                ></div>
              ))}
            </div>
          </div>
        ),
      });
    };
  }, [calendarEvents]);

  // Effect for "Today" and "Next 7 Days" sections
  useEffect(() => {
    if (user?.userId) {
      const fetchUserShifts = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`http://localhost:5000/api/users/${user.userId}/shifts`);
          const shifts = await response.json();
          const todayString = new Date().toISOString().split('T')[0];

          let foundTodayShift = null;
          const futureShifts = [];

          shifts.forEach((shift, index) => {
            const shiftDateString = shift.shift_date.split('T')[0];
            if (index === 0 && shiftDateString === todayString) {
              foundTodayShift = shift;
            } else {
              futureShifts.push(shift);
            }
          });

          setTodayShift(foundTodayShift);
          setUpcomingShifts(futureShifts.slice(0, 7));
        } catch (error) {
          console.error("Failed to fetch user shifts:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserShifts();
    }
  }, [user]);

  // Effect for Calendar data
  useEffect(() => {
    if (user?.userId) {
      const fetchCalendarShifts = async () => {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth() + 1;

        try {
          const response = await fetch(`http://localhost:5000/api/users/${user.userId}/shifts-by-month?year=${year}&month=${month}`);
          const shifts = await response.json();

          const events = shifts.map(shift => ({
            id: shift.shift_id,
            title: `${shift.shift_code} - ${shift.ward_name || ''}`,
            start: new Date(shift.shift_date),
            end: new Date(shift.shift_date),
            allDay: true,
            resource: shift,
          }));

          setCalendarEvents(events);
        } catch (error) {
          console.error("Failed to fetch calendar shifts:", error);
        }
      };

      fetchCalendarShifts();
    }
  }, [user, calendarDate]);

  // --- Main Render Function ---
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#EDF0F5',
        overflowX: 'hidden',
        overflowY: 'auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <UserNavbar
  active="home"
  onLogout={onLogout}
  onGoHome={onGoHome}
  onGoRoster={onGoRoster}
  onGoShiftPreference={onGoShiftPreference}
  onGoApplyLeave={onGoApplyLeave}
  onGoAccount={onGoAccount}
/>



      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto 40px',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            color: 'black',
            fontSize: 22,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          Welcome back, {user?.fullName || 'User'}!
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.4fr)',
            gap: 24,
          }}
        >
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* TODAY FOR YOU SECTION */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxSizing: 'border-box',
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              {/* INCREASED FONT SIZE FOR HEADER */}
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px 0' }}>Today For You</h2>
              <div
                style={{
                  padding: '13px 24px',
                  position: 'relative',
                  background: '#EDF0F5',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '150px'
                }}
              >
                {isLoading ? (
                  <div>Loading...</div>
                ) : todayShift ? (
                  <>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* INCREASED FONT SIZES FOR CONTENT */}
                      <div style={{ color: 'black', fontSize: 20, fontWeight: 700 }}>{moment(todayShift.shift_date).format('DD MMMM YYYY')}</div>
                      <div style={{ color: 'black', fontSize: 20, fontWeight: 700 }}>{todayShift.shift_code} - {todayShift.ward_name}</div>
                      <div style={{ color: 'black', fontSize: 18, fontWeight: 400 }}>You have been assigned to {todayShift.ward_comments || todayShift.ward_name} for {todayShift.shift_code} shift.</div>
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, background: todayShift.shift_color_hex || '#0EA5E9', borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />
                  </>
                ) : (
                  <div>You are off today.</div>
                )}
              </div>
            </section>

            {/* MY NEXT 7 SHIFTS SECTION */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxSizing: 'border-box',
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px 0' }}>My Next 7 Scheduled Shifts</h2>

              {/* SCROLLABLE CONTAINER WITH FIXED HEIGHT */}
              <div className="scrollable-shift-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isLoading ? (
                  <div>Loading...</div>
                ) : upcomingShifts.length > 0 ? (
                  upcomingShifts.map((item) => (
                    <div key={item.shift_id} style={{ padding: '13px 24px', position: 'relative', background: '#EDF0F5', borderRadius: 8, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ color: 'black', fontSize: 16, fontWeight: 700 }}>{moment(item.shift_date).format('DD MMMM YYYY')}</div>
                        <div style={{ color: 'black', fontSize: 16, fontWeight: 700 }}>{item.shift_code} - {item.ward_name}</div>
                        <div style={{ color: 'black', fontSize: 16, fontWeight: 400 }}>You have been assigned at {item.ward_comments || item.ward_name} for {item.shift_code} shift.</div>
                      </div>
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 10, background: item.shift_color_hex || '#FFFFFF', borderTopRightRadius: 8, borderBottomRightRadius: 8 }} />
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '13px 24px' }}>No upcoming shifts in the next 7 days.</div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* QUICK LINKS SECTION */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxSizing: 'border-box',
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px 0' }}>Quick Links</h2>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: 16 }}>
                <button type="button" onClick={onGoRoster} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 80, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                  <div style={{ width: 78, height: 78, background: '#5091CD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img style={{ width: 40, height: 40 }} src="/userViewRoster.png" alt="View Monthly Roster" /></div>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, whiteSpace: 'pre-line' }}>{'View\nMonthly Roster'}</div>
                </button>
                <button type="button" onClick={onGoShiftPreference} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 80, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                  <div style={{ width: 78, height: 78, background: '#5091CD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img style={{ width: 40, height: 40 }} src="/userShiftPref.png" alt="Shifts Preference" /></div>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, whiteSpace: 'pre-line' }}>{'Shifts\nPreference'}</div>
                </button>
                <button type="button" onClick={onGoApplyLeave} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 80, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                  <div style={{ width: 78, height: 78, background: '#5091CD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img style={{ width: 40, height: 40 }} src="/userApplyLeave.png" alt="Apply Leave" /></div>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, whiteSpace: 'pre-line' }}>{'Apply\nLeave'}</div>
                </button>
                <button type="button" onClick={onGoAccount} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 80, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                  <div style={{ width: 78, height: 78, background: '#5091CD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img style={{ width: 40, height: 40 }} src="/userEditProfile.png" alt="Edit Profile" /></div>
                  <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, whiteSpace: 'pre-line' }}>{'Edit\nProfile'}</div>
                </button>
              </div>
            </section>

            {/* CALENDAR SECTION */}
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxSizing: 'border-box',
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ height: 'auto' }}>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  views={['month']}
                  date={calendarDate}
                  onNavigate={(newDate) => setCalendarDate(newDate)}
                  components={{
                    toolbar: CustomToolbar,
                    dateCellWrapper: CustomDateCellWrapper,
                    month: {
                      dateHeader: () => null,  // <--- ADD THIS LINE to hide the default number
                    },
                  }}
                  style={{ height: 550 }}
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserHomePage;  