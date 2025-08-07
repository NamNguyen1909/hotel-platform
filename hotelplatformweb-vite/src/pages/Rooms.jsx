import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Button,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  List,
  ListItem,
  ListItemText,
  Slider,
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/apis';
import authUtils from '../services/auth';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [guestCountFilter, setGuestCountFilter] = useState('');
  const [priceRange, setPriceRange] = useState([0, 5000000]); // Default range: 0 - 5M VND
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomImages, setRoomImages] = useState({});

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setSearchQuery(searchParams.get('search') || '');
    setRoomTypeFilter(searchParams.get('room_type') || '');
    setGuestCountFilter(searchParams.get('guest_count') || '');
    setPriceRange([
      parseInt(searchParams.get('price_min')) || 0,
      parseInt(searchParams.get('price_max')) || 5000000,
    ]);
    setCurrentPage(parseInt(searchParams.get('page')) || 1);
  }, [location.search]);

  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const response = await api.get('room-types/');
        setRoomTypes(Array.isArray(response.data.results) ? response.data.results : response.data);
      } catch (err) {
        console.error('Error fetching room types:', err);
        setRoomTypes([]);
      }
    };
    fetchRoomTypes();
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('page_size', pageSize.toString());
        if (searchQuery) params.append('search', searchQuery);
        if (roomTypeFilter) params.append('room_type', roomTypeFilter);
        if (guestCountFilter) params.append('guest_count', guestCountFilter);
        params.append('price_min', priceRange[0].toString());
        params.append('price_max', priceRange[1].toString());
        const response = await api.get(`rooms/?${params.toString()}`);
        const roomsData = Array.isArray(response.data.results) ? response.data.results : response.data;
        setRooms(roomsData);
        setTotalCount(response.data.count || 0);
        setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
        setError(null);

        const imagePromises = roomsData.map((room) =>
          api.get(`/room-images/by_room/${room.id}/`).catch(() => ({ data: [] }))
        );
        const imageResponses = await Promise.all(imagePromises);
        const newRoomImages = {};
        roomsData.forEach((room, index) => {
          const images = imageResponses[index].data || [];
          newRoomImages[room.id] = images.length
            ? images.map((img) => ({
                url: img.image_url,
                caption: img.caption || `Phòng ${room.room_number}`,
              }))
            : [{ url: '/images/default-room.jpg', caption: 'Ảnh mặc định' }];
        });
        setRoomImages(newRoomImages);
      } catch (err) {
        setError('Không thể tải danh sách phòng. Vui lòng thử lại sau.');
        setRooms([]);
        setRoomImages({});
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, [searchQuery, roomTypeFilter, guestCountFilter, priceRange, currentPage, pageSize]);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (roomTypeFilter) params.append('room_type', roomTypeFilter);
    if (guestCountFilter) params.append('guest_count', guestCountFilter);
    params.append('price_min', priceRange[0].toString());
    params.append('price_max', priceRange[1].toString());
    params.append('page', '1');
    navigate(`/rooms?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setSearchQuery('');
    setRoomTypeFilter('');
    setGuestCountFilter('');
    setPriceRange([0, 5000000]);
    navigate('/rooms');
  };

  const handlePageChange = (event, page) => {
    const params = new URLSearchParams(location.search);
    params.set('page', page.toString());
    navigate(`/rooms?${params.toString()}`);
  };

  const handleBookRoom = (room) => {
    if (!authUtils.isAuthenticated()) {
      setSelectedRoom(room);
      setLoginDialogOpen(true);
    } else {
      navigate('/book', { state: { roomId: room.id } });
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: '/book', roomId: selectedRoom?.id } });
    setLoginDialogOpen(false);
  };

  const handleCloseLoginDialog = () => {
    setLoginDialogOpen(false);
    setSelectedRoom(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        <Typography variant="h3" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700, mb: 4, textAlign: 'center' }}>
          Khám Phá Phòng Của Sự Sang Trọng
        </Typography>
        <Card sx={{ p: 3, mb: 6, borderRadius: 4, boxShadow: '0 8px 24px rgba(139, 69, 19, 0.2)', bgcolor: '#FFF8DC' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} lg={3}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Tìm kiếm phòng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#DAA520' }} />
                    </InputAdornment>
                  ),
                  sx: { fontFamily: 'Inter', borderRadius: 3 },
                }}
                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 3 }}>
                <InputLabel sx={{ fontFamily: 'Inter' }}>Loại phòng</InputLabel>
                <Select
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                  label="Loại phòng"
                  sx={{ fontFamily: 'Inter' }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {roomTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id} sx={{ fontFamily: 'Inter' }}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <TextField
                fullWidth
                type="number"
                label="Số người"
                value={guestCountFilter}
                onChange={(e) => setGuestCountFilter(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                InputProps={{ inputProps: { min: 1 }, sx: { fontFamily: 'Inter' } }}
                sx={{ bgcolor: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <Box sx={{ px: 2 }}>
                <Typography sx={{ fontFamily: 'Inter', color: '#8B4513', mb: 1 }}>
                  Giá mỗi đêm: {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                </Typography>
                <Slider
                  value={priceRange}
                  onChange={(e, newValue) => setPriceRange(newValue)}
                  valueLabelDisplay="off"
                  min={0}
                  max={10000000}
                  step={100000}
                  sx={{
                    color: '#DAA520',
                    '& .MuiSlider-thumb': { bgcolor: '#8B4513' },
                    '& .MuiSlider-track': { bgcolor: '#DAA520' },
                    '& .MuiSlider-rail': { bgcolor: '#FFF8DC' },
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={handleFilter}
                sx={{
                  bgcolor: '#DAA520',
                  '&:hover': { bgcolor: '#B8860B' },
                  fontFamily: 'Inter',
                  px: 4,
                  boxShadow: '0 4px 12px rgba(218, 165, 32, 0.3)',
                }}
              >
                Tìm kiếm
              </Button>
              <Button
                variant="outlined"
                onClick={handleResetFilter}
                sx={{
                  borderColor: '#DAA520',
                  color: '#DAA520',
                  '&:hover': { borderColor: '#B8860B', color: '#B8860B' },
                  fontFamily: 'Inter',
                  px: 4,
                  boxShadow: '0 4px 12px rgba(218, 165, 32, 0.2)',
                }}
              >
                Đặt lại
              </Button>
            </Grid>
          </Grid>
        </Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress sx={{ color: '#DAA520' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 4, borderRadius: 3, fontFamily: 'Inter' }}>
            {error}
          </Alert>
        ) : rooms.length === 0 ? (
          <Alert severity="info" sx={{ mt: 4, borderRadius: 3, fontFamily: 'Inter' }}>
            Không tìm thấy phòng phù hợp. Vui lòng thử lại với các tiêu chí khác.
          </Alert>
        ) : (
          <>
            <Typography sx={{ mt: 4, mb: 2, fontFamily: 'Inter', color: '#8B4513', fontWeight: 500, textAlign: 'center' }}>
              Tìm thấy <strong>{totalCount}</strong> phòng phù hợp
            </Typography>
            <Grid container spacing={3}>
              {rooms.map((room) => (
                <Grid item xs={12} sm={6} lg={4} key={room.id}>
                  <Card
                    sx={{
                      borderRadius: 4,
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(139, 69, 19, 0.2)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': { transform: 'scale(1.05)', boxShadow: '0 12px 32px rgba(139, 69, 19, 0.3)' },
                    }}
                  >
                    <Carousel showThumbs={false} showStatus={false} infiniteLoop autoPlay interval={3000}>
                      {roomImages[room.id]?.map((img, index) => (
                        <div key={index}>
                          <img src={img.url} alt={img.caption} style={{ height: '200px', objectFit: 'cover' }} />
                          <p style={{ fontFamily: 'Inter', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '8px' }}>
                            {img.caption}
                          </p>
                        </div>
                      ))}
                    </Carousel>
                    <CardContent sx={{ bgcolor: '#FFF8DC', p: 3 }}>
                      <Typography variant="h5" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 1 }}>
                        {room.room_number} - {room.room_type_name || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', mb: 1 }}>
                        Giá: {parseFloat(room.room_type_price || 0).toLocaleString('vi-VN')} VND/đêm
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'Inter', color: room.status === 'available' ? '#2E8B57' : '#FF8C00', mb: 1 }}
                      >
                        Trạng thái: {room.status === 'available' ? 'Còn trống' : room.status === 'booked' ? 'Đã đặt' : 'Đang sử dụng'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', mb: 1 }}>
                        Tối đa: {room.room_type?.max_guests || 'N/A'} khách
                      </Typography>
                      {room.room_type?.amenities && (
                        <>
                          <Typography variant="body2" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 1 }}>
                            Tiện nghi:
                          </Typography>
                          <List dense sx={{ mb: 2, pl: 2 }}>
                            {room.room_type.amenities.split(',').slice(0, 3).map((amenity, index) => (
                              <ListItem key={index} sx={{ py: 0 }}>
                                <ListItemText
                                  primary={`• ${amenity.trim()}`}
                                  primaryTypographyProps={{ fontFamily: 'Inter', color: 'text.secondary', fontSize: '0.875rem' }}
                                />
                              </ListItem>
                            ))}
                            {room.room_type.amenities.split(',').length > 3 && (
                              <ListItem sx={{ py: 0 }}>
                                <ListItemText
                                  primary="• ..."
                                  primaryTypographyProps={{ fontFamily: 'Inter', color: 'text.secondary', fontSize: '0.875rem' }}
                                />
                              </ListItem>
                            )}
                          </List>
                        </>
                      )}
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                          variant="outlined"
                          onClick={() => navigate(`/rooms/${room.id}`)}
                          sx={{ borderColor: '#DAA520', color: '#DAA520', fontFamily: 'Inter', '&:hover': { borderColor: '#B8860B', color: '#B8860B' } }}
                        >
                          Chi tiết
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => handleBookRoom(room)}
                          disabled={room.status !== 'available'}
                          sx={{
                            bgcolor: room.status === 'available' ? '#DAA520' : '#A9A9A9',
                            '&:hover': { bgcolor: room.status === 'available' ? '#B8860B' : '#A9A9A9' },
                            fontFamily: 'Inter',
                          }}
                        >
                          Đặt ngay
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            {totalPages > 1 && (
              <Stack spacing={2} sx={{ mt: 6, mb: 4 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontFamily: 'Inter',
                      '&.Mui-selected': { bgcolor: '#DAA520', color: 'white', '&:hover': { bgcolor: '#B8860B' } },
                    },
                  }}
                />
              </Stack>
            )}
          </>
        )}
        <Dialog
          open={loginDialogOpen}
          onClose={handleCloseLoginDialog}
          maxWidth="xs"
          fullWidth
          sx={{ '& .MuiDialog-paper': { borderRadius: 4, bgcolor: '#FFF8DC', maxWidth: { xs: '90vw', sm: '400px' } } }}
        >
          <DialogTitle sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600 }}>
            Yêu Cầu Đăng Nhập
            <IconButton
              onClick={handleCloseLoginDialog}
              sx={{ position: 'absolute', right: 8, top: 8, color: '#8B4513' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontFamily: 'Inter', color: '#8B4513', mb: 2 }}>
              Bạn cần đăng nhập để tiếp tục đặt phòng.
            </Typography>
            {selectedRoom && (
              <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary' }}>
                Phòng: <strong>{selectedRoom.room_number} ({selectedRoom.room_type_name || 'N/A'})</strong>
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseLoginDialog} sx={{ fontFamily: 'Inter', color: '#DAA520' }}>
              Hủy
            </Button>
            <Button
              onClick={handleLoginRedirect}
              variant="contained"
              sx={{ bgcolor: '#DAA520', '&:hover': { bgcolor: '#B8860B' }, fontFamily: 'Inter' }}
            >
              Đăng nhập
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Rooms;