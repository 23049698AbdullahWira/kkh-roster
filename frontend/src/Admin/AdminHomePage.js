// src/Admin/AdminHomePage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Nav/navbar.js';

const todoItems = [
  {
    header: 'New Account Requested – By 23 Oct',
    title: '3 New User Accounts Awaiting Approval',
    body: 'Reminded to approve new account for onboarding members of the team.',
  },
  {
    header: 'Published November Roster – By 29 Oct',
    title: 'Roster Publish.',
    body: 'Reminded to publish November roster to all.',
  },
];

function AdminHome({ user }) {
  const [logs, setLogs] = useState([]);

  // Dashboard data – now driven by real APIs
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingPrefCount, setPendingPrefCount] = useState(0);
  const [nextRosterLabel, setNextRosterLabel] = useState('');
  const [nextRosterStatus, setNextRosterStatus] = useState(''); // e.g. Pending / Drafting / Published

  const navigate = useNavigate();

  // ---- NEW: fetch helpers ----
  const fetchPendingLeaveCount = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/leave/pending-count');
      const data = await res.json();
      setPendingLeaveCount(data.pendingCount ?? 0);
    } catch (err) {
      console.error('Failed to fetch pending leave count:', err);
    }
  };

  const fetchPendingShiftPrefCount = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/shiftpref/pending-count');
      const data = await res.json();
      setPendingPrefCount(data.pendingCount ?? 0);
    } catch (err) {
      console.error('Failed to fetch pending shift preference count:', err);
    }
  };

  const fetchNextRosterStatus = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/rosters/next');
      if (!res.ok) {
        // No rosters found or server error
        setNextRosterLabel('No roster found');
        setNextRosterStatus('N/A');
        return;
      }
      const data = await res.json();
      setNextRosterLabel(`${data.month} ${data.year}`);
      setNextRosterStatus(data.status || 'Unknown');
    } catch (err) {
      console.error('Failed to fetch next roster status:', err);
      setNextRosterLabel('Error');
      setNextRosterStatus('N/A');
    }
  };

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('http://localhost:5000/actionlogs?limit=6');
        const data = await res.json();
        setLogs(data || []);
      } catch (err) {
        console.error('Failed to fetch action logs:', err);
      }
    }

    fetchLogs();
    fetchPendingLeaveCount();
    fetchPendingShiftPrefCount();
    fetchNextRosterStatus();
  }, []);

  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    const dbDate = new Date(isoString);
    const sgtDate = new Date(dbDate.getTime() + 8 * 60 * 60 * 1000);
    const now = Date.now();
    const diffMs = now - sgtDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ${diffMin % 60}m ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
  };

  const getLogIcon = (type) => {
    if (type === 'ROSTER') return '/calendar.png';
    if (type === 'PREFERENCE') return '/userMale.png';
    if (type === 'WINDOW') return '/clock.png';
    if (type === 'ACCOUNT') return '/userMale.png';
    return '/calendar.png';
  };

  // Navigation helpers (Quick Links + Activity Log)
  const goRoster = () => navigate('/admin/rosters');
  const goNewStaff = () => navigate('/admin/staff');
  const goManageLeave = () => navigate('/admin/manage-leave');
  const goStaffPreferences = () => navigate('/admin/shift-distribution');

  const getLogClickHandler = (type) => {
    if (type === 'ROSTER') return goRoster;
    if (type === 'PREFERENCE') return goStaffPreferences;
    if (type === 'ACCOUNT') return goNewStaff;
    if (type === 'WINDOW') return goStaffPreferences;
    return () => {};
  };

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
      <Navbar active="home" />

      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto 40px',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          Welcome back, {user?.fullName || 'Admin'}!
        </h1>

        {/* Summary cards row + main left/right layout */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.4fr)',
            gap: 24,
          }}
        >
          {/* LEFT COLUMN: three cards stacked nicely */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pending leave requests */}
<div
  style={{
    background: 'white',
    borderRadius: 10,
    padding: '16px 20px',
    boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',   // NEW
    minHeight: 90,
  }}
>
  {/* left text block */}
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      Pending leave requests
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#111827',
        }}
      >
        {pendingLeaveCount}
      </span>
      <span style={{ fontSize: 13, color: '#6B7280' }}>
        awaiting approval
      </span>
    </div>
  </div>

  {/* right icon */}
  <img
    src={pendingLeaveCount === 0 ? '/greenCheckMark.png' : '/yellowWarning.png'}
    alt=""
    style={{ width: 70, height: 70, flexShrink: 0 }}
  />
</div>


            {/* Pending shift preferences */}
<div
  style={{
    background: 'white',
    borderRadius: 10,
    padding: '16px 20px',
    boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',   // NEW
    minHeight: 90,
  }}
>
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      Pending shift preferences
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#111827',
        }}
      >
        {pendingPrefCount}
      </span>
      <span style={{ fontSize: 13, color: '#6B7280' }}>
        unreviewed submissions
      </span>
    </div>
  </div>

  <img
    src={pendingPrefCount === 0 ? '/greenCheckMark.png' : '/yellowWarning.png'}
    alt=""
    style={{ width: 70, height: 70, flexShrink: 0 }}
  />
</div>


            {/* Next month roster status */}
<div
  style={{
    background: 'white',
    borderRadius: 10,
    padding: '16px 20px',
    boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',   // NEW
    minHeight: 90,
  }}
>
  {/* left text block */}
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#6B7280',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}
    >
      Next roster status
    </div>
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 4,
      }}
    >
      {nextRosterLabel || 'Loading...'}
    </div>
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color:
          nextRosterStatus === 'Published'
            ? '#16A34A'
            : nextRosterStatus === 'Drafting'
            ? '#F97316'
            : nextRosterStatus === 'Preference Open'
            ? '#DC2626'
            : '#6B7280',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background:
            nextRosterStatus === 'Published'
              ? '#16A34A'
              : nextRosterStatus === 'Drafting'
              ? '#F97316'
              : nextRosterStatus === 'Preference Open'
              ? '#DC2626'
              : '#6B7280',
        }}
      />
      {nextRosterStatus || 'Loading...'}
    </div>
  </div>

  {/* right icon */}
  <img
    src={
      nextRosterStatus === 'Published'
        ? '/greenCheckMark.png'
        : nextRosterStatus === 'Drafting'
        ? '/yellowWarning.png'
        : nextRosterStatus === 'Preference Open'
        ? '/redWarning.png'
        : '/yellowWarning.png'
    }
    alt=""
    style={{ width: 70, height: 70, flexShrink: 0 }}
  />
</div>

          </div>

          {/* RIGHT COLUMN: Quick Links + Activity Log (unchanged) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                Quick Links
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 24,
                }}
              >
                <button
                  type="button"
                  onClick={goRoster}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    width: 80,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 78,
                      height: 78,
                      background: '#5091CD',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      style={{ width: 50, height: 50 }}
                      src="/startNewRoster.png"
                      alt="Start New Roster"
                    />
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {'Start New\nRoster'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={goNewStaff}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    width: 80,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 78,
                      height: 78,
                      background: '#5091CD',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      style={{ width: 50, height: 50 }}
                      src="/addNewStaff.png"
                      alt="Add New Staff"
                    />
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {'Add\nNew Staff'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={goManageLeave}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    width: 80,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 78,
                      height: 78,
                      background: '#5091CD',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      style={{ width: 50, height: 50 }}
                      src="/manageLeave.png"
                      alt="Manage Leave"
                    />
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {'Manage\nLeave'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={goStaffPreferences}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    width: 80,
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 78,
                      height: 78,
                      background: '#5091CD',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      style={{ width: 50, height: 50 }}
                      src="/staffPref.png"
                      alt="Staff Preferences"
                    />
                  </div>
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {'Staff\nPreferences'}
                  </div>
                </button>
              </div>
            </section>

            <section
              style={{
                background: 'white',
                borderRadius: 10,
                padding: 18,
                boxShadow: '0 2px 2px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                height: 360,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  marginBottom: 8,
                }}
              >
                Admin Activity Log
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  overflow: 'hidden',
                }}
              >
                {logs.map((log) => {
                  const onClick = getLogClickHandler(log.log_type);
                  return (
                    <div
                      key={log.log_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        padding: '6px 0',
                        borderTop: '1px solid #E0E0E0',
                        cursor: 'pointer',
                      }}
                      onClick={onClick}
                    >
                      <img
                        style={{ width: 26, height: 26 }}
                        src={getLogIcon(log.log_type)}
                        alt=""
                      />
                      <div
                        style={{
                          flex: 1,
                          fontSize: 14,
                        }}
                      >
                        {formatTimeAgo(log.log_datetime)}, {log.log_details}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#5091CD',
                  cursor: 'pointer',
                }}
              >
                View All
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminHome;
