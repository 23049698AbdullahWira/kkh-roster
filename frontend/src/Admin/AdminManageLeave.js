import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';

const ITEMS_PER_PAGE = 8;

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { day: 'numeric', month: 'short' };
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
  const [isEditing, setIsEditing] = useState(false); 
  const [selectedRequests, setSelectedRequests] = useState([]);

  const loggedInUser = JSON.parse(localStorage.getItem('user'));
  const currentUserId = loggedInUser ? loggedInUser.userId : null;

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

  const handleSelectRequest = (id) => {
    setSelectedRequests(prev =>
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    );
  };

  const handleToggleEditMode = () => {
    setIsEditing(prev => !prev);
    setSelectedRequests([]);
  };

  const handleBulkAction = async (status) => {
    if (selectedRequests.length === 0) return;

    if (!currentUserId) {
      console.error("Cannot perform action: Logged-in user ID not found.");
      return;
    }

    try {
      const promises = selectedRequests.map(id =>
        fetch(`http://localhost:5000/leave_has_users/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, approverId: currentUserId }),
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to update status for ID ${id}`);
          return res.json();
        })
      );

      await Promise.all(promises);

      setAllLeaveRequests(prev =>
        prev.map(req =>
          selectedRequests.includes(req.leave_data_id) ? { ...req, status } : req
        )
      );
      setSelectedRequests([]);
      setIsEditing(false);
    } catch (err) {
      console.error(`Error performing bulk action:`, err);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(allLeaveRequests.length / ITEMS_PER_PAGE);
  const currentItems = allLeaveRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const isBulkActionDisabled = selectedRequests.length === 0 || !isEditing;

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
          <div style={styles.actionButtonsContainer}> {/* Container for action buttons */}
            <ActionButton
              title="Approve Selected"
              text="Approve"
              onClick={() => handleBulkAction('Approved')}
              disabled={isBulkActionDisabled}
              isGreyscaled={isBulkActionDisabled}
              icon={<CheckIcon />}
              color="green"
            />
            <ActionButton
              title="Reject Selected"
              text="Reject"
              onClick={() => handleBulkAction('Rejected')}
              disabled={isBulkActionDisabled}
              isGreyscaled={isBulkActionDisabled}
              icon={<CrossIcon />}
              color="red"
            />
            <ActionButton
              title={isEditing ? "Exit Edit Mode" : "Edit"}
              text={isEditing ? "Exit Edit" : "Edit"}
              onClick={handleToggleEditMode}
              icon={<EditIcon color="#333" />}
              color="grey"
            />
          </div>
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
            {isEditing && <div style={{ width: 60, textAlign: 'center' }}>Select</div>} {/* Header for checkbox column */}
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
            const isRowSelected = selectedRequests.includes(row.leave_data_id);

            return (
              <div key={row.leave_data_id} style={{ ...styles.tableRow, ...(isRowSelected && styles.selectedRow) }}>
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
                </div>
                {isEditing && (
                  <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}> {/* Adjusted width */}
                    <input
                      type="checkbox"
                      checked={isRowSelected}
                      onChange={() => handleSelectRequest(row.leave_data_id)}
                    />
                  </div>
                )}
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
const ActionButton = ({ onClick, disabled, isGreyscaled, icon, color, title, text }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    style={{ 
      ...styles.actionButton.base, 
      ...(styles.actionButton[color] || styles.actionButton.default),
      ...(isGreyscaled && styles.actionButton.greyscale),
      ...(disabled && styles.actionButton.disabled),
      padding: text ? '8px 12px' : '0',
      width: text ? 'auto' : 32,
      gap: text ? 6 : 0,
    }}
  >
    {icon}
    {text && <span style={styles.actionButton.text}>{text}</span>} {/* Conditionally render text */}
  </button>
);

const FileIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);
const CheckIcon = () => <div style={{ width: 12, height: 8, borderLeft: '3px solid #00AE06', borderBottom: '3px solid #00AE06', transform: 'rotate(-45deg)', flexShrink: 0 }} />; // Added flexShrink
const CrossIcon = () => (
  <div style={{ width: 12, height: 12, position: 'relative', flexShrink: 0 }}>
    <span style={styles.crossIcon.line1} />
    <span style={styles.crossIcon.line2} />
  </div>
);

const EditIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
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
    // CHANGE THIS: 'space-between' pushes the first item (Back) to the left 
    // and the last item (Actions) to the right.
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative', 
    height: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    margin: 0,
    textAlign: 'center',
    // Change 3: absolutely center the title
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    // Change 4: Prevent title from overlapping buttons on small screens
    whiteSpace: 'nowrap', 
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
  actionButtonsContainer: {
    display: 'flex',
    gap: 8,
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
    transition: 'background-color 0.2s',
  },
  selectedRow: {
    backgroundColor: '#e6f7ff',
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
      display: 'inline-flex', 
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      transition: 'filter 0.2s, opacity 0.2s',
      minWidth: 32,
      height: 32,
    },
    default: { background: '#E0E0E0' },
    green: { background: 'rgba(0, 174, 6, 0.15)' },
    red: { background: 'rgba(255, 37, 37, 0.15)' },
    blue: { background: 'rgba(0, 110, 255, 0.15)' },
    grey: { background: '#F0F0F0' },
    greyscale: {
      filter: 'grayscale(100%)',
      opacity: 0.6,
    },
    disabled: { 
      cursor: 'not-allowed',
      opacity: 0.6,
    },
    text: {
      fontSize: 14,
      fontWeight: 600,
    }
  },
  crossIcon: {
    line1: { position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: '#FF2525', transform: 'rotate(45deg)' },
    line2: { position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, background: '#FF2525', transform: 'rotate(-45deg)' },
  }
};

export default AdminManageLeave;