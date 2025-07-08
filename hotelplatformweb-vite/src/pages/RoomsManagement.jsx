import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Hotel as HotelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api,{  endpoints } from '../services/apis';

const RoomsManagement = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch rooms data
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const response = await api.get(endpoints.rooms.list);
        
        // Xử lý response - đảm bảo luôn có một array
        let roomsData = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            roomsData = response.data;
          } else if (response.data.results && Array.isArray(response.data.results)) {
            roomsData = response.data.results;
          }
        }
        
        setRooms(roomsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Không thể tải danh sách phòng. Vui lòng thử lại sau.');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'occupied':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Còn trống';
      case 'occupied':
        return 'Đã thuê';
      case 'maintenance':
        return 'Bảo trì';
      default:
        return 'Không xác định';
    }
  };

  const handleAddRoom = () => {
    // TODO: Navigate to add room page
    console.log('Add new room');
  };

  const handleEditRoom = (roomId) => {
    // TODO: Navigate to edit room page
    console.log('Edit room:', roomId);
  };

  const handleDeleteRoom = (roomId) => {
    // TODO: Implement delete room
    console.log('Delete room:', roomId);
  };

  const handleViewRoom = (roomId) => {
    // TODO: Navigate to room details
    console.log('View room:', roomId);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            <HotelIcon sx={{ mr: 2, fontSize: 40 }} />
            Quản Lý Phòng
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddRoom}
            sx={{ borderRadius: 2 }}
          >
            Thêm Phòng Mới
          </Button>
        </Box>
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tổng số phòng
                </Typography>
                <Typography variant="h5" component="div">
                  {rooms.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Phòng trống
                </Typography>
                <Typography variant="h5" component="div" color="success.main">
                  {rooms.filter(room => room.status === 'available').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Phòng đã thuê
                </Typography>
                <Typography variant="h5" component="div" color="error.main">
                  {rooms.filter(room => room.status === 'occupied').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Bảo trì
                </Typography>
                <Typography variant="h5" component="div" color="warning.main">
                  {rooms.filter(room => room.status === 'maintenance').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Rooms Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Số phòng</TableCell>
                <TableCell>Loại phòng</TableCell>
                <TableCell>Giá</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body1" color="textSecondary">
                      Không có phòng nào
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((room) => (
                  <TableRow key={room.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {room.room_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {room.room_type_name || room.room_type?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {room.room_type_price 
                        ? `${parseFloat(room.room_type_price).toLocaleString('vi-VN')} VND/đêm`
                        : 'Liên hệ'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(room.status)}
                        color={getStatusColor(room.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Xem chi tiết">
                        <IconButton onClick={() => handleViewRoom(room.id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Chỉnh sửa">
                        <IconButton onClick={() => handleEditRoom(room.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa">
                        <IconButton onClick={() => handleDeleteRoom(room.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default RoomsManagement;