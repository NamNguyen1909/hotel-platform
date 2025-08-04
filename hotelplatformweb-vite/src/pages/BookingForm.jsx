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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Card,
  Grid,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Close as CloseIcon } from '@mui/icons-material';
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
    discountCode: '',
  });
  const [customers, setCustomers] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [maxGuests, setMaxGuests] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [discountValidation, setDiscountValidation] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [bookingPreview, setBookingPreview] = useState(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (!authUtils.isAuthenticated()) {
        navigate('/login');
        return;
      }
      try {
        const userData = await authUtils.getCurrentUser();
        setUser(userData);
        setUserRole(userData?.role || '');
        if (userData?.role === 'customer') {
          setFormData(prev => ({ ...prev, customer: userData.id }));
        }
        if (!['customer', 'staff', 'admin', 'owner'].includes(userData?.role)) {
          setError('Bạn không có quyền tạo đặt phòng.');
          navigate('/');
        }
      } catch (err) {
        setError('Không thể xác thực người dùng.');
        navigate('/login');
      }
    };
    checkPermission();
  }, [navigate]);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (['staff', 'admin', 'owner'].includes(userRole)) {
        try {
          const response = await api.get('/users/?role=customer');
          setCustomers(response.data?.results || []);
        } catch (err) {
          setError('Không thể tải danh sách khách hàng.');
        }
      }
    };
    fetchCustomers();
  }, [userRole]);

  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (formData.checkInDate && formData.checkOutDate && formData.checkInDate instanceof Date && formData.checkOutDate instanceof Date && !isNaN(formData.checkInDate) && !isNaN(formData.checkOutDate)) {
        try {
          const response = await api.get('/rooms/available/', {
            params: {
              check_in_date: format(formData.checkInDate, 'yyyy-MM-dd'),
              check_out_date: format(formData.checkOutDate, 'yyyy-MM-dd'),
            },
          });
          setAvailableRooms(response.data || []);
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

  useEffect(() => {
    if (formData.rooms.length && availableRooms.length) {
      const selectedRoom = availableRooms.find(room => room.id === formData.rooms[0]);
      if (selectedRoom) {
        const maxGuestsValue = selectedRoom.room_type?.max_guests || 1;
        setMaxGuests(maxGuestsValue);
        if (formData.guestCount > maxGuestsValue) {
          setFormData(prev => ({ ...prev, guestCount: maxGuestsValue }));
        }
      } else {
        setMaxGuests(null);
      }
    } else {
      setMaxGuests(null);
    }
  }, [formData.rooms, availableRooms]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'guestCount') {
      const newValue = parseInt(value) || 1;
      if (maxGuests && newValue > maxGuests) {
        setError(`Số khách không được vượt quá ${maxGuests} người cho phòng này.`);
        return;
      }
      setError(null);
      setFormData((prev) => ({ ...prev, [name]: newValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRoomChange = (e) => {
    const selectedRoom = e.target.value;
    setFormData((prev) => ({
      ...prev,
      rooms: selectedRoom && selectedRoom !== '' ? [selectedRoom] : [],
    }));
    setError(null);
  };

  const handleDiscountCodeChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, discountCode: value }));
    setDiscountValidation(null);
  };

  const validateDiscountCode = async () => {
    if (!formData.discountCode) {
      setDiscountValidation(null);
      return;
    }
    try {
      const response = await api.post('/discount-codes/validate/', {
        code: formData.discountCode,
        check_in_date: formData.checkInDate && formData.checkInDate instanceof Date
          ? format(formData.checkInDate, 'yyyy-MM-dd')
          : null,
        check_out_date: formData.checkOutDate && formData.checkOutDate instanceof Date
          ? format(formData.checkOutDate, 'yyyy-MM-dd')
          : null,
      });
      setDiscountValidation(response.data);
    } catch (err) {
      let errorMessage = 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.status === 404) {
        errorMessage = 'Mã giảm giá không tồn tại.';
      }
      setDiscountValidation({ valid: false, message: errorMessage });
    }
  };

  const calculateTotalPrice = () => {
    if (
      !formData.rooms.length ||
      !formData.checkInDate ||
      !formData.checkOutDate ||
      !availableRooms.length ||
      !(formData.checkInDate instanceof Date) ||
      !(formData.checkOutDate instanceof Date) ||
      isNaN(formData.checkInDate) ||
      isNaN(formData.checkOutDate)
    ) {
      return 0;
    }
    const selectedRoom = availableRooms.find(room => room.id === formData.rooms[0]);
    if (!selectedRoom) return 0;
    const nights = Math.ceil((formData.checkOutDate - formData.checkInDate) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return 0;
    return selectedRoom.price_per_night * nights;
  };

  const calculateDiscountedPrice = () => {
    const totalPrice = calculateTotalPrice();
    if (discountValidation?.valid) {
      const discountPercentage = discountValidation.discount.discount_percentage;
      return totalPrice * (1 - discountPercentage / 100);
    }
    return totalPrice;
  };

  const handlePreview = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (['staff', 'admin', 'owner'].includes(userRole) && !formData.customer) {
      setError('Vui lòng chọn khách hàng.');
      setLoading(false);
      return;
    }
    if (!formData.rooms.length) {
      setError('Vui lòng chọn một phòng.');
      setLoading(false);
      return;
    }
    if (
      !formData.checkInDate ||
      !formData.checkOutDate ||
      !(formData.checkInDate instanceof Date) ||
      !(formData.checkOutDate instanceof Date) ||
      isNaN(formData.checkInDate) ||
      isNaN(formData.checkOutDate)
    ) {
      setError('Vui lòng chọn ngày nhận và trả phòng.');
      setLoading(false);
      return;
    }
    if (formData.checkInDate >= formData.checkOutDate) {
      setError('Ngày trả phòng phải sau ngày nhận phòng.');
      setLoading(false);
      return;
    }
    if (maxGuests && formData.guestCount > maxGuests) {
      setError(`Số khách không được vượt quá ${maxGuests} người cho phòng này.`);
      setLoading(false);
      return;
    }
    try {
      const selectedRoom = availableRooms.find(room => room.id === formData.rooms[0]);
      if (!selectedRoom) {
        setError('Phòng đã chọn không hợp lệ.');
        setLoading(false);
        return;
      }
      const nights = Math.ceil((formData.checkOutDate - formData.checkInDate) / (1000 * 60 * 60 * 24));
      const totalPrice = calculateTotalPrice();
      const discountedPrice = calculateDiscountedPrice();
      const previewData = {
        room: selectedRoom,
        nights,
        totalPrice,
        discountedPrice,
        discount: discountValidation?.valid ? discountValidation : null,
        checkInDate: format(formData.checkInDate, 'dd/MM/yyyy'),
        checkOutDate: format(formData.checkOutDate, 'dd/MM/yyyy'),
        guestCount: formData.guestCount,
      };
      setBookingPreview(previewData);
      setPreviewDialogOpen(true);
    } catch (err) {
      setError('Không thể tạo bản xem trước. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreviewDialogOpen(false);
    try {
      if (maxGuests && formData.guestCount > maxGuests) {
        setError(`Số khách không được vượt quá ${maxGuests} người cho phòng này.`);
        setLoading(false);
        setPreviewDialogOpen(true);
        return;
      }
      const payload = {
        customer: userRole === 'customer' ? user?.id : formData.customer,
        rooms: formData.rooms,
        check_in_date: formData.checkInDate && formData.checkInDate instanceof Date
          ? format(formData.checkInDate, "yyyy-MM-dd'T14:00:00Z'")
          : null,
        check_out_date: formData.checkOutDate && formData.checkOutDate instanceof Date
          ? format(formData.checkOutDate, "yyyy-MM-dd'T12:00:00Z'")
          : null,
        guest_count: parseInt(formData.guestCount) || 1,
        special_requests: formData.specialRequests,
      };
      if (discountValidation?.valid) {
        payload.discount_code = formData.discountCode;
      }
      const response = await api.post('/bookings/', payload);
      await api.post('/notifications/', {
        type: 'booking_confirmation',
        booking_id: response.data.id,
        message: `Đặt phòng ${response.data.id} đã được xác nhận cho phòng ${formData.rooms.join(', ')} từ ${format(formData.checkInDate, 'dd/MM/yyyy')} đến ${format(formData.checkOutDate, 'dd/MM/yyyy')}.`,
      });
      setSuccess(`Đặt phòng thành công! Mã đặt phòng: ${response.data.id}. Thông báo xác nhận đã được gửi.`);
      setTimeout(() => navigate(userRole === 'customer' ? '/my-bookings' : '/staff/bookings'), 3000);
    } catch (err) {
      let errorMessage = 'Không thể tạo đặt phòng. Vui lòng thử lại.';
      if (err.response?.data) {
        const errors = err.response.data;
        if (errors.rooms) {
          errorMessage = 'Phòng không khả dụng trong khoảng thời gian đã chọn.';
        } else if (errors.guest_count) {
          errorMessage = errors.guest_count;
        } else if (errors.check_in_date) {
          errorMessage = errors.check_in_date;
        } else if (errors.check_out_date) {
          errorMessage = errors.check_out_date;
        } else if (errors.discount_code) {
          errorMessage = errors.discount_code;
        } else if (errors.detail) {
          errorMessage = errors.detail;
        } else {
          errorMessage = Object.values(errors).flat().join(' ');
        }
      }
      setError(errorMessage);
      setPreviewDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreviewDialog = () => {
    setPreviewDialogOpen(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <Box sx={{ 
      bgcolor: 'background.default', 
      minHeight: '100vh', 
      py: { xs: 3, sm: 6 }, 
      px: { xs: 2, sm: 0 }
    }}>
      <Container maxWidth="md">
        <Typography 
          variant="h3" 
          sx={{ 
            fontFamily: 'Inter', 
            color: '#8B4513', 
            fontWeight: 700, 
            mb: 4, 
            textAlign: 'center',
            fontSize: { xs: '1.8rem', sm: '2.5rem' },
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          Đặt Phòng Của Sự Sang Trọng
        </Typography>
        <Card 
          sx={{ 
            p: { xs: 2, sm: 4 }, 
            borderRadius: 4, 
            boxShadow: '0 8px 24px rgba(139, 69, 19, 0.2)', 
            bgcolor: '#FFF8DC',
            border: '1px solid rgba(139, 69, 19, 0.1)'
          }}
        >
          <Box component="form" onSubmit={handlePreview}>
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontFamily: 'Inter' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontFamily: 'Inter' }}>{success}</Alert>}
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {['staff', 'admin', 'owner'].includes(userRole) && (
                <Grid item xs={12}>
                  <FormControl 
                    fullWidth 
                    required 
                    sx={{ 
                      bgcolor: 'white', 
                      borderRadius: 3,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: '#DAA520',
                        },
                        '&:hover fieldset': {
                          borderColor: '#B8860B',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#8B4513',
                        },
                      },
                    }}
                  >
                    <InputLabel 
                      sx={{ 
                        fontFamily: 'Inter',
                        color: '#8B4513',
                        '&.Mui-focused': {
                          color: '#8B4513',
                        },
                      }}
                    >
                      Khách hàng
                    </InputLabel>
                    <Select
                      name="customer"
                      value={formData.customer}
                      onChange={handleInputChange}
                      label="Khách hàng"
                      sx={{ fontFamily: 'Inter', color: '#333' }}
                    >
                      <MenuItem value="" disabled sx={{ fontFamily: 'Inter' }}>
                        Chọn khách hàng
                      </MenuItem>
                      {customers.map((customer) => (
                        <MenuItem 
                          key={customer.id} 
                          value={customer.id} 
                          sx={{ 
                            fontFamily: 'Inter',
                            '&:hover': {
                              bgcolor: 'rgba(218, 165, 32, 0.1)',
                            },
                            '&.Mui-selected': {
                              bgcolor: 'rgba(218, 165, 32, 0.2)',
                            },
                            '&.Mui-selected:hover': {
                              bgcolor: 'rgba(218, 165, 32, 0.2)',
                            },
                          }}
                        >
                          {customer.full_name} ({customer.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              
              {/* Discount Code Section */}
              <Grid item xs={12}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontFamily: 'Inter', 
                    color: '#8B4513', 
                    mb: 1,
                    fontWeight: 600
                  }}
                >
                  Mã Giảm Giá
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Mã giảm giá"
                  name="discountCode"
                  value={formData.discountCode}
                  onChange={handleDiscountCodeChange}
                  placeholder="Nhập mã giảm giá"
                  sx={{ 
                    bgcolor: 'white', 
                    borderRadius: 3, 
                    '& .MuiOutlinedInput-notchedOutline': { 
                      borderColor: '#DAA520' 
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#B8860B',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8B4513',
                    },
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  }}
                  InputProps={{ sx: { fontFamily: 'Inter' } }}
                  InputLabelProps={{
                    sx: {
                      fontFamily: 'Inter',
                      color: '#8B4513',
                      '&.Mui-focused': {
                        color: '#8B4513',
                      },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={validateDiscountCode}
                  disabled={!formData.discountCode || loading}
                  sx={{ 
                    borderColor: '#DAA520', 
                    color: '#DAA520', 
                    fontFamily: 'Inter', 
                    py: 1.5, 
                    borderRadius: 3, 
                    '&:hover': { 
                      borderColor: '#B8860B', 
                      color: '#B8860B',
                      backgroundColor: 'rgba(218, 165, 32, 0.05)'
                    },
                    height: '100%',
                    fontWeight: 600,
                    transition: 'all 0.3s ease'
                  }}
                >
                  Kiểm tra mã
                </Button>
              </Grid>
              
              {discountValidation && (
                <Grid item xs={12}>
                  <Alert
                    severity={discountValidation.valid ? 'success' : 'error'}
                    sx={{ 
                      borderRadius: 3, 
                      fontFamily: 'Inter',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    {discountValidation.valid
                      ? `Mã hợp lệ: Giảm ${discountValidation.discount.discount_percentage}%`
                      : discountValidation.message || 'Mã giảm giá không hợp lệ'}
                  </Alert>
                </Grid>
              )}
              
              {/* Room Selection Section */}
              <Grid item xs={12}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontFamily: 'Inter', 
                    color: '#8B4513', 
                    mb: 1,
                    fontWeight: 600
                  }}
                >
                  Chọn Phòng
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl 
                  fullWidth 
                  required 
                  sx={{ 
                    bgcolor: 'white', 
                    borderRadius: 3,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#DAA520',
                      },
                      '&:hover fieldset': {
                        borderColor: '#B8860B',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#8B4513',
                      },
                    },
                  }}
                >
                  <InputLabel 
                    sx={{ 
                      fontFamily: 'Inter',
                      color: '#8B4513',
                      '&.Mui-focused': {
                        color: '#8B4513',
                      },
                    }}
                  >
                    Phòng
                  </InputLabel>
                  <Select
                    name="rooms"
                    value={formData.rooms[0] || ''}
                    onChange={handleRoomChange}
                    label="Phòng"
                    disabled={!formData.checkInDate || !formData.checkOutDate}
                    sx={{ fontFamily: 'Inter', color: '#333' }}
                  >
                    <MenuItem value="" disabled sx={{ fontFamily: 'Inter' }}>
                      Chọn phòng
                    </MenuItem>
                    {availableRooms.map((room) => (
                      <MenuItem 
                        key={room.id} 
                        value={room.id} 
                        sx={{ 
                          fontFamily: 'Inter',
                          '&:hover': {
                            bgcolor: 'rgba(218, 165, 32, 0.1)',
                          },
                          '&.Mui-selected': {
                            bgcolor: 'rgba(218, 165, 32, 0.2)',
                          },
                          '&.Mui-selected:hover': {
                            bgcolor: 'rgba(218, 165, 32, 0.2)',
                          },
                        }}
                      >
                        {room.room_number} - {room.room_type?.name || room.room_type} ({formatCurrency(room.price_per_night)}/đêm, Tối đa {room.room_type?.max_guests || 'N/A'} khách)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Date Selection Section */}
              <Grid item xs={12}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontFamily: 'Inter', 
                    color: '#8B4513', 
                    mb: 1,
                    fontWeight: 600
                  }}
                >
                  Ngày Ở
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                  <DatePicker
                    label="Ngày nhận phòng"
                    value={formData.checkInDate}
                    onChange={(newValue) => setFormData((prev) => ({ ...prev, checkInDate: newValue }))}
                    minDate={new Date()}
                    maxDate={new Date(new Date().setDate(new Date().getDate() + 28))}
                    slots={{ textField: TextField }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        variant: 'outlined',
                        sx: { 
                          bgcolor: 'white', 
                          '& .MuiInputBase-input': { fontFamily: 'Inter' }, 
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#B8860B',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#8B4513',
                          },
                          borderRadius: 3,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                        },
                        InputLabelProps: {
                          sx: {
                            fontFamily: 'Inter',
                            color: '#8B4513',
                            '&.Mui-focused': {
                              color: '#8B4513',
                            },
                          },
                        },
                      },
                    }}
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
                    slots={{ textField: TextField }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        variant: 'outlined',
                        sx: { 
                          bgcolor: 'white', 
                          '& .MuiInputBase-input': { fontFamily: 'Inter' }, 
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#B8860B',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#8B4513',
                          },
                          borderRadius: 3,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                        },
                        InputLabelProps: {
                          sx: {
                            fontFamily: 'Inter',
                            color: '#8B4513',
                            '&.Mui-focused': {
                              color: '#8B4513',
                            },
                          },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              {/* Guest Count and Special Requests Section */}
              <Grid item xs={12}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontFamily: 'Inter', 
                    color: '#8B4513', 
                    mb: 1,
                    fontWeight: 600
                  }}
                >
                  Thông Tin Khách
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Số khách"
                  name="guestCount"
                  value={formData.guestCount}
                  onChange={handleInputChange}
                  InputProps={{ 
                    inputProps: { min: 1, max: maxGuests || undefined }, 
                    sx: { fontFamily: 'Inter' } 
                  }}
                  required
                  sx={{ 
                    bgcolor: 'white', 
                    borderRadius: 3, 
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#B8860B',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8B4513',
                    },
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  }}
                  InputLabelProps={{
                    sx: {
                      fontFamily: 'Inter',
                      color: '#8B4513',
                      '&.Mui-focused': {
                        color: '#8B4513',
                      },
                    },
                  }}
                  helperText={maxGuests ? `Tối đa ${maxGuests} khách` : ''}
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
                  InputProps={{ sx: { fontFamily: 'Inter' } }}
                  sx={{ 
                    bgcolor: 'white', 
                    borderRadius: 3, 
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#B8860B',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8B4513',
                    },
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  }}
                  InputLabelProps={{
                    sx: {
                      fontFamily: 'Inter',
                      color: '#8B4513',
                      '&.Mui-focused': {
                        color: '#8B4513',
                      },
                    },
                  }}
                />
              </Grid>
              
              {/* Action Buttons */}
              <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{ 
                    bgcolor: '#DAA520', 
                    '&:hover': { 
                      bgcolor: '#B8860B',
                      boxShadow: '0 4px 12px rgba(184, 134, 11, 0.3)'
                    }, 
                    fontFamily: 'Inter', 
                    px: { xs: 2, sm: 4 }, 
                    py: 1.5, 
                    borderRadius: 3,
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(218, 165, 32, 0.3)'
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Xem Trước Đặt Phòng'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate(userRole === 'customer' ? '/my-bookings' : '/staff/bookings')}
                  sx={{ 
                    borderColor: '#DAA520', 
                    color: '#DAA520', 
                    fontFamily: 'Inter', 
                    px: { xs: 2, sm: 4 }, 
                    py: 1.5, 
                    borderRadius: 3, 
                    '&:hover': { 
                      borderColor: '#B8860B', 
                      color: '#B8860B',
                      backgroundColor: 'rgba(218, 165, 32, 0.05)'
                    },
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Hủy
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Card>
        
        {/* Preview Dialog */}
        <Dialog
          open={previewDialogOpen}
          onClose={handleClosePreviewDialog}
          maxWidth="sm"
          fullWidth
          sx={{ 
            '& .MuiDialog-paper': { 
              borderRadius: 4, 
              bgcolor: '#FFF8DC',
              boxShadow: '0 12px 30px rgba(139, 69, 19, 0.3)'
            } 
          }}
        >
          <DialogTitle 
            sx={{ 
              fontFamily: 'Inter', 
              color: '#8B4513', 
              fontWeight: 600,
              fontSize: '1.5rem',
              pb: 1
            }}
          >
            Xác Nhận Đặt Phòng
            <IconButton
              onClick={handleClosePreviewDialog}
              sx={{ 
                position: 'absolute', 
                right: 8, 
                top: 8, 
                color: '#8B4513',
                '&:hover': {
                  bgcolor: 'rgba(139, 69, 19, 0.1)'
                }
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ bgcolor: '#FFF8DC' }}>
            {bookingPreview ? (
              <Box sx={{ py: 2 }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontFamily: 'Inter', 
                    color: '#8B4513', 
                    mb: 3,
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                >
                  {bookingPreview.room?.room_number} - {bookingPreview.room?.room_type?.name || bookingPreview.room?.room_type}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                      Ngày nhận phòng
                    </Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      {bookingPreview.checkInDate}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                      Ngày trả phòng
                    </Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      {bookingPreview.checkOutDate}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                      Số đêm
                    </Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      {bookingPreview.nights} đêm
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                      Số khách
                    </Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      {bookingPreview.guestCount} khách
                    </Typography>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 3, bgcolor: '#DAA520' }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                      Giá phòng/đêm
                    </Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      {formatCurrency(bookingPreview.room?.price_per_night)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                      Tổng giá trị
                    </Typography>
                    <Typography sx={{ fontFamily: 'Inter', fontWeight: 500 }}>
                      {formatCurrency(bookingPreview.totalPrice)}
                    </Typography>
                  </Grid>
                  {bookingPreview.discount && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                          Mã giảm giá
                        </Typography>
                        <Typography sx={{ fontFamily: 'Inter', fontWeight: 500 }}>
                          {formData.discountCode}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', fontWeight: 500 }}>
                          Giảm giá
                        </Typography>
                        <Typography sx={{ fontFamily: 'Inter', color: '#2E8B57', fontWeight: 600 }}>
                          - {formatCurrency(bookingPreview.totalPrice - bookingPreview.discountedPrice)}
                        </Typography>
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontFamily: 'Inter', 
                        color: '#8B4513', 
                        textAlign: 'right',
                        fontWeight: 700,
                        mt: 1
                      }}
                    >
                      Tổng thanh toán: {formatCurrency(bookingPreview.discountedPrice)}
                    </Typography>
                  </Grid>
                </Grid>
                
                {bookingPreview.discount && (
                  <Alert 
                    severity="success" 
                    sx={{ 
                      mt: 3, 
                      borderRadius: 3, 
                      fontFamily: 'Inter',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    Bạn tiết kiệm {formatCurrency(bookingPreview.totalPrice - bookingPreview.discountedPrice)} với mã giảm giá!
                  </Alert>
                )}
              </Box>
            ) : (
              <Typography sx={{ fontFamily: 'Inter', textAlign: 'center' }}>
                Đang tải thông tin đặt phòng...
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ bgcolor: '#FFF8DC', px: 3, py: 2 }}>
            <Button
              onClick={handleClosePreviewDialog}
              sx={{ 
                fontFamily: 'Inter', 
                color: '#DAA520',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: 'rgba(218, 165, 32, 0.1)'
                }
              }}
            >
              Quay lại
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              sx={{ 
                bgcolor: '#DAA520', 
                '&:hover': { 
                  bgcolor: '#B8860B',
                  boxShadow: '0 4px 12px rgba(184, 134, 11, 0.3)'
                }, 
                fontFamily: 'Inter', 
                px: 4, 
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(218, 165, 32, 0.3)'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Xác Nhận Đặt Phòng'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default BookingForm;
