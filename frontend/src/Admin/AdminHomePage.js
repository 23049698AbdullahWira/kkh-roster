import React, { useEffect, useState } from 'react';
import Navbar from '../Nav/navbar.js';
import './AdminHomePage.css'; // Import the external CSS

function AdminHome({ user, onGoHome, onGoRoster, onGoStaff, onGoShift, onGoManageLeave, onLogout }) {
  const goRoster = onGoRoster;
  const goNewStaff = onGoStaff;
  const goManageLeave = onGoManageLeave;
  const goStaffPreferences = onGoShift;

  // Dashboard data
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const [pendingPrefCount, setPendingPrefCount] = useState(0);
  const [nextRosterLabel, setNextRosterLabel] = useState('');
  const [nextRosterStatus, setNextRosterStatus] = useState('');

  // Loading flag
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // Activity logs & Modal State
  const [logs, setLogs] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentLogPage, setCurrentLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState('All'); // 'All', 'Today', 'Week', 'Month'
  const logsPerPage = 10;

  useEffect(() => {
    async function fetchAll() {
      try {
        const [logsRes, leaveRes, prefRes, rosterRes] = await Promise.all([
          fetch('http://localhost:5000/actionlogs?limit=100'), // Fetch more for the modal
          fetch('http://localhost:5000/api/leave/pending-count'),
          fetch('http://localhost:5000/api/shiftpref/pending-count'),
          fetch('http://localhost:5000/api/rosters/next'),
        ]);

        const [logsData, leaveData, prefData] = await Promise.all([
          logsRes.json(),
          leaveRes.json(),
          prefRes.json(),
        ]);

        setLogs(logsData || []);
        setPendingLeaveCount(leaveData?.pendingCount ?? 0);
        setPendingPrefCount(prefData?.pendingCount ?? 0);

        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          setNextRosterLabel(`${rosterData.month} ${rosterData.year}`);
          setNextRosterStatus(rosterData.status || 'Unknown');
        } else {
          setNextRosterLabel('No roster found');
          setNextRosterStatus('N/A');
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setNextRosterLabel('Error');
        setNextRosterStatus('N/A');
      } finally {
        setIsLoadingDashboard(false);
      }
    }

    fetchAll();
  }, []);

  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    const dbDate = new Date(isoString);
    const sgtDate = new Date(dbDate.getTime() + 8 * 60 * 60 * 1000);
    const now = Date.now();
    const diffMs = now - sgtDate.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ${diffMin % 60}m ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
  };

  const getLogIcon = (type) => {
    if (type === 'ROSTER') return '/calendar.png';
    if (type === 'PREFERENCE') return '/userMale.png';
    if (type === 'WINDOW') return '/clock.png';
    if (type === 'ACCOUNT') return '/userMale.png';
    return '/calendar.png';
  };

  const getLogClickHandler = (type) => {
    if (type === 'ROSTER') return goRoster;
    if (type === 'PREFERENCE') return goStaffPreferences;
    if (type === 'ACCOUNT') return goNewStaff;
    if (type === 'WINDOW') return goStaffPreferences;
    return null;
  };

  // --- FILTER & PAGINATION LOGIC FOR MODAL ---
  const getFilteredLogs = () => {
    const now = new Date();
    // Midnight today for 'Today' check
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // 7 days ago
    const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    // 30 days ago
    const oneMonthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return logs.filter(log => {
      const logTime = new Date(log.log_datetime).getTime();
      if (logFilter === 'Today') return logTime >= todayStart;
      if (logFilter === 'Week') return logTime >= oneWeekAgo;
      if (logFilter === 'Month') return logTime >= oneMonthAgo;
      return true;
    });
  };

  const filteredLogs = getFilteredLogs();
  const indexOfLastLog = currentLogPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentModalLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalLogPages = Math.ceil(filteredLogs.length / logsPerPage);

  const handleNextPage = () => setCurrentLogPage(prev => Math.min(prev + 1, totalLogPages));
  const handlePrevPage = () => setCurrentLogPage(prev => Math.max(prev - 1, 1));

  // --- Helpers for colors ---
  const getLeaveBorderColor = () => {
    if (isLoadingDashboard) return '#D1D5DB'; 
    return pendingLeaveCount === 0 ? '#16A34A' : '#F59E0B'; 
  };

  const getPrefBorderColor = () => {
    if (isLoadingDashboard) return '#D1D5DB';
    return pendingPrefCount === 0 ? '#16A34A' : '#F59E0B';
  };

  const getRosterBorderColor = () => {
    if (isLoadingDashboard) return '#D1D5DB';
    if (nextRosterStatus === 'Published') return '#16A34A';
    if (nextRosterStatus === 'Drafting') return '#F59E0B';
    if (nextRosterStatus === 'Preference Open') return '#DC2626';
    return '#D1D5DB';
  };

  const getRosterStatusColor = () => {
    if (nextRosterStatus === 'Published') return '#16A34A';
    if (nextRosterStatus === 'Drafting') return '#F59E0B';
    if (nextRosterStatus === 'Preference Open') return '#DC2626';
    return '#6B7280';
  };

  return (
    <div className="admin-home-container">
      <Navbar
        active="home"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoStaff={onGoStaff}
        onGoShift={onGoShift}
        onLogout={onLogout}
      />

      <main className="admin-home-main">
        <h1 className="admin-home-welcome-title">
          Welcome back, {user?.fullName || 'Admin'}!
        </h1>

        <section className="admin-home-grid">
          {/* LEFT COLUMN */}
          <div className="admin-home-col-left">
            
            {/* 1. Pending leave requests */}
            <div 
              className="admin-home-card"
              style={{ borderRight: `6px solid ${getLeaveBorderColor()}` }}
            >
              <img
                src={
                  isLoadingDashboard ? '/loadingCircle.png' :
                  pendingLeaveCount === 0 ? '/greenCheckMark.png' : '/yellowWarning.png'
                }
                alt=""
                className="admin-home-card-icon"
                style={{ width: isLoadingDashboard ? 20 : 46, height: isLoadingDashboard ? 20 : 46 }}
              />
              <div className="admin-home-card-text-group">
                <div className="admin-home-card-label">Pending leave requests</div>
                <div className="admin-home-card-value-row">
                  <span className="admin-home-card-value">{pendingLeaveCount}</span>
                  <span className="admin-home-card-subtext">awaiting approval</span>
                </div>
              </div>
            </div>

            {/* 2. Pending shift preferences */}
            <div 
              className="admin-home-card"
              style={{ borderRight: `6px solid ${getPrefBorderColor()}` }}
            >
              <img
                src={
                  isLoadingDashboard ? '/loadingCircle.png' :
                  pendingPrefCount === 0 ? '/greenCheckMark.png' : '/yellowWarning.png'
                }
                alt=""
                className="admin-home-card-icon"
                style={{ width: isLoadingDashboard ? 20 : 46, height: isLoadingDashboard ? 20 : 46 }}
              />
              <div className="admin-home-card-text-group">
                <div className="admin-home-card-label">Pending shift preferences</div>
                <div className="admin-home-card-value-row">
                  <span className="admin-home-card-value">{pendingPrefCount}</span>
                  <span className="admin-home-card-subtext">unreviewed submissions</span>
                </div>
              </div>
            </div>

            {/* 3. Next month roster status */}
            <div 
              className="admin-home-card"
              style={{ borderRight: `6px solid ${getRosterBorderColor()}` }}
            >
              <img
                src={
                  isLoadingDashboard ? '/loadingCircle.png' :
                  nextRosterStatus === 'Published' ? '/greenCheckMark.png' :
                  nextRosterStatus === 'Drafting' ? '/yellowWarning.png' :
                  nextRosterStatus === 'Preference Open' ? '/redWarning.png' : '/yellowWarning.png'
                }
                alt=""
                className="admin-home-card-icon"
                style={{ width: isLoadingDashboard ? 20 : 46, height: isLoadingDashboard ? 20 : 46 }}
              />
              <div className="admin-home-card-text-group">
                <div className="admin-home-card-label">Next roster status</div>
                <div className="admin-home-roster-label">{nextRosterLabel || 'Loading...'}</div>
                <div className="admin-home-roster-status" style={{ color: getRosterStatusColor() }}>
                  <span className="admin-home-status-dot" style={{ background: getRosterStatusColor() }} />
                  {nextRosterStatus || 'Loading...'}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="admin-home-col-right">
            
            {/* Quick Links */}
            <section className="admin-home-links-card">
              <div className="admin-home-section-title">Quick Links</div>
              <div className="admin-home-links-row">
                <button type="button" onClick={goRoster} className="admin-home-link-btn">
                  <div className="admin-home-icon-box">
                    <img className="admin-home-icon-img" src="/startNewRoster.png" alt="Start New Roster" />
                  </div>
                  <div className="admin-home-link-text">{'Start New\nRoster'}</div>
                </button>

                <button type="button" onClick={goNewStaff} className="admin-home-link-btn">
                  <div className="admin-home-icon-box">
                    <img className="admin-home-icon-img" src="/addNewStaff.png" alt="Add New Staff" />
                  </div>
                  <div className="admin-home-link-text">{'Add\nNew Staff'}</div>
                </button>

                <button type="button" onClick={goManageLeave} className="admin-home-link-btn">
                  <div className="admin-home-icon-box">
                    <img className="admin-home-icon-img" src="/manageLeave.png" alt="Manage Leave" />
                  </div>
                  <div className="admin-home-link-text">{'Manage\nLeave'}</div>
                </button>

                <button type="button" onClick={goStaffPreferences} className="admin-home-link-btn">
                  <div className="admin-home-icon-box">
                    <img className="admin-home-icon-img" src="/staffPref.png" alt="Staff Preferences" />
                  </div>
                  <div className="admin-home-link-text">{'Staff\nPreferences'}</div>
                </button>
              </div>
            </section>

            {/* Activity Log (Fixed Height Preview) */}
            <section className="admin-home-log-card">
              <div className="admin-home-log-title">Admin Activity Log</div>
              <div className="admin-home-log-list">
                {/* Show only 5 items in the dashboard widget */}
                {logs.slice(0, 3).map((log) => {
                  const onClick = getLogClickHandler(log.log_type);
                  return (
                    <div
                      key={log.log_id}
                      className={`admin-home-log-item ${onClick ? 'clickable' : ''}`}
                      onClick={onClick || undefined}
                    >
                      <img className="admin-home-log-icon" src={getLogIcon(log.log_type)} alt="" />
                      <div className="admin-home-log-text">
                        {formatTimeAgo(log.log_datetime)}, {log.log_details}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View All Button triggers the modal */}
              <button
                className="admin-home-view-all"
                onClick={() => {
                  setCurrentLogPage(1); // Reset to page 1
                  setShowLogModal(true);
                }}
              >
                View All Activity
              </button>
            </section>
          </div>
        </section>
      </main>

      {/* --- ALL ACTIVITY LOGS MODAL --- */}
      {showLogModal && (
        <div className="admin-home-modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="admin-home-modal-content" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header with Filter */}
            <div className="admin-home-modal-header">
              <h3 className="admin-home-modal-title">All Activity Logs</h3>
              
              {/* DATE FILTER */}
              <select 
                className="admin-home-log-filter"
                value={logFilter}
                onChange={(e) => {
                  setLogFilter(e.target.value);
                  setCurrentLogPage(1); // Reset pagination on filter change
                }}
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Week">Last 7 Days</option>
                <option value="Month">Last 30 Days</option>
              </select>

              <button className="admin-home-modal-close" onClick={() => setShowLogModal(false)}>×</button>
            </div>

            {/* Modal Body (Scrollable List) */}
            <div className="admin-home-modal-body">
              {currentModalLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B7280', padding: '20px' }}>No logs found for this period.</div>
              ) : (
                <div className="admin-home-log-list">
                  {currentModalLogs.map((log) => {
                    const onClick = getLogClickHandler(log.log_type);
                    return (
                      <div
                        key={log.log_id}
                        className={`admin-home-log-item ${onClick ? 'clickable' : ''}`}
                        onClick={onClick || undefined}
                      >
                        <img className="admin-home-log-icon" src={getLogIcon(log.log_type)} alt="" />
                        <div className="admin-home-log-text">
                          <strong style={{ display:'block', fontSize: '12px', color: '#6B7280', marginBottom: '2px' }}>
                            {new Date(log.log_datetime).toLocaleString()}
                          </strong>
                          {log.log_details}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer (Pagination) */}
            {filteredLogs.length > logsPerPage && (
              <div className="admin-home-pagination-container">
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentLogPage === 1}
                  className="admin-home-pagination-btn"
                >
                  ‹
                </button>
                <span className="admin-home-pagination-text">
                  Page {currentLogPage} of {totalLogPages}
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentLogPage === totalLogPages}
                  className="admin-home-pagination-btn"
                >
                  ›
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminHome;