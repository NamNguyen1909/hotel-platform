import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Chip,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/apis';

const statusColors = {
  pending: 'warning',
  confirmed: 'success',
  checked_in: 'info',
  checked_out: 'default',
  cancelled: 'error',
};

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã nhận phòng',
  checked_out: 'Đã trả phòng',
  cancelled: 'Đã hủy',
};

const Bookings = () => {
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
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#8B4513' }}>
        Quản Lý Đặt Phòng
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress sx={{ color: '#DAA520' }} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : bookings.length === 0 ? (
        <Alert severity="info">Chưa có đặt phòng nào.</Alert>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
          {bookings.map((booking) => (
            <React.Fragment key={booking.id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#DAA520' }}>
                    {booking.id}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`Đặt phòng #${booking.id}`}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        Khách hàng: {booking.customer_name || 'N/A'}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="text.primary">
                        Từ: {new Date(booking.check_in_date).toLocaleDateString('vi-VN')}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="text.primary">
                        Đến: {new Date(booking.check_out_date).toLocaleDateString('vi-VN')}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="text.primary">
                        Tổng tiền: {parseFloat(booking.total_price).toLocaleString('vi-VN')} VND
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <Chip
                    label={statusLabels[booking.status] || 'Không xác định'}
                    color={statusColors[booking.status] || 'default'}
                    sx={{ mr: 2, fontWeight: 'bold' }}
                  />
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#DAA520', '&:hover': { bgcolor: '#B8860B' } }}
                    onClick={() => navigate(`/booking/${booking.id}`)}
                  >
                    Xem Chi Tiết
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </Container>
  );
};

export default Bookings;
