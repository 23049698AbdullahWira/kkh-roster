import React, { useState } from 'react';
import './AdminNewRoster.css'; 
// 1. Import centralized helper
import { fetchFromApi } from '../services/api';

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
      // 2. UPDATED: Using fetchFromApi (POST)
      // No need to manually check response.ok or parse .json()
      await fetchFromApi('/api/rosters', {
        method: 'POST',
        body: JSON.stringify({
          title: finalTitle, // Uses the auto-generated title
          month: month,
          year: year,
          status: 'Preference Open', 
          userId: currentUserId
        }),
      });

      // If we reach here, it was successful
      setIsSubmitting(false);
      setMonth('');
      setYear('');
      if (onConfirm) onConfirm();

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create roster');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-newroster-overlay" onClick={onCancel}>
      <div className="admin-newroster-modal" onClick={(e) => e.stopPropagation()}>
        
        <div className="admin-newroster-header">Add New Roster</div>

        {error && <div className="admin-newroster-error-box">{error}</div>}

        {/* 1. Roster Period Selectors */}
        <div>
          <label className="admin-newroster-label">Roster Period</label>
          <div className="admin-newroster-select-group">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="admin-newroster-select"
            >
              <option value="">Select month</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="admin-newroster-select"
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
          <label className="admin-newroster-label">Roster Name (Auto-Generated)</label>
          <div className="admin-newroster-readonly-input">
            {autoTitle}
          </div>
        </div>

        {/* Buttons */}
        <div className="admin-newroster-button-group">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="admin-newroster-btn admin-newroster-btn-cancel"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="admin-newroster-btn admin-newroster-btn-confirm"
          >
            {isSubmitting ? 'Creating...' : 'Confirm'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default AdminNewRoster;