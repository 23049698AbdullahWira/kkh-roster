import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

const SuccessSummary = ({ data, onGoHome }) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/ /g, ' ');
  };

  const hasDocument = data.fileName && data.fileName !== 'No file selected';

  return (
    <div style={{
      width: '100%',
      maxWidth: 954,
      padding: '40px',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      textAlign: 'center',
      border: '1px solid #e2e8f0'
    }}>
      <h2 style={{ color: '#2d8a4a', marginBottom: '16px', fontSize: '24px' }}>Leave Request Submitted Successfully!</h2>
      <p style={{ color: '#555', marginBottom: '32px' }}>
        Application summary. Return to home.
      </p>

      {/* Summary Box */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px',
        background: '#f8f9fa',
        borderRadius: '6px',
        textAlign: 'left',
        fontSize: '16px'
      }}>
        {/* Left side: User details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{data.fullName}</div>
          <div>{data.email}</div>
          <div>Ward: {data.ward}</div>
        </div>

        {/* Right side: Leave details */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{data.leaveTypeName}</div>
          <div>{formatDate(data.startDate)} - {formatDate(data.endDate)}</div>
          
          <div style={{
            marginTop: '8px',
            fontSize: '14px',
            color: hasDocument ? '#2563EB' : '#888',
            fontWeight: 500
          }}>
            {hasDocument ? `Document: ${data.fileName}` : 'No Document Uploaded'}
          </div>
        </div>
      </div>

      {/* Go Home Button */}
      <button
        type="button"
        onClick={onGoHome}
        style={{
          width: 165,
          padding: '10px 0',
          background: '#5091CD',
          boxShadow: '0 3px 18px rgba(0,0,0,0.25)',
          borderRadius: 24,
          border: 'none',
          color: 'white',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 0.21,
          cursor: 'pointer',
          marginTop: '32px'
        }}
      >
        Go Home
      </button>
    </div>
  );
};

function UserApplyLeave({
  loggedInUser,
  onBack,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
}) {
  const today = new Date().toISOString().split('T')[0];

  // --- STATE MANAGEMENT ---
  const [fullName] = useState(loggedInUser?.fullName || 'Loading...');
  const [email] = useState(loggedInUser?.email || 'Loading...');
  
  const [ward, setWard] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('No file selected');

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const response = await fetch('http://localhost:5000/leave_type');
        if (!response.ok) {
          throw new Error('Failed to fetch leave types.');
        }
        const data = await response.json();
        setLeaveTypes(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchLeaveTypes();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setError('');
      } else {
        setError('Invalid file type. Please select a PDF, PNG, or JPG file.');
        setFile(null);
        setFileName('No file selected');
      }
    }
  };
  
  // --- Capitalizes the first letter of each word ---
  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  };

  const handleWardChange = (e) => {
    setWard(capitalizeWords(e.target.value));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!ward || !leaveTypeId || !startDate || !endDate) {
      setError('Please fill in all required fields.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be before the start date.');
      return;
    }

    if (!loggedInUser || !loggedInUser.userId) {
      setError('Could not identify user. Please log in again.');
      return;
    }

    const formData = new FormData();
    formData.append('user_id', loggedInUser.userId);
    formData.append('leave_type_id', parseInt(leaveTypeId, 10));
    formData.append('start_date', startDate);
    formData.append('end_date', endDate);
    formData.append('ward_designation', ward);
    if (file) {
      formData.append('leave_document', file);
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/leave_has_users', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit leave request.');
      }

      const leaveTypeName = leaveTypes.find(
        (type) => type.leave_id === parseInt(leaveTypeId, 10)
      )?.leave_type || 'Leave';

      setSubmittedData({
        fullName,
        email,
        ward,
        leaveTypeName,
        startDate,
        endDate,
        fileName,
      });

      setIsSubmitted(true);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onBack && onBack();
  };

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

      <div
        style={{
          width: '100%',
          maxWidth: 1620,
          margin: '24px auto 12px',
          padding: '0 150px',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}
      >
        {/* Left Column: Back Button */}
        <div style={{ justifySelf: 'start' }}>
          <button
            type="button"
            onClick={() => onBack && onBack()}
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
              visibility: isSubmitted ? 'hidden' : 'visible',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>←</span>
            <span style={{ color: 'black', fontSize: 20, fontWeight: 600 }}>Back</span>
          </button>
        </div>

        {/* Center Column: Title */}
        <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 900, marginBottom: 24 }}>
          {isSubmitted ? 'Submission Successful' : 'Apply Leave'}
        </div>

        <div/>
      </div>

      <main
        style={{
          width: '100%',
          padding: '0 150px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {isSubmitted ? (
          <SuccessSummary data={submittedData} onGoHome={onGoHome} />
        ) : (
          // --- Form container card ---
          <div style={{
            width: '100%',
            maxWidth: 954,
            background: 'white',
            borderRadius: '8px',
            padding: '40px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
              
              <div style={{ display: 'flex', gap: 34, alignItems: 'flex-start' }}>
                {/* Left column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0.24 }}>
                      Full name<span style={{ color: '#FF2525' }}> *</span>
                    </label>
                    <input
                      type="text" value={fullName} readOnly
                      style={{ padding: 12, background: '#F3F4F6', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16, fontWeight: 500, color: '#6B7280' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0.24 }}>
                      Email<span style={{ color: '#FF2525' }}> *</span>
                    </label>
                    <input
                      type="email" value={email} readOnly
                      style={{ padding: 12, background: '#F3F4F6', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16, fontWeight: 500, color: '#6B7280' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0.24 }}>
                      Ward Designation<span style={{ color: '#FF2525' }}> *</span>
                    </label>
                    <input
                      type="text" value={ward} onChange={handleWardChange}
                      placeholder="Enter Ward" required
                      style={{ padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16, fontWeight: 500, color: '#000' }}
                    />
                  </div>
                </div>

                {/* Right column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0.24 }}>
                      Leave Type<span style={{ color: '#FF2525' }}> *</span>
                    </label>
                    <select
                      value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} required
                      style={{ padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16, fontWeight: 500, color: '#000' }}
                    >
                      <option value="" disabled>-- Select a Leave Type --</option>
                      {leaveTypes.map((type) => (
                        <option key={type.leave_id} value={type.leave_id}>{type.leave_type}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0.24 }}>
                      Start Date<span style={{ color: '#FF2525' }}> *</span>
                    </label>
                    <input
                      type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required min={today}
                      style={{ padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16, fontWeight: 500, color: '#000' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0.24 }}>
                      End Date<span style={{ color: '#FF2525' }}> *</span>
                    </label>
                    <input
                      type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate || today}
                      style={{ padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16, fontWeight: 500, color: '#000' }}
                    />
                  </div>
                </div>
              </div>

              {/* Upload File */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: 0.24 }}>
                  Upload Document (Optional)
                </div>
                <label style={{ height: 104, padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, background: '#E9E9E9', borderRadius: 8 }}/>
                  <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 500, color: '#8C8C8C' }}>
                    Click to upload PDF, PNG, or JPG
                  </div>
                  <div style={{ fontSize: 11, color: fileName === 'No file selected' ? '#888' : '#2563EB', fontWeight: 500 }}>
                    {fileName}
                  </div>
                  <input
                    type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg"
                  />
                </label>
              </div>

              {/* Submit / Cancel buttons */}
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 32 }}>
                <button
                  type="submit" disabled={loading}
                  style={{ width: 165, padding: '10px 0', background: loading ? '#9BBEE5' : '#5091CD', boxShadow: '0 3px 18px rgba(0,0,0,0.25)', borderRadius: 24, border: 'none', color: 'white', fontSize: 14, fontWeight: 600, letterSpacing: 0.21, cursor: loading ? 'default' : 'pointer' }}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type="button" onClick={handleCancel}
                  style={{ width: 165, padding: '10px 0', background: 'white', boxShadow: '0 3px 18px rgba(0,0,0,0.25)', borderRadius: 24, border: 'none', color: 'black', fontSize: 14, fontWeight: 600, letterSpacing: 0.21, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default UserApplyLeave;