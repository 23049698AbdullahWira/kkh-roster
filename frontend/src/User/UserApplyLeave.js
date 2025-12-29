import React, { useState, useEffect } from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Adjust for timezone differences by treating the date as UTC
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
    <div style={styles.summaryContainer}>
      <h2 style={styles.summaryTitle}>Leave Submitted Successfully!</h2>
      <p style={styles.summarySubtitle}>
        Summary of your application. You may now return to the home page.
      </p>

      {/* Summary Details Box */}
      <div style={styles.summaryBox}>
        {/* Left side: User details */}
        <div style={styles.summaryUserDetails}>
          <div style={styles.summaryFullName}>{data.fullName}</div>
          <div>{data.email}</div>
          <div>Ward: {data.ward}</div>
        </div>

        {/* Right side: Leave details */}
        <div style={styles.summaryLeaveDetails}>
          <div style={styles.summaryLeaveType}>{data.leaveTypeName}</div>
          <div>{formatDate(data.startDate)} - {formatDate(data.endDate)}</div>
          <div style={{
            ...styles.summaryDocumentText,
            color: hasDocument ? '#006EFF' : '#888',
          }}>
            {hasDocument ? `Document: ${data.fileName}` : 'No Document Uploaded'}
          </div>
        </div>
      </div>

      {/* Go Home Button */}
      <button type="button" onClick={onGoHome} style={styles.primaryButton}>
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
    <div style={styles.page}>
      <UserNavbar
        active="leave"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
      />

      <main style={styles.mainContent}>
        <header style={styles.header}>
          <button
            type="button"
            onClick={onBack}
            style={{ ...styles.backButton, visibility: isSubmitted ? 'hidden' : 'visible' }}
          >
            <span style={styles.backArrow} />
            Back
          </button>
          <h1 style={styles.title}>
            {isSubmitted ? 'Submission Successful' : 'Apply Leave'}
          </h1>
          <div style={{ width: 120 }} /> {/* Spacer */}
        </header>

        {isSubmitted ? (
          <SuccessSummary data={submittedData} onGoHome={onGoHome} />
        ) : (
          <div style={styles.formContainer}>
            <form onSubmit={handleSubmit} style={styles.form}>
              {error && <div style={styles.errorMessage}>{error}</div>}
              
              <div style={styles.formGrid}>
                {/* Left column */}
                <div style={styles.formColumn}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Full name<span style={styles.required}> *</span></label>
                    <input type="text" value={fullName} readOnly style={{ ...styles.input, ...styles.inputDisabled }} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Email<span style={styles.required}> *</span></label>
                    <input type="email" value={email} readOnly style={{ ...styles.input, ...styles.inputDisabled }} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Ward (Remarks, if any)<span style={styles.required}> *</span></label>
                    <input type="text" value={ward} onChange={handleWardChange} placeholder="Enter Ward / Remarks" required style={styles.input} />
                  </div>
                </div>

                {/* Right column */}
                <div style={styles.formColumn}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Leave Type<span style={styles.required}> *</span></label>
                    <select value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} required style={styles.input}>
                      <option value="" disabled>-- Select a Leave Type --</option>
                      {leaveTypes.map((type) => (
                        <option key={type.leave_id} value={type.leave_id}>{type.leave_type}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Start Date<span style={styles.required}> *</span></label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required min={today} style={styles.input} />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>End Date<span style={styles.required}> *</span></label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate || today} style={styles.input} />
                  </div>
                </div>
              </div>

              {/* Upload File */}
              <div style={styles.fieldGroup}>
                <div style={styles.label}>Upload Document (Optional)</div>
                <label style={styles.uploadBox}>
                  <div style={styles.uploadIconPlaceholder} />
                  <div style={styles.uploadText}>Click to upload PDF, PNG, or JPG</div>
                  <div style={{ ...styles.uploadFileName, color: fileName === 'No file selected' ? '#888' : '#006EFF' }}>
                    {fileName}
                  </div>
                  <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
                </label>
              </div>

              {/* Action Buttons */}
              <div style={styles.buttonContainer}>
                <button type="submit" disabled={loading} style={{...styles.primaryButton, ...(loading && styles.buttonDisabled)}}>
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
                <button type="button" onClick={handleCancel} style={styles.secondaryButton}>
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

// --- Styles ---
const styles = {
  page: {
    width: '100%',
    minHeight: '100vh',
    background: '#F8F9FA',
    fontFamily: "'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  mainContent: {
    maxWidth: 1400,
    width: '100%',
    margin: '24px auto 40px',
    padding: '0 32px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    textAlign: 'center',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px',
    background: 'white',
    borderRadius: 68,
    border: '1px solid #DDDDDD',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 600,
  },
  backArrow: {
    display: 'inline-block',
    width: 12,
    height: 12,
    borderLeft: '2px solid black',
    borderBottom: '2px solid black',
    transform: 'rotate(45deg)',
    marginRight: 2,
  },
  formContainer: {
    width: '100%',
    maxWidth: 954,
    background: 'white',
    borderRadius: 12,
    border: '1px solid #E6E6E6',
    padding: '40px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  errorMessage: {
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 500,
  },
  formGrid: {
    display: 'flex',
    gap: 34,
    alignItems: 'flex-start',
  },
  formColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 500,
  },
  required: {
    color: '#B91C1C',
  },
  input: {
    padding: 12,
    background: 'white',
    borderRadius: 6,
    border: '1px solid #D4D4D4',
    fontSize: 16,
    fontWeight: 500,
    color: '#000',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputDisabled: {
    background: '#F3F4F6',
    color: '#6B7280',
    cursor: 'not-allowed',
  },
  uploadBox: {
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
  },
  uploadIconPlaceholder: {
    width: 44,
    height: 44,
    background: '#E9E9E9',
    borderRadius: 8,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: 500,
    color: '#8C8C8C',
  },
  uploadFileName: {
    fontSize: 12,
    fontWeight: 500,
  },
  buttonContainer: {
    marginTop: 10,
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
  },
  primaryButton: {
    width: 165,
    padding: '12px 0',
    background: '#5091CD',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: 24,
    border: 'none',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.21,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    width: 165,
    padding: '12px 0',
    background: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    borderRadius: 24,
    border: '1px solid #DDDDDD',
    color: 'black',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.21,
    cursor: 'pointer',
  },
  buttonDisabled: {
    background: '#9BBEE5',
    cursor: 'default',
  },
  // --- Success Summary Styles ---
  summaryContainer: {
    width: '100%',
    maxWidth: 954,
    padding: '40px',
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    textAlign: 'center',
    border: '1px solid #E6E6E6',
  },
  summaryTitle: {
    color: '#199325',
    marginBottom: 16,
    fontSize: 24,
  },
  summarySubtitle: {
    color: '#555',
    marginBottom: 32,
  },
  summaryBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    background: '#F8F9FA',
    borderRadius: 8,
    textAlign: 'left',
    fontSize: 16,
    marginBottom: 32,
  },
  summaryUserDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  summaryLeaveDetails: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  summaryFullName: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  summaryLeaveType: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  summaryDocumentText: {
    fontSize: 14,
    fontWeight: 500,
  }
};

export default UserApplyLeave;