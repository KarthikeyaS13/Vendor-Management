/**
 * Base API client configuration and interceptors.
 * Replace the baseURL with the actual API endpoint when available.
 */
const BASE_URL = '/api';

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Core fetch wrapper with JSON parsing and error handling.
 * @param {string} endpoint - The relative API endpoint (e.g., '/dashboard/stats').
 * @param {RequestInit} [options={}] - Standard fetch options.
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Use the correct token based on the current portal to allow concurrent sessions
  const isPortal = window.location.pathname.startsWith('/portal');
  const tokenKey = isPortal ? 'token' : 'adminToken';
  
  const token = localStorage.getItem(tokenKey);
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // If response is no content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
      }
      throw new ApiError(
        data?.message || response.statusText || 'An error occurred during the API request.',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Handle network errors or other unexpected errors
    throw new ApiError(error.message || 'Network error', 0, null);
  }
}
