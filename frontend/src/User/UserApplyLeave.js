import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';
import './UserApplyLeave.css';
// 1. Import the centralized helper
import { fetchFromApi } from '../services/api';

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const adjustedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return adjustedDate.toLocaleDateString('en-GB', options).replace(/ /g, ' ');
};

const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\b\w/g, char => char.toUpperCase());
};

// --- Success Summary Component ---
const SuccessSummary = ({ data, onGoHome }) => {
  const hasDocument = data.fileName && data.fileName !== 'No file selected';

  return (
    <div className="user-userapplyleave-summary-container">
      <h2 className="user-userapplyleave-summary-title">Leave Submitted Successfully!</h2>
      <p className="user-userapplyleave-summary-subtitle">
        Summary of your application. You may now return to the home page.
      </p>

      {/* Summary Details Box */}
      <div className="user-userapplyleave-summary-box">
        {/* Left side: User details */}
        <div className="user-userapplyleave-summary-user-details">
          <div className="user-userapplyleave-summary-fullname">{data.fullName}</div>
          <div>{data.email}</div>
          <div>Ward: {data.ward}</div>
        </div>

        {/* Right side: Leave details */}
        <div className="user-userapplyleave-summary-leave-details">
          <div className="user-userapplyleave-summary-leavetype">{data.leaveTypeName}</div>
          <div>{formatDate(data.startDate)} - {formatDate(data.endDate)}</div>
          <div className={`user-userapplyleave-summary-document-text ${hasDocument ? 'user-userapplyleave-doc-present' : 'user-userapplyleave-doc-missing'}`}>
            {hasDocument ? `Document: ${data.fileName}` : 'No Document Uploaded'}
          </div>
        </div>
      </div>

      {/* Go Home Button */}
      <button type="button" onClick={onGoHome} className="user-userapplyleave-primary-button">
        Go Home
      </button>
    </div>
  );
};

// --- Main Component ---
function UserApplyLeave({
  loggedInUser,
  onBack,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  onLogout,
}) {

  // --- STATE MANAGEMENT ---
  const today = new Date().toISOString().split('T')[0];

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
        // 2. UPDATED FETCH (GET)
        // fetchFromApi returns the parsed JSON data directly
        const data = await fetchFromApi('/leave_type');
        setLeaveTypes(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchLeaveTypes();
  }, []);

  // --- EVENT HANDLERS ---
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
  
  const handleWardChange = (e) => {
    setWard(capitalizeWords(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // --- Validation ---
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

    // --- Form Submission ---
    setLoading(true);
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
      // 3. UPDATED FETCH (POST with FormData)
      const result = await fetchFromApi('/leave_has_users', {
        method: 'POST',
        body: formData,
      });

      // Note: api.js throws automatically on !response.ok, 
      // so we just check logical success here if your API returns { success: true }
      if (result.success === false) {
        throw new Error(result.message || 'Failed to submit leave request.');
      }

      const leaveTypeName = leaveTypes.find(
        (type) => type.leave_id === parseInt(leaveTypeId, 10)
      )?.leave_type || 'Leave';

      // Set data for summary and switch view
      setSubmittedData({
        fullName, email, ward, leaveTypeName, startDate, endDate, fileName,
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

  // --- RENDER ---
  return (
    <div className="user-userapplyleave-page">
      <UserNavbar
        active="leave"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
        onLogout={onLogout}
      />

      <main className="user-userapplyleave-main-content">
        <header className="user-userapplyleave-header">
          <h1 className="user-userapplyleave-title">
            {isSubmitted ? 'Submission Successful' : 'Apply Leave'}
          </h1>
          <div style={{ width: 120 }} />
        </header>

        {isSubmitted ? (
          <SuccessSummary data={submittedData} onGoHome={onGoHome} />
        ) : (
          <div className="user-userapplyleave-form-container">
            <form onSubmit={handleSubmit} className="user-userapplyleave-form">
              {error && <div className="user-userapplyleave-error-message">{error}</div>}
              
              <div className="user-userapplyleave-form-grid">
                {/* Left column */}
                <div className="user-userapplyleave-form-column">
                  <div className="user-userapplyleave-field-group">
                    <label className="user-userapplyleave-label">Full name<span className="user-userapplyleave-required"> *</span></label>
                    <input type="text" value={fullName} readOnly className="user-userapplyleave-input user-userapplyleave-input-disabled" />
                  </div>
                  <div className="user-userapplyleave-field-group">
                    <label className="user-userapplyleave-label">Email<span className="user-userapplyleave-required"> *</span></label>
                    <input type="email" value={email} readOnly className="user-userapplyleave-input user-userapplyleave-input-disabled" />
                  </div>
                  <div className="user-userapplyleave-field-group">
                    <label className="user-userapplyleave-label">Ward (Remarks, if any)<span className="user-userapplyleave-required"> *</span></label>
                    <input type="text" value={ward} onChange={handleWardChange} placeholder="Enter Ward / Remarks" required className="user-userapplyleave-input" />
                  </div>
                </div>

                {/* Right column */}
                <div className="user-userapplyleave-form-column">
                  <div className="user-userapplyleave-field-group">
                    <label className="user-userapplyleave-label">Leave Type<span className="user-userapplyleave-required"> *</span></label>
                    <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} required className="user-userapplyleave-input">
                      <option value="" disabled>-- Select a Leave Type --</option>
                      {leaveTypes.map((type) => (
                        <option key={type.leave_id} value={type.leave_id}>{type.leave_type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="user-userapplyleave-field-group">
                    <label className="user-userapplyleave-label">Start Date<span className="user-userapplyleave-required"> *</span></label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required min={today} className="user-userapplyleave-input" />
                  </div>
                  <div className="user-userapplyleave-field-group">
                    <label className="user-userapplyleave-label">End Date<span className="user-userapplyleave-required"> *</span></label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate || today} className="user-userapplyleave-input" />
                  </div>
                </div>
              </div>

              {/* Upload File */}
              <div className="user-userapplyleave-field-group">
                <div className="user-userapplyleave-label">Upload Document (Optional)</div>
                <label className="user-userapplyleave-upload-box">
                  <div className="user-userapplyleave-upload-icon-placeholder" />
                  <div className="user-userapplyleave-upload-text">Click to upload PDF, PNG, or JPG</div>
                  <div className={`user-userapplyleave-upload-file-name ${fileName === 'No file selected' ? 'user-userapplyleave-file-none' : 'user-userapplyleave-file-selected'}`}>
                    {fileName}
                  </div>
                  <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="user-userapplyleave-button-container">
                <button type="submit" disabled={loading} className={`user-userapplyleave-primary-button ${loading ? 'user-userapplyleave-button-disabled' : ''}`}>
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
                <button type="button" onClick={handleCancel} className="user-userapplyleave-secondary-button">
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