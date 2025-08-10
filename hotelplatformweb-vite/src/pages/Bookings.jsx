import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Divider,
  Grid,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  Search as SearchIcon,
  CheckCircle,
  ExitToApp,
  Add,
  Cancel,
} from '@mui/icons-material';
import api, { endpoints } from '../services/apis';
import authUtils from '../services/auth';
import { useBookingsPolling } from '../hooks/useSmartPolling';
import CheckoutDialog from '../components/CheckoutDialog';

// Format giá tiền
const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
};

// Format ngày giờ
const formatDate = (dateString) => {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateString));
};

// Map trạng thái booking với màu sắc và nhãn
const statusConfig = {
  pending: { label: 'Chờ xác nhận', color: 'warning' },
  confirmed: { label: 'Đã xác nhận', color: 'info' },
  checked_in: { label: 'Đã check-in', color: 'success' },
  checked_out: { label: 'Đã check-out', color: 'default' },
  cancelled: { label: 'Đã hủy', color: 'error' },
};

const Bookings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialog, setDialog] = useState({
    open: false,
    action: null,
    bookingId: null,
    title: '',
    message: '',
  });
  const [checkinDialog, setCheckinDialog] = useState({
    open: false,
    booking: null,
    actualGuestCount: 0,
    estimatedPrice: 0,
    surchargeInfo: null,
  });
  const [checkoutDialog, setCheckoutDialog] = useState({
    open: false,
    bookingId: null,
  });

  // Check payment result từ URL params (VNPay redirect)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paymentResult = searchParams.get('payment_result');
    const message = searchParams.get('message');
    const autoRefresh = searchParams.get('auto_refresh');
    
    if (paymentResult || autoRefresh) {
      // Nếu có auto_refresh, refresh token để duy trì session
      if (autoRefresh === 'true' && authUtils.isAuthenticated()) {
        authUtils.refreshToken().catch(error => {
          console.warn('Failed to refresh token after payment:', error);
          // Không navigate về login ngay, để user thấy kết quả thanh toán trước
        });
      }
      
      // Clear URL params ngay lập tức để tránh loop
      const newUrl = location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Force refresh data sau khi clear URL
      if (paymentResult || autoRefresh) {
        // Trigger a fresh data fetch
        setPaginationModel(prev => ({ ...prev, page: prev.page }));
      }
    }
  }, [location]);

  // Fetch bookings từ API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Kiểm tra xác thực và quyền truy cập
        if (!authUtils.isAuthenticated()) {
          setError('Vui lòng đăng nhập để xem danh sách đặt phòng.');
          navigate('/login');
          return;
        }

        const user = await authUtils.getCurrentUser();
        if (!['staff', 'admin', 'owner'].includes(user?.role)) {
          setError('Bạn không có quyền truy cập trang này.');
          navigate('/');
          return;
        }

        // Gọi API lấy danh sách bookings
        const response = await api.get(endpoints.bookings.list, {
          params: {
            page: paginationModel.page + 1, // Django pagination là 1-based
            page_size: paginationModel.pageSize,
            search: searchTerm.trim() || undefined,
          },
        });

        // Debug dữ liệu API
        console.log('API Response (Bookings):', response.data.results);

        // Xử lý dữ liệu từ API
        const fetchedBookings = (response.data.results || []).map((booking) => {
          const customerName = booking.customer_name;
          const customerPhone = booking.customer_phone || 'N/A';

          if (!customerName) {
            console.warn(`Booking ID ${booking.id} thiếu tên khách hàng:`, {
              booking: booking,
            });
          }

          return {
            id: booking.id,
            customer_name: customerName || 'Khách hàng không xác định',
            customer_phone: customerPhone,
            room_numbers: booking.room_details
              ?.map((room) => room.room_number)
              .join(', ') || 'N/A',
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            total_price: parseFloat(booking.total_price || 0),
            guest_count: booking.guest_count || 0,
            status: booking.status,
            room_details: booking.room_details || [],
            rentals: booking.rentals || [],
          };
        });

        if (fetchedBookings.some((b) => !b.customer_name || b.customer_name === 'Khách hàng không xác định')) {
          setError(
            'Cảnh báo: Một số booking thiếu tên khách hàng. Vui lòng kiểm tra dữ liệu từ hệ thống.'
          );
        } else if (fetchedBookings.some((b) => b.customer_phone === 'N/A')) {
          setError(
            'Thông báo: Một số khách hàng chưa cung cấp số điện thoại.'
          );
        }

        setBookings(fetchedBookings);
        setRowCount(response.data.count || 0);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (err.response?.status === 401) {
          setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          authUtils.clearTokens();
          navigate('/login');
        } else if (err.response?.status === 403) {
          setError('Bạn không có quyền truy cập danh sách đặt phòng.');
          navigate('/');
        } else {
          setError('Không thể tải danh sách đặt phòng. Vui lòng thử lại sau.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [navigate, paginationModel, searchTerm]);

  // Function để refresh bookings data
  const refreshBookings = async () => {
    // Chỉ refresh khi không đang loading và có quyền truy cập
    if (!loading && authUtils.isAuthenticated()) {
      try {
        const user = await authUtils.getCurrentUser();
        if (['staff', 'admin', 'owner'].includes(user?.role)) {
          // Refresh data trong background, không hiển thị loading spinner
          const response = await api.get(endpoints.bookings.list, {
            params: {
              page: paginationModel.page + 1,
              page_size: paginationModel.pageSize,
              search: searchTerm.trim() || undefined,
            },
          });

          const fetchedBookings = (response.data.results || []).map((booking) => ({
            id: booking.id,
            customer_name: booking.customer_name || 'Khách hàng không xác định',
            customer_phone: booking.customer_phone || 'N/A',
            room_numbers: booking.room_details
              ?.map((room) => room.room_number)
              .join(', ') || 'N/A',
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            total_price: parseFloat(booking.total_price || 0),
            guest_count: booking.guest_count || 0,
            status: booking.status,
            room_details: booking.room_details || [],
            rentals: booking.rentals || [],
          }));

          setBookings(fetchedBookings);
          setRowCount(response.data.count || 0);
          console.log('🔄 Bookings auto-refreshed');
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
        // Không hiển thị error cho auto-refresh để tránh làm phiền user
      }
    }
  };

  // Smart Auto-refresh với custom hook - 2 phút interval
  const { isRunning } = useBookingsPolling(
    refreshBookings,
    !loading && authUtils.isAuthenticated()
  );

  // Xử lý tìm kiếm
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  // Mở dialog xác nhận
  const openConfirmationDialog = (action, bookingId, title, message) => {
    setDialog({
      open: true,
      action,
      bookingId,
      title,
      message,
    });
  };

  // Đóng dialog
  const closeDialog = () => {
    setDialog({ open: false, action: null, bookingId: null, title: '', message: '' });
  };

  // Mở modal check-in với tính giá tạm tính
  const openCheckinDialog = (booking) => {
    setCheckinDialog({
      open: true,
      booking: booking,
      actualGuestCount: booking.guest_count, // Mặc định bằng số khách đã đặt
      estimatedPrice: booking.total_price,
      surchargeInfo: null,
    });
  };

  // Tính giá tạm tính dựa trên số khách thực tế so với max_guests của room type
  const calculateEstimatedPrice = (booking, actualGuestCount) => {
    if (!booking || !actualGuestCount) return booking?.total_price || 0;
    
    const originalPrice = booking.total_price;
    const rooms = booking.room_details || [];
    
    if (!rooms.length) {
      return {
        estimatedPrice: originalPrice,
        surchargeInfo: null,
        breakdown: null
      };
    }

    // Tính tổng max_guests của tất cả phòng
    const totalMaxGuests = rooms.reduce((sum, room) => sum + (room.room_type_max_guests || 0), 0);
    
    // Nếu số khách thực tế <= tổng max_guests, không có phụ thu
    if (actualGuestCount <= totalMaxGuests) {
      return {
        estimatedPrice: originalPrice,
        surchargeInfo: actualGuestCount < booking.guest_count ? 
          `Ít khách hơn dự kiến: ${booking.guest_count - actualGuestCount} khách` : null,
        breakdown: null
      };
    }
    
    // Có phụ thu nếu vượt quá max_guests
    const extraGuests = actualGuestCount - totalMaxGuests;
    
    // Tính phụ thu dựa trên extra_guest_surcharge của từng room type
    let totalSurcharge = 0;
    const stayDays = Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24));
    
    rooms.forEach(room => {
      const roomSurcharge = (room.room_type_price || 0) * ((room.room_type_extra_guest_surcharge || 20) / 100);
      totalSurcharge += roomSurcharge * stayDays;
    });
    
    // Phân bổ phụ thu theo tỷ lệ khách thêm
    const proportionalSurcharge = (totalSurcharge * extraGuests) / rooms.length;
    const estimatedPrice = originalPrice + proportionalSurcharge;
    
    return {
      estimatedPrice: estimatedPrice,
      surchargeInfo: `Phụ thu ${extraGuests} khách vượt quá giới hạn (${totalMaxGuests} khách): ${formatPrice(proportionalSurcharge)}`,
      breakdown: {
        original: originalPrice,
        surcharge: proportionalSurcharge,
        total: estimatedPrice,
        maxGuests: totalMaxGuests,
        extraGuests: extraGuests
      }
    };
  };

  // Xử lý thay đổi số khách thực tế
  const handleGuestCountChange = (newGuestCount) => {
    if (!checkinDialog.booking) return;
    
    // Tính lại giá
    const priceData = calculateEstimatedPrice(checkinDialog.booking, newGuestCount);
    
    setCheckinDialog(prev => ({
      ...prev,
      actualGuestCount: newGuestCount,
      estimatedPrice: priceData.estimatedPrice,
      surchargeInfo: priceData.surchargeInfo,
      breakdown: priceData.breakdown,
    }));
  };

  // Đóng modal check-in
  const closeCheckinDialog = () => {
    setCheckinDialog({ 
      open: false, 
      booking: null, 
      actualGuestCount: 0,
      estimatedPrice: 0,
      surchargeInfo: null,
    });
  };

  // Xử lý check-in với actual guest count
  const handleCheckIn = async (bookingId, actualGuestCount) => {
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking) {
        setError('Không tìm thấy booking.');
        return;
      }

      // Kiểm tra trạng thái booking
      if (booking.status !== 'confirmed') {
        setError('Booking chưa được xác nhận, không thể check-in.');
        return;
      }

      // Kiểm tra actualGuestCount
      if (!Number.isInteger(actualGuestCount) || actualGuestCount <= 0) {
        setError('Số khách thực tế không hợp lệ.');
        return;
      }

      // Kiểm tra token trước khi gửi yêu cầu
      const token = localStorage.getItem('access_token');
      console.log('Access token for check-in:', token); // Debug token
      if (!token) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        authUtils.clearTokens();
        navigate('/login');
        return;
      }

      console.log('Sending check-in request:', {
        bookingId,
        actual_guest_count: actualGuestCount,
      });

      const response = await api.post(endpoints.bookings.checkin(bookingId), {
        actual_guest_count: actualGuestCount,
      });

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'checked_in', guest_count: actualGuestCount }
            : booking
        )
      );
      setError(null);
      closeCheckinDialog(); // Đóng modal sau khi thành công
    } catch (err) {
      console.error('Check-in error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      if (err.response?.status === 401) {
        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        authUtils.clearTokens();
        navigate('/login');
      } else {
        setError(`Không thể thực hiện check-in: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  // Xử lý check-out với enhanced checkout dialog
  const handleCheckOut = async (bookingId) => {
    // Mở checkout dialog thay vì gọi API trực tiếp
    setCheckoutDialog({
      open: true,
      bookingId: bookingId,
    });
  };

  // Xử lý khi checkout thành công
  const handleCheckoutSuccess = (checkoutData) => {
    // Cập nhật booking trong list
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === checkoutData.booking_id 
          ? { ...booking, status: 'checked_out' } 
          : booking
      )
    );
    setError(null);
    
    // Hiển thị thông báo thành công
    console.log('Checkout thành công:', checkoutData);
  };

  // Đóng checkout dialog
  const closeCheckoutDialog = () => {
    setCheckoutDialog({
      open: false,
      bookingId: null,
    });
  };

  // Xử lý hủy booking
  const handleCancel = async (bookingId) => {
    try {
      await api.post(endpoints.bookings.cancel(bookingId));
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
        )
      );
      setError(null);
    } catch (err) {
      setError(`Không thể hủy booking: ${err.response?.data?.error || err.message}`);
    }
  };

  // Xử lý xác nhận booking (PENDING → CONFIRMED)
  const handleConfirm = async (bookingId) => {
    try {
      await api.post(endpoints.bookings.confirm(bookingId));
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'confirmed' } : booking
        )
      );
      setError(null);
    } catch (err) {
      setError(`Không thể xác nhận booking: ${err.response?.data?.error || err.message}`);
    }
  };

  // Xử lý xác nhận hành động từ dialog
  const handleConfirmAction = async () => {
    // Checkin sẽ được xử lý riêng trong modal checkin
    if (dialog.action === 'checkout') {
      await handleCheckOut(dialog.bookingId);
    } else if (dialog.action === 'cancel') {
      await handleCancel(dialog.bookingId);
    } else if (dialog.action === 'confirm') {
      await handleConfirm(dialog.bookingId);
    }
    closeDialog();
  };

  // Điều hướng đến form tạo booking
  const handleCreateBooking = () => {
    navigate('/book');
  };

  // Cột cho DataGrid
  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'customer_name',
      headerName: 'Khách hàng',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">{params.value}</Typography>
      ),
    },
    {
      field: 'customer_phone',
      headerName: 'Số điện thoại',
      width: 130,
    },
    {
      field: 'room_numbers',
      headerName: 'Phòng',
      width: 150,
    },
    {
      field: 'check_in_date',
      headerName: 'Check-in',
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'check_out_date',
      headerName: 'Check-out',
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'total_price',
      headerName: 'Tổng tiền',
      width: 120,
      renderCell: (params) => formatPrice(params.value),
    },
    {
      field: 'guest_count',
      headerName: 'Số khách',
      width: 100,
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 150,
      renderCell: (params) => {
        const { label, color } = statusConfig[params.value] || {
          label: 'Không xác định',
          color: 'default',
        };
        return <Chip label={label} color={color} size="small" />;
      },
    },
    {
      field: 'actions',
      headerName: 'Hành động',
      width: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          {params.row.status === 'pending' && (
            <Tooltip title="Xác nhận">
              <IconButton
                color="primary"
                onClick={() =>
                  openConfirmationDialog(
                    'confirm',
                    params.row.id,
                    'Xác nhận Booking',
                    `Xác nhận booking ID ${params.row.id}?`
                  )
                }
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
          {params.row.status === 'confirmed' && (
            <Tooltip title="Check-in">
              <IconButton
                color="success"
                onClick={() => openCheckinDialog(params.row)}
              >
                <CheckCircle />
              </IconButton>
            </Tooltip>
          )}
          {params.row.status === 'checked_in' && (
            <Tooltip title="Check-out">
              <IconButton
                color="primary"
                onClick={() =>
                  openConfirmationDialog(
                    'checkout',
                    params.row.id,
                    'Xác nhận Check-out',
                    `Xác nhận check-out cho booking ID ${params.row.id}?`
                  )
                }
              >
                <ExitToApp />
              </IconButton>
            </Tooltip>
          )}
          {['pending', 'confirmed'].includes(params.row.status) && (
            <Tooltip title="Hủy">
              <IconButton
                color="error"
                onClick={() =>
                  openConfirmationDialog(
                    'cancel',
                    params.row.id,
                    'Xác nhận Hủy Booking',
                    `Xác nhận hủy booking ID ${params.row.id}?`
                  )
                }
              >
                <Cancel />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quản lý đặt phòng
      </Typography>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Thanh tìm kiếm và nút tạo booking */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <Box sx={{ display: 'flex', flex: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Tìm kiếm theo tên khách hàng hoặc số điện thoại..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateBooking}
          sx={{ minWidth: { xs: '100%', sm: 160 } }}
        >
          Tạo đặt phòng
        </Button>
      </Stack>

      {/* Bảng danh sách bookings */}
      <Paper elevation={3} sx={{ height: 600, width: '100%' }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={bookings}
            columns={columns}
            rowCount={rowCount}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            disableSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': {
                fontSize: '0.875rem',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 'bold',
              },
            }}
          />
        )}
      </Paper>

      {/* Enhanced Modal Check-in với Price Calculator */}
      <Dialog 
        open={checkinDialog.open} 
        onClose={closeCheckinDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          🏨 Check-in Booking
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {checkinDialog.booking && (
            <Grid container spacing={3}>
              {/* Thông tin booking */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📋 Thông tin Booking
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Booking ID
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          #{checkinDialog.booking.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Khách hàng
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {checkinDialog.booking.customer_name}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Phòng
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {checkinDialog.booking.room_numbers}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Số khách đã đặt
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {checkinDialog.booking.guest_count} khách
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Giới hạn phòng
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="info.main">
                          {checkinDialog.booking.room_details?.reduce((sum, room) => sum + (room.room_type_max_guests || 0), 0) || 0} khách tối đa
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Input số khách thực tế */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      👥 Số khách thực tế
                    </Typography>
                    <TextField
                      label="Số khách check-in"
                      type="number"
                      value={checkinDialog.actualGuestCount}
                      onChange={(e) => handleGuestCountChange(parseInt(e.target.value) || 0)}
                      fullWidth
                      inputProps={{ min: 1, max: 20 }}
                      helperText={`Nhập số khách thực tế (Tối đa ${checkinDialog.booking.room_details?.reduce((sum, room) => sum + (room.room_type_max_guests || 0), 0) || 0} khách miễn phụ thu)`}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Thông tin giá */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ bgcolor: '#f8f9fa' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      💰 Tính giá tạm tính
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Stack spacing={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            Giá gốc:
                          </Typography>
                          <Typography variant="body2">
                            {formatPrice(checkinDialog.booking.total_price)}
                          </Typography>
                        </Box>
                        
                        {checkinDialog.actualGuestCount !== checkinDialog.booking.guest_count && (
                          <>
                            <Divider />
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="body2" color="warning.main">
                                Giá theo số khách thực tế:
                              </Typography>
                              <Typography variant="body2" color="warning.main" fontWeight="bold">
                                {formatPrice(checkinDialog.estimatedPrice)}
                              </Typography>
                            </Box>
                            
                            {checkinDialog.surchargeInfo && (
                              <Box sx={{ 
                                p: 1, 
                                bgcolor: 'warning.light', 
                                borderRadius: 1,
                                color: 'warning.contrastText' 
                              }}>
                                <Typography variant="caption">
                                  ⚠️ {checkinDialog.surchargeInfo}
                                </Typography>
                              </Box>
                            )}
                          </>
                        )}
                        
                        <Divider />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body1" fontWeight="bold" color="primary">
                            Tổng cộng:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold" color="primary">
                            {formatPrice(checkinDialog.estimatedPrice)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Thông tin thời gian */}
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: '#e3f2fd' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      📅 Thông tin thời gian
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Check-in dự kiến
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(checkinDialog.booking.check_in_date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Check-out dự kiến
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(checkinDialog.booking.check_out_date)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={closeCheckinDialog}
            variant="outlined"
            size="large"
          >
            Hủy
          </Button>
          <Button 
            onClick={() => handleCheckIn(checkinDialog.booking?.id, checkinDialog.actualGuestCount)}
            color="primary" 
            variant="contained"
            size="large"
            disabled={!checkinDialog.actualGuestCount || checkinDialog.actualGuestCount <= 0}
            startIcon={<CheckCircle />}
          >
            Xác nhận Check-in
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác nhận hành động */}
      <Dialog open={dialog.open} onClose={closeDialog}>
        <DialogTitle>{dialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{dialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Hủy</Button>
          <Button onClick={handleConfirmAction} color="primary" variant="contained">
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Checkout Dialog với full checkout processing */}
      <CheckoutDialog
        open={checkoutDialog.open}
        onClose={closeCheckoutDialog}
        bookingId={checkoutDialog.bookingId}
        onCheckoutSuccess={handleCheckoutSuccess}
      />
    </Container>
  );
};

export default Bookings;