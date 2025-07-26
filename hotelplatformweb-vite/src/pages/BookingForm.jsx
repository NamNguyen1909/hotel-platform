import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import api from '../services/apis';
import authUtils from '../services/auth';
import vi from 'date-fns/locale/vi';
import { format } from 'date-fns';

const BookingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId, checkInDate, checkOutDate, guestCount } = location.state || {};

  const [formData, setFormData] = useState({
    customer: '',
    rooms: roomId ? [roomId] : [],
    checkInDate: checkInDate || null,
    checkOutDate: checkOutDate || null,
    guestCount: guestCount || 1,
    specialRequests: '',
  });
  const [customers, setCustomers] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Kiểm tra quyền nhân viên
  useEffect(() => {
    const checkPermission = async () => {
      if (!authUtils.isAuthenticated()) {
        navigate('/login');
        return;
      }
      const user = await authUtils.getCurrentUser();
      if (!['staff', 'admin', 'owner'].includes(user?.role)) {
        setError('Bạn không có quyền tạo đặt phòng.');
        navigate('/');
      }
    };
    checkPermission();
  }, [navigate]);

  // Lấy danh sách khách hàng
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('/users/?role=customer');
        setCustomers(response.data.results || []);
      } catch (err) {
        setError('Không thể tải danh sách khách hàng.');
      }
    };
    fetchCustomers();
  }, []);

  // Kiểm tra phòng trống dựa trên ngày nhận/trả phòng
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (formData.checkInDate && formData.checkOutDate) {
        try {
          const response = await api.get('/rooms/available/', {
            params: {
              check_in_date: format(formData.checkInDate, 'yyyy-MM-dd'),
              check_out_date: format(formData.checkOutDate, 'yyyy-MM-dd'),
            },
          });
          setAvailableRooms(response.data || []);
          // Nếu roomId từ location.state không có trong danh sách phòng trống, xóa nó
          if (roomId && !response.data.some((room) => room.id === roomId)) {
            setFormData((prev) => ({ ...prev, rooms: [] }));
          }
        } catch (err) {
          setError('Không thể tải danh sách phòng trống.');
        }
      }
    };
    fetchAvailableRooms();
  }, [formData.checkInDate, formData.checkOutDate, roomId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoomChange = (e) => {
    const selectedRooms = e.target.value;
    setFormData((prev) => ({ ...prev, rooms: selectedRooms }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Kiểm tra dữ liệu đầu vào
    if (!formData.customer) {
      setError('Vui lòng chọn khách hàng.');
      setLoading(false);
      return;
    }
    if (!formData.rooms.length) {
      setError('Vui lòng chọn ít nhất một phòng.');
      setLoading(false);
      return;
    }
    if (!formData.checkInDate || !formData.checkOutDate) {
      setError('Vui lòng chọn ngày nhận và trả phòng.');
      setLoading(false);
      return;
    }
    if (formData.checkInDate >= formData.checkOutDate) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        customer: formData.customer,
        rooms: formData.rooms,
        check_in_date: format(formData.checkInDate, 'yyyy-MM-dd'),
        check_out_date: format(formData.checkOutDate, 'yyyy-MM-dd'),
        guest_count: parseInt(formData.guestCount) || 1,
        special_requests: formData.specialRequests,
      };

      const response = await api.post('/bookings/', payload);
      setSuccess('Tạo đặt phòng thành công!');
      setTimeout(() => navigate('/staff/bookings'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Không thể tạo đặt phòng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#8B4513' }}>
        Tạo Đặt Phòng
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Khách hàng</InputLabel>
              <Select
                name="customer"
                value={formData.customer}
                onChange={handleInputChange}
                label="Khách hàng"
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.full_name} ({customer.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Phòng</InputLabel>
              <Select
                name="rooms"
                multiple
                value={formData.rooms}
                onChange={handleRoomChange}
                label="Phòng"
                disabled={!formData.checkInDate || !formData.checkOutDate}
              >
                {availableRooms.map((room) => (
                  <MenuItem key={room.id} value={room.id}>
                    {room.room_number} - {room.room_type} (Giá: {room.price_per_night.toLocaleString('vi-VN')} VND)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Ngày nhận phòng"
                value={formData.checkInDate}
                onChange={(newValue) => setFormData((prev) => ({ ...prev, checkInDate: newValue }))}
                minDate={new Date()}
                maxDate={new Date(new Date().setDate(new Date().getDate() + 28))}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Ngày trả phòng"
                value={formData.checkOutDate}
                onChange={(newValue) => setFormData((prev) => ({ ...prev, checkOutDate: newValue }))}
                minDate={formData.checkInDate || new Date()}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Số khách"
              name="guestCount"
              value={formData.guestCount}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 1 } }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Yêu cầu đặc biệt"
              name="specialRequests"
              value={formData.specialRequests}
              onChange={handleInputChange}
              multiline
              rows={3}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: '#DAA520', '&:hover': { bgcolor: '#B8860B' } }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Tạo Đặt Phòng'}
            </Button>
            <Button
              variant="outlined"
              sx={{ ml: 2, borderColor: '#DAA520', color: '#DAA520' }}
              onClick={() => navigate('/staff/bookings')}
            >
              Hủy
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default BookingForm;