import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

const ActionButton = ({ onClick, icon, color, title }) => (
  <button type="button" title={title} onClick={onClick} style={{ ...styles.actionButton.base, ...styles.actionButton[color] }}>
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
        const response = await fetch(`http://localhost:5000/users/${loggedInUser.userId}`);
        if (!response.ok) throw new Error('Failed to fetch user data.');
        const data = await response.json();
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

    // --- VALIDATION LOGIC ---
    if (!trimmedFullName) {
      setEditError("Full Name cannot be empty.");
      return;
    }
    if (!trimmedEmail) {
      setEditError("Email cannot be empty.");
      return;
    }
    if (!trimmedContact) {
      setEditError("Contact cannot be empty.");
      return;
    }
    // --- END OF VALIDATION ---

    const payload = {
      ...userData,
      full_name: trimmedFullName,
      email: trimmedEmail,
      contact: trimmedContact,
    };

    const hasChanged = initialUserData.full_name !== payload.full_name ||
      initialUserData.email !== payload.email ||
      initialUserData.contact !== payload.contact;

    if (!hasChanged) {
      setIsEditing(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/users/${userData.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to update profile.');

      setSuccessMessage('Account Details Updated Successfully');
      setTimeout(() => setSuccessMessage(''), 4000);

      setUserData(payload);
      setInitialUserData(payload);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!passwords.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!passwords.newPassword) {
      setPasswordError("Enter new password.");
      return;
    }
    if (passwords.newPassword === passwords.currentPassword) {
      setPasswordError("New password cannot be the same as the current password.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      const payload = {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      };

      const response = await fetch(`http://localhost:5000/users/${userData.user_id}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password.');
      }

      setSuccessMessage('Password Updated Successfully');
      setTimeout(() => setSuccessMessage(''), 4000);

      setShowPassword(false);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || "An unexpected error occurred.");
    }
  };

  if (loading) return <div style={styles.message}>Loading...</div>;
  if (error && !successMessage) return <div style={{ ...styles.message, color: '#B91C1C' }}>Error: {error}</div>;
  if (!userData) return <div style={styles.message}>No user data found.</div>;

  return (
    <div style={styles.page}>
      <UserNavbar
        active="roster"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
        onLogout={onLogout}
      />
      <main style={styles.mainContent}>
        <header style={styles.header}>
          <h1 style={styles.title}>Account Information</h1>
        </header>
        <div style={styles.container}>
          <div style={styles.profileGrid}>
            <div style={styles.avatarColumn}>
              <img style={styles.avatar} src={userData.avatar_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png'} alt="Profile Avatar" />
              <div style={styles.avatarName}>{userData.full_name}</div>
              <div style={styles.avatarEmail}>{userData.email}</div>
            </div>

            <div style={styles.detailsColumn}>
              <div style={styles.actionsHeader}>
                {isEditing ? (
                  <div style={styles.actions}>
                    <CheckIcon onClick={handleSave} />
                    <CrossIcon onClick={handleCancel} />
                  </div>
                ) : (
                  <PencilIcon onClick={handleEdit} />
                )}
              </div>

              {/* Display Edit Error Message */}
              {editError && <div style={styles.errorMessage}>{editError}</div>}
              {successMessage && <div style={styles.successMessage}>{successMessage}</div>}

              <Field label="Full Name" name="full_name" value={userData.full_name} isEditing={isEditing} onChange={handleInputChange} maxLength={50} />
              <Field label="Email" name="email" value={userData.email} isEditing={isEditing} onChange={handleInputChange} maxLength={50} />
              <Field label="Contact" name="contact" value={userData.contact} isEditing={isEditing} onChange={handleInputChange} />

              <div style={styles.divider} />

              {showPassword ? (
                <div>
                  {passwordError && <div style={styles.errorMessage}>{passwordError}</div>}
                  <div style={{ marginBottom: '16px' }}>
                    <Field label="Current Password" name="currentPassword" type="password" value={passwords.currentPassword} isEditing={true} onChange={handlePasswordChange} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <Field label="New Password" name="newPassword" type="password" value={passwords.newPassword} isEditing={true} onChange={handlePasswordChange} />
                  </div>
                  <Field label="Confirm New Password" name="confirmPassword" type="password" value={passwords.confirmPassword} isEditing={true} onChange={handlePasswordChange} />
                  <div style={styles.buttonContainer}>
                    <button onClick={handleChangePassword} style={styles.primaryButton}>Save Password</button>
                    <button onClick={handleCancelPasswordChange} style={styles.secondaryButton}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowPassword(true)} style={styles.secondaryButton}>Change Password</button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const Field = ({ label, name, value, isEditing, onChange, type = 'text', maxLength }) => (
  <div style={styles.fieldGroup}>
    <label style={styles.label}>{label}</label>
    {isEditing ? (
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        style={styles.input}
        maxLength={maxLength}
      />
    ) : (
      <div style={{ ...styles.input, ...styles.inputDisabled, ...styles.displayField }}>{value}</div>
    )}
  </div>
);

const styles = {
  page: { width: '100%', minHeight: '100vh', background: '#F8F9FA', fontFamily: "'Inter', sans-serif" },
  mainContent: { maxWidth: 1400, width: '100%', margin: '24px auto 40px', padding: '0 32px', boxSizing: 'border-box' },
  header: { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 800, margin: 0, textAlign: 'center' },
  container: { width: '100%', maxWidth: 954, margin: '0 auto', background: 'white', borderRadius: 12, border: '1px solid #E6E6E6', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  profileGrid: { display: 'flex', minHeight: 450 },
  avatarColumn: { width: 280, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #E6E6E6', background: '#F8F9FA', borderRadius: '12px 0 0 12px' },
  avatar: { width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', marginBottom: 20, border: '4px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  avatarName: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  avatarEmail: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    width: '100%',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  detailsColumn: { flex: 1, padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: 20 },
  actionsHeader: { display: 'flex', justifyContent: 'flex-end', height: '32px' },
  actions: { display: 'flex', gap: 8 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 16, fontWeight: 500 },
  input: { padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16, width: '100%', boxSizing: 'border-box' },
  inputDisabled: { background: '#F3F4F6', color: '#6B7280' },
  displayField: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  divider: { height: 1, background: '#E6E6E6', margin: '10px 0' },
  buttonContainer: { marginTop: 24, display: 'flex', gap: 16 },
  primaryButton: { padding: '10px 20px', background: '#5091CD', borderRadius: 24, border: 'none', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  secondaryButton: { padding: '10px 20px', background: 'white', borderRadius: 24, border: '1px solid #DDDDDD', color: 'black', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  message: { padding: '40px', textAlign: 'center', color: '#555', fontSize: 16 },
  errorMessage: { color: '#DC2626', fontSize: 14, marginBottom: 12, textAlign: 'left' },
  successMessage: { color: '#059669', fontSize: 15, fontWeight: 500, marginBottom: 10, textAlign: 'left' },
  actionButton: {
    base: { width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    green: { background: 'rgba(0, 174, 6, 0.15)' },
    red: { background: 'rgba(255, 37, 37, 0.15)' },
    blue: { background: 'rgba(0, 110, 255, 0.15)' },
  },
};

export default UserAccountInformation;