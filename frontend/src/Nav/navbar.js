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
    const role = localStorage.getItem('role') || userObj.role || "User"; 
    
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
  
  // 1. Time State (Updated to allow setting state)
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 2. Navbar Display State
  const [navUserName, setNavUserName] = useState(initialData.name);
  const [navAvatarUrl, setNavAvatarUrl] = useState(initialData.avatar);
  
  // 3. UI Toggles
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false); 
  
  // 4. Profile Form Data
  const [profileFormData, setProfileFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatar: '',
    currentPassword: '',
    newPassword: ''
  });

  const dropdownRef = useRef(null);

  // --- TIMER EFFECT (Updates Time Every Second) ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000); // Update every second so minutes change immediately

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, []);

  // --- LOGGING FUNCTION ---
  const logAction = async ({ userId, details }) => {
    try {
      await fetch(`${API_BASE_URL}/action-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, details })
      });
      console.log("Action Logged:", details);
    } catch (err) {
      console.error('Failed to insert action log:', err);
    }
  };

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
    setShowPasswordChange(false);
    
    setProfileFormData({ 
        fullName: navUserName || 'Loading...', 
        email: 'Loading...', 
        phone: initialData.phone || '', 
        avatar: navAvatarUrl || '', 
        currentPassword: '',
        newPassword: '' 
    });

    const userId = initialData.id;
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileFormData({
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '', 
          avatar: data.avatar || '',
          currentPassword: '',
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
    
    try {
      // 1. Update Basic Profile Info (PUT)
      const profilePayload = {
        full_name: profileFormData.fullName,
        email: profileFormData.email,
        contact: profileFormData.phone,
        avatar_url: profileFormData.avatar,
      };

      const profileResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload)
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile details.");
      }

      // 2. Update Password (POST) - Only if requested
      if (showPasswordChange) {
        if (!profileFormData.currentPassword || !profileFormData.newPassword) {
           alert("Please enter both current and new passwords.");
           return;
        }

        const passwordResponse = await fetch(`${API_BASE_URL}/users/${userId}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: profileFormData.currentPassword,
                newPassword: profileFormData.newPassword
            })
        });

        if (!passwordResponse.ok) {
            const errData = await passwordResponse.json();
            throw new Error(errData.message || "Failed to update password.");
        }
      }

      // 3. LOG THE ACTION
      const logDetails = `${initialData.role} ${initialData.name} updated ${profileFormData.fullName}'s account details.`;
      await logAction({ userId: userId, details: logDetails });

      // 4. Success UI Updates
      setNavUserName(profileFormData.fullName);
      setNavAvatarUrl(profileFormData.avatar);
      localStorage.setItem('userName', profileFormData.fullName);
      localStorage.setItem('avatar', profileFormData.avatar);
      localStorage.setItem('phone', profileFormData.phone);
      
      setIsEditingProfile(false);
      setShowPasswordChange(false);
      setProfileFormData(prev => ({...prev, currentPassword: '', newPassword: ''}));
      alert("Profile updated successfully!");

    } catch (error) {
      console.error(error);
      alert(error.message || "An error occurred.");
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

  // Check if current user is SUPERADMIN
  const isSuperAdmin = (initialData.role || '').toUpperCase() === 'SUPERADMIN';

  return (
    <>
      {/* 1. STICKY HEADER */}
      <header style={styles.header}>
        <div style={styles.container}>
          <div style={styles.leftSection}>
            <img onClick={() => handleNavClick(onGoHome)} style={styles.logo} src="https://www.kkh.com.sg/adobe/dynamicmedia/deliver/dm-p-oid--JqCZpr4gmYKfeMnlqRVD8oOf_e248huXQTjXYCcI8k1uSp-cJhQpzmoCZcP8BsW3koppbJXk5tMVBnByC2Fqk0ac3yBuu61hzuoDJezaFc0OzrSjNuilO1-vIf6pzIUX/kkh.jpg?preferwebp=true" alt="KKH Logo" />
            <nav style={styles.nav}>
              <div style={getLinkStyle('home')} onClick={() => handleNavClick(onGoHome)}>Home</div>
              <div style={getLinkStyle('roster')} onClick={() => handleNavClick(onGoRoster)}>Roster</div>
              <div style={getLinkStyle('staff')} onClick={() => handleNavClick(onGoStaff)}>Staff</div>
              <div style={getLinkStyle('shift')} onClick={() => handleNavClick(onGoShift)}>Shift Distribution</div>
            </nav>
          </div>

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
                  
                  {/* RESTRICTION: Only show 'My Profile' & Separator if NOT SuperAdmin */}
                  {!isSuperAdmin && (
                    <>
                        <div style={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); handleOpenProfile(); }}>
                        My Profile
                        </div>
                        <div style={styles.separator}></div>
                    </>
                  )}

                  <div style={{...styles.dropdownItem, color: '#dc2626'}} onClick={(e) => { e.stopPropagation(); handleLogoutClick(); }}>
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. SPACER */}
      <div style={styles.headerSpacer}></div>

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

      {/* --- PROFILE MODAL --- */}
      {showProfileModal && (
        <div style={styles.profileOverlay}>
          <div style={styles.profileContainer}>
            
            <h2 style={styles.pageTitle}>Account Information</h2>

            <div style={styles.profileCard}>
              {/* Left Column */}
              <div style={styles.cardLeft}>
                <div style={styles.largeAvatarContainer}>
                  <img 
                    src={generateAvatarUrl(profileFormData.avatar)} 
                    alt="User" 
                    style={styles.largeAvatar}
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                  />
                </div>
                <div style={styles.userEmailLabel}>{profileFormData.email || 'user@kkh.com.sg'}</div>
                
                {isEditingProfile && (
                   <input 
                      type="text" 
                      name="avatar"
                      placeholder="Image URL..."
                      value={profileFormData.avatar}
                      onChange={handleProfileChange}
                      style={{...styles.input, marginTop: '10px', fontSize: '12px', padding: '8px'}} 
                   />
                )}
              </div>

              {/* Right Column */}
              <div style={styles.cardRight}>
                
                <button 
                  style={styles.editIconBtn} 
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  title="Edit Profile"
                >
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                   </svg>
                </button>

                <div style={styles.inputGroup}>
                   <label style={styles.label}>Full Name</label>
                   <input 
                      type="text" 
                      name="fullName"
                      value={profileFormData.fullName} 
                      onChange={handleProfileChange}
                      disabled={!isEditingProfile}
                      style={styles.input}
                   />
                </div>

                <div style={styles.inputGroup}>
                   <label style={styles.label}>Email</label>
                   <input 
                      type="email" 
                      name="email"
                      value={profileFormData.email} 
                      onChange={handleProfileChange}
                      disabled={true} 
                      style={{...styles.input, color: '#6B7280', cursor: 'not-allowed'}}
                   />
                </div>

                <div style={styles.inputGroup}>
                   <label style={styles.label}>Contact</label>
                   <input 
                      type="tel" 
                      name="phone"
                      value={profileFormData.phone} 
                      onChange={handleProfileChange}
                      disabled={!isEditingProfile}
                      style={styles.input}
                   />
                </div>

                {showPasswordChange && (
                   <>
                       <div style={styles.inputGroup}>
                          <label style={styles.label}>Current Password</label>
                          <input 
                              type="password" 
                              name="currentPassword"
                              value={profileFormData.currentPassword}
                              onChange={handleProfileChange}
                              style={{...styles.input, backgroundColor: 'white', border: '1px solid #ddd'}}
                              placeholder="Enter current password"
                          />
                       </div>

                       <div style={styles.inputGroup}>
                          <label style={styles.label}>New Password</label>
                          <input 
                              type="password" 
                              name="newPassword"
                              value={profileFormData.newPassword}
                              onChange={handleProfileChange}
                              style={{...styles.input, backgroundColor: 'white', border: '1px solid #ddd'}}
                              placeholder="Enter new password"
                          />
                       </div>
                   </>
                )}

                <div style={styles.actionFooter}>
                   {!isEditingProfile && !showPasswordChange ? (
                      <button style={styles.changePasswordBtn} onClick={() => { setIsEditingProfile(true); setShowPasswordChange(true); }}>
                        Change Password
                      </button>
                   ) : (
                      <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                        <button style={styles.cancelBtn} onClick={() => { setIsEditingProfile(false); setShowPasswordChange(false); handleOpenProfile(); }}>
                           Cancel
                        </button>
                        <button style={styles.saveBtn} onClick={handleSaveProfile}>
                           Save
                        </button>
                      </div>
                   )}
                </div>
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
  header: { 
    position: 'fixed',
    top: 0, 
    left: 0,
    zIndex: 1000,
    width: '100%', 
    backgroundColor: 'white', 
    borderBottom: '1px solid #ddd', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    boxSizing: 'border-box' 
  },
  
  // SPACER
  headerSpacer: {
    height: '100px', 
    width: '100%',
    display: 'block'
  },

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
  separator: { height: '1px', backgroundColor: '#E5E7EB', margin: '4px 0' },

  // --- PROFILE MODAL ---
  profileOverlay: {
    position: 'fixed',
    top: '34px',
    left: 0,
    width: '100%',
    height: 'calc(100vh - 74px)',
    backgroundColor: '#F8F9FA', 
    zIndex: 900,
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '60px', 
    overflowY: 'auto'
  },
  profileContainer: {
    width: '850px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingBottom: '50px'
  },
  pageTitle: {
    fontSize: '32px', 
    fontWeight: '800',
    color: 'black',
    marginBottom: '20px',
    fontFamily: 'sans-serif'
  },
  profileCard: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex', 
    overflow: 'hidden',
    minHeight: '400px'
  },
  
  cardLeft: {
    width: '35%',
    borderRight: '1px solid #E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    backgroundColor: '#fff'
  },
  largeAvatarContainer: {
    width: '140px', 
    height: '140px',
    borderRadius: '50%',
    border:'0.5px lightgrey solid',
    backgroundColor: '#D1D5DB',
    marginBottom: '16px',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  largeAvatar: { width: '100%', height: '100%', objectFit: 'cover' },
  userEmailLabel: { color: '#6B7280', fontSize: '14px' }, 

  cardRight: {
    width: '65%',
    padding: '40px',
    position: 'relative'
  },
  editIconBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    backgroundColor: '#F8F9FA', 
    border: '0.5px lightgrey solid',
    color: 'grey', 
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  
  inputGroup: { 
    marginBottom: '24px', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'flex-start' 
  },
  
  label: { 
    fontSize: '15px', 
    color: '#111827', 
    marginBottom: '8px', 
    fontWeight: '600' 
  },
  
  input: {
    width: '100%',
    backgroundColor: '#F8F9FA', 
    border: '0.5px solid lightgrey',
    borderRadius: '4px',
    padding: '12px 16px',
    fontSize: '16px', 
    color: '#1F2937',
    boxSizing: 'border-box',
    outline: 'none'
  },

  actionFooter: { marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #E5E7EB', width: '100%' },
  changePasswordBtn: {
    width: '100%',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '20px', 
    padding: '12px',
    fontWeight: '700',
    fontSize: '14px',
    color: 'black',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  
  saveBtn: { flex: 1, padding: '10px', border: 'none', borderRadius: '6px', backgroundColor: '#10B981', color: 'white', cursor: 'pointer', fontWeight: '600' },
  cancelBtn: { padding: '10px 20px', border: '1px solid #D1D5DB', borderRadius: '6px', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontWeight: '600' },
  
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '320px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  modalTitle: { margin: '0', fontSize: '18px', fontWeight: '700', color: '#111827' },
  modalText: { margin: '0 0 24px 0', fontSize: '14px', color: '#6B7280' },
  modalActions: { display: 'flex', justifyContent: 'center', gap: '12px' },
  confirmBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: '600' },
};

export default Navbar;