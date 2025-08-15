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
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/apis';
import authUtils from '../services/auth';
import { useRoomsPolling } from '../hooks/useSmartPolling';
import LazyImage from '../components/LazyImage';

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
  const [priceRange, setPriceRange] = useState([0, 5000000]);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomImages, setRoomImages] = useState({});

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setSearchQuery(searchParams.get('search') || '');
    setRoomTypeFilter(searchParams.get('room_type') || '');
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
        params.append('price_min', priceRange[0].toString());
        params.append('price_max', priceRange[1].toString());
        const response = await api.get(`rooms/?${params.toString()}`);
        const roomsData = Array.isArray(response.data.results) ? response.data.results : response.data;
        setRooms(roomsData);
        setTotalCount(response.data.count || 0);
        setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
        setError(null);

        const imagePromises = roomsData.map((room) =>
          api.get(`/room-images/by_room/${room.id}/`).catch(() => ({ data: { images: [] } }))
        );
        const imageResponses = await Promise.all(imagePromises);
        const newRoomImages = {};
        roomsData.forEach((room, index) => {
          const images = imageResponses[index].data.images || [];
          const primaryImage = images.find(img => img.is_primary) || images[0] || {
            image_url: '/images/default-room.jpg',
            caption: 'Ảnh mặc định',
          };
          newRoomImages[room.id] = {
            url: primaryImage.image_url,
            caption: primaryImage.caption || `Phòng ${room.room_number}`,
          };
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
  }, [searchQuery, roomTypeFilter, priceRange, currentPage, pageSize]);

  const refreshRoomStatus = async () => {
    if (!loading) {
      try {
        const response = await api.get('/rooms/', {
          params: {
            search: searchQuery,
            room_type: roomTypeFilter,
            price_min: priceRange[0],
            price_max: priceRange[1],
            page: currentPage,
            page_size: pageSize,
          },
        });

        const roomsData = response.data.results || [];
        setRooms(roomsData);
        setTotalCount(response.data.count || 0);
        setTotalPages(Math.ceil((response.data.count || 0) / pageSize));

        console.log('🏨 Room status auto-refreshed');
      } catch (error) {
        console.error('Room status auto-refresh error:', error);
      }
    }
  };

  const { isRunning } = useRoomsPolling(refreshRoomStatus, !loading);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (roomTypeFilter) params.append('room_type', roomTypeFilter);
    params.append('price_min', priceRange[0].toString());
    params.append('price_max', priceRange[1].toString());
    params.append('page', '1');
    navigate(`/rooms?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setSearchQuery('');
    setRoomTypeFilter('');
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

  const getMaxGuests = (roomTypeId) => {
    const roomType = roomTypes.find((type) => type.id === roomTypeId);
    return roomType?.max_guests || 'N/A';
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 4, bgcolor: '#FFF8DC', p: 3, borderRadius: 3, boxShadow: '0 4px 12px rgba(139, 69, 19, 0.1)' }}>
          <Typography variant="h6" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 2 }}>
            Tìm kiếm phòng
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Tìm kiếm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#8B4513' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontFamily: 'Inter',
                  },
                  '& .MuiInputLabel-root': { fontFamily: 'Inter', color: '#8B4513' },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth sx={{ borderRadius: 2 }} variant="outlined">
                <InputLabel id="room-type-label" shrink sx={{ fontFamily: 'Inter', color: '#8B4513' }}>
                  Loại phòng
                </InputLabel>
                <Select
                  labelId="room-type-label"
                  label="Loại phòng"
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                  sx={{ fontFamily: 'Inter', borderRadius: 2 }}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Tất cả</em>
                  </MenuItem>
                  {roomTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box sx={{ px: 2 }}>
                <Typography sx={{ fontFamily: 'Inter', color: '#8B4513', mb: 1 }}>
                  Khoảng giá: {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
                </Typography>
                <Slider
                  value={priceRange}
                  onChange={(e, newValue) => setPriceRange(newValue)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={formatCurrency}
                  min={0}
                  max={5000000}
                  step={100000}
                  sx={{
                    color: '#DAA520',
                    '& .MuiSlider-thumb': { bgcolor: '#DAA520' },
                    '& .MuiSlider-track': { bgcolor: '#DAA520' },
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={handleResetFilter}
                sx={{
                  borderColor: '#DAA520',
                  color: '#DAA520',
                  fontFamily: 'Inter',
                  '&:hover': { borderColor: '#B8860B', color: '#B8860B' },
                }}
              >
                Đặt lại
              </Button>
              <Button
                variant="contained"
                onClick={handleFilter}
                sx={{
                  bgcolor: '#DAA520',
                  '&:hover': { bgcolor: '#B8860B' },
                  fontFamily: 'Inter',
                }}
              >
                Tìm kiếm
              </Button>
            </Grid>
          </Grid>
        </Box>

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
            <Grid container spacing={3} alignItems="stretch">
              {rooms.map((room) => (
                <Grid item xs={12} sm={6} lg={4} key={room.id}>
                  <Card
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      minHeight: '450px',
                      borderRadius: 3,
                      overflow: 'hidden',
                      boxShadow: '0 6px 20px rgba(139, 69, 19, 0.15)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      '&:hover': { transform: 'scale(1.03)', boxShadow: '0 10px 28px rgba(139, 69, 19, 0.25)' },
                    }}
                  >
                    <Box sx={{ height: '200px', overflow: 'hidden', aspectRatio: '16/9' }}>
                      <LazyImage
                        src={roomImages[room.id]?.url || '/images/default-room.jpg'}
                        alt={roomImages[room.id]?.caption || `Phòng ${room.room_number}`}
                        width="100%"
                        height="100%"
                        skeletonHeight="200px"
                        borderRadius={0}
                        style={{ objectFit: 'cover' }}
                      />
                    </Box>
                    <CardContent sx={{ bgcolor: '#FFF8DC', p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: 'Inter',
                          color: '#8B4513',
                          fontWeight: 600,
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {room.room_number} - {room.room_type_name || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', mb: 0.75 }}>
                        Giá: {parseFloat(room.room_type_price || 0).toLocaleString('vi-VN')} VND/đêm
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Inter',
                          color: room.status === 'available' ? '#2E8B57' : '#FF8C00',
                          mb: 0.75,
                        }}
                      >
                        Trạng thái: {room.status === 'available' ? 'Còn trống' : room.status === 'booked' ? 'Đã đặt' : 'Đang sử dụng'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary', mb: 1 }}>
                        Tối đa: {getMaxGuests(room.room_type)} khách
                      </Typography>
                      {room.room_type?.amenities && (
                        <>
                          <Typography variant="body2" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600, mb: 0.75 }}>
                            Tiện nghi:
                          </Typography>
                          <List dense sx={{ mb: 1.5, pl: 2 }}>
                            {room.room_type.amenities.split(',').slice(0, 3).map((amenity, index) => (
                              <ListItem key={index} sx={{ py: 0 }}>
                                <ListItemText
                                  primary={`• ${amenity.trim()}`}
                                  primaryTypographyProps={{
                                    fontFamily: 'Inter',
                                    color: 'text.secondary',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </ListItem>
                            ))}
                            {room.room_type.amenities.split(',').length > 3 && (
                              <ListItem sx={{ py: 0 }}>
                                <ListItemText
                                  primary="• ..."
                                  primaryTypographyProps={{
                                    fontFamily: 'Inter',
                                    color: 'text.secondary',
                                    fontSize: '0.85rem',
                                  }}
                                />
                              </ListItem>
                            )}
                          </List>
                        </>
                      )}
                      <Box sx={{ display: 'flex', gap: 1.5, mt: 'auto' }}>
                        <Button
                          variant="outlined"
                          onClick={() => navigate(`/rooms/${room.id}`)}
                          sx={{
                            borderColor: '#DAA520',
                            color: '#DAA520',
                            fontFamily: 'Inter',
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.75,
                            '&:hover': { borderColor: '#B8860B', color: '#B8860B' },
                          }}
                        >
                          Chi tiết
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() => handleBookRoom(room)}
                          sx={{
                            bgcolor: '#DAA520',
                            '&:hover': { bgcolor: '#B8860B' },
                            fontFamily: 'Inter',
                            fontSize: '0.85rem',
                            px: 2,
                            py: 0.75,
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
            <Stack spacing={2} sx={{ mt: 4, alignItems: 'center' }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                sx={{ '& .MuiPaginationItem-root': { fontFamily: 'Inter' } }}
              />
            </Stack>
          </>
        )}
      </Container>
      <Dialog
        open={loginDialogOpen}
        onClose={handleCloseLoginDialog}
        sx={{ '& .MuiDialog-paper': { borderRadius: 3, p: 2 } }}
      >
        <DialogTitle sx={{ fontFamily: 'Inter', color: '#8B4513' }}>
          Yêu cầu đăng nhập
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontFamily: 'Inter', color: 'text.secondary' }}>
            Vui lòng đăng nhập để đặt phòng.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseLoginDialog}
            sx={{ fontFamily: 'Inter', color: '#8B4513' }}
          >
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
    </Box>
  );
};

export default Rooms;