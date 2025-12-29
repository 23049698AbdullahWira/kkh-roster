import React, { useState } from 'react';

function Login({ onAdminLoginSuccess, onUserLoginSuccess, onGoSignup, onSetRole }) {
  const [step, setStep] = useState('identifier'); // 'identifier' | 'password'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // STEP 1: check identifier (email) exists
  const handleContinueIdentifier = async () => {
    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email.');
      return;
    }
    setCurrentEmail(trimmed);
    setPassword('');
    setError('');
    setStep('password');
  };

  // STEP 2: login against backend
  const handleLogin = async () => {
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (!currentEmail) {
      setError('Missing email. Please go back and enter your email again.');
      setStep('identifier');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Login failed. Please check your credentials.');
        return;
      }

      // Decide where to route based on role from backend
      const role = (data.role || '').toUpperCase(); // normalize

      // send role to parent so pages like AdminStaffManagementPage can use it
      if (onSetRole) {
        onSetRole(role);
      }

      if (role === 'ADMIN' || role === 'SUPERADMIN') {
        onAdminLoginSuccess && onAdminLoginSuccess();
      } else {
        onUserLoginSuccess && onUserLoginSuccess(userData);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
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
                onClick={onGoSignup}
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

        {/* Error */}
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

        {/* Identifier or password section */}
        {step === 'identifier' ? (
          <>
            {/* Identifier UI */}
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
                  type="email"
                  placeholder="Email"
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
              disabled={loading}
              style={{
                width: 278,
                height: 41,
                padding: 8,
                background: loading ? '#9BBEE5' : '#5091CD',
                borderRadius: 6,
                border: '1px solid #8C8C8C',
                color: 'white',
                fontSize: 18,
                fontWeight: 800,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Please wait...' : 'Continue'}
            </button>

            {/* The rest of your OR + SSO icons stay the same */}
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
          <>
            {/* Password UI */}
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
              disabled={loading}
              style={{
                width: 278,
                height: 41,
                padding: 8,
                background: loading ? '#9BBEE5' : '#5091CD',
                borderRadius: 6,
                border: 'none',
                color: 'white',
                fontSize: 18,
                fontWeight: 800,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Logging in...' : 'Log in'}
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