import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../Nav/navbar';
import AdminNewRoster from './AdminNewRoster';
import './AdminRoster.css'; 

// --- 1. ICON COMPONENTS (SVG) ---
const IconView = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// --- 2. HELPER BUTTON COMPONENT ---
const ActionBtn = ({ icon, onClick, bg = '#EBF5FF', border = '#D6E4FF', color = '#2F80ED' }) => (
  <button
    className="admin-roster-action-btn"
    onClick={(e) => {
      e.stopPropagation();
      if (onClick) onClick();
    }}
    style={{
      background: bg, 
      border: `1px solid ${border}`,
      color: color, 
    }}
  >
    {icon}
  </button>
);

// --- LOGGING HELPER ---
const logAction = async ({ userId, details }) => {
  try {
    if (!userId) return;
    await fetch('http://localhost:5000/action-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, details })
    });
  } catch (err) { console.error('Failed to insert action log:', err); }
};

const statusOptions = ['All', 'Preference Open', 'Drafting', 'Published'];

function AdminRosterPage({ onGoHome, onGoRoster, onGoStaff, onGoShift, onOpenRoster, onLogout, loggedInUser }) {
  const [showNewRoster, setShowNewRoster] = useState(false);
  const [rosterRows, setRosterRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 
  
  // --- DELETE MODAL STATE ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRosterToDelete, setSelectedRosterToDelete] = useState(null);

  // --- FILTER & SORT STATE ---
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // Added for Pills

  // --- START: ADD THIS BLOCK ---
  const [gliderStyle, setGliderStyle] = useState({ left: 0, width: 0 });
  const pillsRef = useRef([]); 

  // Calculate the position of the black pill (glider) whenever filterStatus changes
  useEffect(() => {
    const activeIndex = statusOptions.indexOf(filterStatus);
    const activeElement = pillsRef.current[activeIndex];

    if (activeElement) {
      setGliderStyle({
        left: activeElement.offsetLeft,
        width: activeElement.offsetWidth
      });
    }
  }, [filterStatus]);
  

  // --- SAFE ACCESS TO USER DETAILS ---
  const adminName = loggedInUser?.full_name || loggedInUser?.fullName || 'Admin';
  const adminId = loggedInUser?.user_id || loggedInUser?.userId;

  const fetchRosters = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/rosters')
      .then((res) => res.json())
      .then((data) => {
        setRosterRows(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch rosters:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRosters(); 
  }, []);

  // --- HELPER FUNCTIONS ---
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Published':
        return { background: '#E6F6EC', color: '#037847' }; // Green
      case 'Drafting':
        return { background: '#FFF8C5', color: '#9A6B00' }; // Yellow
      case 'Preference Open':
      default:
        return { background: '#D9E8F3', color: '#194A93' }; // Blue
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // --- DERIVE UNIQUE YEARS FOR DROPDOWN ---
  const uniqueYears = React.useMemo(() => {
    const years = rosterRows.map(r => r.year).filter(y => y);
    return [...new Set(years)].sort((a, b) => b - a);
  }, [rosterRows]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // --- FILTER & SORT LOGIC ---
  const processedRosters = React.useMemo(() => {
    // 1. Filter
    let items = [...rosterRows];
    
    if (filterMonth !== 'All') {
      items = items.filter(r => r.month === filterMonth);
    }
    if (filterYear !== 'All') {
      items = items.filter(r => String(r.year) === String(filterYear));
    }
    if (filterStatus !== 'All') {
        items = items.filter(r => r.status === filterStatus);
    }

    // 2. Sort
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        // Custom Status Sort
        if (sortConfig.key === 'status') {
          const statusOrder = { 'Preference Open': 1, 'Drafting': 2, 'Published': 3 };
          const rankA = statusOrder[a.status] || 99;
          const rankB = statusOrder[b.status] || 99;
          if (rankA < rankB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (rankA > rankB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        }
        // Standard Sort
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return items;
  }, [rosterRows, sortConfig, filterMonth, filterYear, filterStatus]);

  // --- PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedRosters.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedRosters.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterYear, filterStatus]);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);

  // --- ACTION HANDLERS ---
  const handleNavigateToRoster = (row) => {
    if (onOpenRoster) onOpenRoster(row.id, row.month, row.year);
  };

  const handleDownload = async (row) => {
    try {
      const response = await fetch(`http://localhost:5000/api/rosters/${row.id}/download`);
      if (!response.ok) throw new Error("Failed to download file");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.month}_${row.year}_Roster.xlsx`; 
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
      alert("Error downloading roster. Please try again.");
    }
  };

  const handleDeleteClick = (row) => {
    setSelectedRosterToDelete(row);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedRosterToDelete) return;
    try {
      const res = await fetch(`http://localhost:5000/api/rosters/${selectedRosterToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRosterRows(prev => prev.filter(r => r.id !== selectedRosterToDelete.id));
        if (currentItems.length === 1 && currentPage > 1) setCurrentPage(prev => prev - 1);
        await logAction({ userId: adminId, details: `${adminName} deleted roster: ${selectedRosterToDelete.title}` });
        alert("Roster deleted successfully.");
      } else {
        alert("Failed to delete roster.");
      }
    } catch (err) {
      console.error("Error deleting roster:", err);
      alert("Error connecting to server.");
    } finally {
        setShowDeleteModal(false);
        setSelectedRosterToDelete(null);
    }
  };

  const handleRosterCreated = async (newRosterData) => {
    const details = newRosterData && newRosterData.title 
        ? `${adminName} created a new roster: ${newRosterData.title}`
        : `${adminName} created a new roster`;
    await logAction({ userId: adminId, details: details });
    setShowNewRoster(false);
    fetchRosters(); 
  };

  return (
    <div className="admin-roster-container">
      <Navbar
        active="roster"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoStaff={onGoStaff}
        onGoShift={onGoShift}
        onLogout={onLogout}
      />

      <main className="admin-roster-content">
        <div className="admin-roster-header">
          <h1 className="admin-roster-title">All Rosters</h1>
          <button
            type="button"
            onClick={() => setShowNewRoster(true)}
            className="admin-roster-btn-new"
          >
            New Roster
            <div className="admin-roster-icon-circle">
              <IconPlus />
            </div>
          </button>
          <AdminNewRoster
            open={showNewRoster}
            onCancel={() => setShowNewRoster(false)}
            onConfirm={handleRosterCreated} 
          />
        </div>

        {/* --- FILTER SECTION --- */}
        <div className="admin-roster-filter-card">
          
          {/* Row 1: Status Pills */}
          <div className="admin-roster-filter-pills-row">
            <div className="admin-roster-pill-group">
              
              {/* 1. The Sliding Black Background (Glider) */}
              <div 
                className="admin-roster-pill-glider"
                style={{ 
                  left: gliderStyle.left, 
                  width: gliderStyle.width 
                }} 
              />

              {/* 2. The Buttons */}
              {statusOptions.map((status, index) => (
                <button
                  key={status}
                  ref={(el) => (pillsRef.current[index] = el)} // Capture element reference
                  onClick={() => setFilterStatus(status)}
                  className={`admin-roster-pill-btn ${filterStatus === status ? 'active' : ''}`}
                >
                  {status === 'All' ? 'All Status' : status}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Dropdowns */}
          <div className="admin-roster-filter-controls-row">
            <div className="admin-roster-filter-group">
                <label className="admin-roster-filter-label">Month</label>
                <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="admin-roster-filter-select"
                >
                <option value="All">All Months</option>
                {months.map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
                </select>
            </div>

            <div className="admin-roster-filter-group">
                <label className="admin-roster-filter-label">Year</label>
                <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="admin-roster-filter-select"
                >
                <option value="All">All Years</option>
                {uniqueYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                ))}
                </select>
            </div>
          </div>
        </div>

        {/* TABLE HEADER */}
        <div className="admin-roster-table-header">
          <div>Roster Title</div>
          <div>Generated By</div>
          <div>Created On</div>
          <div>Publish Date</div>
          <div 
            onClick={() => requestSort('status')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Status
            {sortConfig.key === 'status' ? (
              <span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>
            ) : (
              <span style={{ color: '#ccc' }}>⇅</span>
            )}
          </div>
          <div>Actions</div>
        </div>

        {/* TABLE BODY */}
        <div className="admin-roster-table-body">
          {loading ? (
            <div className="admin-roster-loading">Loading rosters...</div>
          ) : processedRosters.length === 0 ? (
            <div className="admin-roster-empty">No rosters found matching filters.</div>
          ) : (
            currentItems.map((row, idx) => (
              <div
                key={row.id || idx}
                onClick={() => handleNavigateToRoster(row)}
                className="admin-roster-row"
              >
                <div>{row.title}</div>
                <div>{row.generatedBy}</div>
                <div>{formatDate(row.createdOn)}</div>
                <div>{formatDate(row.deadline)}</div>
                <div>
                  {(() => {
                    const style = getStatusStyle(row.status);
                    return (
                      <span
                        className="admin-roster-status-badge"
                        style={{
                          backgroundColor: style.background,
                          color: style.color,
                        }}
                      >
                        {row.status}
                      </span>
                    );
                  })()}
                </div>

                <div className="admin-roster-actions-cell">
                  <ActionBtn icon={<IconView />} onClick={() => handleNavigateToRoster(row)} />
                  {row.status === 'Published' ? (
                    <ActionBtn icon={<IconDownload />} onClick={() => handleDownload(row)} />
                  ) : (
                    <ActionBtn
                      icon={<IconTrash />}
                      onClick={() => handleDeleteClick(row)}
                      bg="#FEE2E2"      
                      border="#FECACA"  
                      color="#DC2626"   
                    />
                  )}
                </div>
              </div>
            ))
          )}

          {/* PAGINATION FOOTER */}
          {processedRosters.length > 0 && (
            <div className="admin-roster-pagination-container">
              <div className="admin-roster-pagination-controls">
                <button 
                  onClick={handleFirstPage} 
                  disabled={currentPage === 1} 
                  className="admin-roster-pagination-btn"
                >
                  «
                </button>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1} 
                  className="admin-roster-pagination-btn"
                >
                  ‹
                </button>
                <span className="admin-roster-pagination-text">
                  {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, processedRosters.length)} of {processedRosters.length}
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages} 
                  className="admin-roster-pagination-btn"
                >
                  ›
                </button>
                <button 
                  onClick={handleLastPage} 
                  disabled={currentPage === totalPages} 
                  className="admin-roster-pagination-btn"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="admin-roster-modal-overlay">
          <div className="admin-roster-modal-content">
            <h3 className="admin-roster-modal-title">
              Confirm Deletion
            </h3>
            <p className="admin-roster-modal-text">
              Are you sure you want to delete <br/>
              <span className="admin-roster-text-bold">"{selectedRosterToDelete?.title}"</span>?
              <br/>
              <span className="admin-roster-text-danger">
                This action cannot be undone.
              </span>
            </p>
            <div className="admin-roster-modal-actions">
              <button 
                onClick={() => setShowDeleteModal(false)} 
                className="admin-roster-modal-btn admin-roster-btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete} 
                className="admin-roster-modal-btn admin-roster-btn-delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRosterPage;