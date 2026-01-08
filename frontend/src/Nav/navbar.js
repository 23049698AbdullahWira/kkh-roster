import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:5000";
const DEFAULT_AVATAR = "https://i.pinimg.com/736x/9e/83/75/9e837528f01cf3f42119c5aeeed1b336.jpg";

function Navbar({ active, onGoHome, onGoRoster, onGoStaff, onGoShift }) {
  
  // --- HELPERS (defined outside or inside, but before state) ---

  // 1. Safe LocalStorage Parser
  const getStoredData = () => {
    // Try to get the bundled 'user' object first
    let userObj = {};
    try {
      const stored = localStorage.getItem('user');
      if (stored) userObj = JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing user object", e);
    }

    // Resolve Name: Priority = Loose Key -> User Object
    const name = localStorage.getItem('userName') || userObj.fullName || userObj.full_name || "";

    // Resolve Avatar: Priority = Loose Key -> User Object
      const avatar = localStorage.getItem('avatar') || userObj.avatar || userObj.avatar_url || null;

    // Resolve ID: Priority = Loose Key -> User Object
    const id = localStorage.getItem('userId') || userObj.userId || userObj.user_id || userObj.id;

    return { name, avatar, id };
  };

  // 2. URL Cleaner / Generator
  const generateAvatarUrl = (url) => {
    if (!url || url === "null" || url === "undefined") return DEFAULT_AVATAR;

    let clean = String(url).replace(/['"]+/g, '').trim();
    
    // Fix Windows file paths if present
    clean = clean.replace(/\\/g, '/');

    // If it's already a web link, return it
    if (clean.startsWith('http') || clean.startsWith('blob:')) return clean;

    // If it's a local path, prepend the API base URL
    if (!clean.startsWith('/')) clean = `/${clean}`;
    
    return `${API_BASE_URL}${clean}`;
  };

  // --- STATE ---
  const initialData = getStoredData();
  const [currentDate] = useState(new Date()); // No set needed if it doesn't tick
  const [userName, setUserName] = useState(initialData.name);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar);

  // --- EFFECTS ---

  // Sync Data with Backend
  useEffect(() => {
    const fetchUserData = async () => {
      const userId = initialData.id;

      if (!userId) {
        console.warn("[Navbar] No User ID found, skipping fetch.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (response.ok) {
          const userData = await response.json();

          // 1. Handle Name Update
          const newName = userData.fullName || userData.full_name;
          if (newName) {
            setUserName(newName);
            localStorage.setItem('userName', newName);
          }

          // 2. Handle Avatar Update (THE FIX)
          const rawAvatar = userData.avatar || userData.avatar_url;
          
          if (rawAvatar) {
            // Case A: User has an avatar
            const cleanAvatar = String(rawAvatar).replace(/['"]+/g, '').trim();
            setAvatarUrl(cleanAvatar);
            localStorage.setItem('avatar', cleanAvatar);
          } else {
            // Case B: User has NO avatar (null/empty)
            // We must explicitly clear the state and storage
            setAvatarUrl(null);
            localStorage.removeItem('avatar');
          }
        }
      } catch (error) {
        console.error("[Navbar] Failed to sync user data:", error);
      }
    };

    fetchUserData();
  }, [initialData.id]);

  // --- FORMATTING ---
  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', weekday: 'long', 
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(currentDate);

  const getLinkStyle = (tabName) => ({
    cursor: 'pointer',
    borderBottom: active === tabName ? '3px solid #5091CD' : '3px solid transparent',
    paddingBottom: '4px',
    color: '#374151',
    textDecoration: 'none',
    transition: 'border-color 0.2s'
  });

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        
        {/* Left Side: Logo & Navigation */}
        <div style={styles.leftSection}>
          <img 
            onClick={onGoHome} 
            style={styles.logo} 
            src="https://www.kkh.com.sg/adobe/dynamicmedia/deliver/dm-p-oid--JqCZpr4gmYKfeMnlqRVD8oOf_e248huXQTjXYCcI8k1uSp-cJhQpzmoCZcP8BsW3koppbJXk5tMVBnByC2Fqk0ac3yBuu61hzuoDJezaFc0OzrSjNuilO1-vIf6pzIUX/kkh.jpg?preferwebp=true" 
            alt="KKH Logo" 
          />
          
          <nav style={styles.nav}>
            <div style={getLinkStyle('home')} onClick={onGoHome}>Home</div>
            <div style={getLinkStyle('roster')} onClick={onGoRoster}>Roster</div>
            <div style={getLinkStyle('staff')} onClick={onGoStaff}>Staff</div>
            <div style={getLinkStyle('shift')} onClick={onGoShift}>Shift Distribution</div>
          </nav>
        </div>

        {/* Right Side: Date & User Profile */}
        <div style={styles.rightSection}>
          <div style={styles.userInfo}>
            <div style={styles.dateText}>{formattedDate}</div>
            {userName && <div style={styles.userName}>{userName}</div>}
          </div>

          <div style={styles.avatarWrapper}>
            <img
              style={styles.avatarImg}
              src={generateAvatarUrl(avatarUrl)}
              alt="Profile"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = DEFAULT_AVATAR;
              }}
            />
          </div>
        </div>

      </div>
    </header>
  );
}

// --- STYLES OBJECT (Cleaner than inline spaghetti) ---
const styles = {
  header: {
    width: '100%',
    backgroundColor: 'white',
    borderBottom: '1px solid #ddd',
    boxSizing: 'border-box'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px'
  },
  logo: {
    width: '180px',
    height: 'auto',
    cursor: 'pointer'
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
    fontSize: '16px',
    fontWeight: '800'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  dateText: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '600'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827'
  },
  avatarWrapper: {
    position: 'relative',
    cursor: 'pointer'
  },
  avatarImg: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid #ddd'
  }
};

export default Navbar;