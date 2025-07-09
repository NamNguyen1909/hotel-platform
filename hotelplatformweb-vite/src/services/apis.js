// Cấu hình Axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/', // Base URL của Django API
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor để thêm token vào header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor để xử lý token hết hạn
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`http://127.0.0.1:8000/api/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API Endpoints configuration
export const endpoints = {
  // Authentication endpoints
  auth: {
    login: '/api/auth/token/',
    register: '/users/', // Registration endpoint
    refresh: '/api/auth/token/refresh/',
    logout: '/api/auth/token/blacklist/',
    me: '/api/auth/user/', // Hoặc có thể là '/users/me/' tùy theo backend
  },
  
  // User management endpoints
  users: {
    list: '/users/',
    detail: (id) => `/users/${id}/`,
    create: '/users/',
    update: (id) => `/users/${id}/`,
    delete: (id) => `/users/${id}/`,
    profile: '/users/profile/',
    changePassword: '/users/change-password/',
  },
  
  // Hotel management endpoints
  hotels: {
    list: '/hotels/',
    detail: (id) => `/hotels/${id}/`,
    create: '/hotels/',
    update: (id) => `/hotels/${id}/`,
    delete: (id) => `/hotels/${id}/`,
    stats: '/hotels/stats/',
  },
  
  // Room management endpoints
  rooms: {
    list: '/rooms/',
    detail: (id) => `/rooms/${id}/`,
    create: '/rooms/',
    update: (id) => `/rooms/${id}/`,
    delete: (id) => `/rooms/${id}/`,
    available: '/rooms/available/',
    low_performance: '/rooms/low-performance/',
  },
  
  // Room types endpoints
  roomTypes: {
    list: '/room-types/',
    detail: (id) => `/room-types/${id}/`,
    create: '/room-types/',
    update: (id) => `/room-types/${id}/`,
    delete: (id) => `/room-types/${id}/`,
  },

  // Room images endpoints
  roomImages: {
    list: '/room-images/',
    detail: (id) => `/room-images/${id}/`,
    create: '/room-images/',
    update: (id) => `/room-images/${id}/`,
    delete: (id) => `/room-images/${id}/`,
    byRoom: (roomId) => `/room-images/by_room/?room_id=${roomId}`,
    setPrimary: (id) => `/room-images/${id}/set_primary/`,
  },
  
  // Booking management endpoints
  bookings: {
    list: '/bookings/',
    detail: (id) => `/bookings/${id}/`,
    create: '/bookings/',
    update: (id) => `/bookings/${id}/`,
    delete: (id) => `/bookings/${id}/`,
    cancel: (id) => `/bookings/${id}/cancel/`,
    confirm: (id) => `/bookings/${id}/confirm/`,
    checkin: (id) => `/bookings/${id}/checkin/`,
    checkout: (id) => `/bookings/${id}/checkout/`,
    myBookings: '/bookings/my-bookings/',
  },
  
  // Room rental endpoints
  rentals: {
    list: '/rentals/',
    detail: (id) => `/rentals/${id}/`,
    create: '/rentals/',
    update: (id) => `/rentals/${id}/`,
    delete: (id) => `/rentals/${id}/`,
    active: '/rentals/active/',
    history: '/rentals/history/',
  },
  
  // Payment endpoints
  payments: {
    list: '/payments/',
    detail: (id) => `/payments/${id}/`,
    create: '/payments/',
    update: (id) => `/payments/${id}/`,
    delete: (id) => `/payments/${id}/`,
    vnpay: {
      create: '/vnpay/create-payment/',
      redirect: '/vnpay/redirect/',
    },
    history: '/payments/history/',
    refund: (id) => `/payments/${id}/refund/`,
  },
  
  // Discount code endpoints
  discountCodes: {
    list: '/discount-codes/',
    detail: (id) => `/discount-codes/${id}/`,
    create: '/discount-codes/',
    update: (id) => `/discount-codes/${id}/`,
    delete: (id) => `/discount-codes/${id}/`,
    validate: '/discount-codes/validate/',
    apply: '/discount-codes/apply/',
  },
  
  // Notification endpoints
  notifications: {
    list: '/notifications/',
    detail: (id) => `/notifications/${id}/`,
    create: '/notifications/',
    update: (id) => `/notifications/${id}/`,
    delete: (id) => `/notifications/${id}/`,
    markRead: (id) => `/notifications/${id}/mark-read/`,
    markAllRead: '/notifications/mark-all-read/',
    unread: '/notifications/unread/',
  },
  
  // QR Code endpoints
  qr: {
    generate: '/api/qr-generate/',
    scan: '/api/qr-scan/',
  },
  
  // Statistics endpoints
  stats: {
    overview: '/api/stats/',
    revenue: '/api/stats/revenue/',
    bookings: '/api/stats/bookings/',
    occupancy: '/api/stats/occupancy/',
    customers: '/api/stats/customers/',
  },
  
  // File upload endpoints
  files: {
    upload: '/files/upload/',
    delete: (id) => `/files/${id}/`,
    avatar: '/files/avatar/',
  },
  
  // Settings endpoints
  settings: {
    general: '/settings/general/',
    hotel: '/settings/hotel/',
    payment: '/settings/payment/',
    notification: '/settings/notification/',
  },
};

// Helper functions for room image management
export const roomImageHelpers = {
  // Upload multiple images for a room
  uploadImages: async (roomId, files) => {
    const formData = new FormData();
    formData.append('room', roomId);
    
    const uploadPromises = files.map(async (file, index) => {
      const fileFormData = new FormData();
      fileFormData.append('room', roomId);
      fileFormData.append('image', file);
      fileFormData.append('caption', file.name);
      fileFormData.append('is_primary', index === 0); // First image is primary by default
      
      return api.post(endpoints.roomImages.create, fileFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    });
    
    return Promise.all(uploadPromises);
  },

  // Get all images for a specific room
  getRoomImages: async (roomId) => {
    return api.get(endpoints.roomImages.byRoom(roomId));
  },

  // Set an image as primary
  setPrimaryImage: async (imageId) => {
    return api.post(endpoints.roomImages.setPrimary(imageId));
  },

  // Delete an image
  deleteImage: async (imageId) => {
    return api.delete(endpoints.roomImages.delete(imageId));
  },

  // Update image caption
  updateImage: async (imageId, data) => {
    return api.put(endpoints.roomImages.update(imageId), data);
  }
};

export default api;