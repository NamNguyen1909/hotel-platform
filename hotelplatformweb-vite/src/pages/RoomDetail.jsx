import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  CircularProgress,
  Box,
  Button,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import apis from '../services/apis';

const RoomDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await apis.get(`/rooms/${id}/`);
        setRoom(response.data);
      } catch (err) {
        console.error('Error fetching room detail:', err);
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 800, margin: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!room) {
    return (
      <Box sx={{ maxWidth: 800, margin: 'auto', mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Không tìm thấy thông tin phòng.
        </Typography>
      </Box>
    );
  }

  const images = room.room_images?.length
    ? room.room_images.map((img) => ({
        url: img.image,
        caption: img.caption || `Ảnh phòng ${room.room_number}`,
      }))
    : [{ url: 'https://via.placeholder.com/600x400', caption: 'Ảnh mặc định' }];

  return (
    <Box sx={{ maxWidth: 800, margin: 'auto', mt: 4, mb: 4 }}>
      <Card sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {/* Carousel ảnh phòng */}
        <Carousel showThumbs={false} showStatus={false} infiniteLoop autoPlay>
          {images.map((img, index) => (
            <div key={index}>
              <img
                src={img.url}
                alt={img.caption}
                style={{ height: '400px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
              />
              <p className="legend">{img.caption}</p>
            </div>
          ))}
        </Carousel>

        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#8B4513' }}>
            Phòng {room.room_number} ({room.room_type_name || 'N/A'})
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Loại phòng:</strong> {room.room_type_name || 'N/A'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Giá:</strong> {parseFloat(room.room_type_price).toLocaleString('vi-VN')} VND/đêm
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Sức chứa:</strong> {room.room_type?.max_guests || 'N/A'} người
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Trạng thái:</strong>{' '}
                <Chip
                  label={
                    room.status === 'available'
                      ? 'Còn trống'
                      : room.status === 'booked'
                      ? 'Đã đặt'
                      : 'Đang sử dụng'
                  }
                  color={room.status === 'available' ? 'success' : 'warning'}
                  size="small"
                />
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Tiện nghi:</strong> {room.room_type?.amenities || 'Không có thông tin'}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Mô tả:</strong> {room.description || 'Không có mô tả'}
              </Typography>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              disabled={room.status !== 'available'}
              onClick={() =>
                navigate('/book', {
                  state: { roomId: room.id, roomNumber: room.room_number },
                })
              }
              sx={{ bgcolor: '#DAA520', '&:hover': { bgcolor: '#B8860B' } }}
            >
              Đặt Phòng
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/rooms')}
              sx={{
                borderColor: '#DAA520',
                color: '#DAA520',
                '&:hover': { borderColor: '#B8860B', color: '#B8860B' },
              }}
            >
              Quay lại
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RoomDetail;