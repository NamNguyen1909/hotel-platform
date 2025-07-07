// Cấu hình Axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/', // Thay bằng URL của Django API
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;