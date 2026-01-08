import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

// --- Constants ---
const ITEMS_PER_PAGE = 8;

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { day: 'numeric', month: 'short' };
  // Correctly formats the date in a consistent way
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    .toLocaleDateString('en-GB', options)
    .replace(/ /g, ' ');
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'Approved':
      return { color: '#199325', backgroundColor: 'rgba(25, 147, 37, 0.1)' };
    case 'Rejected':
      return { color: '#B91C1C', backgroundColor: 'rgba(185, 28, 28, 0.1)' };
    default:
      return { color: '#B8B817', backgroundColor: 'rgba(184, 184, 23, 0.1)' };
  }
};

// --- Main Component ---
function AdminManageLeave({ onBack, onGoHome, onGoRoster, onGoStaff, onGoShift, onLogout, }) {
  const [allLeaveRequests, setAllLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLeaveData = async () => {
      setLoading(true);
      try {
        const [leavesRes, usersRes, leaveTypesRes] = await Promise.all([
          fetch('http://localhost:5000/leave_has_users'),
          fetch('http://localhost:5000/users'),
          fetch('http://localhost:5000/leave_type'),
        ]);

        if (!leavesRes.ok || !usersRes.ok || !leaveTypesRes.ok) {
          throw new Error('Failed to fetch all required data.');
        }

        const leavesData = await leavesRes.json();
        const usersData = await usersRes.json();
        const leaveTypesData = await leaveTypesRes.json();

        const formattedData = leavesData.map(leave => {
          const user = usersData.find(u => u.user_id === leave.user_id);
          const leaveType = leaveTypesData.find(lt => lt.leave_id === leave.leave_id);
          const year = leave.leave_start ? new Date(leave.leave_start).getUTCFullYear() : '';

          return {
            ...leave,
            fullName: user?.full_name || 'Unknown User',
            email: user?.email || 'N/A',
            remarks: leave.remarks || 'N/A',
            type: leaveType?.leave_type || 'Unknown Type',
            period: `${formatDate(leave.leave_start)} – ${formatDate(leave.leave_end)} ${year}`,
            status: leave.status || 'Pending',
          };
        });

        setAllLeaveRequests(formattedData.reverse());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      const response = await fetch(`http://localhost:5000/leave_has_users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update leave status.');

      setAllLeaveRequests(prev =>
        prev.map(req => (req.leave_data_id === id ? { ...req, status } : req))
      );
    } catch (err) {
      console.error(`Error updating leave status:`, err);
    }
  };

  const handleDownload = async (fileUrl) => {
    try {
      const fullUrl = `http://localhost:5000${fileUrl}`;
      const fileName = fileUrl.split('/').pop();
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error('Network response was not ok.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(allLeaveRequests.length / ITEMS_PER_PAGE);
  const currentItems = allLeaveRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // --- Render ---
  return (
    <div style={styles.page}>
      <Navbar active="staff" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout}/>
      
      <main style={styles.mainContent}>
        <header style={styles.header}>
          <button type="button" onClick={onBack} style={styles.backButton}>
            <span style={styles.backArrow} />
            Back
          </button>
          <h1 style={styles.title}>Manage Leave</h1>
          <div style={{ width: 120 }} /> {/* Spacer */}
        </header>

        <div style={styles.tableContainer}>
          {/* Table Header */}
          <div style={styles.tableHeader}>
            <div style={{ flex: 1.5 }}>Full Name</div>
            <div style={{ flex: 1.8 }}>Email</div>
            <div style={{ flex: 1.5 }}>Remarks</div>
            <div style={{ flex: 1.2 }}>Leave Type</div>
            <div style={{ flex: 1.5 }}>Leave Period</div>
            <div style={{ flex: 1 }}>Status</div>
            <div style={{ flex: 1 }}>Actions</div>
          </div>

          {/* Table Body */}
          {loading && <div style={styles.message}>Loading...</div>}
          {error && <div style={{...styles.message, color: '#B91C1C' }}>Error: {error}</div>}
          {!loading && !error && currentItems.length === 0 && (
            <div style={styles.message}>No leave requests found.</div>
          )}
          
          {!loading && !error && currentItems.map((row) => {
            const hasDocument = !!row.leave_url;
            const statusStyle = getStatusStyle(row.status);

            return (
              <div key={row.leave_data_id} style={styles.tableRow}>
                <div style={{ flex: 1.5 }}>{row.fullName}</div>
                <div style={{ flex: 1.8, wordBreak: 'break-all' }}>{row.email}</div>
                <div style={{ flex: 1.5 }}>{row.remarks}</div>
                <div style={{ flex: 1.2 }}>{row.type}</div>
                <div style={{ flex: 1.5 }}>{row.period}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ ...styles.statusBadge, ...statusStyle }}>
                    {row.status}
                  </span>
                </div>
                <div style={{ ...styles.actions, flex: 1 }}>
                  <ActionButton
                    title={hasDocument ? "Download Document" : "No Document Uploaded"}
                    onClick={() => hasDocument && handleDownload(row.leave_url)}
                    disabled={!hasDocument}
                    icon={<FileIcon color={hasDocument ? "#006EFF" : "#B0B0B0"} />}
                    color={hasDocument ? 'blue' : 'grey'}
                  />
                  <ActionButton
                    title="Approve"
                    onClick={() => handleUpdateStatus(row.leave_data_id, 'Approved')}
                    isGreyscaled={row.status !== 'Pending'}
                    icon={<CheckIcon />}
                    color="green"
                  />
                  <ActionButton
                    title="Reject"
                    onClick={() => handleUpdateStatus(row.leave_data_id, 'Rejected')}
                    isGreyscaled={row.status !== 'Pending'}
                    icon={<CrossIcon />}
                    color="red"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {allLeaveRequests.length > ITEMS_PER_PAGE && (
          <div style={styles.pagination.container}>
            <span style={styles.pagination.text}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{ ...styles.pagination.button, ...(currentPage === 1 && styles.pagination.disabled) }}
              >
                &lt;
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ ...styles.pagination.button, ...(currentPage === totalPages && styles.pagination.disabled) }}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Sub-components for Icons and Buttons ---
const ActionButton = ({ onClick, disabled, isGreyscaled, icon, color, title }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{ 
      ...styles.actionButton.base, 
      ...styles.actionButton[color], 
      ...(isGreyscaled && styles.actionButton.greyscale),
      ...(disabled && styles.actionButton.disabled) 
    }}
  >
    {icon}
  </button>
);

const FileIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);
const CheckIcon = () => <div style={{ width: 12, height: 8, borderLeft: '3px solid #00AE06', borderBottom: '3px solid #00AE06', transform: 'rotate(-45deg)' }} />;
const CrossIcon = () => (
  <div style={{ width: 12, height: 12, position: 'relative' }}>
    <span style={styles.crossIcon.line1} />
    <span style={styles.crossIcon.line2} />
  </div>
);

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
    flex: 1,
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
  tableContainer: {
    width: '100%',
    background: 'white',
    borderRadius: 12,
    border: '1px solid #E6E6E6',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    height: 56,
    padding: '0 24px',
    fontSize: 15,
    fontWeight: 600,
    color: '#555',
    borderBottom: '1px solid #E6E6E6',
    background: 'white',
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    fontSize: 14,
    borderTop: '1px solid #E6E6E6',
  },
  statusBadge: {
    padding: '5px 10px',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 13,
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  message: {
    padding: '40px',
    textAlign: 'center',
    color: '#555',
    fontSize: 16,
  },
  pagination: {
    container: {
      width: '100%',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 24,
    },
    text: {
      fontSize: 14,
      fontWeight: 600,
      color: '#333',
      marginRight: 16,
    },
    button: {
      width: 36,
      height: 36,
      borderRadius: 8,
      border: '1px solid #CCC',
      cursor: 'pointer',
      background: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 20,
      transition: 'background-color 0.2s',
    },
    disabled: {
      cursor: 'not-allowed',
      background: '#F0F0F0',
      color: '#AAA',
    }
  },
  actionButton: {
    base: {
      width: 32,
      height: 32,
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'filter 0.2s, opacity 0.2s',
    },
    green: { background: 'rgba(0, 174, 6, 0.15)' },
    red: { background: 'rgba(255, 37, 37, 0.15)' },
    blue: { background: 'rgba(0, 110, 255, 0.15)' },
    grey: { background: '#F0F0F0' },
    greyscale: {
      filter: 'grayscale(100%)',
    },
    disabled: { 
      cursor: 'not-allowed',
      opacity: 0.6,
    },
  },
  crossIcon: {
    line1: { position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: '#FF2525', transform: 'rotate(45deg)' },
    line2: { position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: '#FF2525', transform: 'rotate(-45deg)' },
  }
};

export default AdminManageLeave;