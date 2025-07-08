import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Gọi API để lấy danh sách phòng
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get('/api/rooms/');
        setRooms(response.data);
        setLoading(false);
      } catch (err) {
        setError('Không thể tải danh sách phòng. Vui lòng thử lại sau.');
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
          <Typography color="error">{error}</Typography>
        ) : rooms.length === 0 ? (
          <Typography>Không có phòng nào khả dụng.</Typography>
        ) : (
          <Grid container spacing={3}>
            {rooms.map((room) => (
              <Grid item xs={12} sm={6} md={4} key={room.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="140"
                    image={'https://via.placeholder.com/300x140'} // Placeholder vì API không có image
                    alt={room.room_number}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      Phòng {room.room_number} ({room.room_type_name})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Giá: {parseFloat(room.room_type_price).toLocaleString('vi-VN')} VND/đêm
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