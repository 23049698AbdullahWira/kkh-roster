import React, { useState } from 'react';

const USERS = {
  'admin@example.com': {
    role: 'admin',
    password: 'admin123',
  },
  'user@example.com': {
    role: 'user',
    password: 'user123',
  },
};

function Login({ onAdminLoginSuccess, onUserLoginSuccess }) {
  const [step, setStep] = useState('identifier'); // 'identifier' | 'password'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [error, setError] = useState('');

  const handleContinueIdentifier = () => {
    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email or phone number.');
      return;
    }

    if (!USERS[trimmed]) {
      setError('Account not found. Try admin@example.com or user@example.com.');
      return;
    }

    setCurrentEmail(trimmed);
    setPassword('');
    setError('');
    setStep('password');
  };

  const handleLogin = () => {
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    const user = USERS[currentEmail];
    if (!user || user.password !== password) {
      setError('Incorrect password.');
      return;
    }

    setError('');
    if (user.role === 'admin') {
      onAdminLoginSuccess && onAdminLoginSuccess();
    } else {
      onUserLoginSuccess && onUserLoginSuccess();
    }
  };

  const handleSwitchAccount = () => {
    setStep('identifier');
    setIdentifier('');
    setPassword('');
    setCurrentEmail('');
    setError('');
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
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: 474,
          padding: 38,
          background: 'white',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          boxSizing: 'border-box',
        }}
      >
        <img
          style={{ width: 234, height: 'auto' }}
          src="https://placehold.co/234x95"
          alt="Logo"
        />

        {/* Header depending on step */}
        {step === 'identifier' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                color: 'black',
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              Log in
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 16,
              }}
            >
              <span>New to KKH Roster? </span>
              <button
                type="button"
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#2424FF',
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sign up
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                color: 'black',
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              Welcome back
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 16,
              }}
            >
              <span>{currentEmail}</span>
              <button
                type="button"
                onClick={handleSwitchAccount}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#2424FF',
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Switch account
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              width: '100%',
              color: '#B91C1C',
              fontSize: 14,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 1: Identifier screen (email/phone) */}
        {step === 'identifier' ? (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 372,
                  padding: 8,
                  borderRadius: 6,
                  outline: '1px #8C8C8C solid',
                  outlineOffset: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Email or Phone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>
              <div
                style={{
                  width: 362,
                  color: '#2424FF',
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Forgot email?
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinueIdentifier}
              style={{
                width: 278,
                height: 41,
                padding: 8,
                background: '#5091CD',
                borderRadius: 6,
                border: '1px solid #8C8C8C',
                color: 'white',
                fontSize: 18,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Continue
            </button>

            <div
              style={{
                width: 277,
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 104,
                  height: 0,
                  borderTop: '2px solid #8C8C8C',
                }}
              />
              <div
                style={{
                  width: 21,
                  height: 18,
                  textAlign: 'center',
                  color: '#8C8C8C',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                OR
              </div>
              <div
                style={{
                  width: 104,
                  height: 0,
                  borderTop: '2px solid #8C8C8C',
                }}
              />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 26,
              }}
            >
              <img
                style={{
                  width: 42,
                  height: 42,
                  boxShadow: '0 10px 17.3px -2px rgba(0,0,0,0.25)',
                  borderRadius: '50%',
                }}
                src="https://placehold.co/42x42"
                alt="SsoIcon1"
              />
              <img
                style={{
                  width: 42,
                  height: 42,
                  boxShadow: '0 10px 17.3px rgba(0,0,0,0.25)',
                  borderRadius: '50%',
                }}
                src="https://placehold.co/42x42"
                alt="SsoIcon2"
              />
            </div>
          </>
        ) : (
          /* STEP 2: Password screen */
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 372,
                  padding: 8,
                  borderRadius: 6,
                  outline: '1px #8C8C8C solid',
                  outlineOffset: '-1px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#000',
                  }}
                />
              </div>
              <div
                style={{
                  width: 362,
                  color: '#2424FF',
                  fontSize: 14,
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Forgot password?
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogin}
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
            >
              Log in
            </button>

            <div
              style={{
                width: 277,
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 104,
                  height: 0,
                  borderTop: '2px solid #8C8C8C',
                }}
              />
              <div
                style={{
                  width: 21,
                  height: 18,
                  textAlign: 'center',
                  color: '#8C8C8C',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                OR
              </div>
              <div
                style={{
                  width: 104,
                  height: 0,
                  borderTop: '2px solid #8C8C8C',
                }}
              />
            </div>

            <div
              style={{
                width: 166,
                height: 28,
                padding: 8,
                borderRadius: 6,
                border: '1px solid #8C8C8C',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: 14,
                color: '#8C8C8C',
              }}
            >
              One-Time Passcode
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
