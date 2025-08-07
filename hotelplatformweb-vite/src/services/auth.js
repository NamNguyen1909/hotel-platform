import api, { endpoints } from './apis';

// Authentication utilities
const authUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  // Get current user info
  getCurrentUser: async () => {
    try {
      const response = await api.get(endpoints.users.profile);
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      // Clear tokens if user info fetch fails (authentication error)
      authUtils.clearTokens();
      return null;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post(endpoints.auth.token, {
        email,
        password,
      });
      const { access, refresh } = response.data;
      authUtils.setTokens(access, refresh);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }
      const response = await api.post(endpoints.auth.refresh, {
        refresh: refreshToken,
      });
      const { access } = response.data;
      authUtils.setTokens(access, refreshToken);
      return access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  },

  // Get access token
  getToken: () => {
    return localStorage.getItem('access_token');
  },

  // Set tokens
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
  },

  // Clear tokens
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
  },

  // Setup axios interceptors
  setupInterceptors: () => {
    api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newToken = await authUtils.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            authUtils.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  },
};

export default authUtils;