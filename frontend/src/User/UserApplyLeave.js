import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

function UserApplyLeave({
  currentUser,
  onBack,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
}) {
  // Backend state
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedLeaveId, setSelectedLeaveId] = useState('');

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [fileName, setFileName] = useState('No file selected');
  const [ward, setWard] = useState('');

  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch leave types on component mount
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/leave-types');
        if (!response.ok) throw new Error('Could not fetch leave types.');

        const data = await response.json();
        setLeaveTypes(data);

        if (data.length > 0) {
          setSelectedLeaveId(data[0].leave_id);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchLeaveTypes();
  }, []);

  // Submit leave application to backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!currentUser || !currentUser.userId) {
      setError('You must be logged in to apply for leave.');
      setLoading(false);
      return;
    }

    if (!selectedLeaveId || !startDate || !endDate) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          leaveId: selectedLeaveId,
          startDate,
          endDate,
          remarks,
          ward,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit leave application.');
      }

      setSuccess('Leave request submitted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => onBack && onBack();

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#EDF0F5',
        overflowX: 'hidden',
        overflowY: 'auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <UserNavbar
        active="leave"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
      />

      {/* Back + Title Row */}
      <div
        style={{
          width: '100%',
          maxWidth: 1620,
          margin: '24px auto 12px',
          padding: '0 150px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
          style={{
            padding: '10px 24px',
            background: 'white',
            boxShadow: '0 4px 4px rgba(0,0,0,0.25)',
            borderRadius: 68,
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 20 }}>←</span>
          <span style={{ color: 'black', fontSize: 20, fontWeight: 600 }}>Back</span>
        </button>

        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 900,
            marginRight: 190,
          }}
        >
          Apply Leave
        </div>
      </div>

      {/* Form Card */}
      <main
        style={{
          width: '100%',
          padding: '0 150px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: 954,
            background: '#EDF0F5',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Success / Error Messages */}
          {error && (
            <div style={{ color: 'red', textAlign: 'center', fontWeight: 600 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ color: 'green', textAlign: 'center', fontWeight: 600 }}>
              {success}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: 34,
              alignItems: 'flex-start',
            }}
          >
            {/* Left Column */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Full Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>
                  Full Name<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="text"
                  value={currentUser?.fullName || ''}
                  readOnly
                  style={{
                    padding: 12,
                    background: '#EAEAEA',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>
                  Email<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  readOnly
                  style={{
                    padding: 12,
                    background: '#EAEAEA',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                />
              </div>

              {/* Staff Ward Designation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>
                  Staff Ward Designation<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Enter your designation"
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                />
              </div>
            </div>

            {/* Right Column */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Leave Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>
                  Leave Type<span style={{ color: '#FF2525' }}> *</span>
                </label>

                <select
                  value={selectedLeaveId}
                  onChange={(e) => setSelectedLeaveId(e.target.value)}
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  {leaveTypes.map((type) => (
                    <option key={type.leave_id} value={type.leave_id}>
                      {type.leave_type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>
                  Start Date<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                />
              </div>

              {/* End Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>
                  End Date<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Upload File */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Upload File</div>
            <label
              style={{
                height: 104,
                padding: 12,
                background: 'white',
                borderRadius: 6,
                border: '1px solid #D4D4D4',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 44, height: 44, background: '#D0D0D0', borderRadius: 8 }} />
              <div style={{ fontSize: 11, color: '#8C8C8C' }}>Upload Leave Document</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{fileName}</div>

              <input
                type="file"
                style={{ display: 'none' }}
                onChange={(e) =>
                  setFileName(
                    e.target.files && e.target.files[0]
                      ? e.target.files[0].name
                      : 'No file selected'
                  )
                }
              />
            </label>
          </div>

          {/* Buttons */}
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              justifyContent: 'center',
              gap: 32,
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 40px',
                background: loading ? '#9BBEE5' : '#5091CD',
                borderRadius: 8,
                border: 'none',
                color: 'white',
                fontSize: 18,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '12px 40px',
                background: '#BFBFBF',
                borderRadius: 8,
                border: 'none',
                color: 'white',
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default UserApplyLeave;
