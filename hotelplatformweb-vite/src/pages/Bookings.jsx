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
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Search as SearchIcon, CheckCircle, ExitToApp, Add } from '@mui/icons-material';
import api, { endpoints } from '../services/apis';
import authUtils from '../services/auth';

// Format giá tiền
const formatPrice = (price) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(price);
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

  // Fetch bookings từ API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Kiểm tra role của user
        const user = await authUtils.getCurrentUser();
        if (!['staff', 'admin', 'owner'].includes(user?.role)) {
          setError('Bạn không có quyền truy cập trang này.');
          navigate('/');
          return;
        }

        // Gọi API với params phân trang và tìm kiếm
        const response = await api.get(endpoints.bookings.list, {
          params: {
            page: paginationModel.page + 1, // Django pagination là 1-based
            page_size: paginationModel.pageSize,
            search: searchTerm.trim() || undefined, // Gửi undefined nếu search rỗng
          },
        });

        // Xử lý dữ liệu từ API
        const fetchedBookings = (response.data.results || []).map((booking) => ({
          id: booking.id,
          customer_name: booking.customer_name || 'Không xác định',
          customer_phone: booking.customer_phone || 'N/A',
          room_numbers: booking.room_details?.map((room) => room.room_number).join(', ') || 'N/A',
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          total_price: booking.total_price,
          guest_count: booking.guest_count,
          status: booking.status,
          room_details: booking.room_details || [],
        }));

        setBookings(fetchedBookings);
        setRowCount(response.data.count || 0);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (err.response?.status === 401) {
          setError('Bạn cần đăng nhập lại để xem danh sách đặt phòng.');
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

    if (authUtils.isAuthenticated()) {
      fetchBookings();
    } else {
      setError('Vui lòng đăng nhập để xem danh sách đặt phòng.');
      navigate('/login');
    }
  }, [navigate, paginationModel, searchTerm]);

  // Xử lý tìm kiếm
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPaginationModel((prev) => ({ ...prev, page: 0 })); // Reset về trang đầu khi tìm kiếm
  };

  // Xử lý check-in
  const handleCheckIn = async (bookingId) => {
    try {
      const response = await api.post(endpoints.bookings.checkin(bookingId));
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'checked_in', rentals: [response.data.rental] }
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

  // Điều hướng đến form tạo booking
  const handleCreateBooking = () => {
    navigate('/book');
  };

  // Cấu hình cột cho DataGrid
  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'customer_name', headerName: 'Khách hàng', width: 200 },
    { field: 'customer_phone', headerName: 'Số điện thoại', width: 150 },
    { field: 'room_numbers', headerName: 'Phòng', width: 150 },
    {
      field: 'check_in_date',
      headerName: 'Ngày check-in',
      width: 150,
      valueFormatter: ({ value }) =>
        value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A',
    },
    {
      field: 'check_out_date',
      headerName: 'Ngày check-out',
      width: 150,
      valueFormatter: ({ value }) =>
        value ? new Date(value).toLocaleDateString('vi-VN') : 'N/A',
    },
    {
      field: 'total_price',
      headerName: 'Tổng giá',
      width: 150,
      valueFormatter: ({ value }) => (value ? formatPrice(value) : 'N/A'),
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 150,
      renderCell: ({ value }) => (
        <Chip
          label={
            value === 'pending'
              ? 'Chờ xác nhận'
              : value === 'confirmed'
              ? 'Đã xác nhận'
              : value === 'checked_in'
              ? 'Đã nhận phòng'
              : value === 'checked_out'
              ? 'Đã trả phòng'
              : value === 'cancelled'
              ? 'Đã hủy'
              : value === 'no_show'
              ? 'Không xuất hiện'
              : 'Không xác định'
          }
          color={
            value === 'confirmed'
              ? 'warning'
              : value === 'checked_in'
              ? 'success'
              : value === 'checked_out'
              ? 'default'
              : value === 'pending'
              ? 'info'
              : value === 'cancelled' || value === 'no_show'
              ? 'error'
              : 'default'
          }
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Hành động',
      width: 250,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1}>
          {row.status === 'confirmed' && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => handleCheckIn(row.id)}
            >
              Check-in
            </Button>
          )}
          {row.status === 'checked_in' && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<ExitToApp />}
              onClick={() => handleCheckOut(row.id)}
            >
              Check-out
            </Button>
          )}
          {['pending', 'confirmed'].includes(row.status) && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={() => handleCancel(row.id)}
            >
              Hủy
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Quản lý đặt phòng
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
          onClick={handleCreateBooking}
        >
          Tạo Đặt Phòng
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo tên khách hàng, số điện thoại, hoặc số phòng..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mb: 3 }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={bookings}
              columns={columns}
              paginationMode="server"
              rowCount={rowCount}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 20, 50]}
              disableRowSelectionOnClick
              sx={{
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'neutral.light',
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(139, 69, 19, 0.1)',
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: 'neutral.main',
                  borderBottom: '2px solid primary.main',
                },
              }}
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Bookings;