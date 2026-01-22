import React, { useState, useEffect } from 'react';
import Navbar from '../Nav/navbar';
import AdminNewRoster from './AdminNewRoster';

// --- 1. ICON COMPONENTS (SVG) ---
const IconView = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// const IconEdit = () => (
//   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
//     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
//   </svg>
// );

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

// New Plus Icon for the button
const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

// --- 2. HELPER BUTTON COMPONENT ---
const ActionBtn = ({ icon, onClick, bg = '#EBF5FF', border = '#D6E4FF', color = '#2F80ED' }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      if (onClick) onClick();
    }}
    style={{
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: bg, // Now uses dynamic background
      border: `1px solid ${border}`, // Now uses dynamic border
      borderRadius: 8,
      color: color, // Now uses dynamic color
      cursor: 'pointer',
      padding: 0,
    }}
  >
    {icon}
  </button>
);

function AdminRosterPage({ onGoHome, onGoRoster, onGoStaff, onGoShift, onOpenRoster, onLogout }) {
  const [showNewRoster, setShowNewRoster] = useState(false);
  const [rosterRows, setRosterRows] = useState([]);
  const [loading, setLoading] = useState(true);

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
  // -----------------------------

  // --- INITIAL FETCH ---
  useEffect(() => {
    fetchRosters(); // <--- We call it here when page loads
  }, []);

  // --- FETCH DATA ---
  useEffect(() => {
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
  }, []);

  // --- HELPER FUNCTIONS ---
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  // --- ACTION HANDLERS ---
  const handleNavigateToRoster = (row) => {
    if (onOpenRoster) onOpenRoster(row.id, row.month, row.year);
  };


  const handleDownload = async (row) => {
    try {
      const response = await fetch(`http://localhost:5000/api/rosters/${row.id}/download`);
      
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // 1. Convert response to Blob (Binary Large Object)
      const blob = await response.blob();

      // 2. Create a hidden link element
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${row.month}_${row.year}_Roster.xlsx`; // Name the file
      document.body.appendChild(a);

      // 3. Click it programmatically
      a.click();

      // 4. Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error("Download error:", err);
      alert("Error downloading roster. Please try again.");
    }
  };

  const handleDeleteRoster = async (row) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${row.title}"?\n\nThis will delete all shifts associated with this roster. This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`http://localhost:5000/api/rosters/${row.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setRosterRows(prev => prev.filter(r => r.id !== row.id));
        alert("Roster deleted successfully.");
      } else {
        alert("Failed to delete roster.");
      }
    } catch (err) {
      console.error("Error deleting roster:", err);
      alert("Error connecting to server.");
    }
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
      <Navbar
        active="roster"
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoStaff={onGoStaff}
        onGoShift={onGoShift}
        onLogout={onLogout}
      />

      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto 40px',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>All Rosters</h1>

          {/* UPDATED "NEW ROSTER" BUTTON */}
          <button
            type="button"
            onClick={() => setShowNewRoster(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 20px', paddingRight: '16px',
              background: '#5091CD', borderRadius: 999, border: 'none', color: 'white',
              fontSize: 16, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(80, 145, 205, 0.4)'
            }}
          >
            New Roster
            {/* The Plus Icon */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24,
              background: 'rgba(255,255,255,0.2)', borderRadius: '50%'
            }}>
              <IconPlus />
            </div>
          </button>

          {/* THE MODAL COMPONENT */}
          <AdminNewRoster
            open={showNewRoster}
            onCancel={() => setShowNewRoster(false)}
            onConfirm={() => {
              setShowNewRoster(false); // 1. Close the modal manually
              fetchRosters();          // 2. Just re-fetch the data list
            }}
          />
        </div>

        {/* ... TABLE HEADERS AND BODY REMAIN THE SAME ... */}
        <div
          style={{
            background: 'white', borderRadius: '10px 10px 0 0', border: '1px solid #E6E6E6', borderBottom: 'none',
            display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.4fr 1.7fr 1.2fr 0.8fr', alignItems: 'center',
            height: 56, padding: '0 16px', boxSizing: 'border-box', fontSize: 16, fontWeight: 600,
          }}
        >
          <div>Roster Title</div>
          <div>Generated By</div>
          <div>Created On</div>
          <div>Publish Dateline</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        <div
          style={{
            background: 'white', borderRadius: '0 0 10px 10px', border: '1px solid #E6E6E6', borderTop: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>Loading rosters...</div>
          ) : rosterRows.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>No rosters found.</div>
          ) : (
            rosterRows.map((row, idx) => (
              <div
                key={row.id || idx}
                onClick={() => handleNavigateToRoster(row)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.4fr 1.7fr 1.2fr 0.8fr', alignItems: 'center',
                  padding: '12px 16px', boxSizing: 'border-box', fontSize: 14,
                  borderTop: idx === 0 ? 'none' : '1px solid #E6E6E6', cursor: 'pointer',
                }}
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
                        style={{
                          padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                          backgroundColor: style.background, color: style.color,
                        }}
                      >
                        {row.status}
                      </span>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-start' }}>
                  <ActionBtn icon={<IconView />} onClick={() => handleNavigateToRoster(row)} />
                  {row.status === 'Published' ? (
                    <ActionBtn icon={<IconDownload />} onClick={() => handleDownload(row)} />
                  ) : (
                    <ActionBtn
                      icon={<IconTrash />}
                      onClick={() => handleDeleteRoster(row)}
                      bg="#FEE2E2"      // Red Background
                      border="#FECACA"  // Red Border
                      color="#DC2626"   // Red Icon
                    />
                  )}
                </div>

              </div>
            ))
          )}

          {/* ... PAGINATION ... */}
          <div style={{ height: 60, background: 'white', borderTop: '1px solid #EEE', borderRadius: '0 0 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #EEE', background: 'rgba(255,255,255,0.4)' }}>«</button>
            <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #EEE', background: 'white' }}>‹</button>
            <span style={{ fontSize: 14, color: '#656575' }}>1–{rosterRows.length} of {rosterRows.length}</span>
            <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #EEE', background: 'white' }}>›</button>
            <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #EEE', background: 'white' }}>»</button>
          </div>

        </div>
      </main>
    </div>
  );
}

export default AdminRosterPage;