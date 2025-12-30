import React, { useState } from 'react';

// --- STYLES OBJECT (Keeps JSX clean) ---
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly darker overlay for focus
    backdropFilter: 'blur(2px)', // Optional: adds a nice blur to background
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#EDF0F5', // Pure white background
    width: '100%',
    maxWidth: '500px', // Limits width so it doesn't look stretched
    padding: '32px',
    borderRadius: '16px', // Smooth rounded corners
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)', // Soft shadow for depth
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
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #E0E0E0', // Subtle light gray border
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    color: '#333',
    backgroundColor: '#FAFAFA', // Very light gray inside input
    transition: 'border-color 0.2s',
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
    appearance: 'none', // Removes default browser arrow for cleaner look
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px',
    cursor: 'pointer',
  },
  textarea: {
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
    minHeight: '100px',
    resize: 'vertical',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '12px',
  },
  btnConfirm: {
    padding: '10px 24px',
    backgroundColor: '#5091CD', // Your theme blue
    color: 'white',
    border: 'none',
    borderRadius: '50px', // Pill shape
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
    borderRadius: '50px', // Pill shape
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
  // State
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    // Basic Validation
    if (!title || !month || !year) {
      setError("Please fill in the Title, Month, and Year.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    // --- CHANGED PART START: Get User ID ---
    let currentUserId = 1; // Default fallback
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      // Use the stored ID, or fallback to 101 (Janet) if testing
      currentUserId = storedUser.userId || storedUser.id || 101; 
    } catch (e) {
      console.warn("Could not read user from local storage", e);
    }
    // --- CHANGED PART END ---

    try {
      const response = await fetch('http://localhost:5000/api/rosters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          month: month,
          year: year,
          notes: notes,
          status: 'Preference Open', // Default status per your schema
          userId: currentUserId
        }),
      });

      if (response.ok) {
        setIsSubmitting(false);
        setTitle('');
        setMonth('');
        setYear('');
        setNotes('');
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
      {/* Stop click propagation so clicking inside doesn't close modal */}
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={styles.header}>Add New Roster</div>

        {/* Error Message */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Form Group: Title */}
        <div>
          <label style={styles.label}>Roster Title</label>
          <input
            type="text"
            placeholder="Enter new roster title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
          />
        </div>

        {/* Form Group: Roster Period (Stacked) */}
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

        {/* Form Group: Notes */}
        <div>
          <label style={styles.label}>Notes (Optional)</label>
          <textarea
            placeholder="Enter notes for this roster (e.g. public holiday)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={styles.textarea}
          />
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