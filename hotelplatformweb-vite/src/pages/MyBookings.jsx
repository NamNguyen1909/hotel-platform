import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  CircularProgress,
  Box,
  Button,
  Alert,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const Home = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Lấy search query từ URL
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get('search') || '';

  // Gọi API để lấy danh sách phòng
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/rooms/${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setRooms(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Không thể tải danh sách phòng. Vui lòng thử lại sau.');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [searchQuery]);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700 }}
        >
          {searchQuery ? `Kết quả tìm kiếm: "${searchQuery}"` : 'Danh Sách Phòng'}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: '#DAA520' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : !Array.isArray(rooms) || rooms.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Không có phòng nào khả dụng.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {rooms.map((room) => (
              <Grid item xs={12} sm={6} md={4} key={room.id}>
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
                  <CardMedia
                    component="img"
                    height="140"
                    image={room.room_type?.image || 'https://via.placeholder.com/300x140'}
                    alt={`Phòng ${room.room_number}`}
                  />
                  <CardContent>
                    <Typography
                      gutterBottom
                      variant="h5"
                      component="div"
                      sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600 }}
                    >
                      Phòng {room.room_number} ({room.room_type_name || 'N/A'})
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Giá: {parseFloat(room.room_type_price).toLocaleString('vi-VN')} VND/đêm
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Trạng thái: {room.status === 'available' ? 'Còn trống' : room.status === 'booked' ? 'Đã đặt' : 'Đang sử dụng'}
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{
                        mt: 2,
                        bgcolor: '#DAA520',
                        '&:hover': { bgcolor: '#B8860B' },
                        fontFamily: 'Inter',
                      }}
                      onClick={() => navigate(`/room/${room.id}`)}
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

export default Home;