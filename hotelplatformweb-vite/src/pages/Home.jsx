import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  AppBar,
  Toolbar,
  CircularProgress,
  Box,
  Button,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/apis';

const Home = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Gọi API để lấy danh sách phòng
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await api.get(endpoints.rooms.list);
        
        // Xử lý response - đảm bảo luôn có một array
        let roomsData = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            roomsData = response.data;
          } else if (response.data.results && Array.isArray(response.data.results)) {
            // Trường hợp có pagination
            roomsData = response.data.results;
          } else if (typeof response.data === 'object') {
            // Trường hợp trả về object với các trường khác
            roomsData = [];
          }
        }
        
        setRooms(roomsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Không thể tải danh sách phòng. Vui lòng thử lại sau.');
        setRooms([]); // Đảm bảo rooms luôn là array
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Thanh điều hướng */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Khách Sạn Của Bạn
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Nội dung chính */}
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Danh Sách Phòng
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
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
            {Array.isArray(rooms) && rooms.map((room) => (
              <Grid item xs={12} sm={6} md={4} key={room.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={'https://via.placeholder.com/300x140'} // Placeholder vì API không có image
                    alt={`Phòng ${room.room_number}`}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      Phòng {room.room_number} ({room.room_type_name || room.room_type?.name || 'N/A'})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Giá: {room.room_type_price ? parseFloat(room.room_type_price).toLocaleString('vi-VN') : 'Liên hệ'} VND/đêm
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Trạng thái: {room.status === 'available' ? 'Còn trống' : 'Đã đặt'}
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{ mt: 2 }}
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