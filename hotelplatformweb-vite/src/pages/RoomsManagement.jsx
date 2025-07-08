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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Tabs,
  Tab,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Hotel as HotelIcon,
  Close as CloseIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api,{  endpoints } from '../services/apis';

const RoomsManagement = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Room states
  const [openAddModal, setOpenAddModal] = useState(false);
  const [addRoomData, setAddRoomData] = useState({
    room_number: '',
    room_type: '',
    status: 'available'
  });
  const [addLoading, setAddLoading] = useState(false);

  // RoomType states
  const [openRoomTypeModal, setOpenRoomTypeModal] = useState(false);
  const [roomTypeModalMode, setRoomTypeModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [roomTypeData, setRoomTypeData] = useState({
    name: '',
    description: '',
    base_price: '',
    max_guests: 2,
    extra_guest_surcharge: 25.00,
    amenities: ''
  });
  const [roomTypeLoading, setRoomTypeLoading] = useState(false);

  // Fetch rooms data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch rooms
        const roomsResponse = await api.get(endpoints.rooms.list);
        let roomsData = [];
        if (roomsResponse.data) {
          if (Array.isArray(roomsResponse.data)) {
            roomsData = roomsResponse.data;
          } else if (roomsResponse.data.results && Array.isArray(roomsResponse.data.results)) {
            roomsData = roomsResponse.data.results;
          }
        }
        
        // Fetch room types
        const roomTypesResponse = await api.get(endpoints.roomTypes.list);
        let roomTypesData = [];
        if (roomTypesResponse.data) {
          if (Array.isArray(roomTypesResponse.data)) {
            roomTypesData = roomTypesResponse.data;
          } else if (roomTypesResponse.data.results && Array.isArray(roomTypesResponse.data.results)) {
            roomTypesData = roomTypesResponse.data.results;
          }
        }
        
        setRooms(roomsData);
        setRoomTypes(roomTypesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Không thể tải dữ liệu. Vui lòng thử lại sau.');
        setRooms([]);
        setRoomTypes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'booked':
        return 'warning';
      case 'occupied':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Trống';
      case 'booked':
        return 'Đã đặt';
      case 'occupied':
        return 'Đang sử dụng';
      default:
        return 'Không xác định';
    }
  };

  const handleAddRoom = () => {
    setOpenAddModal(true);
  };

  const handleCloseAddModal = () => {
    setOpenAddModal(false);
    setAddRoomData({
      room_number: '',
      room_type: '',
      status: 'available'
    });
    setError(null);
  };

  const handleAddRoomChange = (field, value) => {
    setAddRoomData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitAddRoom = async () => {
    try {
      setAddLoading(true);
      setError(null);

      // Validate form
      if (!addRoomData.room_number.trim()) {
        setError('Vui lòng nhập số phòng');
        return;
      }
      if (!addRoomData.room_type) {
        setError('Vui lòng chọn loại phòng');
        return;
      }

      // Submit to API
      const response = await api.post(endpoints.rooms.create, addRoomData);
      
      // Refresh rooms list
      const roomsResponse = await api.get(endpoints.rooms.list);
      let roomsData = [];
      if (roomsResponse.data) {
        if (Array.isArray(roomsResponse.data)) {
          roomsData = roomsResponse.data;
        } else if (roomsResponse.data.results && Array.isArray(roomsResponse.data.results)) {
          roomsData = roomsResponse.data.results;
        }
      }
      setRooms(roomsData);

      // Close modal
      handleCloseAddModal();
    } catch (err) {
      console.error('Error adding room:', err);
      setError(err.response?.data?.message || 'Không thể thêm phòng. Vui lòng thử lại.');
    } finally {
      setAddLoading(false);
    }
  };

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // RoomType handlers
  const handleAddRoomType = () => {
    setRoomTypeModalMode('add');
    setSelectedRoomType(null);
    setRoomTypeData({
      name: '',
      description: '',
      base_price: '',
      max_guests: 2,
      extra_guest_surcharge: 25.00,
      amenities: ''
    });
    setOpenRoomTypeModal(true);
  };

  const handleEditRoomType = (roomType) => {
    setRoomTypeModalMode('edit');
    setSelectedRoomType(roomType);
    setRoomTypeData({
      name: roomType.name,
      description: roomType.description || '',
      base_price: roomType.base_price,
      max_guests: roomType.max_guests,
      extra_guest_surcharge: roomType.extra_guest_surcharge,
      amenities: roomType.amenities || ''
    });
    setOpenRoomTypeModal(true);
  };

  const handleCloseRoomTypeModal = () => {
    setOpenRoomTypeModal(false);
    setSelectedRoomType(null);
    setRoomTypeData({
      name: '',
      description: '',
      base_price: '',
      max_guests: 2,
      extra_guest_surcharge: 25.00,
      amenities: ''
    });
    setError(null);
  };

  const handleRoomTypeChange = (field, value) => {
    setRoomTypeData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitRoomType = async () => {
    try {
      setRoomTypeLoading(true);
      setError(null);

      // Validate form
      if (!roomTypeData.name.trim()) {
        setError('Vui lòng nhập tên loại phòng');
        return;
      }
      if (!roomTypeData.base_price || parseFloat(roomTypeData.base_price) <= 0) {
        setError('Vui lòng nhập giá hợp lệ');
        return;
      }

      const submitData = {
        ...roomTypeData,
        base_price: parseFloat(roomTypeData.base_price),
        extra_guest_surcharge: parseFloat(roomTypeData.extra_guest_surcharge)
      };

      // Submit to API
      if (roomTypeModalMode === 'add') {
        await api.post(endpoints.roomTypes.create, submitData);
      } else {
        await api.put(endpoints.roomTypes.update(selectedRoomType.id), submitData);
      }
      
      // Refresh room types list
      const roomTypesResponse = await api.get(endpoints.roomTypes.list);
      let roomTypesData = [];
      if (roomTypesResponse.data) {
        if (Array.isArray(roomTypesResponse.data)) {
          roomTypesData = roomTypesResponse.data;
        } else if (roomTypesResponse.data.results && Array.isArray(roomTypesResponse.data.results)) {
          roomTypesData = roomTypesResponse.data.results;
        }
      }
      setRoomTypes(roomTypesData);

      // Close modal
      handleCloseRoomTypeModal();
    } catch (err) {
      console.error('Error saving room type:', err);
      setError(err.response?.data?.message || 'Không thể lưu loại phòng. Vui lòng thử lại.');
    } finally {
      setRoomTypeLoading(false);
    }
  };

  const handleDeleteRoomType = async (roomTypeId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa loại phòng này?')) {
      return;
    }

    try {
      await api.delete(endpoints.roomTypes.delete(roomTypeId));
      
      // Refresh room types list
      const roomTypesResponse = await api.get(endpoints.roomTypes.list);
      let roomTypesData = [];
      if (roomTypesResponse.data) {
        if (Array.isArray(roomTypesResponse.data)) {
          roomTypesData = roomTypesResponse.data;
        } else if (roomTypesResponse.data.results && Array.isArray(roomTypesResponse.data.results)) {
          roomTypesData = roomTypesResponse.data.results;
        }
      }
      setRoomTypes(roomTypesData);
    } catch (err) {
      console.error('Error deleting room type:', err);
      setError(err.response?.data?.message || 'Không thể xóa loại phòng. Vui lòng thử lại.');
    }
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
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
          <HotelIcon sx={{ mr: 2, fontSize: 40 }} />
          Quản Lý Phòng & Loại Phòng
        </Typography>
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Quản Lý Phòng" />
            <Tab label="Quản Lý Loại Phòng" />
          </Tabs>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tab Panel 0: Room Management */}
        {tabValue === 0 && (
          <Box>
            {/* Header and Add Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Danh Sách Phòng
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
                      Phòng đã đặt
                    </Typography>
                    <Typography variant="h5" component="div" color="warning.main">
                      {rooms.filter(room => room.status === 'booked').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Phòng đang sử dụng
                    </Typography>
                    <Typography variant="h5" component="div" color="error.main">
                      {rooms.filter(room => room.status === 'occupied').length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

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
          </Box>
        )}

        {/* Tab Panel 1: RoomType Management */}
        {tabValue === 1 && (
          <Box>
            {/* Header and Add Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                Danh Sách Loại Phòng
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddRoomType}
                sx={{ borderRadius: 2 }}
              >
                Thêm Loại Phòng Mới
              </Button>
            </Box>
            
            {/* RoomTypes Stats */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CategoryIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          Tổng loại phòng
                        </Typography>
                        <Typography variant="h5" component="div">
                          {roomTypes.length}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MoneyIcon sx={{ mr: 2, color: 'success.main' }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          Giá thấp nhất
                        </Typography>
                        <Typography variant="h5" component="div" color="success.main">
                          {roomTypes.length > 0 
                            ? `${Math.min(...roomTypes.map(rt => parseFloat(rt.base_price))).toLocaleString('vi-VN')} VND`
                            : '0 VND'
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PeopleIcon sx={{ mr: 2, color: 'info.main' }} />
                      <Box>
                        <Typography color="textSecondary" gutterBottom>
                          Sức chứa tối đa
                        </Typography>
                        <Typography variant="h5" component="div" color="info.main">
                          {roomTypes.length > 0 
                            ? `${Math.max(...roomTypes.map(rt => rt.max_guests))} khách`
                            : '0 khách'
                          }
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* RoomTypes Table */}
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tên loại phòng</TableCell>
                      <TableCell>Giá cơ bản</TableCell>
                      <TableCell>Sức chứa tối đa</TableCell>
                      <TableCell>Phụ thu (%)</TableCell>
                      <TableCell>Số phòng</TableCell>
                      <TableCell align="center">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roomTypes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body1" color="textSecondary">
                            Không có loại phòng nào
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      roomTypes.map((roomType) => (
                        <TableRow key={roomType.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="body1" fontWeight="medium">
                                {roomType.name}
                              </Typography>
                              {roomType.description && (
                                <Typography variant="body2" color="textSecondary">
                                  {roomType.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body1" fontWeight="medium" color="success.main">
                              {parseFloat(roomType.base_price).toLocaleString('vi-VN')} VND/đêm
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${roomType.max_guests} khách`}
                              color="info"
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {roomType.extra_guest_surcharge}%
                          </TableCell>
                          <TableCell>
                            {rooms.filter(room => room.room_type === roomType.id).length} phòng
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Chỉnh sửa">
                              <IconButton onClick={() => handleEditRoomType(roomType)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <IconButton 
                                onClick={() => handleDeleteRoomType(roomType.id)} 
                                color="error"
                                disabled={rooms.some(room => room.room_type === roomType.id)}
                              >
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
          </Box>
        )}
      </Box>

      {/* Add Room Modal */}
      <Dialog 
        open={openAddModal} 
        onClose={handleCloseAddModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Thêm Phòng Mới</Typography>
            <IconButton onClick={handleCloseAddModal}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Số phòng"
              value={addRoomData.room_number}
              onChange={(e) => handleAddRoomChange('room_number', e.target.value)}
              fullWidth
              required
              placeholder="Ví dụ: 101, A203, ..."
            />
            
            <FormControl fullWidth required>
              <InputLabel>Loại phòng</InputLabel>
              <Select
                value={addRoomData.room_type}
                onChange={(e) => handleAddRoomChange('room_type', e.target.value)}
                label="Loại phòng"
              >
                {roomTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name} - {parseFloat(type.base_price).toLocaleString('vi-VN')} VND/đêm
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={addRoomData.status}
                onChange={(e) => handleAddRoomChange('status', e.target.value)}
                label="Trạng thái"
              >
                <MenuItem value="available">Trống</MenuItem>
                <MenuItem value="booked">Đã đặt</MenuItem>
                <MenuItem value="occupied">Đang sử dụng</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAddModal} variant="outlined">
            Hủy
          </Button>
          <Button 
            onClick={handleSubmitAddRoom} 
            variant="contained"
            disabled={addLoading}
            startIcon={addLoading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {addLoading ? 'Đang thêm...' : 'Thêm phòng'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit RoomType Modal */}
      <Dialog 
        open={openRoomTypeModal} 
        onClose={handleCloseRoomTypeModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {roomTypeModalMode === 'add' ? 'Thêm Loại Phòng Mới' : 'Chỉnh Sửa Loại Phòng'}
            </Typography>
            <IconButton onClick={handleCloseRoomTypeModal}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Tên loại phòng"
              value={roomTypeData.name}
              onChange={(e) => handleRoomTypeChange('name', e.target.value)}
              fullWidth
              required
              placeholder="Ví dụ: Phòng đơn, Phòng đôi, Suite VIP..."
            />
            
            <TextField
              label="Mô tả"
              value={roomTypeData.description}
              onChange={(e) => handleRoomTypeChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Mô tả chi tiết về loại phòng..."
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Giá cơ bản"
                value={roomTypeData.base_price}
                onChange={(e) => handleRoomTypeChange('base_price', e.target.value)}
                fullWidth
                required
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">VND</InputAdornment>,
                }}
                placeholder="0"
              />
              
              <FormControl fullWidth>
                <InputLabel>Sức chứa tối đa</InputLabel>
                <Select
                  value={roomTypeData.max_guests}
                  onChange={(e) => handleRoomTypeChange('max_guests', e.target.value)}
                  label="Sức chứa tối đa"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <MenuItem key={num} value={num}>
                      {num} khách
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Phụ thu khách thêm (%)"
              value={roomTypeData.extra_guest_surcharge}
              onChange={(e) => handleRoomTypeChange('extra_guest_surcharge', e.target.value)}
              fullWidth
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Phần trăm phụ thu cho mỗi khách vượt quá sức chứa cơ bản"
            />
            
            <TextField
              label="Tiện nghi"
              value={roomTypeData.amenities}
              onChange={(e) => handleRoomTypeChange('amenities', e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Wifi, Điều hòa, TV, Tủ lạnh..."
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseRoomTypeModal} variant="outlined">
            Hủy
          </Button>
          <Button 
            onClick={handleSubmitRoomType} 
            variant="contained"
            disabled={roomTypeLoading}
            startIcon={roomTypeLoading ? <CircularProgress size={16} /> : <AddIcon />}
          >
            {roomTypeLoading 
              ? (roomTypeModalMode === 'add' ? 'Đang thêm...' : 'Đang cập nhật...') 
              : (roomTypeModalMode === 'add' ? 'Thêm loại phòng' : 'Cập nhật')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RoomsManagement;