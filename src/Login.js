import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');

  const handleContinue = () => {
    // later: add real validation here if needed
    // e.g. check emailOrPhone not empty, call API, etc.
    if (onLoginSuccess) {
      onLoginSuccess();
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: '#EDF0F5',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Open Sans, sans-serif',
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 474,
          height: 518,
          paddingLeft: 50,
          paddingRight: 50,
          paddingTop: 38,
          paddingBottom: 38,
          position: 'relative',
          background: 'white',
          borderRadius: 12,
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 26,
          display: 'flex',
        }}
      >
        <img
          style={{ width: 234 }}
          src="kkh.png"
          alt="Logo"
        />

        <div
          style={{
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 10,
            display: 'flex',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              color: 'black',
              fontSize: 24,
              fontWeight: 900,
              wordWrap: 'break-word',
            }}
          >
            Log in
          </div>
          <div
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              display: 'inline-flex',
            }}
          >
            <div>
              <span
                style={{
                  color: 'black',
                  fontSize: 16,
                  fontWeight: 500,
                  wordWrap: 'break-word',
                }}
              >
                New to KKH Roster?{' '}
              </span>
              <span
                style={{
                  color: '#2424FF',
                  fontSize: 16,
                  fontWeight: 500,
                  wordWrap: 'break-word',
                  cursor: 'pointer',
                }}
              >
                Sign up
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 6,
            display: 'flex',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              padding: 8,
              borderRadius: 6,
              outline: '1px #8C8C8C solid',
              outlineOffset: '-1px',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              gap: 10,
              display: 'flex',
            }}
          >
            <input
              type="text"
              placeholder="Email or Phone"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 16,
                fontWeight: 500,
                color: '#8C8C8C',
              }}
            />
          </div>
          <div
            style={{
              width: 362,
              color: '#2424FF',
              fontSize: 14,
              fontWeight: 500,
              wordWrap: 'break-word',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            Forgot email?
          </div>
        </div>

        <button
          style={{
            width: 278,
            height: 41,
            padding: 8,
            background: '#5091CD',
            borderRadius: 6,
            border: 'none',
            color: 'white',
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
          }}
          onClick={handleContinue}
        >
          Continue
        </button>

        <div
          style={{
            width: 277,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            display: 'inline-flex',
          }}
        >
          <div
            style={{
              width: 104,
              height: 1,
              backgroundColor: '#8C8C8C',
            }}
          ></div>
          <div
            style={{
              width: 21,
              height: 18,
              textAlign: 'center',
              color: '#8C8C8C',
              fontSize: 14,
              fontWeight: 800,
              userSelect: 'none',
            }}
          >
            OR
          </div>
          <div
            style={{
              width: 104,
              height: 1,
              backgroundColor: '#8C8C8C',
            }}
          ></div>
        </div>

        <div
          style={{
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 26,
            display: 'inline-flex',
          }}
        >
          <img
            style={{
              width: 42,
              height: 42,
              boxShadow: '0px 10px 17.3px -2px rgba(0, 0, 0, 0.25)',
              borderRadius: 9999,
              cursor: 'pointer',
            }}
            src="https://placehold.co/42x42"
            alt="Social Icon 1"
          />
          <img
            style={{
              width: 42,
              height: 42,
              boxShadow: '0px 10px 17.3px rgba(0, 0, 0, 0.25)',
              cursor: 'pointer',
            }}
            src="https://placehold.co/42x42"
            alt="Social Icon 2"
          />
        </div>
      </div>
    </div>
  );
}

export default Login;
