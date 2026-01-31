// src/UserNavbar.js
import React, { useState, useEffect, useRef } from 'react';
// 1. IMPORT CENTRALIZED CONFIG & HELPER
import { API_BASE_URL, fetchFromApi } from '../services/api';

const DEFAULT_AVATAR = "https://i.pinimg.com/736x/9e/83/75/9e837528f01cf3f42119c5aeeed1b336.jpg";

function UserNavbar({
  active = 'home',
  onLogout,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
}) {

  // --- HELPERS ---
  const getStoredData = () => {
    let userObj = {};
    try {
      const stored = localStorage.getItem('user');
      if (stored) userObj = JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing user object", e);
    }
    const name = localStorage.getItem('userName') || userObj.fullName || userObj.full_name || "";
    const avatar = localStorage.getItem('avatar') || userObj.avatar || userObj.avatar_url || null;
    const id = localStorage.getItem('userId') || userObj.userId || userObj.user_id || userObj.id;
    return { name, avatar, id };
  };

  const generateAvatarUrl = (url) => {
    if (!url || url === "null" || url === "undefined") return DEFAULT_AVATAR;
    let clean = String(url).replace(/['"]+/g, '').trim();
    clean = clean.replace(/\\/g, '/');
    if (clean.startsWith('http') || clean.startsWith('blob:')) return clean;
    if (!clean.startsWith('/')) clean = `/${clean}`;
    // Uses the imported API_BASE_URL from services/api.js
    return `${API_BASE_URL}${clean}`;
  };

  // --- STATE ---
  const initialData = getStoredData();
  const [currentDate] = useState(new Date()); 
  const [userName, setUserName] = useState(initialData.name);
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar);
  
  // UI States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); 
  const dropdownRef = useRef(null);

  // --- LOGOUT LOGIC ---
  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // 1. Wipe Local Storage
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    localStorage.removeItem('avatar');
    localStorage.removeItem('userId');
    localStorage.removeItem('token'); 

    // 2. Trigger Parent Logout
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // --- EFFECTS ---
  useEffect(() => {
    const fetchUserData = async () => {
      const userId = initialData.id;
      if (!userId) return;

      try {
        // 2. UPDATED: Using fetchFromApi
        // fetchFromApi returns parsed JSON directly
        const userData = await fetchFromApi(`/users/${userId}`);
        
        const newName = userData.fullName || userData.full_name;
        if (newName) {
            setUserName(newName);
            localStorage.setItem('userName', newName);
        }
        
        const rawAvatar = userData.avatar || userData.avatar_url;
        if (rawAvatar) {
            const cleanAvatar = String(rawAvatar).replace(/['"]+/g, '').trim();
            setAvatarUrl(cleanAvatar);
            localStorage.setItem('avatar', cleanAvatar);
        } else {
            setAvatarUrl(null);
            localStorage.removeItem('avatar');
        }
        
      } catch (error) {
        console.error("[UserNavbar] Failed to sync user data:", error);
      }
    };
    fetchUserData();
  }, [initialData.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <>
      <header style={styles.header}>
        <div style={styles.container}>
          
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
              <div style={getLinkStyle('preference')} onClick={onGoShiftPreference}>Shifts Preference</div>
              <div style={getLinkStyle('leave')} onClick={onGoApplyLeave}>Apply Leave</div>
            </nav>
          </div>

          <div style={styles.rightSection}>
            <div style={styles.userInfo}>
              <div style={styles.dateText}>{formattedDate}</div>
              {userName && <div style={styles.userName}>{userName}</div>}
            </div>

            <div 
              style={styles.avatarWrapper} 
              ref={dropdownRef}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <img
                style={styles.avatarImg}
                src={generateAvatarUrl(avatarUrl)}
                alt="Profile"
                referrerPolicy="no-referrer"
                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
              />

              {isDropdownOpen && (
                <div style={styles.dropdownMenu}>
                  <div style={styles.dropdownArrow}></div>
                  
                  <div 
                    style={styles.dropdownItem} 
                    onClick={(e) => { e.stopPropagation(); onGoAccount(); setIsDropdownOpen(false); }}
                  >
                    My Profile
                  </div>
                  
                  <div style={styles.separator}></div>
                  
                  <div 
                    style={{...styles.dropdownItem, color: '#dc2626'}} 
                    onClick={(e) => { e.stopPropagation(); handleLogoutClick(); }}
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* --- CONFIRMATION MODAL --- */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Confirm Logout</h3>
            <p style={styles.modalText}>Are you sure you want to logout?</p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={cancelLogout}>Cancel</button>
              <button style={styles.confirmBtn} onClick={confirmLogout}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  header: { width: '100%', backgroundColor: 'white', borderBottom: '1px solid #ddd', boxSizing: 'border-box' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  leftSection: { display: 'flex', alignItems: 'center', gap: '32px' },
  logo: { width: '180px', height: 'auto', cursor: 'pointer' },
  nav: { display: 'flex', alignItems: 'center', gap: '32px', fontSize: '16px', fontWeight: '800' },
  rightSection: { display: 'flex', alignItems: 'center', gap: '16px' },
  userInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  dateText: { fontSize: '12px', color: '#6B7280', fontWeight: '600' },
  userName: { fontSize: '14px', fontWeight: '700', color: '#111827' },
  avatarWrapper: { position: 'relative', cursor: 'pointer' },
  avatarImg: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' },
  
  // Dropdown
  dropdownMenu: {
    position: 'absolute', top: '55px', right: '0', width: '150px', backgroundColor: 'white', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '4px 0',
  },
  dropdownArrow: {
    position: 'absolute', top: '-6px', right: '14px', width: '12px', height: '12px', backgroundColor: 'white',
    transform: 'rotate(45deg)', borderLeft: '1px solid #e5e7eb', borderTop: '1px solid #e5e7eb',
  },
  dropdownItem: { padding: '10px 16px', fontSize: '14px', color: '#374151', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s' },
  separator: { height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' },
  
  // Modal Styles
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 2000,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  modalContent: {
    backgroundColor: 'white', padding: '24px', borderRadius: '8px',
    width: '320px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  modalTitle: { margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#111827' },
  modalText: { margin: '0 0 24px 0', fontSize: '14px', color: '#6B7280' },
  modalActions: { display: 'flex', justifyContent: 'center', gap: '12px' },
  cancelBtn: {
    padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px',
    backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontWeight: '600'
  },
  confirmBtn: {
    padding: '8px 16px', border: 'none', borderRadius: '6px',
    backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600'
  }
};

export default UserNavbar;