// src/Nav/navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ active }) {
  const navigate = useNavigate();

  const linkStyle = (tab) => ({
    cursor: 'pointer',
    borderBottom: active === tab ? '2px #5091CD solid' : 'none',
    paddingBottom: active === tab ? 4 : 0,
    color: '#000',
    textDecoration: 'none',
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <img
            style={{ width: 180, height: 'auto' }}
            src="/kkh.png"
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
            <Link to="/admin/home" style={linkStyle('home')}>
              Home
            </Link>
            <Link to="/admin/rosters" style={linkStyle('roster')}>
              Roster
            </Link>
            <Link to="/admin/staff" style={linkStyle('staff')}>
              Staff
            </Link>
            <Link
              to="/admin/shift-distribution"
              style={linkStyle('shift')}
            >
              Shift Distribution
            </Link>
            <div style={linkStyle('logout')} onClick={handleLogout}>
              Logout
            </div>
          </nav>
        </div>

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
            style={{ width: 40, height: 40, borderRadius: '50%' }}
            src="https://placehold.co/50x50"
            alt="Avatar"
          />
        </div>
      </div>
    </header>
  );
}

export default Navbar;
