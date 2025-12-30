// src/UserNavbar.js
import React from 'react';

function UserNavbar({
  active = 'home',
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,              // NEW
}) {
  const tabBaseStyle = {
    height: 37,
    paddingLeft: 8,
    paddingRight: 8,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  };

  const renderTab = (key, label, onClick) => {
    const isActive = active === key;
    return (
      <div
        onClick={onClick}
        style={{
          ...tabBaseStyle,
          borderBottom: isActive ? '2px #5091CD solid' : '2px transparent solid',
        }}
      >
        <div
          style={{
            color: 'black',
            fontSize: 18,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
          }}
        >
          {label}
        </div>
      </div>
    );
  };

  return (
    <header
      style={{
        width: '100%',
        height: 80,
        paddingLeft: 96,
        paddingRight: 96,
        background: 'white',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 0 2px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          style={{ width: 180, height: 'auto' }}
          src="kkh.png"
          alt="Logo"
        />
      </div>

      {/* Center tabs */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 40,
        }}
      >
        {renderTab('home', 'Home', onGoHome)}
        {renderTab('roster', 'Roster', onGoRoster)}
        {renderTab('preference', 'Shifts Preference', onGoShiftPreference)}
        {renderTab('leave', 'Apply Leave', onGoApplyLeave)}
      </nav>

      {/* Right side: date/time + avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            color: 'black',
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
          }}
        >
          30 Oct, Thursday, 07:23 AM
        </div>
        <img
          style={{ width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}
          src="https://placehold.co/40x40"
          alt="User avatar"
          onClick={onGoAccount}     // NEW: go to account page
        />
      </div>
    </header>
  );
}

export default UserNavbar;
