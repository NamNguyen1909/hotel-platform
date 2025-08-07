import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Stack,
  Paper,
  Avatar,
  useTheme,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Hotel as HotelIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Info as InfoIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/apis';

const statusColors = {
  pending: { color: 'warning', bgColor: '#fff3cd', textColor: '#856404', icon: <ScheduleIcon /> },
  confirmed: { color: 'success', bgColor: '#d4edda', textColor: '#155724', icon: <CheckCircleIcon /> },
  checked_in: { color: 'info', bgColor: '#d1ecf1', textColor: '#0c5460', icon: <HotelIcon /> },
  checked_out: { color: 'default', bgColor: '#f8f9fa', textColor: '#6c757d', icon: <CheckCircleIcon /> },
  cancelled: { color: 'error', bgColor: '#f8d7da', textColor: '#721c24', icon: <CancelIcon /> },
};

const statusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  checked_in: 'Đã nhận phòng',
  checked_out: 'Đã trả phòng',
  cancelled: 'Đã hủy',
  no_show: 'Không đến',
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    console.log('MyBookings component mounted');
    console.log('Auth token exists:', !!localStorage.getItem('access_token'));
    fetchBookings();
  }, []);

  useEffect(() => {
    // Filter bookings based on search term
    if (!searchTerm.trim()) {
      setFilteredBookings(bookings);
    } else {
      const filtered = bookings.filter(booking => 
        booking.id.toString().includes(searchTerm) ||
        new Date(booking.check_in_date).toLocaleDateString('vi-VN').includes(searchTerm) ||
        new Date(booking.check_out_date).toLocaleDateString('vi-VN').includes(searchTerm) ||
        statusLabels[booking.status]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.room_details?.some(room => 
          room.room_number?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredBookings(filtered);
    }
  }, [searchTerm, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      console.log('Fetching bookings for user...');
      const response = await api.get(endpoints.bookings.myBookings);
      console.log('Bookings response:', response.data);
      
      // Handle paginated response
      if (response.data.results) {
        console.log('Found paginated response with', response.data.results.length, 'bookings');
        setBookings(response.data.results);
      } else if (Array.isArray(response.data)) {
        console.log('Found direct array with', response.data.length, 'bookings');
        setBookings(response.data);
      } else {
        console.log('Unexpected response format:', response.data);
        setBookings([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      console.error('Error response:', err.response?.data);
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        setError('Bạn cần đăng nhập để xem đặt phòng của mình.');
      } else if (err.response?.status === 403) {
        setError('Bạn không có quyền xem thông tin này.');
      } else {
        setError('Không thể tải danh sách đặt phòng. Vui lòng thử lại sau.');
      }
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingDetail = async (bookingId) => {
    try {
      setLoadingDetail(true);
      const response = await api.get(endpoints.bookings.detail(bookingId));
      setBookingDetail(response.data);
    } catch (err) {
      console.error('Error fetching booking detail:', err);
      setError('Không thể tải chi tiết đặt phòng.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenModal = async (booking) => {
    setSelectedBooking(booking);
    setOpenModal(true);
    await fetchBookingDetail(booking.id);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedBooking(null);
    setBookingDetail(null);
  };

  const handleRefresh = () => {
    fetchBookings();
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    try {
      setCancelling(true);
      await api.post(endpoints.bookings.cancel(selectedBooking.id));
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === selectedBooking.id 
          ? { ...booking, status: 'cancelled' }
          : booking
      ));
      
      // Update booking detail if open
      if (bookingDetail && bookingDetail.id === selectedBooking.id) {
        setBookingDetail(prev => ({ ...prev, status: 'cancelled' }));
      }
      
      setOpenCancelDialog(false);
      setError(null);
      
      // Show success message
      setSuccessMessage('Đặt phòng đã được hủy thành công!');
      setTimeout(() => setSuccessMessage(''), 5000); // Hide after 5 seconds
      
    } catch (err) {
      console.error('Error cancelling booking:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Không thể hủy đặt phòng. Vui lòng thử lại sau.');
      }
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenCancelDialog = () => {
    setOpenCancelDialog(true);
  };

  const handleCloseCancelDialog = () => {
    setOpenCancelDialog(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString('vi-VN') + ' VND';
  };

  const getStatusConfig = (status) => {
    return statusColors[status] || statusColors.pending;
  };

  const canCancelBooking = (booking) => {
    return booking && ['pending', 'confirmed'].includes(booking.status);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header Section */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            mb: 4, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <HotelIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Đặt Phòng Của Tôi
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Quản lý và theo dõi các đặt phòng của bạn
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Làm mới">
              <Fab 
                size="medium" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                onClick={handleRefresh}
              >
                <RefreshIcon />
              </Fab>
            </Tooltip>
          </Box>
        </Paper>

        {/* Search Section */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Tìm kiếm theo mã đặt phòng, ngày, trạng thái, số phòng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Paper>

        {/* Content Section */}
        {successMessage && (
          <Alert severity="success" sx={{ borderRadius: 2, mb: 3 }}>
            {successMessage}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} thickness={4} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2, mb: 3 }}>
            {error}
          </Alert>
        ) : filteredBookings.length === 0 ? (
          <Paper elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <HotelIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {bookings.length === 0 ? 'Bạn chưa có đặt phòng nào' : 'Không tìm thấy kết quả phù hợp'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {bookings.length === 0 
                ? 'Hãy đặt phòng đầu tiên của bạn để bắt đầu trải nghiệm'
                : 'Thử tìm kiếm với từ khóa khác'
              }
            </Typography>
            {bookings.length === 0 && (
              <Button 
                variant="contained" 
                sx={{ mt: 3 }}
                onClick={() => navigate('/rooms')}
              >
                Đặt Phòng Ngay
              </Button>
            )}
          </Paper>
        ) : (
          <>
            {/* Results Info */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Hiển thị {filteredBookings.length} / {bookings.length} đặt phòng
              </Typography>
            </Box>

            {/* Bookings Grid */}
            <Grid container spacing={3}>
              {filteredBookings.map((booking) => {
                const statusConfig = getStatusConfig(booking.status);
                return (
                  <Grid item xs={12} md={6} lg={4} key={booking.id}>
                    <Card 
                      elevation={2}
                      sx={{ 
                        height: '100%',
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: theme.shadows[8],
                        },
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                      onClick={() => handleOpenModal(booking)}
                    >
                      <CardContent sx={{ p: 3 }}>
                        {/* Header with Status */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 32, height: 32 }}>
                              <Typography variant="caption" fontWeight="bold">
                                {booking.id}
                              </Typography>
                            </Avatar>
                            <Typography variant="h6" fontWeight="bold">
                              Đặt phòng #{booking.id}
                            </Typography>
                          </Box>
                          <Chip
                            icon={statusConfig.icon}
                            label={statusLabels[booking.status]}
                            size="small"
                            sx={{
                              bgcolor: statusConfig.bgColor,
                              color: statusConfig.textColor,
                              fontWeight: 'bold',
                              '& .MuiChip-icon': {
                                color: statusConfig.textColor,
                              },
                            }}
                          />
                        </Box>

                        <Divider sx={{ mb: 2 }} />

                        {/* Booking Info */}
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Check-in
                              </Typography>
                              <Typography variant="body2" fontWeight="500">
                                {formatDate(booking.check_in_date)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Check-out
                              </Typography>
                              <Typography variant="body2" fontWeight="500">
                                {formatDate(booking.check_out_date)}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Số khách
                              </Typography>
                              <Typography variant="body2" fontWeight="500">
                                {booking.guest_count} người
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MoneyIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Tổng tiền
                              </Typography>
                              <Typography variant="h6" fontWeight="bold" color="primary.main">
                                {formatPrice(booking.total_price)}
                              </Typography>
                            </Box>
                          </Box>

                          {booking.room_details && booking.room_details.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <HotelIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  Phòng
                                </Typography>
                                <Typography variant="body2" fontWeight="500">
                                  {booking.room_details.map(room => room.room_number).join(', ')}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>

                      <CardActions sx={{ p: 2, pt: 0 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<InfoIcon />}
                          sx={{ borderRadius: 2 }}
                        >
                          Xem Chi Tiết
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {/* Detail Modal */}
        <Dialog
          open={openModal}
          onClose={handleCloseModal}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ p: 3, bgcolor: 'primary.main', color: 'white', position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <HotelIcon />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Chi Tiết Đặt Phòng #{selectedBooking?.id}
                </Typography>
                {selectedBooking && (
                  <Chip
                    icon={getStatusConfig(selectedBooking.status).icon}
                    label={statusLabels[selectedBooking.status]}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      mt: 1,
                      '& .MuiChip-icon': {
                        color: 'white',
                      },
                    }}
                  />
                )}
              </Box>
            </Box>
            <IconButton
              onClick={handleCloseModal}
              sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 0 }}>
            {loadingDetail ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : bookingDetail ? (
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Basic Information */}
                  <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="h6" gutterBottom color="primary.main" fontWeight="bold">
                        Thông Tin Cơ Bản
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Mã đặt phòng
                          </Typography>
                          <Typography variant="body1" fontWeight="500">
                            #{bookingDetail.id}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Ngày tạo
                          </Typography>
                          <Typography variant="body1">
                            {formatDate(bookingDetail.created_at)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Số khách
                          </Typography>
                          <Typography variant="body1">
                            {bookingDetail.guest_count} người
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Tổng tiền
                          </Typography>
                          <Typography variant="h6" color="primary.main" fontWeight="bold">
                            {formatPrice(bookingDetail.total_price)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Time Information */}
                  <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="h6" gutterBottom color="primary.main" fontWeight="bold">
                        Thời Gian
                      </Typography>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Check-in
                          </Typography>
                          <Typography variant="body1" fontWeight="500">
                            {formatDate(bookingDetail.check_in_date)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Check-out
                          </Typography>
                          <Typography variant="body1" fontWeight="500">
                            {formatDate(bookingDetail.check_out_date)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Số đêm
                          </Typography>
                          <Typography variant="body1">
                            {Math.ceil((new Date(bookingDetail.check_out_date) - new Date(bookingDetail.check_in_date)) / (1000 * 60 * 60 * 24))} đêm
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Room Information */}
                  {bookingDetail.room_details && bookingDetail.room_details.length > 0 && (
                    <Grid item xs={12}>
                      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom color="primary.main" fontWeight="bold">
                          Thông Tin Phòng
                        </Typography>
                        <Grid container spacing={2}>
                          {bookingDetail.room_details.map((room, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                              <Box 
                                sx={{ 
                                  p: 2, 
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: 2,
                                  bgcolor: 'background.paper'
                                }}
                              >
                                <Typography variant="subtitle1" fontWeight="bold">
                                  Phòng {room.room_number}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {room.room_type_name}
                                </Typography>
                                <Typography variant="body2" color="primary.main" fontWeight="500">
                                  {formatPrice(room.room_type_price)}/đêm
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Paper>
                    </Grid>
                  )}

                  {/* Special Requests */}
                  {bookingDetail.special_requests && (
                    <Grid item xs={12}>
                      <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom color="primary.main" fontWeight="bold">
                          Yêu Cầu Đặc Biệt
                        </Typography>
                        <Typography variant="body1">
                          {bookingDetail.special_requests}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Không thể tải chi tiết đặt phòng</Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 3, bgcolor: 'background.default' }}>
            <Button onClick={handleCloseModal} variant="outlined">
              Đóng
            </Button>
            {canCancelBooking(selectedBooking) && (
              <Button 
                variant="contained" 
                color="error"
                onClick={handleOpenCancelDialog}
                startIcon={<CancelIcon />}
                disabled={cancelling}
              >
                Hủy Đặt Phòng
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <Dialog
          open={openCancelDialog}
          onClose={handleCloseCancelDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3 }
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
            <WarningIcon />
            <Typography variant="h6" fontWeight="bold">
              Xác nhận hủy đặt phòng
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ py: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn hủy đặt phòng này không?
            </Alert>
            
            {selectedBooking && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Mã đặt phòng:</strong> #{selectedBooking.id}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Check-in:</strong> {formatDate(selectedBooking.check_in_date)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Check-out:</strong> {formatDate(selectedBooking.check_out_date)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Tổng tiền:</strong> {formatPrice(selectedBooking.total_price)}
                </Typography>
              </Box>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Lưu ý: Sau khi hủy, bạn không thể hoàn tác thao tác này. Vui lòng liên hệ với khách sạn để biết thêm chi tiết về chính sách hoàn tiền.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleCloseCancelDialog} 
              variant="outlined"
              disabled={cancelling}
            >
              Không, giữ lại
            </Button>
            <Button 
              onClick={handleCancelBooking} 
              variant="contained" 
              color="error"
              disabled={cancelling}
              startIcon={cancelling ? <CircularProgress size={16} /> : <CancelIcon />}
            >
              {cancelling ? 'Đang hủy...' : 'Có, hủy đặt phòng'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default MyBookings;