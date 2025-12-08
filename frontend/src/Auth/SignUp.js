// src/Auth/SignUp.js
import React, { useState } from 'react';

function SignUp({ onDone }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    loginEmail: '',
    optionalPhone: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const next = () => {
    setStep((s) => Math.min(s + 1, 4));
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleContinueFromPassword = () => {
    if (form.password && form.password === form.confirmPassword) {
      next();
    } else {
      alert('Passwords do not match.');
    }
  };

  const handleGetStarted = async () => {
    // Build payload for backend
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.loginEmail || form.email,
      phone: form.optionalPhone || form.phone,
      password: form.password,
    };

    if (!payload.email || !payload.password) {
      alert('Email and password are required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || 'Registration failed. Please try again.');
        return;
      }

      // Registration OK → go back to Login
      onDone && onDone();
    } catch (err) {
      console.error(err);
      alert('Unable to connect to server. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Individual screens (unchanged UI, just using form state) ---

  const renderStep0 = () => (
    <div style={outerContainer}>
      <div style={cardStyle}>
        <img
          style={{ width: 234, height: 95.25 }}
          src="https://placehold.co/234x95"
          alt="Logo"
        />
        <div style={titleBlock}>
          <div style={titleText}>Sign Up With</div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'flex-start',
            gap: 26,
          }}
        >
          <img
            style={{
              width: 42,
              height: 42,
              boxShadow: '0 10px 17.3px -2px rgba(0,0,0,0.25)',
              borderRadius: 9999,
            }}
            src="https://placehold.co/42x42"
            alt="Google"
          />
          <img
            style={{
              width: 42,
              height: 42,
              boxShadow: '0 10px 17.3px rgba(0,0,0,0.25)',
              borderRadius: 9999,
            }}
            src="https://placehold.co/42x42"
            alt="Other"
          />
        </div>

        <div style={dividerRow}>
          <div style={dividerLine} />
          <div style={dividerText}>or start here</div>
          <div style={dividerLine} />
        </div>

        <div style={fieldColumn}>
          <FieldBox>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange('email')}
              style={inputPlain}
            />
          </FieldBox>
          <FieldBox>
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange('phone')}
              style={inputPlain}
            />
          </FieldBox>
        </div>

        <button type="button" style={primaryButton} onClick={next}>
          Continue
        </button>

        <div style={{ fontSize: 16, fontFamily: 'Inter, sans-serif' }}>
          <span>Already have an account? </span>
          <span
            style={{ color: '#2424FF', cursor: 'pointer' }}
            onClick={onDone}
          >
            Log in
          </span>
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div style={outerContainer}>
      <div style={cardStyle}>
        <img
          style={{ width: 234, height: 95.25 }}
          src="https://placehold.co/234x95"
          alt="Logo"
        />
        <div style={titleBlock}>
          <div style={titleText}>What’s Your Name?</div>
        </div>
        <div
          style={{
            textAlign: 'center',
            color: 'black',
            fontSize: 16,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
          }}
        >
          Your real name may be used later<br />
          to verify your identity.
        </div>

        <div style={fieldColumn}>
          <FieldBox>
            <input
              type="text"
              placeholder="First Name"
              value={form.firstName}
              onChange={handleChange('firstName')}
              style={inputPlain}
            />
          </FieldBox>
          <FieldBox>
            <input
              type="text"
              placeholder="Last Name"
              value={form.lastName}
              onChange={handleChange('lastName')}
              style={inputPlain}
            />
          </FieldBox>
        </div>

        <button type="button" style={primaryButton} onClick={next}>
          Continue
        </button>

        <button type="button" style={linkBack} onClick={back}>
          Back
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div style={outerContainer}>
      <div style={cardStyle}>
        <img
          style={{ width: 234, height: 95.25 }}
          src="https://placehold.co/234x95"
          alt="Logo"
        />
        <div style={titleBlock}>
          <div style={titleText}>Identify Your Account</div>
        </div>
        <div
          style={{
            textAlign: 'center',
            color: 'black',
            fontSize: 16,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
          }}
        >
          This is what you will use when you log in
          <br />
          to KKH Roster.
        </div>

        <div style={fieldColumn}>
          <FieldBox>
            <input
              type="email"
              placeholder="Email"
              value={form.loginEmail}
              onChange={handleChange('loginEmail')}
              style={inputPlain}
            />
          </FieldBox>
          <FieldBox>
            <input
              type="tel"
              placeholder="Phone (Optional)"
              value={form.optionalPhone}
              onChange={handleChange('optionalPhone')}
              style={inputPlain}
            />
          </FieldBox>
        </div>

        <button type="button" style={primaryButton} onClick={next}>
          Continue
        </button>

        <button type="button" style={linkBack} onClick={back}>
          Back
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div style={outerContainer}>
      <div style={cardStyle}>
        <img
          style={{ width: 234, height: 95.25 }}
          src="https://placehold.co/234x95"
          alt="Logo"
        />
        <div style={titleBlock}>
          <div style={titleText}>Set Your Password</div>
        </div>
        <div
          style={{
            width: 309,
            textAlign: 'center',
            color: 'black',
            fontSize: 16,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
          }}
        >
          Secure your account and choose a strong password.
        </div>

        <div style={fieldColumn}>
          <FieldBox>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange('password')}
              style={inputPlain}
            />
          </FieldBox>
          <FieldBox>
            <input
              type="password"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              style={inputPlain}
            />
          </FieldBox>
        </div>

        <button
          type="button"
          style={primaryButton}
          onClick={handleContinueFromPassword}
        >
          Continue
        </button>

        <button type="button" style={linkBack} onClick={back}>
          Back
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div style={outerContainer}>
      <div style={cardStyleFinal}>
        <img
          style={{ width: 90, height: 90 }}
          src="https://placehold.co/90x90"
          alt="Success"
        />
        <div style={titleBlock}>
          <div style={titleText}>You are all set!</div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 315,
              textAlign: 'center',
              color: 'black',
              fontSize: 16,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
            }}
          >
            The following account will be created:
          </div>
          <div
            style={{
              width: 309,
              textAlign: 'center',
              color: 'black',
              fontSize: 20,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
            }}
          >
            {form.loginEmail || form.email || 'example123@gmail.com'}
          </div>
        </div>

        <button
          type="button"
          style={{
            ...primaryButton,
            background: submitting ? '#9BBEE5' : '#5091CD',
            cursor: submitting ? 'default' : 'pointer',
          }}
          onClick={handleGetStarted}
          disabled={submitting}
        >
          {submitting ? 'Creating...' : 'Get Started'}
        </button>
      </div>
    </div>
  );

  switch (step) {
    case 0:
      return renderStep0();
    case 1:
      return renderStep1();
    case 2:
      return renderStep2();
    case 3:
      return renderStep3();
    case 4:
      return renderStep4();
    default:
      return renderStep0();
  }
}

// --- Shared styles and FieldBox (unchanged) ---

const outerContainer = {
  width: '100%',
  minHeight: '100vh',
  background: '#EDF0F5',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const cardBase = {
  width: 474,
  paddingLeft: 50,
  paddingRight: 50,
  paddingTop: 38,
  paddingBottom: 38,
  background: 'white',
  borderRadius: 12,
  display: 'inline-flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center',
  gap: 26,
};

const cardStyle = cardBase;
const cardStyleFinal = cardBase;

const titleBlock = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
};

const titleText = {
  color: 'black',
  fontSize: 24,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 900,
};

const dividerRow = {
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 12,
};

const dividerLine = {
  width: 104,
  height: 0,
  borderTop: '2px solid #8C8C8C',
};

const dividerText = {
  width: 96,
  textAlign: 'center',
  color: '#8C8C8C',
  fontSize: 14,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 800,
};

const fieldColumn = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
};

const FieldBox = ({ children }) => (
  <div
    style={{
      width: 372,
      padding: 8,
      borderRadius: 6,
      border: '1px solid #8C8C8C',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      gap: 10,
      boxSizing: 'border-box',
    }}
  >
    {children}
  </div>
);

const inputPlain = {
  width: '100%',
  border: 'none',
  outline: 'none',
  fontSize: 16,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 500,
  color: '#000',
};

const primaryButton = {
  width: 278,
  height: 41,
  padding: 8,
  background: '#5091CD',
  borderRadius: 6,
  border: '1px solid #8C8C8C',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  cursor: 'pointer',
  color: 'white',
  fontSize: 18,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 800,
};

const linkBack = {
  marginTop: 4,
  background: 'none',
  border: 'none',
  color: '#5091CD',
  fontSize: 16,
  fontFamily: 'Inter, sans-serif',
  fontWeight: 700,
  cursor: 'pointer',
};

export default SignUp;
