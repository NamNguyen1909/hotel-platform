import React, { useState, useEffect, Component } from 'react';
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
import { Search as SearchIcon, CheckCircle, ExitToApp } from '@mui/icons-material';
import api, { endpoints } from '../services/apis';
import authUtils from '../services/auth';

// Error Boundary để xử lý lỗi trong DataGrid
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          Đã xảy ra lỗi: {this.state.error.message}. Vui lòng làm mới trang.
        </Alert>
      );
    }
    return this.props.children;
  }
}

const Bookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });
  const [rowCount, setRowCount] = useState(0);

  // Lấy danh sách đặt phòng
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const user = await authUtils.getCurrentUser();
        if (!['staff', 'admin', 'owner'].includes(user?.role)) {
          setError('Bạn không có quyền truy cập trang này.');
          navigate('/');
          return;
        }
        const response = await api.get(
          endpoints.bookings.list(paginationModel.page + 1, paginationModel.pageSize, searchTerm)
        );
        setBookings(response.data.results || []);
        setFilteredBookings(response.data.results || []);
        setRowCount(response.data.count || 0);
        setLoading(false);
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Bạn cần đăng nhập lại để xem danh sách đặt phòng.');
          navigate('/login');
        } else if (err.response?.status === 403) {
          setError('Bạn không có quyền truy cập danh sách đặt phòng.');
          navigate('/');
        } else {
          setError('Không thể tải danh sách đặt phòng. Vui lòng thử lại sau.');
        }
        setLoading(false);
      }
    };

    if (authUtils.isAuthenticated()) {
      fetchBookings();
    } else {
      navigate('/login');
    }
  }, [navigate, paginationModel, searchTerm]);

  // Xử lý tìm kiếm
  const handleSearch = async (event) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
  };

  // Xử lý check-in
  const handleCheckIn = async (bookingId) => {
    try {
      await api.post(endpoints.bookings.checkin(bookingId));
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'CHECKED_IN' } : booking
        )
      );
      setFilteredBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'CHECKED_IN' } : booking
        )
      );
    } catch (err) {
      setError('Không thể thực hiện check-in. Vui lòng thử lại.');
    }
  };

  // Xử lý check-out
  const handleCheckOut = async (bookingId) => {
    try {
      await api.post(endpoints.bookings.checkout(bookingId));
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'CHECKED_OUT' } : booking
        )
      );
      setFilteredBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'CHECKED_OUT' } : booking
        )
      );
    } catch (err) {
      setError('Không thể thực hiện check-out. Vui lòng thử lại.');
    }
  };

  // Cấu hình cột cho DataGrid
  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'customer',
      headerName: 'Khách hàng',
      width: 200,
      valueGetter: (params) => params.row.customer?.full_name ?? 'N/A',
    },
    {
      field: 'room',
      headerName: 'Phòng',
      width: 150,
      valueGetter: (params) => params.row.room?.room_number ?? 'N/A',
    },
    {
      field: 'check_in_date',
      headerName: 'Ngày check-in',
      width: 150,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString('vi-VN') : 'N/A',
    },
    {
      field: 'check_out_date',
      headerName: 'Ngày check-out',
      width: 150,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString('vi-VN') : 'N/A',
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.value || 'UNKNOWN'}
          color={
            params.value === 'CONFIRMED'
              ? 'warning'
              : params.value === 'CHECKED_IN'
              ? 'success'
              : params.value === 'CHECKED_OUT'
              ? 'default'
              : 'error'
          }
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Hành động',
      width: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          {params.row.status === 'CONFIRMED' && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => handleCheckIn(params.row.id)}
            >
              Check-in
            </Button>
          )}
          {params.row.status === 'CHECKED_IN' && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<ExitToApp />}
              onClick={() => handleCheckOut(params.row.id)}
            >
              Check-out
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Quản lý đặt phòng
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo ID, tên khách hàng, hoặc số phòng..."
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
          <ErrorBoundary>
            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={filteredBookings}
                columns={columns}
                paginationMode="server"
                rowCount={rowCount}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 20, 50]}
                disableSelectionOnClick
                sx={{
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: 'neutral.light',
                  },
                }}
              />
            </Box>
          </ErrorBoundary>
        )}
      </Paper>
    </Container>
  );
};

export default Bookings;