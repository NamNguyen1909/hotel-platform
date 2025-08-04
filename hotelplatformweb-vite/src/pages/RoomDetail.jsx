import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Button,
  Chip,
  Alert,
  Container,
  Grid,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import api from '../services/apis';
import authUtils from '../services/auth';
import vi from 'date-fns/locale/vi';
import { format } from 'date-fns';

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [guestCount, setGuestCount] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState(null);
  const [availabilityError, setAvailabilityError] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await api.get(`/rooms/${id}/`);
        setRoom(response.data);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? 'Phòng không tồn tại.'
            : 'Không thể tải thông tin phòng. Vui lòng thử lại sau.'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  useEffect(() => {
    const calculatePrice = async () => {
      if (checkInDate && checkOutDate && guestCount) {
        try {
          setPricingLoading(true);
          const response = await api.post('/bookings/calculate-price/', {
            room_id: id,
            check_in_date: format(checkInDate, 'yyyy-MM-dd'),
            check_out_date: format(checkOutDate, 'yyyy-MM-dd'),
            guest_count: parseInt(guestCount),
            discount_code: discountCode || undefined,
          });
          setPricing(response.data);
          setPricingError(null);
        } catch (err) {
          setPricingError(err.response?.data?.error || 'Không thể tính giá. Vui lòng thử lại.');
          setPricing(null);
        } finally {
          setPricingLoading(false);
        }
      } else {
        setPricing(null);
      }
    };
    calculatePrice();
  }, [id, checkInDate, checkOutDate, guestCount, discountCode]);

  const handleBookRoom = async () => {
    if (!checkInDate || !checkOutDate || !guestCount) {
      setAvailabilityError('Vui lòng nhập ngày nhận phòng, ngày trả phòng và số lượng khách.');
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('check_in', format(checkInDate, 'yyyy-MM-dd'));
      params.append('check_out', format(checkOutDate, 'yyyy-MM-dd'));
      params.append('room_id', id);
      const response = await api.get(`rooms/available/?${params.toString()}`);
      const availableRooms = response.data.results || response.data;

      if (!availableRooms.some(r => r.id === parseInt(id))) {
        setAvailabilityError(`Phòng ${room.room_number} không còn trống trong khoảng thời gian đã chọn.`);
        return;
      }

      setAvailabilityError(null);
      if (!authUtils.isAuthenticated()) {
        navigate('/login', {
          state: { from: '/book', roomId: room.id, checkInDate, checkOutDate, guestCount, discountCode },
        });
      } else {
        navigate('/book', {
          state: { roomId: room.id, checkInDate, checkOutDate, guestCount, discountCode },
        });
      }
    } catch (err) {
      setAvailabilityError('Không thể kiểm tra tình trạng phòng. Vui lòng thử lại sau.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#DAA520' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Alert severity="error" sx={{ borderRadius: 3, fontFamily: 'Inter' }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!room) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Inter', color: 'text.secondary', textAlign: 'center' }}>
          Không tìm thấy thông tin phòng.
        </Typography>
      </Container>
    );
  }

  const images = room.images?.length
    ? room.images.map((img) => ({
        url: img.image_url,
        caption: img.caption || `Phòng ${room.room_number}`,
      }))
    : [{ url: 'https://via.placeholder.com/800x400?text=Phòng+' + room.room_number, caption: 'Ảnh mặc định' }];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        <Card sx={{ borderRadius: 4, boxShadow: '0 8px 24px rgba(139, 69, 19, 0.2)', overflow: 'hidden' }}>
          <Carousel showThumbs={true} showStatus={false} infiniteLoop autoPlay>
            {images.map((img, index) => (
              <div key={index}>
                <img
                  src={img.url}
                  alt={img.caption}
                  style={{ height: '500px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                />
                <Typography className="legend" sx={{ fontFamily: 'Inter', bgcolor: 'rgba(0,0,0,0.7)', color: 'white', p: 1 }}>
                  {img.caption}
                </Typography>
              </div>
            ))}
          </Carousel>
          <CardContent sx={{ p: 4, bgcolor: '#FFF8DC' }}>
            <Typography variant="h3" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700, mb: 3, textAlign: 'center' }}>
              Phòng {room.room_number} - {room.room_type?.name || 'N/A'}
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(139, 69, 19, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 2 }}>
                    Thông Tin Phòng
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Loại phòng:</strong> {room.room_type?.name || 'N/A'}
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Giá mỗi đêm:</strong> {parseFloat(room.room_type?.base_price || 0).toLocaleString('vi-VN')} VND
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Sức chứa:</strong> {room.room_type?.max_guests || 'N/A'} người
                  </Typography>
                  <Box sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Trạng thái:</strong>{' '}
                    <Chip
                      label={room.status === 'available' ? 'Còn trống' : room.status === 'booked' ? 'Đã đặt' : 'Đang sử dụng'}
                      color={room.status === 'available' ? 'success' : 'warning'}
                      sx={{ fontFamily: 'Inter', fontWeight: 500 }}
                    />
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(139, 69, 19, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 2 }}>
                    Mô Tả & Tiện Nghi
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Tiện nghi:</strong> {room.room_type?.amenities || 'Không có thông tin'}
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Mô tả:</strong> {room.room_type?.description || 'Không có mô tả'}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Card sx={{ p: 3, bgcolor: '#f5f5f5', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <Typography variant="h5" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 3, textAlign: 'center' }}>
                    Tính Giá Tạm Tính
                  </Typography>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid item xs={12} sm={6} md={3}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                        <DatePicker
                          label="Ngày nhận phòng"
                          value={checkInDate}
                          onChange={(newValue) => setCheckInDate(newValue)}
                          minDate={new Date()}
                          maxDate={new Date(new Date().setDate(new Date().getDate() + 28))}
                          enableAccessibleFieldDOMStructure={false}
                          slots={{ textField: TextField }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: 'outlined',
                              sx: { bgcolor: 'white', '& .MuiInputBase-input': { fontFamily: 'Inter' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' } },
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                        <DatePicker
                          label="Ngày trả phòng"
                          value={checkOutDate}
                          onChange={(newValue) => setCheckOutDate(newValue)}
                          minDate={checkInDate || new Date()}
                          enableAccessibleFieldDOMStructure={false}
                          slots={{ textField: TextField }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: 'outlined',
                              sx: { bgcolor: 'white', '& .MuiInputBase-input': { fontFamily: 'Inter' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' } },
                            },
                          }}
                        />
                      </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Số khách"
                        value={guestCount}
                        onChange={(e) => setGuestCount(e.target.value)}
                        InputProps={{ inputProps: { min: 1 }, sx: { fontFamily: 'Inter' } }}
                        sx={{ bgcolor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Mã giảm giá"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        sx={{ bgcolor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' } }}
                      />
                    </Grid>
                  </Grid>
                  {pricingLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <CircularProgress sx={{ color: '#DAA520' }} />
                    </Box>
                  )}
                  {pricingError && (
                    <Alert severity="error" sx={{ mt: 3, borderRadius: 3, fontFamily: 'Inter' }}>
                      {pricingError}
                    </Alert>
                  )}
                  {availabilityError && (
                    <Alert severity="error" sx={{ mt: 3, borderRadius: 3, fontFamily: 'Inter' }}>
                      {availabilityError}
                    </Alert>
                  )}
                  {pricing && !pricingLoading && !pricingError && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                      <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 2, textAlign: 'center' }}>
                        Chi Tiết Giá
                      </Typography>
                      <Typography variant="body1" sx={{ fontFamily: 'Inter', color: 'text.secondary', mb: 1 }}>
                        Giá gốc: {pricing.original_price.toLocaleString('vi-VN')} VND ({pricing.days} đêm)
                      </Typography>
                      {pricing.discount_info && (
                        <Typography variant="body1" sx={{ fontFamily: 'Inter', color: '#2E8B57', mb: 1 }}>
                          Giảm giá: {pricing.discount_info.discount_percentage}% (-{pricing.discount_info.amount_saved.toLocaleString('vi-VN')} VND)
                        </Typography>
                      )}
                      <Typography variant="body1" sx={{ fontFamily: 'Inter', color: '#DAA520', fontWeight: 600, mb: 1, fontSize: '1.1rem' }}>
                        Tổng giá: {pricing.total_price.toLocaleString('vi-VN')} VND
                      </Typography>
                    </Box>
                  )}
                </Card>
              </Grid>
            </Grid>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                disabled={room.status !== 'available'}
                onClick={handleBookRoom}
                sx={{
                  bgcolor: '#DAA520',
                  '&:hover': { bgcolor: '#B8860B' },
                  fontFamily: 'Inter',
                  fontSize: '1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)',
                }}
              >
                Đặt Phòng Ngay
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/rooms')}
                sx={{
                  borderColor: '#DAA520',
                  color: '#DAA520',
                  fontFamily: 'Inter',
                  fontSize: '1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  '&:hover': { borderColor: '#B8860B', color: '#B8860B' },
                  boxShadow: '0 4px 12px rgba(218, 165, 32, 0.2)',
                }}
              >
                Quay Lại
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default RoomDetail;