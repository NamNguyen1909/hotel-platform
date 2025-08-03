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
} from '@mui/material';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import api from '../services/apis';

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

  const images = room.room_images?.length
    ? room.room_images.map((img) => ({
        url: img.image,
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
            <Typography variant="h3" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700, mb: 3 }}>
              Phòng {room.room_number} - {room.room_type_name || 'N/A'}
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 2 }}>
                  <strong>Loại phòng:</strong> {room.room_type_name || 'N/A'}
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 2 }}>
                  <strong>Giá mỗi đêm:</strong> {parseFloat(room.room_type_price).toLocaleString('vi-VN')} VND
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 2 }}>
                  <strong>Sức chứa:</strong> {room.room_type?.max_guests || 'N/A'} người
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 2 }}>
                  <strong>Trạng thái:</strong>{' '}
                  <Chip
                    label={room.status === 'available' ? 'Còn trống' : room.status === 'booked' ? 'Đã đặt' : 'Đang sử dụng'}
                    color={room.status === 'available' ? 'success' : 'warning'}
                    sx={{ fontFamily: 'Inter', fontWeight: 500 }}
                  />
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 2 }}>
                  <strong>Tiện nghi:</strong> {room.room_type?.amenities || 'Không có thông tin'}
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'Inter', mb: 2 }}>
                  <strong>Mô tả:</strong> {room.description || 'Không có mô tả'}
                </Typography>
              </Grid>
            </Grid>
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                disabled={room.status !== 'available'}
                onClick={() => navigate('/book', { state: { roomId: room.id, roomNumber: room.room_number } })}
                sx={{
                  bgcolor: '#DAA520',
                  '&:hover': { bgcolor: '#B8860B' },
                  fontFamily: 'Inter',
                  fontSize: '1rem',
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
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