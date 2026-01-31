// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  // 1. Retrieve the user from localStorage
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  // 2. Check if user exists (Is Logged In?)
  if (!user) {
    // If not logged in, redirect to Login page
    return <Navigate to="/" replace />;
  }

  // 3. Check for Role (Optional but recommended for Admin vs User)
  // Assuming your user object has a 'role' property like 'Admin' or 'APN'
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If logged in but wrong role (e.g. User trying to access Admin page)
    // Redirect to an unauthorized page or their own home page
    return <Navigate to="/unauthorized" replace />; // Or send them to "/"
  }

  // 4. If all checks pass, render the child components (The Page)
  return <Outlet />;
};

export default ProtectedRoute;