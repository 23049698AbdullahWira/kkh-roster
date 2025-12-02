// src/AdminNewRoster.js
import React, { useState } from 'react';

function AdminNewRoster({ open, onConfirm, onCancel }) {
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm &&
      onConfirm({
        title,
        month,
        year,
        notes,
      });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: 630,
          padding: 38,
          background: '#EDF0F5',
          borderRadius: 9.6,
          display: 'flex',
          flexDirection: 'column',
          gap: 27,
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              color: 'black',
              fontSize: 24,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
            }}
          >
            Add New Roster
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Roster Title */}
          <div
            style={{
              display: 'inline-flex',
              width: 490,
              gap: 18,
            }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  color: 'black',
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: 0.24,
                }}
              >
                Roster Title
              </div>
              <div
                style={{
                  padding: 12,
                  background: 'white',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Enter new roster title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Roster Period */}
          <div
            style={{
              display: 'inline-flex',
              width: 490,
              gap: 18,
            }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  color: 'black',
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: 0.24,
                }}
              >
                Roster Period
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    height: 42,
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                  }}
                >
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      color: month ? '#000' : '#8E8E8E',
                      background: 'transparent',
                      width: '100%',
                    }}
                  >
                    <option value="">Select month</option>
                    <option value="January">January</option>
                    <option value="February">February</option>
                    <option value="March">March</option>
                    <option value="April">April</option>
                    <option value="May">May</option>
                    <option value="June">June</option>
                    <option value="July">July</option>
                    <option value="August">August</option>
                    <option value="September">September</option>
                    <option value="October">October</option>
                    <option value="November">November</option>
                    <option value="December">December</option>
                  </select>
                </div>

                <div
                  style={{
                    height: 42,
                    padding: 12,
                    background: 'white',
                    borderRadius: 6,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                  }}
                >
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 500,
                      color: year ? '#000' : '#8E8E8E',
                      background: 'transparent',
                      width: '100%',
                    }}
                  >
                    <option value="">Select year</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 490,
              gap: 6,
            }}
          >
            <div
              style={{
                color: 'black',
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: 0.24,
              }}
            >
              Notes (Optional)
            </div>
            <div
              style={{
                height: 94,
                padding: 12,
                background: 'white',
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'flex-start',
                boxSizing: 'border-box',
              }}
            >
              <textarea
                placeholder="Enter notes for this roster (e.g. public holiday)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: 12,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  color: '#000',
                }}
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'inline-flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
            alignSelf: 'stretch',
          }}
        >
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              width: 121,
              paddingTop: 6,
              paddingBottom: 6,
              background: '#5091CD',
              boxShadow: '0 3px 18.7px rgba(0,0,0,0.25)',
              borderRadius: 24,
              border: 'none',
              color: 'white',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              letterSpacing: 0.21,
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>

          <button
            type="button"
            onClick={onCancel}
            style={{
              width: 121,
              paddingTop: 6,
              paddingBottom: 6,
              background: '#EDF0F5',
              boxShadow: '0 3px 18.7px rgba(0,0,0,0.25)',
              borderRadius: 24,
              border: 'none',
              color: 'black',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              letterSpacing: 0.21,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminNewRoster;
