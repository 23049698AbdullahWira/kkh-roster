import React, { useState } from 'react';
import './App.css';
import Login from './Auth/Login.js';
import AdminHomePage from './Admin/AdminHomePage.js';
import AdminRosterPage from './Admin/AdminRoster.js';          // All Rosters list
import AdminRosterView from './Admin/AdminRosterView.js';      // Single month sheet
import AdminStaffManagementPage from './Admin/AdminStaffManagement.js';
import AdminShiftDistributionPage from './Admin/AdminShiftDistribution.js';
import AdminNewAccounts from './Admin/AdminNewStaffAcounts.js';
import AdminManageLeave from './Admin/AdminManageLeave.js';
import UserHomePage from './User/UserHomePage.js';            // user home
import UserRoster from './User/UserRoster.js';                // user roster view
import UserShiftPref from './User/UserShiftPref.js';         // user shift preference
import UserApplyLeave from './User/UserApplyLeave.js';
import UserAccountInformation from './User/UserAccountInformation.js';
import SignUp from './Auth/SignUp.js';

function App() {
  const [page, setPage] = useState('login');
  const [rosterMonth, setRosterMonth] = useState('December');
  const [rosterYear, setRosterYear] = useState(2025);
  const [loggedInUser, setLoggedInUser] = useState(null); // *** NEW: State to hold user data ***

  // *** UPDATED: Login success handlers now receive user data ***
  const handleAdminLogin = (userData) => {
    setLoggedInUser(userData);
    setPage('home');
  };

  const handleUserLogin = (userData) => {
    setLoggedInUser(userData);
    setPage('userHome');
  };

  // LOGIN
  if (page === 'login') {
    return (
      <Login
        onAdminLoginSuccess={handleAdminLogin}
        onUserLoginSuccess={handleUserLogin}
        onGoSignup={() => setPage('signup')}
      />
    );
  }

  if (page === 'signup') {
    return (
      <SignUp
        onDone={() => setPage('login')}
      />
    );
  }

  // shared navbar navigation for all ADMIN pages
  const navProps = {
    onGoHome: () => setPage('home'),
    onGoRoster: () => setPage('rosterList'),
    onGoStaff: () => setPage('staff'),
    onGoShift: () => setPage('shift'),
  };

  // All Rosters page (table of months)
  if (page === 'rosterList') {
    return (
      <AdminRosterPage
        {...navProps}
        onOpenRoster={(month, year) => {
          setRosterMonth(month);
          setRosterYear(year);
          setPage('rosterView');   // go to detailed sheet
        }}
      />
    );
  }

  // Single month roster sheet
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

  // Staff management
  if (page === 'staff') {
    return (
      <AdminStaffManagementPage
        {...navProps}
        onGoNewStaffAccounts={() => setPage('newStaff')}
        onGoManageLeave={() => setPage('manageLeave')}
      />
    );
  }

  // Shift distribution
  if (page === 'shift') {
    return <AdminShiftDistributionPage {...navProps} />;
  }

  // New staff accounts
  if (page === 'newStaff') {
    return (
      <AdminNewAccounts
        {...navProps}
        onBack={() => setPage('staff')}
      />
    );
  }

  // Manage leave
  if (page === 'manageLeave') {
    return (
      <AdminManageLeave
        {...navProps}
        onBack={() => setPage('staff')}
      />
    );
  }

  // USER home (non-admin)
if (page === 'userHome') {
  return (
    <UserHomePage
      onGoHome={() => setPage('userHome')}
      onGoRoster={() => setPage('userRoster')}
      onGoShiftPreference={() => setPage('userPreference')}
      onGoApplyLeave={() => setPage('userLeave')}
      onGoAccount={() => setPage('userAccount')}       // NEW
    />
  );
}

// USER roster view
if (page === 'userRoster') {
  return (
    <UserRoster
      onBack={() => setPage('userHome')}
      onGoHome={() => setPage('userHome')}
      onGoRoster={() => setPage('userRoster')}
      onGoShiftPreference={() => setPage('userPreference')}
      onGoApplyLeave={() => setPage('userLeave')}
      onGoAccount={() => setPage('userAccount')}       // NEW
    />
  );
}

// USER shift preference view
if (page === 'userPreference') {
  return (
    <UserShiftPref
      onBack={() => setPage('userHome')}
      onGoHome={() => setPage('userHome')}
      onGoRoster={() => setPage('userRoster')}
      onGoShiftPreference={() => setPage('userPreference')}
      onGoApplyLeave={() => setPage('userLeave')}
      onGoAccount={() => setPage('userAccount')}       // NEW
    />
  );
}

  // USER apply leave view
  if (page === 'userLeave') {
    return (
      <UserApplyLeave
        loggedInUser={loggedInUser} // *** NEW: Pass user data as a prop ***
        onBack={() => setPage('userHome')}
        onGoHome={() => setPage('userHome')}
        onGoRoster={() => setPage('userRoster')}
        onGoShiftPreference={() => setPage('userPreference')}
        onGoApplyLeave={() => setPage('userLeave')}
        onGoAccount={() => setPage('userAccount')}
      />
    );
  }

// USER account information view
if (page === 'userAccount') {
  return (
    <UserAccountInformation
      onGoHome={() => setPage('userHome')}
      onGoRoster={() => setPage('userRoster')}
      onGoShiftPreference={() => setPage('userPreference')}
      onGoApplyLeave={() => setPage('userLeave')}
      onGoAccount={() => setPage('userAccount')}       // keep for navbar
    />
  );
}


  // Default: admin home dashboard
  return <AdminHomePage {...navProps} />;
}

export default App;