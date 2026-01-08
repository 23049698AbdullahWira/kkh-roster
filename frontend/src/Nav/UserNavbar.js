// src/UserNavbar.js
import React from 'react';

function UserNavbar({
  active = 'home',
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  onLogout,
}) {
  const linkStyle = (tab) => ({
    cursor: 'pointer',
    borderBottom: active === tab ? '2px #5091CD solid' : 'none',
    paddingBottom: active === tab ? 4 : 0,
  });

  return (
    <header
      style={{
        width: '100%',
        background: 'white',
        boxSizing: 'border-box',
        borderBottom: '1px solid #ddd',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        {/* Left: logo + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <img
            style={{ width: 180, height: 'auto' }}
            src="kkh.png"
            alt="Logo"
          />
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            <div style={linkStyle('home')} onClick={onGoHome}>
              Home
            </div>
            <div style={linkStyle('roster')} onClick={onGoRoster}>
              Roster
            </div>
            <div
              style={linkStyle('preference')}
              onClick={onGoShiftPreference}
            >
              Shifts Preference
            </div>
            <div style={linkStyle('leave')} onClick={onGoApplyLeave}>
              Apply Leave
            </div>
            <div style={linkStyle('logout')} onClick={onLogout}>
              Logout
            </div>
          </nav>
        </div>

        {/* Right: date/time + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            30 Oct, Thursday, 07:23 AM
          </div>
          <img
            style={{ width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}
            src="https://placehold.co/40x40"
            alt="User avatar"
            onClick={onGoAccount}
          />
        </div>
      </div>
    </header>
  );
}

export default UserNavbar;
