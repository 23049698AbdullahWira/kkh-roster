import React, { useState, useEffect } from 'react';

function Navbar({ active, onGoHome, onGoRoster, onGoStaff, onGoShift }) {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState(new Date());

  // 1. INITIALIZE STATE FROM LOCAL STORAGE
  const [avatarUrl, setAvatarUrl] = useState(() => {
    // FIX: Read 'avatar' because that is what is currently in your LocalStorage
    const stored = localStorage.getItem('avatar');

    // If it exists, clean it up (remove quotes " " and extra spaces)
    if (stored) {
      return stored.replace(/['"]+/g, '').trim();
    }

    // Fallback
    return "https://placehold.co/50x50";
  });

  const [userName, setUserName] = useState(
    localStorage.getItem('userName') || ""
  );

  // --- EFFECT 1: Live Clock ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- EFFECT 2: Fetch User Data (To keep it fresh) ---
  useEffect(() => {
    const fetchUserData = async () => {
      const userId = localStorage.getItem('userId');

      if (!userId) return;

      try {
        const response = await fetch(`http://localhost:5000/users/${userId}`);

        if (response.ok) {
          const userData = await response.json();
          
          // Update Name if changed
          if (userData.full_name) {
            setUserName(userData.full_name);
            localStorage.setItem('userName', userData.full_name);
          }

          // Update Avatar if changed
          // Note: The DB column is 'avatar_url', but we save it to LS as 'avatar'
          if (userData.avatar_url) {
            const cleanUrl = userData.avatar_url.replace(/['"]+/g, '').trim();
            setAvatarUrl(cleanUrl);
            
            // FIX: Ensure we save it with the same key name we read from ('avatar')
            localStorage.setItem('avatar', cleanUrl);
          }
        }
      } catch (error) {
        console.error("Navbar: Fetch failed", error);
      }
    };

    fetchUserData();
  }, []);

  // --- FORMATTER ---
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(currentDate);

  const linkStyle = (tab) => ({
    cursor: 'pointer',
    borderBottom: active === tab ? '2px #5091CD solid' : 'none',
    paddingBottom: active === tab ? 4 : 0,
    color: '#374151',
    textDecoration: 'none'
  });

  return (
    <header style={{ width: '100%', background: 'white', boxSizing: 'border-box', borderBottom: '1px solid #ddd' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>

        {/* LEFT: Logo & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <img
            onClick={onGoHome}
            style={{ marginRight: 28, width: 180, height: 'auto', cursor: 'pointer' }}
            src="https://www.kkh.com.sg/adobe/dynamicmedia/deliver/dm-p-oid--JqCZpr4gmYKfeMnlqRVD8oOf_e248huXQTjXYCcI8k1uSp-cJhQpzmoCZcP8BsW3koppbJXk5tMVBnByC2Fqk0ac3yBuu61hzuoDJezaFc0OzrSjNuilO1-vIf6pzIUX/kkh.jpg?preferwebp=true"
            alt="Logo"
          />
          <nav style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 16, fontWeight: 800 }}>
            <div style={linkStyle('home')} onClick={onGoHome}>Home</div>
            <div style={linkStyle('roster')} onClick={onGoRoster}>Roster</div>
            <div style={linkStyle('staff')} onClick={onGoStaff}>Staff</div>
            <div style={linkStyle('shift')} onClick={onGoShift}>Shift Distribution</div>
          </nav>
        </div>

        {/* RIGHT: Info & Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{formattedDate}</div>
            {userName && (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Welcome, {userName}</div>
            )}
          </div>

          <div style={{ position: 'relative', cursor: 'pointer' }} >
            <img
              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
              src={avatarUrl}
              alt="Profile"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/50x50";
              }}
            />
          </div>
        </div>

      </div>
    </header>
  );
}

export default Navbar;