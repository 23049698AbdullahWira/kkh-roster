import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';
import './AdminManageLeave.css'; 
// 1. Import centralized helper AND base URL
import { fetchFromApi, API_BASE_URL } from '../services/api';

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

const getStatusClass = (status) => {
  switch (status) {
    case 'Approved': return 'admin-manageleave-status-approved';
    case 'Rejected': return 'admin-manageleave-status-rejected';
    default: return 'admin-manageleave-status-pending';
  }
};

// --- Main Component ---
function AdminManageLeave({ onBack, onGoHome, onGoRoster, onGoStaff, onGoShift, onLogout }) {
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
        // 2. UPDATED: Using fetchFromApi
        const [leavesData, usersData, leaveTypesData] = await Promise.all([
          fetchFromApi('/leave_has_users'),
          fetchFromApi('/users'),
          fetchFromApi('/leave_type'),
        ]);

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
      // 3. UPDATED: Using imported API_BASE_URL constant
      // Note: We use raw fetch here because we need a Blob, not JSON.
      const fullUrl = `${API_BASE_URL}${fileUrl}`;
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
        // 4. UPDATED: Using fetchFromApi (PATCH)
        fetchFromApi(`/leave_has_users/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, approverId: currentUserId }),
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

  // --- PAGINATION LOGIC (UPDATED) ---
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = allLeaveRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(allLeaveRequests.length / ITEMS_PER_PAGE);
  
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };

  const isBulkActionDisabled = selectedRequests.length === 0 || !isEditing;

  // --- Render ---
  return (
    <div className="admin-manageleave-container">
      <Navbar active="staff" onGoHome={onGoHome} onGoRoster={onGoRoster} onGoStaff={onGoStaff} onGoShift={onGoShift} onLogout={onLogout}/>
      
      <main className="admin-manageleave-content">
        <header className="admin-manageleave-header">
          <button type="button" onClick={onBack} className="admin-manageleave-back-btn">
            <span style={{ fontSize: 18, marginRight: 2, verticalAlign: 'middle' }}>←</span>
            Back
          </button>
          <h1 className="admin-manageleave-title">Manage Leave</h1>
          <div className="admin-manageleave-header-actions">
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

        <div className="admin-manageleave-table-card">
          {/* Table Header */}
          <div className="admin-manageleave-table-header">
            <div className="admin-manageleave-col-name">Full Name</div>
            <div className="admin-manageleave-col-email">Email</div>
            <div className="admin-manageleave-col-remarks">Remarks</div>
            <div className="admin-manageleave-col-type">Leave Type</div>
            <div className="admin-manageleave-col-period">Leave Period</div>
            <div className="admin-manageleave-col-status">Status</div>
            {/* <div className="admin-manageleave-col-actions">Actions</div> */}
            {isEditing && <div className="admin-manageleave-col-select">Select</div>}
          </div>

          {/* Table Body */}
          {loading && <div className="admin-manageleave-state-message">Loading...</div>}
          {error && <div className="admin-manageleave-state-message admin-manageleave-text-error">Error: {error}</div>}
          {!loading && !error && currentItems.length === 0 && (
            <div className="admin-manageleave-state-message">No leave requests found.</div>
          )}
          
          {!loading && !error && currentItems.map((row) => {
            const hasDocument = !!row.leave_url;
            const statusClass = getStatusClass(row.status);
            const isRowSelected = selectedRequests.includes(row.leave_data_id);

            return (
              <div key={row.leave_data_id} className={`admin-manageleave-table-row ${isRowSelected ? 'selected' : ''}`}>
                <div className="admin-manageleave-col-name">{row.fullName}</div>
                <div className="admin-manageleave-col-email">{row.email}</div>
                <div className="admin-manageleave-col-remarks">{row.remarks}</div>
                <div className="admin-manageleave-col-type">{row.type}</div>
                <div className="admin-manageleave-col-period">{row.period}</div>
                <div className="admin-manageleave-col-status">
                  <span className={`admin-manageleave-status-badge ${statusClass}`}>
                    {row.status}
                  </span>
                </div>
                {/* <div className="admin-manageleave-col-actions">
                  <ActionButton
                    title={hasDocument ? "Download Document" : "No Document Uploaded"}
                    onClick={() => hasDocument && handleDownload(row.leave_url)}
                    disabled={!hasDocument}
                    icon={<FileIcon color={hasDocument ? "#006EFF" : "#B0B0B0"} />}
                    color={hasDocument ? 'blue' : 'grey'}
                  />
                </div> */}
                {isEditing && (
                  <div className="admin-manageleave-col-select">
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

          {/* Pagination */}
          {allLeaveRequests.length > ITEMS_PER_PAGE && (
            <div className="admin-manageleave-pagination-container">
              <div className="admin-manageleave-pagination-controls">
                <button 
                  onClick={() => setCurrentPage(1)} 
                  disabled={currentPage === 1} 
                  className="admin-manageleave-pagination-btn"
                >
                  «
                </button>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1} 
                  className="admin-manageleave-pagination-btn"
                >
                  ‹
                </button>
                
                <span className="admin-manageleave-pagination-text">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, allLeaveRequests.length)} of {allLeaveRequests.length}
                </span>
                
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages} 
                  className="admin-manageleave-pagination-btn"
                >
                  ›
                </button>
                <button 
                  onClick={() => setCurrentPage(totalPages)} 
                  disabled={currentPage === totalPages} 
                  className="admin-manageleave-pagination-btn"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- Sub-components for Icons and Buttons ---
const ActionButton = ({ onClick, disabled, isGreyscaled, icon, color, title, text }) => {
  let className = `admin-manageleave-action-btn btn-${color}`;
  if (text) className += ' has-text';
  if (isGreyscaled) className += ' greyscale';

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {icon}
      {text && <span className="admin-manageleave-btn-text">{text}</span>}
    </button>
  );
};

const FileIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const CheckIcon = () => <div className="admin-manageleave-check-icon" />;
const CrossIcon = () => (
  <div className="admin-manageleave-cross-icon">
    <span className="cross-line rotate-45" />
    <span className="cross-line rotate-neg-45" />
  </div>
);

const EditIcon = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

export default AdminManageLeave;