import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, CircularProgress, Box, Button, Chip, Alert, Container, Grid } from '@mui/material';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import api from '../services/apis';
import authUtils from '../services/auth';

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleBookRoom = () => {
    if (!authUtils.isAuthenticated()) {
      navigate('/login', { state: { from: '/book', roomId: room.id } });
    } else {
      navigate('/book', { state: { roomId: room.id } });
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
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4, borderRadius: 3, fontFamily: 'Inter' }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!room) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h6" sx={{ fontFamily: 'Inter', color: 'text.secondary', textAlign: 'center', mt: 6 }}>
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
    : [{ url: '/images/default-room.jpg', caption: 'Ảnh mặc định' }];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        <Card sx={{ borderRadius: 4, boxShadow: '0 8px 24px rgba(139, 69, 19, 0.2)', overflow: 'hidden' }}>
          <Carousel showThumbs={true} showStatus={false} infiniteLoop autoPlay>
            {images.map((img, index) => (
              <div key={index}>
                <img src={img.url} alt={img.caption} style={{ height: { xs: '300px', sm: '500px' }, objectFit: 'cover' }} />
                <p style={{ fontFamily: 'Inter', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px' }}>
                  {img.caption}
                </p>
              </div>
            ))}
          </Carousel>
          <CardContent sx={{ p: 4, bgcolor: '#FFF8DC' }}>
            <Typography variant="h3" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700, mb: 3, textAlign: 'center' }}>
              Phòng {room.room_number} - {room.room_type?.name || 'N/A'}
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(139, 69, 19, 0.05)', borderRadius: 2 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 2 }}>
                    Mô Tả & Tiện Nghi
                  </Typography>
                  <Box sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Tiện nghi:</strong>{' '}
                    {room.room_type?.amenities?.split(',').map((amenity, index) => (
                      <Chip key={index} label={amenity.trim()} sx={{ m: 0.5, fontFamily: 'Inter' }} />
                    )) || 'Không có thông tin'}
                  </Box>
                  <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 1.5 }}>
                    <strong>Mô tả:</strong> {room.room_type?.description || 'Không có mô tả'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
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