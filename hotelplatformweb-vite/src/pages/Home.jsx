import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Button,
  Paper,
  Chip,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Hotel as HotelIcon,
  Wifi as WifiIcon,
  LocalParking as ParkingIcon,
  RoomService as RoomServiceIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/apis';

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load room types từ API
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const response = await api.get(endpoints.roomTypes.list);
        setRoomTypes(response.data.results || response.data);
      } catch (error) {
        console.error('Error fetching room types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoomTypes();
  }, []);

  const services = [
    {
      icon: <HotelIcon sx={{ fontSize: 40 }} />,
      title: 'Phòng Nghỉ Cao Cấp',
      description: 'Phòng nghỉ sang trọng với đầy đủ tiện nghi hiện đại',
      color: '#1976d2'
    },
    {
      icon: <WifiIcon sx={{ fontSize: 40 }} />,
      title: 'WiFi Miễn Phí',
      description: 'Kết nối internet tốc độ cao trong toàn bộ khách sạn',
      color: '#0288d1'
    },
    {
      icon: <ParkingIcon sx={{ fontSize: 40 }} />,
      title: 'Bãi Đậu Xe',
      description: 'Bãi đậu xe rộng rãi và an toàn cho khách hàng',
      color: '#388e3c'
    },
    {
      icon: <RoomServiceIcon sx={{ fontSize: 40 }} />,
      title: 'Dịch Vụ Phòng',
      description: 'Phục vụ tận tình 24/7 mọi yêu cầu của quý khách',
      color: '#d32f2f'
    }
  ];

  const amenities = [
    'WiFi miễn phí',
    'Bãi đậu xe',
    'Dịch vụ phòng 24/7',
    'An ninh 24/7',
    'Dịch vụ giặt ủi',
    'Hỗ trợ khách hàng'
  ];

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* Hero Section */}
      <Box
        sx={{
          height: '100vh',
          background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          position: 'relative'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Hotel Platform
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 3,
                    opacity: 0.9,
                    fontSize: { xs: '1.2rem', md: '1.5rem' }
                  }}
                >
                  Trải nghiệm nghỉ dưỡng đẳng cấp 5 sao
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    mb: 4,
                    fontSize: '1.1rem',
                    lineHeight: 1.6,
                    maxWidth: 500
                  }}
                >
                  Chào mừng bạn đến với khách sạn hàng đầu Việt Nam. 
                  Với dịch vụ tận tâm và không gian sang trọng, 
                  chúng tôi cam kết mang đến những kỷ niệm khó quên.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/rooms')}
                    sx={{
                      bgcolor: '#FFD700',
                      color: 'black',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      '&:hover': {
                        bgcolor: '#FFA500',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Đặt Phòng Ngay
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      '&:hover': {
                        borderColor: '#FFD700',
                        color: '#FFD700',
                        bgcolor: 'rgba(255, 215, 0, 0.1)'
                      }
                    }}
                  >
                    Xem Thêm
                  </Button>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Services Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 'bold',
              mb: 2,
              color: 'primary.main'
            }}
          >
            Dịch Vụ Đẳng Cấp
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Khám phá những dịch vụ tuyệt vời mà chúng tôi cung cấp
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {services.map((service, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 3,
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: `${service.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    color: service.color
                  }}
                >
                  {service.icon}
                </Box>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  {service.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {service.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Room Types Section */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 'bold',
                mb: 2,
                color: 'primary.main'
              }}
            >
              Loại Phòng
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Lựa chọn phòng nghỉ phù hợp với nhu cầu của bạn
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {loading ? (
              // Loading skeleton
              Array.from(new Array(3)).map((_, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ height: 250, bgcolor: 'grey.200' }} />
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ height: 32, bgcolor: 'grey.200', borderRadius: 1, mb: 1 }} />
                      <Box sx={{ height: 24, bgcolor: 'grey.200', borderRadius: 1, mb: 2, width: '60%' }} />
                      <Box sx={{ height: 20, bgcolor: 'grey.200', borderRadius: 1, mb: 1 }} />
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              roomTypes.map((roomType, index) => (
                <Grid item xs={12} md={4} key={roomType.id || index}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                      }
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="250"
                      image={`https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop&q=80&sig=${index}`}
                      alt={roomType.name}
                    />
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" fontWeight="bold" mb={1}>
                        {roomType.name}
                      </Typography>
                      <Typography
                        variant="h4"
                        color="primary.main"
                        fontWeight="bold"
                        mb={2}
                      >
                        {Number(roomType.base_price).toLocaleString('vi-VN')}₫
                        <Typography component="span" variant="body2" color="text.secondary">
                          /đêm
                        </Typography>
                      </Typography>
                      
                      <Stack spacing={1} mb={3}>
                        <Chip
                          label={`${roomType.room_size}m²`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Tối đa ${roomType.max_guests} khách`}
                          size="small"
                          variant="outlined"
                        />
                        {roomType.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {roomType.description}
                          </Typography>
                        )}
                      </Stack>
                      
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => navigate('/rooms')}
                        sx={{
                          py: 1.5,
                          fontWeight: 'bold'
                        }}
                      >
                        Xem Chi Tiết
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Container>
      </Box>


    </Box>
  );
};

export default Home;