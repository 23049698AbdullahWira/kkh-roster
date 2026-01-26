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
  // 1) Correct useNavigate variable and only declare it once
  const navigate = useNavigate();

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

  // Rehydrate user from localStorage on first load
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setLoggedInUser(user);
      setCurrentUserRole(user.role);
    }
  }, []);

  // These are passed into admin pages for navbar buttons, etc.
  const navProps = {
    onGoHome: () => {},
    onGoRoster: () => {},
    onGoStaff: () => {},
    onGoShift: () => {},
    onLogout: handleLogout,
  };

  return (
    <Routes>
      {/* Default: visiting "/" goes to /login */}
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
            onStartNewRoster={() => {}}
            onAddNewStaff={() => {}}
            onManageLeave={() => {}}
            onStaffPreferences={() => {}}
          />
        }
      />
      <Route
        path="/admin/rosters"
        element={<AdminRosterPage {...navProps} />}
      />
      <Route
        path="/admin/rosters/view"
        element={<AdminRosterView {...navProps} />}
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
            onGoHome={() => {}}
            onGoRoster={() => {}}
            onGoShiftPreference={() => {}}
            onGoApplyLeave={() => {}}
            onGoAccount={() => {}}
            onLogout={handleLogout}
          />
        }
      />
      <Route
        path="/user/roster"
        element={
          <UserRoster
            onBack={() => {}}
            onGoHome={() => {}}
            onGoRoster={() => {}}
            onGoShiftPreference={() => {}}
            onGoApplyLeave={() => {}}
            onGoAccount={() => {}}
            onLogout={handleLogout}
          />
        }
      />
      <Route
        path="/user/preferences"
        element={
          <UserShiftPref
            onBack={() => {}}
            onGoHome={() => {}}
            onGoRoster={() => {}}
            onGoShiftPreference={() => {}}
            onGoApplyLeave={() => {}}
            onGoAccount={() => {}}
            onLogout={handleLogout}
          />
        }
      />
      <Route
        path="/user/leave"
        element={
          <UserApplyLeave
            loggedInUser={loggedInUser}
            onBack={() => {}}
            onGoHome={() => {}}
            onGoRoster={() => {}}
            onGoShiftPreference={() => {}}
            onGoApplyLeave={() => {}}
            onGoAccount={() => {}}
            onLogout={handleLogout}
          />
        }
      />
      <Route
        path="/user/account"
        element={
          <UserAccountInformation
            onGoHome={() => {}}
            onGoRoster={() => {}}
            onGoShiftPreference={() => {}}
            onGoApplyLeave={() => {}}
            onGoAccount={() => {}}
            onLogout={handleLogout}
          />
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
