import React, { useState } from 'react';
import './App.css';
import Login from './Auth/Login.js';
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
import SignUp from './Auth/SignUp.js';

function App() {
  // --- All state hooks are now at the top level ---
  const [page, setPage] = useState('login');
  const [rosterMonth, setRosterMonth] = useState('December');
  const [rosterYear, setRosterYear] = useState(2025);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // --- Consolidated login handlers ---
  const handleAdminLogin = (userData) => {
    setLoggedInUser(userData);
    setCurrentUserRole(userData.role); // Set role from user data
    setPage('home');
  };

  const handleUserLogin = (userData) => {
    setLoggedInUser(userData);
    setCurrentUserRole(userData.role); // Set role from user data
    setPage('userHome');
  };

    const handleLogout = () => {
    // Clear stored user
    localStorage.removeItem('user');
    setLoggedInUser(null);
    setCurrentUserRole(null);
    setPage('login');
  };


  // --- Render logic ---

  // LOGIN PAGE
  if (page === 'login') {
    // This is now the single, correct way to render Login
    return (
      <Login
        onAdminLoginSuccess={handleAdminLogin}
        onUserLoginSuccess={handleUserLogin}
        onGoSignup={() => setPage('signup')}
      />
    );
  }

  // SIGNUP PAGE
  if (page === 'signup') {
    return <SignUp onDone={() => setPage('login')} />;
  }

  // SHARED NAVBAR PROPS FOR ADMIN
  const navProps = {
    onGoHome: () => setPage('home'),
    onGoRoster: () => setPage('rosterList'),
    onGoStaff: () => setPage('staff'),
    onGoShift: () => setPage('shift'),
    onLogout: handleLogout,
  };

  // ROSTER LIST PAGE (ADMIN)
  if (page === 'rosterList') {
    return (
      <AdminRosterPage
        {...navProps}
        onOpenRoster={(month, year) => {
          setRosterMonth(month);
          setRosterYear(year);
          setPage('rosterView');
        }}
      />
    );
  }

  // ROSTER VIEW PAGE (ADMIN)
  if (page === 'rosterView') {
    return (
      <AdminRosterView
        {...navProps}
        month={rosterMonth}
        year={rosterYear}
        onBack={() => setPage('rosterList')}
      />
    );
  }

  // STAFF MANAGEMENT PAGE (ADMIN)
  if (page === 'staff') {
    return (
      <AdminStaffManagementPage
        {...navProps}
        onGoNewStaffAccounts={() => setPage('newStaff')}
        onGoManageLeave={() => setPage('manageLeave')}
        currentUserRole={currentUserRole}
        loggedInUser={loggedInUser}
      />
    );
  }

  // SHIFT DISTRIBUTION PAGE (ADMIN)
  if (page === 'shift') {
    return <AdminShiftDistributionPage {...navProps} />;
  }

  // NEW STAFF ACCOUNTS PAGE (ADMIN)
  if (page === 'newStaff') {
    return <AdminNewAccounts {...navProps} onBack={() => setPage('staff')} />;
  }

  // MANAGE LEAVE PAGE (ADMIN)
  if (page === 'manageLeave') {
    return <AdminManageLeave {...navProps} onBack={() => setPage('staff')} />;
  }

  // --- USER PAGES ---

  // USER HOME PAGE
  if (page === 'userHome') {
    return (
      <UserHomePage
        user={loggedInUser} // Pass the full loggedInUser object
        onGoHome={() => setPage('userHome')}
        onGoRoster={() => setPage('userRoster')}
        onGoShiftPreference={() => setPage('userPreference')}
        onGoApplyLeave={() => setPage('userLeave')}
        onGoAccount={() => setPage('userAccount')}
        onLogout={handleLogout}
      />
    );
  }

  // USER ROSTER PAGE
  if (page === 'userRoster') {
    return (
      <UserRoster
        onBack={() => setPage('userHome')}
        onGoHome={() => setPage('userHome')}
        onGoRoster={() => setPage('userRoster')}
        onGoShiftPreference={() => setPage('userPreference')}
        onGoApplyLeave={() => setPage('userLeave')}
        onGoAccount={() => setPage('userAccount')}
        onLogout={handleLogout}
      />
    );
  }

  // USER SHIFT PREFERENCE PAGE
  if (page === 'userPreference') {
    return (
      <UserShiftPref
        onBack={() => setPage('userHome')}
        onGoHome={() => setPage('userHome')}
        onGoRoster={() => setPage('userRoster')}
        onGoShiftPreference={() => setPage('userPreference')}
        onGoApplyLeave={() => setPage('userLeave')}
        onGoAccount={() => setPage('userAccount')}
        onLogout={handleLogout}
      />
    );
  }

  // USER APPLY LEAVE PAGE
  if (page === 'userLeave') {
    return (
      <UserApplyLeave
        loggedInUser={loggedInUser} // Pass the full loggedInUser object
        onBack={() => setPage('userHome')}
        onGoHome={() => setPage('userHome')}
        onGoRoster={() => setPage('userRoster')}
        onGoShiftPreference={() => setPage('userPreference')}
        onGoApplyLeave={() => setPage('userLeave')}
        onGoAccount={() => setPage('userAccount')}
        onLogout={handleLogout}
      />
    );
  }

  // USER ACCOUNT INFO PAGE
  if (page === 'userAccount') {
    return (
      <UserAccountInformation
        onGoHome={() => setPage('userHome')}
        onGoRoster={() => setPage('userRoster')}
        onGoShiftPreference={() => setPage('userPreference')}
        onGoApplyLeave={() => setPage('userLeave')}
        onGoAccount={() => setPage('userAccount')}
        onLogout={handleLogout}
      />
    );
  }

  // DEFAULT FALLBACK: ADMIN HOME PAGE
  return (
  <AdminHomePage
    {...navProps}
    user={loggedInUser}
    onStartNewRoster={() => setPage('rosterList')}
    onAddNewStaff={() => setPage('staff')}
    onManageLeave={() => setPage('manageLeave')}
    onStaffPreferences={() => setPage('shift')} // or another page
  />
);
}

export default App;