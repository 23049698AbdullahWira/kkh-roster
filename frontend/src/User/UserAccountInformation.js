import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import './UserAccountInformation.css';
// 1. IMPORT THE CENTRALIZED API HELPER
import { fetchFromApi } from '../services/api';

const ActionButton = ({ onClick, icon, color, title }) => (
  <button 
    type="button" 
    title={title} 
    onClick={onClick} 
    className={`user-useraccountinformation-action-btn user-useraccountinformation-action-btn-${color}`}
  >
    {icon}
  </button>
);

const PencilIcon = ({ onClick }) => (
  <ActionButton onClick={onClick} title="Edit Profile" color="blue" icon={<FaEdit color="#006EFF" />} />
);
const CheckIcon = ({ onClick }) => (
  <ActionButton onClick={onClick} title="Save Changes" color="green" icon={<FaCheck color="#00AE06" />} />
);
const CrossIcon = ({ onClick }) => (
  <ActionButton onClick={onClick} title="Cancel" color="red" icon={<FaTimes color="#FF2525" />} />
);

const Field = ({ label, name, value, isEditing, onChange, type = 'text', maxLength }) => (
  <div className="user-useraccountinformation-field-group">
    <label className="user-useraccountinformation-label">{label}</label>
    {isEditing ? (
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        className="user-useraccountinformation-input"
        maxLength={maxLength}
        placeholder={name === 'avatar_url' ? 'https://example.com/image.png' : ''}
      />
    ) : (
      <div 
        className="user-useraccountinformation-input user-useraccountinformation-input-disabled user-useraccountinformation-display-field"
        title={value} 
      >
        {value || (name === 'avatar_url' ? 'No custom avatar set' : '')}
      </div>
    )}
  </div>
);

function UserAccountInformation({
  loggedInUser,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  onLogout
}) {
  const [userData, setUserData] = useState(null);
  const [initialUserData, setInitialUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!loggedInUser?.userId) {
        setError("No user is logged in.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // 2. UPDATED: Using fetchFromApi
        // Note: api.js automatically handles response.json() and error throwing
        const data = await fetchFromApi(`/api/profile/${loggedInUser.userId}`);
        setUserData(data);
        setInitialUserData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [loggedInUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'contact') {
      const numericValue = value.replace(/\D/g, '');
      setUserData({ ...userData, [name]: numericValue.slice(0, 8) });
    } else {
      setUserData({ ...userData, [name]: value });
    }
  };

  const handlePasswordChange = (e) => {
    if (passwordError) setPasswordError('');
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setSuccessMessage('');
    setEditError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setUserData(initialUserData);
    setIsEditing(false);
    setSuccessMessage('');
    setEditError('');
  };

  const handleCancelPasswordChange = () => {
    setShowPassword(false);
    setPasswordError('');
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleSave = async () => {
    setEditError('');
    const trimmedFullName = userData.full_name ? userData.full_name.trim() : '';
    const trimmedEmail = userData.email ? userData.email.trim() : '';
    const trimmedContact = userData.contact ? String(userData.contact).trim() : '';
    const trimmedAvatar = userData.avatar_url ? userData.avatar_url.trim() : '';

    if (!trimmedFullName) { setEditError("Full Name cannot be empty."); return; }
    if (!trimmedEmail) { setEditError("Email cannot be empty."); return; }
    if (!trimmedContact) { setEditError("Contact cannot be empty."); return; }
    
    const payload = {
      full_name: trimmedFullName,
      email: trimmedEmail,
      contact: trimmedContact,
      avatar_url: trimmedAvatar,
    };

    const hasChanged = initialUserData.full_name !== payload.full_name ||
      initialUserData.email !== payload.email ||
      initialUserData.contact !== payload.contact ||
      initialUserData.avatar_url !== payload.avatar_url;

    if (!hasChanged) {
      setIsEditing(false);
      return;
    }

    try {
      // 3. UPDATED: Using fetchFromApi (PUT)
      // We don't need to specify 'Content-Type' or check response.ok manually; api.js does it.
      await fetchFromApi(`/api/profile/${userData.user_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setSuccessMessage('Account Details Updated Successfully');
      setTimeout(() => setSuccessMessage(''), 4000);

      const updatedData = { ...userData, ...payload };
      setUserData(updatedData);
      setInitialUserData(updatedData);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!passwords.currentPassword) { setPasswordError("Please enter your current password."); return; }
    if (!passwords.newPassword) { setPasswordError("Enter new password."); return; }
    if (passwords.newPassword === passwords.currentPassword) { setPasswordError("New password cannot be the same as the current password."); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordError("Passwords do not match."); return; }

    try {
      const payload = {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      };

      // 4. UPDATED: Using fetchFromApi (POST)
      await fetchFromApi(`/users/${userData.user_id}/change-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage('Password Updated Successfully');
      setTimeout(() => setSuccessMessage(''), 4000);

      setShowPassword(false);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || "An unexpected error occurred.");
    }
  };

  if (loading) return <div className="user-useraccountinformation-message">Loading...</div>;
  if (error && !successMessage) return <div className="user-useraccountinformation-message user-useraccountinformation-msg-error-text">Error: {error}</div>;
  if (!userData) return <div className="user-useraccountinformation-message">No user data found.</div>;

  return (
    <div className="user-useraccountinformation-page">
      <UserNavbar
        active="account" 
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
        onLogout={onLogout}
      />
      <main className="user-useraccountinformation-main-content">
        <header className="user-useraccountinformation-header">
          <h1 className="user-useraccountinformation-title">Account Information</h1>
        </header>
        <div className="user-useraccountinformation-card">
          <div className="user-useraccountinformation-grid">
            <div className="user-useraccountinformation-col-avatar">
              <img 
                className="user-useraccountinformation-avatar-img" 
                src={userData.avatar_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'} 
                alt="Profile Avatar" 
                onError={(e) => { e.target.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'; }}
              />
              <div className="user-useraccountinformation-avatar-name">{userData.full_name}</div>
              <div className="user-useraccountinformation-avatar-email">{userData.email}</div>
            </div>

            <div className="user-useraccountinformation-col-details">
              <div className="user-useraccountinformation-actions-header">
                {isEditing ? (
                  <div className="user-useraccountinformation-actions-group">
                    <CheckIcon onClick={handleSave} />
                    <CrossIcon onClick={handleCancel} />
                  </div>
                ) : (
                  <PencilIcon onClick={handleEdit} />
                )}
              </div>

              {editError && <div className="user-useraccountinformation-error-message">{editError}</div>}
              {successMessage && <div className="user-useraccountinformation-success-message">{successMessage}</div>}

              <Field label="Full Name" name="full_name" value={userData.full_name} isEditing={isEditing} onChange={handleInputChange} maxLength={50} />
              <Field label="Email" name="email" value={userData.email} isEditing={isEditing} onChange={handleInputChange} maxLength={50} />
              <Field label="Contact" name="contact" value={userData.contact} isEditing={isEditing} onChange={handleInputChange} />
              
              <Field label="Avatar URL" name="avatar_url" value={userData.avatar_url} isEditing={isEditing} onChange={handleInputChange} />

              <div className="user-useraccountinformation-divider" />

              {showPassword ? (
                <div>
                  {passwordError && <div className="user-useraccountinformation-error-message">{passwordError}</div>}
                  <div style={{ marginBottom: '16px' }}>
                    <Field label="Current Password" name="currentPassword" type="password" value={passwords.currentPassword} isEditing={true} onChange={handlePasswordChange} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <Field label="New Password" name="newPassword" type="password" value={passwords.newPassword} isEditing={true} onChange={handlePasswordChange} />
                  </div>
                  <Field label="Confirm New Password" name="confirmPassword" type="password" value={passwords.confirmPassword} isEditing={true} onChange={handlePasswordChange} />
                  <div className="user-useraccountinformation-btn-container">
                    <button onClick={handleChangePassword} className="user-useraccountinformation-btn-primary">Save Password</button>
                    <button onClick={handleCancelPasswordChange} className="user-useraccountinformation-btn-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowPassword(true)} className="user-useraccountinformation-btn-secondary">Change Password</button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserAccountInformation;