// src/UserApplyLeave.js
import React, { useState } from 'react';
import UserNavbar from './UserNavbar.js';

function UserApplyLeave({
  onBack,
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
}) {
  // simple local state (static initial values)
  const [fullName, setFullName] = useState('Vanessa Tan');
  const [email, setEmail] = useState('vanessa@example.com');
  const [ward, setWard] = useState('NNJ - CE');
  const [leaveType, setLeaveType] = useState('Annual Leave');
  const [startDate, setStartDate] = useState('2025-12-21');
  const [endDate, setEndDate] = useState('2025-12-23');
  const [fileName, setFileName] = useState('No file selected');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Leave request submitted (static demo).');
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

      {/* Back + title row */}
      <div
        style={{
          width: '100%',
          maxWidth: 1620,
          margin: '24px auto 12px',
          padding: '0 150px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
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
          }}
        >
          <span
            style={{
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            ←
          </span>
          <span
            style={{
              color: 'black',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Back
          </span>
        </button>

        <div
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 900,
            marginRight: 190, // visually center title (approx)
          }}
        >
          Apply Leave
        </div>
      </div>

      {/* Form card */}
      <main
        style={{
          width: '100%',
          padding: '0 150px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: 954,
            background: '#EDF0F5',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 34,
              alignItems: 'flex-start',
            }}
          >
            {/* Left column */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Full name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.24,
                  }}
                >
                  Full name<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.24,
                  }}
                >
                  Email<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Email"
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>

              {/* Staff Ward Designation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.24,
                  }}
                >
                  Staff Ward Designation<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Enter Ward"
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>
            </div>

            {/* Right column */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Leave Type */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.24,
                  }}
                >
                  Leave Type<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="text"
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  placeholder="Enter Leave Type"
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>

              {/* Start Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.24,
                  }}
                >
                  Start Date<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>

              {/* End Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: 0.24,
                  }}
                >
                  End Date<span style={{ color: '#FF2525' }}> *</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px solid #D4D4D4',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Upload File */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              marginTop: 8,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: 0.24,
              }}
            >
              Upload File
            </div>
            <label
              style={{
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
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: '#D0D0D0',
                  borderRadius: 8,
                }}
              />
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  color: '#8C8C8C',
                }}
              >
                Upload Leave Document
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#6B7280',
                }}
              >
                {fileName}
              </div>
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={(e) =>
                  setFileName(
                    e.target.files && e.target.files[0]
                      ? e.target.files[0].name
                      : 'No file selected'
                  )
                }
              />
            </label>
          </div>

          {/* Submit / Cancel buttons */}
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              justifyContent: 'center',
              gap: 32,
            }}
          >
            <button
              type="submit"
              style={{
                width: 165,
                padding: '8px 0',
                background: '#5091CD',
                boxShadow: '0 3px 18px rgba(0,0,0,0.25)',
                borderRadius: 24,
                border: 'none',
                color: 'white',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: 0.21,
                cursor: 'pointer',
              }}
            >
              Submit
            </button>

            <button
              type="button"
              onClick={handleCancel}
              style={{
                width: 165,
                padding: '8px 0',
                background: 'white',
                boxShadow: '0 3px 18px rgba(0,0,0,0.25)',
                borderRadius: 24,
                border: 'none',
                color: 'black',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: 0.21,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default UserApplyLeave;
