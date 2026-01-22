import React, { useState, useEffect, useRef } from 'react';

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:5000";
const DEFAULT_AVATAR = "https://i.pinimg.com/736x/9e/83/75/9e837528f01cf3f42119c5aeeed1b336.jpg";

function Navbar({ active, onGoHome, onGoRoster, onGoStaff, onGoShift, onLogout }) {
  
  // --- HELPERS ---
  const getStoredData = () => {
    let userObj = {};
    try {
      const stored = localStorage.getItem('user');
      if (stored) userObj = JSON.parse(stored);
    } catch (e) { console.error(e); }
    
    const id = localStorage.getItem('userId') || userObj.userId || userObj.id;
    const name = localStorage.getItem('userName') || userObj.fullName || "";
    const avatar = localStorage.getItem('avatar') || userObj.avatar || null;
    const phone = localStorage.getItem('phone') || userObj.phone || "";
    const role = localStorage.getItem('role') || userObj.role || "";
    
    return { name, avatar, id, phone, role };
  };

  const generateAvatarUrl = (url) => {
    if (!url || url === "null" || url === "undefined") return DEFAULT_AVATAR;
    let clean = String(url).replace(/['"]+/g, '').trim().replace(/\\/g, '/');
    if (clean.startsWith('http') || clean.startsWith('blob:')) return clean;
    if (!clean.startsWith('/')) clean = `/${clean}`;
    return `${API_BASE_URL}${clean}`;
  };

  // --- STATE ---
  const initialData = getStoredData();
  const [currentDate] = useState(new Date());
  
  // 1. Navbar Display State
  const [navUserName, setNavUserName] = useState(initialData.name);
  const [navAvatarUrl, setNavAvatarUrl] = useState(initialData.avatar);
  
  // 2. UI Toggles
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // 3. Profile Form Data
  const [profileFormData, setProfileFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatar: '',
    newPassword: ''
  });

  const dropdownRef = useRef(null);

  // --- NAVIGATION INTERCEPTOR ---
  const handleNavClick = (callback) => {
    setShowProfileModal(false);
    setIsDropdownOpen(false);
    if (callback) callback();
  };

  // --- LOGOUT LOGIC ---
  const handleLogoutClick = () => {
    setIsDropdownOpen(false); 
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.clear(); 
    onLogout();
  };

  // --- PROFILE LOGIC ---
  const handleOpenProfile = async () => {
    setIsDropdownOpen(false);
    setShowProfileModal(true);
    setIsEditingProfile(false); 
    
    setProfileFormData({ fullName: 'Loading...', email: '', phone: '', avatar: '', newPassword: '' });

    const userId = initialData.id;
    if (!userId) {
        alert("Error: No User ID found. Please re-login.");
        return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileFormData({
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '', 
          avatar: data.avatar || '',
          newPassword: ''
        });
        if(data.phone) localStorage.setItem('phone', data.phone);
      } else {
        console.error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Network error fetching profile", error);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    const userId = initialData.id;
    
    const payload = {
      full_name: profileFormData.fullName,
      email: profileFormData.email,
      contact: profileFormData.phone,
      avatar_url: profileFormData.avatar,
    };

    if (profileFormData.newPassword && profileFormData.newPassword.trim().length > 0) {
      payload.password = profileFormData.newPassword;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setNavUserName(profileFormData.fullName);
        setNavAvatarUrl(profileFormData.avatar);
        
        localStorage.setItem('userName', profileFormData.fullName);
        localStorage.setItem('avatar', profileFormData.avatar);
        localStorage.setItem('phone', profileFormData.phone);

        setIsEditingProfile(false);
        alert("Profile updated successfully!");
      } else {
        const err = await response.json();
        alert(`Failed to update profile: ${err.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    }
  };

  // --- EFFECTS ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (!initialData.id) return;
      try {
        const response = await fetch(`${API_BASE_URL}/users/${initialData.id}`);
        if (response.ok) {
          const userData = await response.json();
          if (userData.fullName) {
             setNavUserName(userData.fullName);
             localStorage.setItem('userName', userData.fullName);
          }
          if (userData.avatar) {
             setNavAvatarUrl(userData.avatar);
             localStorage.setItem('avatar', userData.avatar);
          }
          if (userData.phone) {
             localStorage.setItem('phone', userData.phone);
          }
        }
      } catch (e) { console.error(e); }
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

  // --- RENDER ---
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

  const isSuperAdmin = (initialData.role || '').toUpperCase() === 'SUPERADMIN';

  return (
    <>
      <header style={styles.header}>
        <div style={styles.container}>
          {/* Left: Logo + Nav */}
          <div style={styles.leftSection}>
            <img onClick={() => handleNavClick(onGoHome)} style={styles.logo} src="https://www.kkh.com.sg/adobe/dynamicmedia/deliver/dm-p-oid--JqCZpr4gmYKfeMnlqRVD8oOf_e248huXQTjXYCcI8k1uSp-cJhQpzmoCZcP8BsW3koppbJXk5tMVBnByC2Fqk0ac3yBuu61hzuoDJezaFc0OzrSjNuilO1-vIf6pzIUX/kkh.jpg?preferwebp=true" alt="KKH Logo" />
            <nav style={styles.nav}>
              <div style={getLinkStyle('home')} onClick={() => handleNavClick(onGoHome)}>Home</div>
              <div style={getLinkStyle('roster')} onClick={() => handleNavClick(onGoRoster)}>Roster</div>
              <div style={getLinkStyle('staff')} onClick={() => handleNavClick(onGoStaff)}>Staff</div>
              <div style={getLinkStyle('shift')} onClick={() => handleNavClick(onGoShift)}>Shift Distribution</div>
            </nav>
          </div>

          {/* Right: Info + Avatar */}
          <div style={styles.rightSection}>
            <div style={styles.userInfo}>
              <div style={styles.dateText}>{formattedDate}</div>
              {navUserName && <div style={styles.userName}>{navUserName}</div>}
            </div>

            <div style={styles.avatarWrapper} ref={dropdownRef} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <img
                style={styles.avatarImg}
                src={generateAvatarUrl(navAvatarUrl)}
                alt="Profile"
                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
              />
              
              {isDropdownOpen && (
                <div style={styles.dropdownMenu}>
                  <div style={styles.dropdownArrow}></div>
                  <div style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); handleOpenProfile(); }}>
                    My Profile
                  </div>
                  <div style={styles.separator}></div>
                  <div style={{...styles.dropdownItem, color: '#dc2626'}} onClick={(e) => { e.stopPropagation(); handleLogoutClick(); }}>
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* --- LOGOUT MODAL --- */}
      {showLogoutConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Confirm Logout</h3>
            <p style={styles.modalText}>Are you sure you want to logout?</p>
            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button style={styles.confirmBtn} onClick={confirmLogout}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* --- PROFILE PAGE (Styled Like Dashboard) --- */}
      {showProfileModal && (
        <div style={styles.fullPageOverlay}>
          
          <div style={styles.contentWrapper}>
            {/* 1. Header sitting on gray background */}
            <div style={styles.dashboardHeader}>
                <h2 style={styles.dashboardTitle}>My Account</h2>
                <button style={styles.closeBtn} onClick={() => setShowProfileModal(false)}>&times;</button>
            </div>

            {/* 2. White Card Container */}
            <div style={styles.dashboardCard}>
              
              {/* Avatar Section */}
              <div style={styles.avatarSection}>
                <img 
                  src={generateAvatarUrl(profileFormData.avatar)} 
                  alt="Preview" 
                  style={styles.largeAvatar}
                  onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                />
                <div style={{flex: 1}}>
                  <h3 style={{margin: '0 0 4px 0', fontSize: '18px', color: '#111827'}}>{profileFormData.fullName}</h3>
                  <p style={{margin: '0', fontSize: '14px', color: '#6B7280'}}>{initialData.role}</p>
                  
                  {isEditingProfile && (
                    <div style={{marginTop: '12px'}}>
                        <label style={styles.label}>Update Avatar Link</label>
                        <input 
                          type="text" 
                          name="avatar"
                          value={profileFormData.avatar} 
                          onChange={handleProfileChange}
                          style={styles.input}
                          placeholder="https://image-url.com..."
                        />
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.separator}></div>

              {/* Form Grid */}
              <div style={styles.gridContainer}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Full Name</label>
                  <input 
                    type="text" 
                    name="fullName"
                    value={profileFormData.fullName} 
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    style={isEditingProfile ? styles.input : styles.inputDisabled}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={profileFormData.phone} 
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    style={isEditingProfile ? styles.input : styles.inputDisabled}
                  />
                </div>

                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.label}>Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={profileFormData.email} 
                    onChange={handleProfileChange}
                    disabled={!isEditingProfile}
                    style={isEditingProfile ? styles.input : styles.inputDisabled}
                  />
                </div>
              </div>

              {/* Password Section */}
              {isEditingProfile && (
                <div style={styles.passwordBox}>
                    <h4 style={styles.passwordTitle}>Security & Login</h4>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Change Password</label>
                      <input 
                        type="password" 
                        name="newPassword"
                        value={profileFormData.newPassword} 
                        onChange={handleProfileChange}
                        style={{...styles.input, backgroundColor: 'white'}}
                        placeholder="Type new password (leave blank to keep current)"
                      />
                    </div>
                </div>
              )}

              {/* Footer Actions */}
              <div style={styles.cardFooter}>
                {isSuperAdmin ? (
                  <div style={styles.restrictionMsg}>
                     Your Super Admin account profile is managed by system configuration.
                  </div>
                ) : (
                  !isEditingProfile ? (
                    <button style={styles.primaryBtn} onClick={() => setIsEditingProfile(true)}>
                      Edit Profile
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button style={styles.cancelBtn} onClick={() => { setIsEditingProfile(false); handleOpenProfile(); }}>
                        Cancel
                      </button>
                      <button style={styles.saveBtn} onClick={handleSaveProfile}>
                        Save Changes
                      </button>
                    </div>
                  )
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- STYLES ---
const styles = {
  // HEADER
  header: { position: 'relative', zIndex: 1000, width: '100%', backgroundColor: 'white', borderBottom: '1px solid #ddd', boxSizing: 'border-box' },
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
  
  // DROPDOWN
  dropdownMenu: { position: 'absolute', top: '55px', right: '0', width: '150px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '4px 0' },
  dropdownArrow: { position: 'absolute', top: '-6px', right: '14px', width: '12px', height: '12px', backgroundColor: 'white', transform: 'rotate(45deg)', borderLeft: '1px solid #e5e7eb', borderTop: '1px solid #e5e7eb' },
  dropdownItem: { padding: '10px 16px', fontSize: '14px', color: '#374151', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s' },
  
  // --- FULL PAGE PROFILE STYLES (MATCHING DASHBOARD) ---
  fullPageOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100vh',
    backgroundColor: '#F5F7FA', // Matches the light gray background of your image
    zIndex: 900, 
    overflowY: 'auto',
    paddingTop: '110px', // Header offset
    paddingBottom: '40px'
  },
  contentWrapper: {
    maxWidth: '800px', // Width of the white card
    margin: '0 auto',
    padding: '0 20px',
  },
  dashboardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px' // Space between Title and Card
  },
  dashboardTitle: {
    fontSize: '24px',
    fontWeight: '800', // Bold like "Annual Shift Distribution Analysis"
    color: '#111827',
    margin: 0
  },
  dashboardCard: {
    backgroundColor: 'white',
    borderRadius: '16px', // Rounded corners like image
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)', // Soft shadow
    padding: '32px',
    boxSizing: 'border-box'
  },
  
  // CARD CONTENT
  avatarSection: { display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' },
  largeAvatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #F3F4F6' },
  
  gridContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }, // Caps styling
  input: { padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', color: '#111827', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  inputDisabled: { padding: '12px', borderRadius: '8px', border: '1px solid transparent', backgroundColor: '#F9FAFB', fontSize: '14px', color: '#374151', width: '100%', boxSizing: 'border-box' },
  
  passwordBox: { marginTop: '32px', padding: '24px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA' },
  passwordTitle: { margin: '0 0 16px 0', fontSize: '14px', fontWeight: '700', color: '#991B1B' },
  
  cardFooter: {
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  
  separator: { height: '1px', backgroundColor: '#E5E7EB', margin: '24px 0' },
  restrictionMsg: { color: '#6B7280', fontSize: '14px', fontStyle: 'italic', width: '100%', textAlign: 'center' },

  // BUTTONS
  closeBtn: { background: 'none', border: 'none', fontSize: '32px', cursor: 'pointer', color: '#9CA3AF', lineHeight: 0.5 },
  cancelBtn: { padding: '10px 20px', border: '1px solid #D1D5DB', borderRadius: '8px', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontWeight: '600' },
  confirmBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600' },
  saveBtn: { padding: '10px 20px', border: 'none', borderRadius: '8px', backgroundColor: '#059669', color: 'white', cursor: 'pointer', fontWeight: '600' },
  primaryBtn: { padding: '10px 24px', border: 'none', borderRadius: '8px', backgroundColor: '#5091CD', color: 'white', cursor: 'pointer', fontWeight: '600' }, // Matches KK Blue

  // LOGOUT MODAL
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '320px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  modalTitle: { margin: '0', fontSize: '18px', fontWeight: '700', color: '#111827' },
  modalText: { margin: '0 0 24px 0', fontSize: '14px', color: '#6B7280' },
  modalActions: { display: 'flex', justifyContent: 'center', gap: '12px' },
};

export default Navbar;