// src/UserAccountInformation.js
import React from 'react';
import UserNavbar from '../Nav/UserNavbar.js';

const userProfile = {
  displayName: 'Vanessa',
  name: 'Aaron Wong',
  dateJoined: '20/10/2025',
  timePreference: 'AM, PM',
  certification: 'Senior',
  notes: 'Fluent in Mandarin and Malay.',
};

function UserAccountInformation({
  onGoHome,
  onGoRoster,
  onGoShiftPreference,
  onGoApplyLeave,
  onGoAccount,
  onLogout
}) {
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
        active="account" // or 'profile' if you add a separate tab later
        onGoHome={onGoHome}
        onGoRoster={onGoRoster}
        onGoShiftPreference={onGoShiftPreference}
        onGoApplyLeave={onGoApplyLeave}
        onGoAccount={onGoAccount}
        onLogout={onLogout}
      />

      {/* Page title */}
      <div
        style={{
          width: '100%',
          maxWidth: 1920,
          marginTop: 30,
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 900,
        }}
      >
        Account Information
      </div>

      {/* Content */}
      <main
        style={{
          width: '100%',
          maxWidth: 1770,
          margin: '20px auto 40px',
          padding: '0 75px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 954,
            background: 'white',
            boxShadow: '0 1.66px 1.33px rgba(0,0,0,0.02)',
            borderRadius: 9.6,
            padding: 24,
            display: 'flex',
            gap: 60,
            boxSizing: 'border-box',
          }}
        >
          {/* Left: avatar + display name */}
          <div
            style={{
              width: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 24,
            }}
          >
            <div
              style={{
                width: '100%',
                textAlign: 'center',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {userProfile.displayName}
            </div>
            <img
              style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
              src="https://placehold.co/200x200"
              alt="Profile"
            />
          </div>

          {/* Right: info fields */}
          <div
            style={{
              width: 624,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 18,
            }}
          >
            {/* edit icon placeholder */}
            <div
              style={{
                display: 'inline-flex',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  background: '#EDF0F5',
                  borderRadius: 8,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    background: '#5091CD',
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>

            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              {/* Name */}
              <Field label="Name" value={userProfile.name} />

              {/* Date Joined */}
              <Field
                label="Date Joined"
                value={userProfile.dateJoined}
                hasIcon
              />

              {/* Time Preference */}
              <Field
                label="Time Preference"
                value={userProfile.timePreference}
              />

              {/* Certification */}
              <Field
                label="Certification"
                value={userProfile.certification}
              />

              {/* Notes */}
              <Field label="Notes" value={userProfile.notes} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Small helper component for the grey info rows
function Field({ label, value, hasIcon = false }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 18,
        width: '100%',
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
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: 0.24,
            color: 'black',
          }}
        >
          {label}
        </div>
        <div
          style={{
            padding: 12,
            background: '#EDF0F5',
            borderRadius: 6,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: hasIcon ? 'space-between' : 'flex-start',
            gap: 18,
            width: '100%',
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 0.18,
              color: 'black',
            }}
          >
            {value}
          </div>
          {hasIcon && (
            <div
              style={{
                width: 18,
                height: 18,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 4,
                  position: 'absolute',
                  left: 5,
                  top: 8,
                  background: 'black',
                }}
              />
              <div
                style={{
                  width: 13,
                  height: 15,
                  position: 'absolute',
                  left: 2,
                  top: 1,
                  background: 'black',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserAccountInformation;
