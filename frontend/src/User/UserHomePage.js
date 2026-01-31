// src/UserHomePage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';
// 1. Import centralized helper
import { fetchFromApi } from '../services/api';

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
        // 2. UPDATED: Removed .json() call. 
        // fetchFromApi returns the data directly now.
        const data = await fetchFromApi('/api/rosters/published');
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
    <div className="user-userhomepage-toolbar">
      <button className="user-userhomepage-toolbar-nav-btn" onClick={goToBack}>&#8249;</button>

      {publishedRosters.length > 0 ? (
        <select className="user-userhomepage-toolbar-select" value={currentRosterValue} onChange={handleRosterChange}>
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
        <span className="user-userhomepage-toolbar-label">{toolbar.label}</span>
      )}

      <button className="user-userhomepage-toolbar-nav-btn" onClick={goToNext}>&#8250;</button>
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
        className: `${children.props.className} user-userhomepage-date-cell-container`,
        children: (
          <div className={`user-userhomepage-date-cell ${isToday ? 'user-userhomepage-date-cell-today' : ''}`}>
            <div className="user-userhomepage-date-number">
              {moment(value).format('D')}
            </div>
            <div className="user-userhomepage-event-dots-container">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="user-userhomepage-event-dot"
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
          // 3. UPDATED: Removed .json() call.
          const shifts = await fetchFromApi(`/api/users/${user.userId}/shifts`);
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
          // 4. UPDATED: Removed .json() call.
          const shifts = await fetchFromApi(`/api/users/${user.userId}/shifts-by-month?year=${year}&month=${month}`);

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
    <div className="user-userhomepage-container">
      <UserNavbar
        active="home"
        onLogout={onLogout}
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
      />

      <main className="user-userhomepage-main">
        <div className="user-userhomepage-welcome-title">
          Welcome back, {user?.fullName || 'User'}!
        </div>

        <div className="user-userhomepage-grid">
          {/* LEFT COLUMN */}
          <div className="user-userhomepage-column">
            {/* TODAY FOR YOU SECTION */}
            <section className="user-userhomepage-card">
              <h2 className="user-userhomepage-card-title user-userhomepage-title-large">Today For You</h2>
              <div className="user-userhomepage-shift-box user-userhomepage-shift-box-today">
                {isLoading ? (
                  <div>Loading...</div>
                ) : todayShift ? (
                  <>
                    <div className="user-userhomepage-shift-content">
                      <div className="user-userhomepage-shift-text-large">{moment(todayShift.shift_date).format('DD MMMM YYYY')}</div>
                      <div className="user-userhomepage-shift-text-large">{todayShift.shift_code} - {todayShift.ward_name}</div>
                      <div className="user-userhomepage-shift-text-medium">You have been assigned to {todayShift.ward_comments || todayShift.ward_name} for {todayShift.shift_code} shift.</div>
                    </div>
                    <div 
                        className="user-userhomepage-shift-strip" 
                        style={{ background: todayShift.shift_color_hex || '#0EA5E9' }} 
                    />
                  </>
                ) : (
                  <div>You are off today.</div>
                )}
              </div>
            </section>

            {/* MY NEXT 7 SHIFTS SECTION */}
            <section className="user-userhomepage-card">
              <h2 className="user-userhomepage-card-title">My Next 7 Scheduled Shifts</h2>

              <div className="user-userhomepage-scrollable-list">
                {isLoading ? (
                  <div>Loading...</div>
                ) : upcomingShifts.length > 0 ? (
                  upcomingShifts.map((item) => (
                    <div key={item.shift_id} className="user-userhomepage-shift-box user-userhomepage-shift-box-list-item">
                      <div className="user-userhomepage-shift-content">
                        <div className="user-userhomepage-shift-text-bold">{moment(item.shift_date).format('DD MMMM YYYY')}</div>
                        <div className="user-userhomepage-shift-text-bold">{item.shift_code} - {item.ward_name}</div>
                        <div className="user-userhomepage-shift-text-normal">You have been assigned at {item.ward_comments || item.ward_name} for {item.shift_code} shift.</div>
                      </div>
                      <div 
                        className="user-userhomepage-shift-strip" 
                        style={{ background: item.shift_color_hex || '#FFFFFF' }} 
                      />
                    </div>
                  ))
                ) : (
                  <div className="user-userhomepage-no-shifts">No upcoming shifts in the next 7 days.</div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="user-userhomepage-column">
            {/* QUICK LINKS SECTION */}
            <section className="user-userhomepage-card">
              <h2 className="user-userhomepage-card-title">Quick Links</h2>
              <div className="user-userhomepage-quicklinks-container">
                <button type="button" onClick={onGoRoster} className="user-userhomepage-quicklink-btn">
                  <div className="user-userhomepage-quicklink-icon-box"><img className="user-userhomepage-quicklink-img" src="/userViewRoster.png" alt="View Monthly Roster" /></div>
                  <div className="user-userhomepage-quicklink-text">{'View\nMonthly Roster'}</div>
                </button>
                <button type="button" onClick={onGoShiftPreference} className="user-userhomepage-quicklink-btn">
                  <div className="user-userhomepage-quicklink-icon-box"><img className="user-userhomepage-quicklink-img" src="/userShiftPref.png" alt="Shifts Preference" /></div>
                  <div className="user-userhomepage-quicklink-text">{'Shifts\nPreference'}</div>
                </button>
                <button type="button" onClick={onGoApplyLeave} className="user-userhomepage-quicklink-btn">
                  <div className="user-userhomepage-quicklink-icon-box"><img className="user-userhomepage-quicklink-img" src="/userApplyLeave.png" alt="Apply Leave" /></div>
                  <div className="user-userhomepage-quicklink-text">{'Apply\nLeave'}</div>
                </button>
                <button type="button" onClick={onGoAccount} className="user-userhomepage-quicklink-btn">
                  <div className="user-userhomepage-quicklink-icon-box"><img className="user-userhomepage-quicklink-img" src="/userEditProfile.png" alt="Edit Profile" /></div>
                  <div className="user-userhomepage-quicklink-text">{'Edit\nProfile'}</div>
                </button>
              </div>
            </section>

            {/* CALENDAR SECTION */}
            <section className="user-userhomepage-card user-userhomepage-card-no-overflow">
              <div className="user-userhomepage-calendar-wrapper">
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
                      dateHeader: () => null,
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