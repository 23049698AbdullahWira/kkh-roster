// src/UserApplyLeave.js
import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

// This component expects a `currentUser` prop with user details like { userId, fullName, email, ward }
function UserApplyLeave({
  onBack,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  currentUser, 
}) {

  // User details are pre-filled from props and are not editable in this form
  const [fullName] = useState(currentUser ? currentUser.fullName : 'Loading...');
  const [email] = useState(currentUser ? currentUser.email : 'Loading...');
  const [ward] = useState(currentUser ? currentUser.ward : 'Loading...');

  // State for form inputs
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedLeaveId, setSelectedLeaveId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveDocument, setLeaveDocument] = useState(null);
  const [fileName, setFileName] = useState('No file selected');

  // State for handling submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' or 'error'
  const [submitMessage, setSubmitMessage] = useState('');


  // Fetch available leave types from the backend when the component mounts
  useEffect(() => {
    // --- CHANGE 1: The fetch URL now points to the corrected `/leave_types` endpoint.
    fetch('http://localhost:5000/leave_types')
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        setLeaveTypes(data);
        if (data.length > 0) {
          setSelectedLeaveId(data[0].leave_id); 
        }
      })
      .catch(error => {
        console.error("Error fetching leave types:", error);
        setSubmitStatus('error');
        setSubmitMessage('Failed to load leave types. Please try again later.');
      });
  }, []); // Empty array ensures this runs only once


  // Handler for file input changes
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLeaveDocument(file);
      setFileName(file.name);
    } else {
      setLeaveDocument(null);
      setFileName('No file selected');
    }
  };

  // Handler for form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!startDate || !endDate || !selectedLeaveId || !currentUser) {
      setSubmitStatus('error');
      setSubmitMessage('Please fill in all required fields and ensure user is logged in.');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMessage('');

    // FormData is required to send files along with text fields
    const formData = new FormData();
    formData.append('user_id', currentUser.userId); 
    formData.append('leave_id', selectedLeaveId);
    formData.append('leave_start_date', startDate);
    formData.append('leave_end_date', endDate);
    
    if (leaveDocument) {
      // The key 'leave_document' must match the backend: upload.single('leave_document')
      formData.append('leave_document', leaveDocument); 
    }

    // POST the form data to the backend
    fetch('http://localhost:5000/leaves/apply', {
      method: 'POST',
      body: formData, // Browser automatically sets Content-Type to multipart/form-data
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        throw new Error(data.message || 'Submission failed');
      }
      setSubmitStatus('success');
      setSubmitMessage(data.message || 'Leave request submitted successfully!');
      // You could optionally call onBack() here after a short delay
      // setTimeout(() => onBack(), 2000);
    })
    .catch(error => {
      console.error("Error submitting leave request:", error);
      setSubmitStatus('error');
      setSubmitMessage(error.message || 'An unexpected error occurred. Please try again.');
    })
    .finally(() => {
      setIsSubmitting(false);
    });
  };

  const handleCancel = () => {
    onBack && onBack();
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#EDF0F5', fontFamily: 'Inter, sans-serif' }}>
      <UserNavbar active="leave" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoShiftPreference={onGoShiftPreference} onGoApplyLeave={onGoApplyLeave} onGoAccount={onGoAccount} />
      
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 1620, margin: '24px auto 12px', padding: '0 150px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button type="button" onClick={handleCancel} style={{ padding: '10px 24px', background: 'white', boxShadow: '0 4px 4px rgba(0,0,0,0.25)', borderRadius: 68, border: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 20 }}>←</span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>Back</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 24, fontWeight: 900, marginRight: 190 }}>Apply Leave</div>
      </div>

      {/* Form */}
      <main style={{ padding: '0 150px 40px', display: 'flex', justifyContent: 'center' }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 954, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 34 }}>
            {/* Left Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {['Full name', 'Email', 'Staff Ward Designation'].map((label, index) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 16, fontWeight: 500 }}>{label}<span style={{ color: '#FF2525' }}> *</span></label>
                  <input type="text" value={[fullName, email, ward][index]} readOnly style={{ padding: 12, background: '#F0F0F0', borderRadius: 6, border: '1px solid #D4D4D4', color: '#555' }} />
                </div>
              ))}
            </div>

            {/* Right Column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Leave Type Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>Leave Type<span style={{ color: '#FF2525' }}> *</span></label>
                <select value={selectedLeaveId} onChange={(e) => setSelectedLeaveId(e.target.value)} required style={{ padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16 }}>
                  {leaveTypes.length === 0 && <option>Loading...</option>}
                  {leaveTypes.map(type => (
                    // --- CHANGE 2: Use `type.leave_type` to match the property name from the backend API response.
                    <option key={type.leave_id} value={type.leave_id}>{type.leave_type}</option>
                  ))}
                </select>
              </div>

              {/* Date Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>Start Date<span style={{ color: '#FF2525' }}> *</span></label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 16, fontWeight: 500 }}>End Date<span style={{ color: '#FF2525' }}> *</span></label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={{ padding: 12, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', fontSize: 16 }} />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <label style={{ fontSize: 16, fontWeight: 500 }}>Upload File</label>
            <label style={{ height: 104, background: 'white', borderRadius: 6, border: '1px solid #D4D4D4', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, background: '#D0D0D0', borderRadius: 8 }} />
              <div style={{ fontSize: 11, fontWeight: 500, color: '#8C8C8C' }}>Upload Leave Document</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{fileName}</div>
              <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          </div>

          {/* Submission Status Message */}
          {submitMessage && (
            <div style={{ marginTop: 10, padding: '12px', textAlign: 'center', borderRadius: '6px', backgroundColor: submitStatus === 'success' ? '#DCFCE7' : '#FEE2E2', color: submitStatus === 'success' ? '#199325' : '#B91C1C', fontWeight: 500 }}>
              {submitMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 32 }}>
            <button type="submit" disabled={isSubmitting} style={{ width: 165, padding: '8px 0', background: isSubmitting ? '#A9A9A9' : '#5091CD', boxShadow: '0 3px 18px rgba(0,0,0,0.25)', borderRadius: 24, border: 'none', color: 'white', fontSize: 14, fontWeight: 500, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <button type="button" onClick={handleCancel} style={{ width: 165, padding: '8px 0', background: 'white', boxShadow: '0 3px 18px rgba(0,0,0,0.25)', borderRadius: 24, border: 'none', color: 'black', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default UserApplyLeave;