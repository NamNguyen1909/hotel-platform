import React, { useState, useCallback, useMemo } from 'react';
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
import { format, isValid, differenceInDays } from 'date-fns';

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) {
    return (
      <Alert severity="error" sx={{ m: 2, fontFamily: 'Inter' }}>
        Đã xảy ra lỗi. Vui lòng thử lại sau.
      </Alert>
    );
  }
  return children;
};

const BookingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = location.state || {};

  const [formData, setFormData] = useState({
    rooms: roomId ? [roomId] : [],
    checkInDate: null,
    checkOutDate: null,
    guestCount: 1,
    specialRequests: '',
    customer: '',
  });
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [roomDetails, setRoomDetails] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [roomTypesLoading, setRoomTypesLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  const [isRoomAvailable, setIsRoomAvailable] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      if (!authUtils.isAuthenticated()) {
        navigate('/login', { state: { from: '/book', roomId } });
        return;
      }
      try {
        const userInfo = await authUtils.getCurrentUser();
        setUser(userInfo);
        setUserRole(userInfo.role);
        if (userInfo.role === 'customer') {
          setFormData((prev) => ({ ...prev, customer: userInfo.id }));
        }
        if (!['customer', 'staff', 'admin', 'owner'].includes(userInfo.role)) {
          setErrors({ global: 'Bạn không có quyền tạo đặt phòng.' });
          navigate('/');
        }
      } catch {
        setErrors({ global: 'Không thể xác thực người dùng.' });
        navigate('/login', { state: { from: '/book', roomId } });
      }
    };
    checkAuth();
  }, [navigate, roomId]);

  React.useEffect(() => {
    if (roomId) {
      const fetchRoomDetailsAndTypes = async () => {
        try {
          const roomResponse = await api.get(`/rooms/${roomId}/`);
          setRoomDetails(roomResponse.data);
          const typesResponse = await api.get('room-types/');
          setRoomTypes(Array.isArray(typesResponse.data.results) ? typesResponse.data.results : typesResponse.data);
        } catch {
          setErrors({ global: 'Không thể tải thông tin phòng hoặc loại phòng.' });
        } finally {
          setRoomTypesLoading(false);
        }
      };
      fetchRoomDetailsAndTypes();
    } else {
      setRoomTypesLoading(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    if (['staff', 'admin', 'owner'].includes(userRole)) {
      const fetchCustomers = async () => {
        try {
          const response = await api.get('/users/customers_list/');
          setCustomers(Array.isArray(response.data.results) ? response.data.results : response.data);
        } catch {
          setErrors({ global: 'Không thể tải danh sách khách hàng.' });
        }
      };
      fetchCustomers();
    }
  }, [userRole]);

  const getRoomTypeInfo = (roomTypeId) => {
    const normalizedId = roomTypeId?.toString();
    let targetId = normalizedId;
    if (roomTypeId && typeof roomTypeId === 'object' && roomTypeId.id) {
      targetId = roomTypeId.id.toString();
    }
    const roomType = roomTypes.find((type) =>
      type.id.toString() === targetId ||
      type.id === roomTypeId ||
      (type.id === roomTypeId?.id)
    );
    let basePrice = 0;
    if (roomType?.base_price) {
      basePrice = parseFloat(roomType.base_price);
    } else if (roomDetails?.room_type_price) {
      basePrice = parseFloat(roomDetails.room_type_price);
    }
    return roomType || {
      name: roomDetails?.room_type_name || (roomTypeId?.name || 'N/A'),
      base_price: basePrice || 0,
      max_guests: roomType?.max_guests || roomDetails?.max_guests || 'N/A'
    };
  };

  const validate = useCallback(() => {
    const errs = {};
    if (!formData.rooms.length) errs.rooms = 'Vui lòng chọn một phòng.';
    if (!isValid(formData.checkInDate)) errs.checkInDate = 'Ngày nhận phòng không hợp lệ.';
    if (!isValid(formData.checkOutDate)) errs.checkOutDate = 'Ngày trả phòng không hợp lệ.';
    if (formData.checkInDate && formData.checkOutDate && formData.checkInDate >= formData.checkOutDate) {
      errs.checkOutDate = 'Ngày trả phòng phải sau ngày nhận phòng.';
    }
    if (formData.checkInDate && formData.checkInDate > new Date(new Date().setDate(new Date().getDate() + 28))) {
      errs.checkInDate = 'Ngày nhận phòng không được vượt quá 28 ngày kể từ hôm nay.';
    }
    if (formData.guestCount < 1) errs.guestCount = 'Số khách phải lớn hơn 0.';
    const roomTypeInfo = roomDetails ? getRoomTypeInfo(roomDetails.room_type) : null;
    if (roomTypeInfo?.max_guests && formData.guestCount > roomTypeInfo.max_guests) {
      errs.guestCount = `Số khách không được vượt quá ${roomTypeInfo.max_guests} người.`;
    }
    if (['staff', 'admin', 'owner'].includes(userRole) && !formData.customer) {
      errs.customer = 'Vui lòng chọn khách hàng.';
    }
    if (isRoomAvailable === false) {
      errs.rooms = `Phòng ${roomDetails?.room_number} không còn trống trong khoảng thời gian đã chọn.`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData, roomDetails, userRole, isRoomAvailable, roomTypes]);

  const handleCalculatePrice = async () => {
    if (!validate()) return;
    try {
      setPricingLoading(true);
      setPricingError(null);
      setPricing(null);
      setIsRoomAvailable(null);

      const params = new URLSearchParams({
        check_in: format(formData.checkInDate, 'yyyy-MM-dd'),
        check_out: format(formData.checkOutDate, 'yyyy-MM-dd'),
        room_id: formData.rooms[0],
      });
      const availabilityResponse = await api.get(`/rooms/available/?${params.toString()}`);
      const availableRooms = Array.isArray(availabilityResponse.data.results)
        ? availabilityResponse.data.results
        : availabilityResponse.data;
      const isAvailable = availableRooms.some((r) => r.id === formData.rooms[0]);
      setIsRoomAvailable(isAvailable);

      if (!isAvailable) {
        setPricingError(`Phòng ${roomDetails?.room_number} không còn trống trong khoảng thời gian đã chọn.`);
        setPricing(null);
        return;
      }

      const priceResponse = await api.post('/bookings/calculate-price/', {
        room_id: formData.rooms[0],
        check_in_date: format(formData.checkInDate, 'yyyy-MM-dd'),
        check_out_date: format(formData.checkOutDate, 'yyyy-MM-dd'),
        guest_count: parseInt(formData.guestCount),
      });
      setPricing(priceResponse.data);
      setPricingError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không thể tính giá. Vui lòng kiểm tra lại thông tin.';
      setPricingError(errorMessage);
      setPricing(null);
      setIsRoomAvailable(false);
    } finally {
      setPricingLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors({});
    setPricing(null);
    setPricingError(null);
    setIsRoomAvailable(null);
  };

  const normalizeDate = (date) => {
    if (!isValid(date)) throw new Error('Ngày không hợp lệ');
    return format(date, 'yyyy-MM-dd');
  };

  const handlePreviewBooking = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      setPreviewOpen(true);
      setErrors({});
    } catch (err) {
      setErrors({ global: err.response?.data?.error || 'Không thể chuẩn bị thông tin đặt phòng.' });
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const payload = {
        rooms: formData.rooms,
        check_in_date: normalizeDate(formData.checkInDate),
        check_out_date: normalizeDate(formData.checkOutDate),
        guest_count: parseInt(formData.guestCount),
        special_requests: formData.specialRequests || undefined,
      };
      if (['staff', 'admin', 'owner'].includes(userRole)) {
        payload.customer = formData.customer;
      }
      const response = await api.post('/bookings/', payload);
      setSuccess(`Đặt phòng thành công! Mã đặt phòng: ${response.data.id}`);
      setErrors({});
      setPreviewOpen(false);
      setTimeout(() => navigate('/my-bookings'), 2000);
    } catch (err) {
      setErrors({ global: err.response?.data?.error || 'Không thể tạo đặt phòng. Vui lòng thử lại.' });
      setPreviewOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const numberOfDays = useMemo(() => {
    if (formData.checkInDate && formData.checkOutDate && isValid(formData.checkInDate) && isValid(formData.checkOutDate)) {
      return Math.max(1, differenceInDays(formData.checkOutDate, formData.checkInDate));
    }
    return 0;
  }, [formData.checkInDate, formData.checkOutDate]);

  const roomTypeInfo = roomDetails && !roomTypesLoading ? getRoomTypeInfo(roomDetails.room_type) : null;

  return (
    <ErrorBoundary>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
        <Container maxWidth="lg">
          <Card sx={{ p: 4, borderRadius: 4, boxShadow: '0 8px 24px rgba(139, 69, 19, 0.2)', bgcolor: '#FFF8DC' }}>
            <Typography variant="h4" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700, mb: 4, textAlign: 'center' }}>
              Đặt Phòng
            </Typography>
            {errors.global && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontFamily: 'Inter' }}>
                {errors.global}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontFamily: 'Inter' }}>
                {success}
              </Alert>
            )}
            {pricingError && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontFamily: 'Inter' }}>
                {pricingError}
              </Alert>
            )}
            <Grid container spacing={3}>
              {['staff', 'admin', 'owner'].includes(userRole) && (
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 3 }} error={!!errors.customer}>
                    <InputLabel sx={{ fontFamily: 'Inter' }}>Khách hàng</InputLabel>
                    <Select
                      value={formData.customer || ''}
                      onChange={(e) => handleInputChange('customer', e.target.value)}
                      label="Khách hàng"
                      sx={{ fontFamily: 'Inter' }}
                      required
                    >
                      <MenuItem value="" disabled>
                        Chọn khách hàng
                      </MenuItem>
                      {customers.map((customer) => (
                        <MenuItem key={customer.id} value={customer.id} sx={{ fontFamily: 'Inter' }}>
                          {customer.full_name} ({customer.email})
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.customer && (
                      <Typography variant="caption" color="error" sx={{ fontFamily: 'Inter', mt: 1 }}>
                        {errors.customer}
                      </Typography>
                    )}
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'rgba(139, 69, 19, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', mb: 2, fontWeight: 600 }}>
                    Thông Tin Phòng
                  </Typography>
                  {roomDetails && !roomTypesLoading && roomTypeInfo ? (
                    <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                      <strong>Phòng đã chọn:</strong> {roomDetails.room_number} - {roomTypeInfo.name} (
                      {formatCurrency(parseFloat(roomTypeInfo.base_price))}/đêm)
                    </Typography>
                  ) : (
                    <Typography variant="body1" sx={{ fontFamily: 'Inter', color: 'text.secondary' }}>
                      Đang tải thông tin phòng...
                    </Typography>
                  )}
                  {errors.rooms && (
                    <Typography variant="caption" color="error" sx={{ fontFamily: 'Inter', mt: 1 }}>
                      {errors.rooms}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ p: 2, bgcolor: 'rgba(139, 69, 19, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', mb: 2, fontWeight: 600 }}>
                    Thông Tin Đặt Phòng
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                        <DatePicker
                          label="Ngày nhận phòng"
                          value={formData.checkInDate}
                          onChange={(newValue) => handleInputChange('checkInDate', newValue)}
                          minDate={new Date()}
                          maxDate={new Date(new Date().setDate(new Date().getDate() + 28))}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: 'outlined',
                              required: true,
                              error: !!errors.checkInDate,
                              helperText: errors.checkInDate,
                              sx: {
                                bgcolor: 'white',
                                '& .MuiInputBase-input': { fontFamily: 'Inter' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8860B' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
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
                          onChange={(newValue) => handleInputChange('checkOutDate', newValue)}
                          minDate={formData.checkInDate || new Date()}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: 'outlined',
                              required: true,
                              error: !!errors.checkOutDate,
                              helperText: errors.checkOutDate,
                              sx: {
                                bgcolor: 'white',
                                '& .MuiInputBase-input': { fontFamily: 'Inter' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8860B' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
                              },
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Số khách"
                        value={formData.guestCount}
                        onChange={(e) => handleInputChange('guestCount', parseInt(e.target.value) || 1)}
                        InputProps={{
                          inputProps: { min: 1, max: roomTypeInfo?.max_guests || undefined },
                          sx: { fontFamily: 'Inter' },
                        }}
                        sx={{
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8860B' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
                        }}
                        required
                        error={!!errors.guestCount}
                        helperText={errors.guestCount || (roomTypeInfo?.max_guests && !roomTypesLoading ? `Tối đa ${roomTypeInfo.max_guests} khách` : '')}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Yêu cầu đặc biệt"
                        value={formData.specialRequests}
                        onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                        sx={{
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8860B' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8B4513' },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: 3 }}>
                  <Box sx={{ p: 2, bgcolor: 'rgba(139, 69, 19, 0.05)', borderRadius: 2, flex: 1 }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', mb: 2, fontWeight: 600 }}>
                      Tính Giá Tạm Tính
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleCalculatePrice}
                      disabled={pricingLoading || Object.keys(errors).length > 0}
                      sx={{
                        bgcolor: '#DAA520',
                        '&:hover': { bgcolor: '#B8860B' },
                        fontFamily: 'Inter',
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)',
                      }}
                    >
                      Tính Giá Tạm Tính
                    </Button>
                  </Box>
                  {pricingLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 250, minHeight: 120 }}>
                      <CircularProgress sx={{ color: '#DAA520' }} />
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: 'white',
                        borderRadius: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        width: 250,
                        minHeight: 120,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', mb: 1, fontWeight: 600, textAlign: 'center' }}>
                        Giá Tạm Tính
                      </Typography>
                      {pricing ? (
                        <>
                          <Typography variant="body1" sx={{ fontFamily: 'Inter', color: 'text.secondary', mb: 0.5 }}>
                            Số đêm: {numberOfDays}
                          </Typography>
                          <Typography variant="body1" sx={{ fontFamily: 'Inter', color: '#DAA520', fontWeight: 600, fontSize: '1.1rem' }}>
                            Tổng giá: {formatCurrency(pricing.total_price)}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body1" sx={{ fontFamily: 'Inter', color: 'text.secondary', textAlign: 'center' }}>
                          Chưa tính giá
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/rooms')}
                    sx={{
                      borderColor: '#DAA520',
                      color: '#DAA520',
                      fontFamily: 'Inter',
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      '&:hover': { borderColor: '#B8860B', color: '#B8860B' },
                    }}
                  >
                    Quay Lại
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePreviewBooking}
                    disabled={loading || Object.keys(errors).length > 0 || !pricing || isRoomAvailable === false || roomTypesLoading}
                    sx={{
                      bgcolor: '#DAA520',
                      '&:hover': { bgcolor: '#B8860B' },
                      fontFamily: 'Inter',
                      px: 4,
                      py: 1.5,
                      borderRadius: 3,
                      boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)',
                    }}
                  >
                    Đặt Phòng
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>
          <Dialog
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            maxWidth="sm"
            fullWidth
            sx={{ '& .MuiDialog-paper': { borderRadius: 4, bgcolor: '#FFF8DC', maxWidth: { xs: '90vw', sm: '600px' } } }}
          >
            <DialogTitle sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600 }}>
              Xác Nhận Đặt Phòng
              <IconButton
                onClick={() => setPreviewOpen(false)}
                sx={{ position: 'absolute', right: 8, top: 8, color: '#8B4513' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ fontFamily: 'Inter' }}>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  <strong>Khách hàng:</strong>{' '}
                  {(customers.find((c) => c.id === formData.customer) || user)?.full_name || 'N/A'} (
                  {(customers.find((c) => c.id === formData.customer) || user)?.email || 'N/A'})
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  <strong>Phòng:</strong> {roomDetails?.room_number} ({roomTypeInfo?.name || 'N/A'})
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  <strong>Ngày nhận phòng:</strong>{' '}
                  {formData.checkInDate ? format(new Date(formData.checkInDate), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  <strong>Ngày trả phòng:</strong>{' '}
                  {formData.checkOutDate ? format(new Date(formData.checkOutDate), 'dd/MM/yyyy', { locale: vi }) : 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  <strong>Số đêm:</strong> {numberOfDays}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  <strong>Số khách:</strong> {formData.guestCount}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5 }}>
                  <strong>Giá gốc:</strong> {pricing ? formatCurrency(pricing.original_price) : 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1.5, fontWeight: 600, color: '#DAA520' }}>
                  <strong>Tổng giá:</strong> {pricing ? formatCurrency(pricing.total_price) : 'N/A'}
                </Typography>
                {formData.specialRequests && (
                  <Typography variant="body1" sx={{ mb: 1.5 }}>
                    <strong>Yêu cầu đặc biệt:</strong> {formData.specialRequests}
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setPreviewOpen(false)}
                sx={{ fontFamily: 'Inter', color: '#DAA520' }}
              >
                Hủy
              </Button>
              <Button
                onClick={confirmBooking}
                variant="contained"
                disabled={loading || roomTypesLoading}
                sx={{
                  bgcolor: '#DAA520',
                  '&:hover': { bgcolor: '#B8860B' },
                  fontFamily: 'Inter',
                  boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)',
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Xác Nhận Đặt Phòng'}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </ErrorBoundary>
  );
};

export default BookingForm;