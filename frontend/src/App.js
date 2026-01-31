import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import './App.css';

// --- Import Pages ---
import Login from './Auth/Login.js';
import SignUp from './Auth/SignUp.js';
import AdminHomePage from './Admin/AdminHomePage.js';
import AdminRosterPage from './Admin/AdminRoster.js';
import AdminRosterView from './Admin/AdminRosterView.js';
import AdminStaffManagementPage from './Admin/AdminStaffManagement.js';
import AdminShiftDistributionPage from './Admin/AdminShiftDistribution.js';
import AdminNewAccounts from './Admin/AdminNewStaffAcounts.js'; 
import AdminManageLeave from './Admin/AdminManageLeave.js';
import UserHomePage from './User/UserHomePage.js';
import UserRoster from './User/UserRoster.js';
import UserShiftPref from './User/UserShiftPref.js';
import UserApplyLeave from './User/UserApplyLeave.js';
import UserAccountInformation from './User/UserAccountInformation.js';

// --- SECURITY: Protected Route Wrapper (Loop Proof) ---
const ProtectedRoute = ({ user, allowedRoles }) => {
  // 1. Not logged in? Go to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize roles to Uppercase to avoid 'Admin' vs 'ADMIN' issues
  const userRole = (user.role || '').toUpperCase();
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

  // 2. Permission Check
  if (!normalizedAllowed.includes(userRole)) {
    // STOP THE LOOP: Do not redirect here. 
    // If we redirect to /admin/home, and that page also fails this check, it crashes the browser.
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: '#DC2626' }}>Access Denied</h1>
        <p style={{ fontSize: '18px', color: '#374151' }}>
          Your current role is: <strong>{user.role}</strong>
        </p>
        <p style={{ color: '#6B7280' }}>
          You are not authorized to view this page.
        </p>
        <button 
          onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          style={{ marginTop: '20px', padding: '10px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    );
  }

  // 3. Authorized -> Render the page
  return <Outlet />;
};

function App() {
  const navigate = useNavigate();

  // --- STATE ---
  const [rosterId, setRosterId] = useState(null);
  const [rosterMonth, setRosterMonth] = useState('December');
  const [rosterYear, setRosterYear] = useState(2025);

  // --- 1. SAFE LAZY INITIALIZATION ---
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return null;

      const user = JSON.parse(stored);

      // Safety check for bad data
      if (!user.role) {
        localStorage.removeItem('user');
        return null;
      }
      return user;
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [currentUserRole, setCurrentUserRole] = useState(loggedInUser?.role || null);

  // --- HANDLERS ---
  const handleLogin = (userData) => {
    setLoggedInUser(userData);
    setCurrentUserRole(userData.role);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setLoggedInUser(null);
    setCurrentUserRole(null);
    navigate('/login');
  };

  // Sync state (Optional safety net)
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (user && user.role) {
           // Only set if different to prevent re-render loops
           if (!loggedInUser || user.userId !== loggedInUser.userId) {
             setLoggedInUser(user);
             setCurrentUserRole(user.role);
           }
        }
      } catch (e) { }
    }
  }, []);

  const navProps = {
    onGoHome: () => navigate('/admin/home'),
    onGoRoster: () => navigate('/admin/rosters'),
    onGoStaff: () => navigate('/admin/staff'),
    onGoShift: () => navigate('/admin/shift-distribution'),
    onGoManageLeave: () => navigate('/admin/manage-leave'),
    onLogout: handleLogout,
  };

  const handleUserGoHome = () => navigate('/user/home');
  const handleUserGoRoster = () => navigate('/user/roster');
  const handleUserGoShiftPref = () => navigate('/user/preferences');
  const handleUserGoLeave = () => navigate('/user/leave');
  const handleUserGoAccount = () => navigate('/user/account');

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* --- PUBLIC ROUTES --- */}
      <Route
        path="/login"
        element={
          loggedInUser && loggedInUser.role ? (
             <Navigate to={(loggedInUser.role === 'APN' || loggedInUser.role === 'USER') ? '/user/home' : '/admin/home'} replace />
          ) : (
            <Login
              onAdminLoginSuccess={handleLogin}
              onUserLoginSuccess={handleLogin}
              onGoSignup={() => navigate('/signup')}
            />
          )
        }
      />
      <Route
        path="/signup"
        element={<SignUp onDone={() => navigate('/login')} />}
      />

      {/* --- ADMIN ROUTES (Secured) --- */}
      {/* Added 'SuperAdmin' (no space) just in case your DB has it that way */}
      <Route element={<ProtectedRoute user={loggedInUser} allowedRoles={['Admin', 'Super Admin', 'SuperAdmin', 'ADMIN', 'SUPER ADMIN']} />}>
        <Route
          path="/admin/home"
          element={<AdminHomePage {...navProps} user={loggedInUser} />}
        />
        <Route
          path="/admin/rosters"
          element={
            <AdminRosterPage
              {...navProps}
              onOpenRoster={(id, month, year) => {
                setRosterId(id);
                setRosterMonth(month);
                setRosterYear(year);
                navigate('/admin/rosters/view');
              }}
              loggedInUser={loggedInUser}
            />
          }
        />
        <Route
          path="/admin/rosters/view"
          element={
            <AdminRosterView
              {...navProps}
              rosterId={rosterId}
              month={rosterMonth}
              year={rosterYear}
              loggedInUser={loggedInUser}
              onBack={() => navigate('/admin/rosters')}
            />
          }
        />
        <Route
          path="/admin/staff"
          element={
            <AdminStaffManagementPage
              {...navProps}
              onGoManageLeave={() => navigate('/admin/manage-leave')}
              currentUserRole={currentUserRole}
              loggedInUser={loggedInUser}
            />
          }
        />
        <Route
          path="/admin/shift-distribution"
          element={<AdminShiftDistributionPage {...navProps} />}
        />
        <Route
          path="/admin/manage-leave"
          element={
            <AdminManageLeave
              {...navProps}
              onBack={() => navigate('/admin/staff')}
            />
          }
        />
        <Route
          path="/admin/new-staff"
          element={<AdminNewAccounts {...navProps} />}
        />
      </Route>

      {/* --- USER ROUTES (Secured) --- */}
      <Route element={<ProtectedRoute user={loggedInUser} allowedRoles={['APN', 'User', 'USER']} />}>
        <Route
          path="/user/home"
          element={
            <UserHomePage
              user={loggedInUser}
              onGoHome={handleUserGoHome}
              onGoRoster={handleUserGoRoster}
              onGoShiftPreference={handleUserGoShiftPref}
              onGoApplyLeave={handleUserGoLeave}
              onGoAccount={handleUserGoAccount}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/user/roster"
          element={
            <UserRoster
              onGoHome={handleUserGoHome}
              onGoRoster={handleUserGoRoster}
              onGoShiftPreference={handleUserGoShiftPref}
              onGoApplyLeave={handleUserGoLeave}
              onGoAccount={handleUserGoAccount}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/user/preferences"
          element={
            <UserShiftPref
              onBack={handleUserGoHome}
              onGoHome={handleUserGoHome}
              onGoRoster={handleUserGoRoster}
              onGoShiftPreference={handleUserGoShiftPref}
              onGoApplyLeave={handleUserGoLeave}
              onGoAccount={handleUserGoAccount}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/user/leave"
          element={
            <UserApplyLeave
              loggedInUser={loggedInUser}
              onBack={handleUserGoHome}
              onGoHome={handleUserGoHome}
              onGoRoster={handleUserGoRoster}
              onGoShiftPreference={handleUserGoShiftPref}
              onGoApplyLeave={handleUserGoLeave}
              onGoAccount={handleUserGoAccount}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/user/account"
          element={
            <UserAccountInformation
              loggedInUser={loggedInUser}
              onGoHome={handleUserGoHome}
              onGoRoster={handleUserGoRoster}
              onGoShiftPreference={handleUserGoShiftPref}
              onGoApplyLeave={handleUserGoLeave}
              onGoAccount={handleUserGoAccount}
              onLogout={handleLogout}
            />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;