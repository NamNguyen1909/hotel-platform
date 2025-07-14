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
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Pagination,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/apis';
import authUtils from '../services/auth';
import vi from 'date-fns/locale/vi';
import { format } from 'date-fns';

const Rooms = () => {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // State cho pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(12); // Số phòng mỗi trang

  // State cho bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [guestCount, setGuestCount] = useState('');

  // Lấy query params từ URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setSearchQuery(searchParams.get('search') || '');
    setRoomTypeFilter(searchParams.get('room_type') || '');
    setCheckInDate(searchParams.get('check_in') ? new Date(searchParams.get('check_in')) : null);
    setCheckOutDate(searchParams.get('check_out') ? new Date(searchParams.get('check_out')) : null);
    setGuestCount(searchParams.get('guest_count') || '');
    setCurrentPage(parseInt(searchParams.get('page')) || 1);
  }, [location.search]);

  // Lấy danh sách loại phòng
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const response = await api.get('room-types/'); // Sử dụng endpoint từ apis.js
        console.log('Room types response:', response);
        
        // Xử lý response data - có thể là paginated hoặc direct array
        let roomTypesData = response.data;
        if (roomTypesData && typeof roomTypesData === 'object') {
          // Nếu có pagination
          if (roomTypesData.results && Array.isArray(roomTypesData.results)) {
            roomTypesData = roomTypesData.results;
          }
          // Nếu là object nhưng không phải array
          else if (!Array.isArray(roomTypesData)) {
            console.warn('Unexpected room types response structure:', roomTypesData);
            roomTypesData = [];
          }
        }
        
        // Đảm bảo response.data là array
        setRoomTypes(Array.isArray(roomTypesData) ? roomTypesData : []);
      } catch (err) {
        console.error('Error fetching room types:', err);
        setRoomTypes([]); // Set về array rỗng nếu có lỗi
      }
    };
    fetchRoomTypes();
  }, []);

  // Lấy danh sách phòng
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        let url = 'rooms/'; // Sử dụng endpoint từ apis.js
        const params = new URLSearchParams();

        // Thêm pagination params
        params.append('page', currentPage.toString());
        params.append('page_size', pageSize.toString());

        if (searchQuery) params.append('search', searchQuery);
        if (roomTypeFilter) params.append('room_type', roomTypeFilter);
        if (checkInDate && checkOutDate) {
          params.append('check_in', format(checkInDate, 'yyyy-MM-dd'));
          params.append('check_out', format(checkOutDate, 'yyyy-MM-dd'));
          url = 'rooms/available/'; // Sử dụng endpoint available khi có ngày
        }
        if (guestCount) params.append('guest_count', guestCount);

        try {
          console.log('Fetching rooms with URL:', url, 'Params:', params.toString());
          const response = await api.get(`${url}?${params.toString()}`);
          console.log('Rooms response:', response);
          console.log('Rooms response data:', response.data);
          
          // Xử lý response data - có thể là paginated hoặc direct array
          let roomsData = response.data;
          let paginationInfo = {};
          
          if (roomsData && typeof roomsData === 'object') {
            // Nếu có pagination
            if (roomsData.results && Array.isArray(roomsData.results)) {
              paginationInfo = {
                count: roomsData.count || 0,
                next: roomsData.next,
                previous: roomsData.previous,
                totalPages: Math.ceil((roomsData.count || 0) / pageSize)
              };
              roomsData = roomsData.results;
            }
            // Nếu là object nhưng không phải array, có thể cần kiểm tra structure khác
            else if (!Array.isArray(roomsData)) {
              console.warn('Unexpected response structure:', roomsData);
              roomsData = [];
            }
          }
          
          setRooms(Array.isArray(roomsData) ? roomsData : []);
          setTotalCount(paginationInfo.count || 0);
          setTotalPages(paginationInfo.totalPages || 1);
          setError(null);
        } catch (err) {
          console.error('Error fetching rooms:', err.response || err.message || err);
          setError('Không thể tải danh sách phòng. Vui lòng thử lại sau.');
          setRooms([]);
        } finally {
          setLoading(false);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.');
        setRooms([]);
        setLoading(false);
      }
    };
    fetchRooms();
  }, [searchQuery, roomTypeFilter, checkInDate, checkOutDate, guestCount, currentPage, pageSize]);

  // Xử lý tìm kiếm và lọc
  const handleFilter = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (roomTypeFilter) params.append('room_type', roomTypeFilter);
    if (checkInDate) params.append('check_in', format(checkInDate, 'yyyy-MM-dd'));
    if (checkOutDate) params.append('check_out', format(checkOutDate, 'yyyy-MM-dd'));
    if (guestCount) params.append('guest_count', guestCount);
    params.append('page', '1'); // Reset về trang 1 khi filter
    navigate(`/rooms?${params.toString()}`);
  };

  const handleResetFilter = () => {
    setSearchQuery('');
    setRoomTypeFilter('');
    setCheckInDate(null);
    setCheckOutDate(null);
    setGuestCount('');
    navigate('/rooms');
  };

  // Xử lý pagination
  const handlePageChange = (event, page) => {
    const params = new URLSearchParams(location.search);
    params.set('page', page.toString());
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700 }}
        >
          Tìm Kiếm Phòng
        </Typography>

        {/* Bộ lọc */}
        <Box
          sx={{
            mb: 4,
            p: 2,
            bgcolor: 'rgba(139, 69, 19, 0.1)',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
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
                }}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '& .MuiInputBase-input': { fontFamily: 'Inter' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B8860B' },
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth sx={{ bgcolor: 'rgba(255, 255, 255, 0.9)' }}>
                <InputLabel sx={{ fontFamily: 'Inter' }}>Loại phòng</InputLabel>
                <Select
                  value={roomTypeFilter}
                  onChange={(e) => setRoomTypeFilter(e.target.value)}
                  label="Loại phòng"
                  sx={{ fontFamily: 'Inter' }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {Array.isArray(roomTypes) && roomTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id} sx={{ fontFamily: 'Inter' }}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày nhận phòng"
                  value={checkInDate}
                  onChange={(newValue) => setCheckInDate(newValue)}
                  minDate={new Date()}
                  maxDate={new Date(new Date().setDate(new Date().getDate() + 28))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        '& .MuiInputBase-input': { fontFamily: 'Inter' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={2}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày trả phòng"
                  value={checkOutDate}
                  onChange={(newValue) => setCheckOutDate(newValue)}
                  minDate={checkInDate || new Date()}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      sx={{
                        bgcolor: 'rgba(255, 255, 255, 0.9)',
                        '& .MuiInputBase-input': { fontFamily: 'Inter' },
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                      }}
                    />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="number"
                label="Số khách"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                InputProps={{ inputProps: { min: 1 } }}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                  '& .MuiInputBase-input': { fontFamily: 'Inter' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#DAA520' },
                }}
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleFilter}
                sx={{
                  bgcolor: '#DAA520',
                  '&:hover': { bgcolor: '#B8860B' },
                  fontFamily: 'Inter',
                }}
              >
                Lọc
              </Button>
              <Button
                variant="outlined"
                onClick={handleResetFilter}
                sx={{
                  borderColor: '#DAA520',
                  color: '#DAA520',
                  '&:hover': { borderColor: '#B8860B', color: '#B8860B' },
                  fontFamily: 'Inter',
                }}
              >
                Xóa bộ lọc
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Danh sách phòng */}
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
          <>
            {/* Thông tin tổng quan */}
            <Box sx={{ 
              mb: 3, 
              p: 2, 
              bgcolor: 'rgba(218, 165, 32, 0.1)', 
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Typography variant="body1" sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 500 }}>
                Tìm thấy <strong>{totalCount}</strong> phòng
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Inter', color: 'text.secondary' }}>
                Trang {currentPage} / {totalPages} (Hiển thị {rooms.length} phòng)
              </Typography>
            </Box>

            {/* Danh sách phòng */}
            <Grid container spacing={3}>
              {rooms.map((room) => (
                <Grid item xs={12} sm={6} md={4} key={room.id}>
                  {/* ...existing room card code... */}
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
                      image={room.room_type?.image || room.primary_image_url || 'https://via.placeholder.com/300x140'}
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
                        Giá: {parseFloat(room.room_type_price || 0).toLocaleString('vi-VN')} VND/đêm
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                        Trạng thái: {room.status === 'available' ? 'Còn trống' : room.status === 'booked' ? 'Đã đặt' : 'Đang sử dụng'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                        Tối đa: {room.room_type?.max_guests || 'N/A'} khách
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                        Tiện nghi: {room.room_type?.amenities || 'N/A'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          variant="contained"
                          sx={{
                            bgcolor: '#DAA520',
                            '&:hover': { bgcolor: '#B8860B' },
                            fontFamily: 'Inter',
                          }}
                          onClick={() => navigate(`/rooms/${room.id}`)}
                        >
                          Xem Chi Tiết
                        </Button>
                        <Button
                          variant="contained"
                          sx={{
                            bgcolor: room.status === 'available' ? '#8B4513' : '#A9A9A9',
                            cursor: room.status === 'available' ? 'pointer' : 'not-allowed',
                            '&:hover': {
                              bgcolor: room.status === 'available' ? '#A0522D' : '#A9A9A9',
                            },
                            fontFamily: 'Inter',
                          }}
                          onClick={() => {
                            if (room.status === 'available') {
                              if (!authUtils.isAuthenticated()) {
                                navigate('/login', { 
                                  state: { 
                                    from: '/book',
                                    roomId: room.id, 
                                    checkInDate, 
                                    checkOutDate, 
                                    guestCount 
                                  } 
                                });
                              } else {
                                navigate('/book', { 
                                  state: { 
                                    roomId: room.id, 
                                    checkInDate, 
                                    checkOutDate, 
                                    guestCount 
                                  } 
                                });
                              }
                            }
                          }}
                          disabled={room.status !== 'available'}
                        >
                          Đặt Phòng
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Stack spacing={2} sx={{ mt: 4, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
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
                        '&.Mui-selected': {
                          backgroundColor: '#DAA520',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: '#B8860B',
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </Stack>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default Rooms;