import React, { useState } from 'react';

// --- STYLES OBJECT ---
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#EDF0F5',
    width: '100%',
    maxWidth: '500px',
    padding: '32px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
  },
  header: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1A1A1A',
    marginBottom: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '8px',
    display: 'block',
  },
  readOnlyInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    color: '#555',
    backgroundColor: '#EBEBEB', // darker grey to indicate disabled
    cursor: 'not-allowed',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    color: '#333',
    backgroundColor: '#FAFAFA',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  btnConfirm: {
    padding: '10px 24px',
    backgroundColor: '#5091CD',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(80, 145, 205, 0.3)',
  },
  btnCancel: {
    padding: '10px 24px',
    backgroundColor: '#F5F5F5',
    color: '#333',
    border: '1px solid #E0E0E0',
    borderRadius: '50px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBox: {
    backgroundColor: '#FFE5E5',
    color: '#D32F2F',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
  }
};

function AdminNewRoster({ open, onConfirm, onCancel }) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  // Auto-Generate Title Logic
  const autoTitle = (month && year) ? `${month} ${year} Roster` : '(Select Month & Year)';

  const handleSubmit = async () => {
    if (!month || !year) {
      setError("Please select both a Month and Year.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    let currentUserId = 1; 
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUserId = storedUser.userId || storedUser.id || 101; 
    } catch (e) {
      console.warn("Could not read user from local storage", e);
    }

    // STRICT Auto Title
    const finalTitle = `${month} ${year} Roster`;

    try {
      const response = await fetch('http://localhost:5000/api/rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle, // Uses the auto-generated title
          month: month,
          year: year,
          status: 'Preference Open', 
          userId: currentUserId
        }),
      });

      if (response.ok) {
        setIsSubmitting(false);
        setMonth('');
        setYear('');
        if (onConfirm) onConfirm();
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to create roster');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError('Server connection error.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        <div style={styles.header}>Add New Roster</div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* 1. Roster Period Selectors */}
        <div>
          <label style={styles.label}>Roster Period</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={styles.select}
            >
              <option value="">Select month</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={styles.select}
            >
              <option value="">Select year</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        {/* 2. Auto-Generated Title (Read Only) */}
        <div>
          <label style={styles.label}>Roster Name (Auto-Generated)</label>
          <div style={styles.readOnlyInput}>
            {autoTitle}
          </div>
        </div>

        {/* Buttons */}
        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={styles.btnCancel}
            onMouseOver={(e) => e.target.style.backgroundColor = '#E0E0E0'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#F5F5F5'}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
                ...styles.btnConfirm,
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Creating...' : 'Confirm'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default AdminNewRoster;