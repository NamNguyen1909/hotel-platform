import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
          // Lấy thông tin khách hàng từ customer_name và customer_phone
          const customerName = booking.customer_name;
          const customerPhone = booking.customer_phone || 'N/A';

          // Debug nếu thiếu thông tin khách hàng
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

        // Kiểm tra và hiển thị cảnh báo nếu có booking thiếu thông tin
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

  // Xử lý tìm kiếm
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPaginationModel((prev) => ({ ...prev, page: 0 })); // Reset về trang đầu
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

  // Xử lý check-in
  const handleCheckIn = async (bookingId) => {
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      const response = await api.post(endpoints.bookings.checkin(bookingId), {
        actual_guest_count: booking.guest_count,
      });
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'checked_in', rentals: [response.data] }
            : booking
        )
      );
      setError(null);
    } catch (err) {
      setError(`Không thể thực hiện check-in: ${err.response?.data?.error || err.message}`);
    }
  };

  // Xử lý check-out
  const handleCheckOut = async (bookingId) => {
    try {
      const booking = bookings.find((b) => b.id === bookingId);
      if (!booking?.rentals?.length) {
        setError('Không tìm thấy thông tin thuê phòng cho booking này.');
        return;
      }
      const rentalId = booking.rentals[0].id;
      await api.post(endpoints.rentals.checkout(rentalId));
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'checked_out' } : booking
        )
      );
      setError(null);
    } catch (err) {
      setError(`Không thể thực hiện check-out: ${err.response?.data?.error || err.message}`);
    }
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

  // Xử lý xác nhận hành động từ dialog
  const handleConfirmAction = async () => {
    if (dialog.action === 'checkin') {
      await handleCheckIn(dialog.bookingId);
    } else if (dialog.action === 'checkout') {
      await handleCheckOut(dialog.bookingId);
    } else if (dialog.action === 'cancel') {
      await handleCancel(dialog.bookingId);
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
          {params.row.status === 'confirmed' && (
            <Tooltip title="Check-in">
              <IconButton
                color="success"
                onClick={() =>
                  openConfirmationDialog(
                    'checkin',
                    params.row.id,
                    'Xác nhận Check-in',
                    `Xác nhận check-in cho booking ID ${params.row.id}?`
                  )
                }
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
    </Container>
  );
};

export default Bookings;