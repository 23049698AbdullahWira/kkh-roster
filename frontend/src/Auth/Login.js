import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFromApi, API_BASE_URL } from '../services/api';

function Login({ onAdminLoginSuccess, onUserLoginSuccess, onGoSignup }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const navigate = useNavigate(); // router navigation

  // Single-step login: email + password on same screen
  const handleLogin = async () => {
    const trimmedEmail = identifier.trim().toLowerCase();

    if (!trimmedEmail) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetchFromApi(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Login failed. Please check your credentials.');
        return;
      }

      // Expect backend to return { success: true, user: { ... } }
      const userData = data.user;
      if (!userData) {
        setError('Login failed: User data not returned from server.');
        return;
      }

      // save to local storage
      localStorage.setItem('user', JSON.stringify(userData));

      const role = (userData.role || '').toUpperCase();

      if (role === 'ADMIN' || role === 'SUPERADMIN') {
        onAdminLoginSuccess && onAdminLoginSuccess(userData);
        navigate('/admin/home'); // redirect to admin home
      } else {
        onUserLoginSuccess && onUserLoginSuccess(userData);
        navigate('/user/home'); // redirect to user home
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        fontFamily: 'Inter, sans-serif',
        background: '#E5E9F0',
      }}
    >
      {/* LEFT HALF: image panel */}
      <div
        style={{
          flex: 0.55,
          backgroundImage: 'url("loginImageBackground.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0.10))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            paddingLeft: '8%',
            paddingRight: '14%',
            paddingTop: '8%',
            boxSizing: 'border-box',
            color: 'white',
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
            Welcome
          </div>
          <div style={{ fontSize: 14, maxWidth: 320, lineHeight: 1.5 }}>
            KK Women's and Children's Hospital Rostering System
          </div>
        </div>
      </div>

      {/* RIGHT HALF: centered login card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 520,
            padding: '40px 48px',
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 18px 40px rgba(0,0,0,0.16)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            boxSizing: 'border-box',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img
              style={{ width: 200, height: 'auto' }}
              src="kkh.png"
              alt="Logo"
            />
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: '#000',
              textAlign: 'center',
            }}
          >
            Log in
          </div>

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

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Email */}
            <div
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 6,
                border: '1px solid #8C8C8C',
                display: 'flex',
                alignItems: 'center',
                background: '#FFF',
              }}
            >
              <input
                ref={emailRef}
                type="email"
                placeholder="Email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    passwordRef.current && passwordRef.current.focus();
                  }
                }}
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

            {/* Password */}
            <div
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 6,
                border: '1px solid #8C8C8C',
                display: 'flex',
                alignItems: 'center',
                background: '#FFF',
              }}
            >
              <input
                ref={passwordRef}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin();
                  }
                }}
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: 260,
                height: 42,
                marginTop: 4,
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
