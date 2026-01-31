// src/services/api.js

// 1. ADD 'export' HERE so other files can use this variable
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://kkh-rostering-application-fyp-republic.onrender.com';

export const fetchFromApi = async (endpoint, options = {}) => {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Combine Base URL + Endpoint
  const url = `${API_BASE_URL}${cleanEndpoint}`; 

  const headers = { ...options.headers };

  // Only add JSON content type if NOT sending a file (FormData)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})); 
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
};
