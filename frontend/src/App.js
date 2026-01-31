// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [rosterId, setRosterId] = useState(null);
  const [rosterMonth, setRosterMonth] = useState('December');
  const [rosterYear, setRosterYear] = useState(2025);

  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const handleAdminLogin = (userData) => {
    setLoggedInUser(userData);
    setCurrentUserRole(userData.role);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleUserLogin = (userData) => {
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

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setLoggedInUser(user);
      setCurrentUserRole(user.role);
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

      {/* Public auth routes */}
      <Route
        path="/login"
        element={
          <Login
            onAdminLoginSuccess={handleAdminLogin}
            onUserLoginSuccess={handleUserLogin}
            onGoSignup={() => navigate('/signup')}
          />
        }
      />
      <Route
        path="/signup"
        element={<SignUp onDone={() => navigate('/login')} />}
      />

      {/* Admin routes */}
      <Route
        path="/admin/home"
        element={
          <AdminHomePage
  {...navProps}
  user={loggedInUser}
/>

        }
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

      

      {/* User routes */}
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
      onGoHome={() => navigate('/user/home')}
      onGoRoster={() => navigate('/user/roster')}
      onGoShiftPreference={() => navigate('/user/preferences')}
      onGoApplyLeave={() => navigate('/user/leave')}
      onGoAccount={() => navigate('/user/account')}
      onLogout={handleLogout}
    />
  }
/>

<Route
  path="/user/preferences"
  element={
    <UserShiftPref
      onBack={() => navigate('/user/home')}
      onGoHome={() => navigate('/user/home')}
      onGoRoster={() => navigate('/user/roster')}
      onGoShiftPreference={() => navigate('/user/preferences')}
      onGoApplyLeave={() => navigate('/user/leave')}
      onGoAccount={() => navigate('/user/account')}
      onLogout={handleLogout}
    />
  }
/>
<Route
  path="/user/leave"
  element={
    <UserApplyLeave
      loggedInUser={loggedInUser}
      onBack={() => navigate('/user/home')}
      onGoHome={() => navigate('/user/home')}
      onGoRoster={() => navigate('/user/roster')}
      onGoShiftPreference={() => navigate('/user/preferences')}
      onGoApplyLeave={() => navigate('/user/leave')}
      onGoAccount={() => navigate('/user/account')}
      onLogout={handleLogout}
    />
  }
/>
<Route
  path="/user/account"
  element={
    <UserAccountInformation
      loggedInUser={loggedInUser}
      onGoHome={() => navigate('/user/home')}
      onGoRoster={() => navigate('/user/roster')}
      onGoShiftPreference={() => navigate('/user/preferences')}
      onGoApplyLeave={() => navigate('/user/leave')}
      onGoAccount={() => navigate('/user/account')}
      onLogout={handleLogout}
    />
  }
/>

      

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
