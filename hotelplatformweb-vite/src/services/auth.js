// Authentication utilities
import api, { endpoints } from './apis';

export const authUtils = {
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
      // Return mock data for development
      const token = localStorage.getItem('access_token');
      if (token) {
        return {
          id: 1,
          username: 'demo_user',
          email: 'demo@hotel.com',
          full_name: 'Demo User',
          role: 'staff', // admin, staff, customer
          avatar: null,
        };
      }
      return null;
    }
  },

  // Logout user
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post(endpoints.auth.logout, {
          refresh: refreshToken
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear tokens regardless of API call result
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
      
      // Redirect to login
      window.location.href = '/login';
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
  }
};

export default authUtils;
