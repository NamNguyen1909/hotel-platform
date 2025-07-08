import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Button,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/apis';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/bookings/');
        setBookings(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Không thể tải danh sách đặt phòng. Vui lòng thử lại sau.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700 }}
        >
          Đặt Phòng Của Tôi
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: '#DAA520' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : !Array.isArray(bookings) || bookings.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Bạn chưa có đặt phòng nào.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {bookings.map((booking) => (
              <Grid item xs={12} sm={6} md={4} key={booking.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s ease',
                    },
                  }}
                >
                  <CardContent>
                    <Typography
                      gutterBottom
                      variant="h5"
                      component="div"
                      sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600 }}
                    >
                      Đặt phòng #{booking.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Từ: {new Date(booking.check_in_date).toLocaleDateString('vi-VN')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Đến: {new Date(booking.check_out_date).toLocaleDateString('vi-VN')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Trạng thái: {booking.status === 'pending' ? 'Chờ xác nhận' :
                        booking.status === 'confirmed' ? 'Đã xác nhận' :
                        booking.status === 'checked_in' ? 'Đã nhận phòng' :
                        booking.status === 'checked_out' ? 'Đã trả phòng' :
                        booking.status === 'cancelled' ? 'Đã hủy' : 'Không xác định'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Tổng tiền: {parseFloat(booking.total_price).toLocaleString('vi-VN')} VND
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{
                        mt: 2,
                        bgcolor: '#DAA520',
                        '&:hover': { bgcolor: '#B8860B' },
                        fontFamily: 'Inter',
                      }}
                      onClick={() => navigate(`/booking/${booking.id}`)}
                    >
                      Xem Chi Tiết
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default MyBookings;
