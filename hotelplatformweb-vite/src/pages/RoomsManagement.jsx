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
  ImageList,
  ImageListItem,
  ImageListItemBar,
  CardMedia,
  Pagination,
  Skeleton,
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
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api, { endpoints, roomImageHelpers } from '../services/apis';

const RoomsManagement = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [allRoomTypes, setAllRoomTypes] = useState([]); // For filter dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Statistics states
  const [roomStats, setRoomStats] = useState({
    total_rooms: 0,
    available_rooms: 0,
    booked_rooms: 0,
    occupied_rooms: 0
  });
  
  const [roomTypeStats, setRoomTypeStats] = useState({
    total_room_types: 0,
    room_counts_by_type: {}
  });
  
  // Pagination states
  const [roomsPagination, setRoomsPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 12,
    totalPages: 0
  });
  
  const [roomTypesPagination, setRoomTypesPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 8,
    totalPages: 0
  });
  
  // Search states for rooms
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState('');
  
  // Room states
  const [openAddModal, setOpenAddModal] = useState(false);
  const [addRoomData, setAddRoomData] = useState({
    room_number: '',
    room_type: '',
    status: 'available'
  });
  const [addLoading, setAddLoading] = useState(false);

  // Room image states
  const [selectedImages, setSelectedImages] = useState([]);
  const [roomImages, setRoomImages] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedRoomForImages, setSelectedRoomForImages] = useState(null);

  // Room management states
  const [openViewModal, setOpenViewModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteRoomConfirm, setOpenDeleteRoomConfirm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [editRoomData, setEditRoomData] = useState({
    room_number: '',
    room_type: '',
    status: 'available'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteRoomLoading, setDeleteRoomLoading] = useState(false);

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
  
  // Delete confirmation states
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [roomTypeToDelete, setRoomTypeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch rooms data
  useEffect(() => {
    fetchRoomsData();
    fetchAllRoomTypes(); // Load all room types for filter dropdown
    fetchRoomTypesData();
  }, []);

  useEffect(() => {
    fetchRoomsData();
  }, [roomsPagination.page, roomSearchTerm, roomStatusFilter, roomTypeFilter]);

  useEffect(() => {
    fetchRoomTypesData();
  }, [roomTypesPagination.page]);

  const fetchRoomsData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: roomsPagination.page.toString(),
        page_size: roomsPagination.pageSize.toString()
      });
      
      // Add search parameters
      if (roomSearchTerm.trim()) {
        params.append('search', roomSearchTerm.trim());
      }
      
      if (roomStatusFilter) {
        params.append('status', roomStatusFilter);
      }
      
      if (roomTypeFilter) {
        params.append('room_type', roomTypeFilter);
      }
      
      const roomsResponse = await api.get(`${endpoints.rooms.list}?${params.toString()}`);
      let roomsData = [];
      
      if (roomsResponse.data) {
        if (roomsResponse.data.results) {
          // Paginated response
          roomsData = roomsResponse.data.results;
          setRoomsPagination(prev => ({
            ...prev,
            count: roomsResponse.data.count,
            totalPages: roomsResponse.data.total_pages
          }));
          
          // Update stats if available
          if (roomsResponse.data.stats) {
            setRoomStats(roomsResponse.data.stats);
          }
        } else if (Array.isArray(roomsResponse.data)) {
          // Non-paginated fallback
          roomsData = roomsResponse.data;
        }
      }
      
      setRooms(roomsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('Không thể tải dữ liệu phòng. Vui lòng thử lại sau.');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRoomTypes = async () => {
    try {
      // Fetch all room types without pagination for filter dropdown
      const response = await api.get(endpoints.roomTypes.list);
      let allRoomTypesData = [];
      
      if (response.data) {
        if (response.data.results) {
          // If paginated, fetch all pages
          allRoomTypesData = response.data.results;
          let allPages = [];
          const totalPages = response.data.total_pages || 1;
          
          for (let i = 1; i <= totalPages; i++) {
            if (i === 1) {
              allPages = [...allRoomTypesData];
            } else {
              const pageResponse = await api.get(`${endpoints.roomTypes.list}?page=${i}`);
              if (pageResponse.data && pageResponse.data.results) {
                allPages = [...allPages, ...pageResponse.data.results];
              }
            }
          }
          allRoomTypesData = allPages;
        } else if (Array.isArray(response.data)) {
          allRoomTypesData = response.data;
        }
      }
      
      setAllRoomTypes(allRoomTypesData);
    } catch (err) {
      console.error('Error fetching all room types:', err);
    }
  };

  const fetchRoomTypesData = async () => {
    try {
      const params = new URLSearchParams({
        page: roomTypesPagination.page.toString(),
        page_size: roomTypesPagination.pageSize.toString()
      });
      
      const roomTypesResponse = await api.get(`${endpoints.roomTypes.list}?${params.toString()}`);
      let roomTypesData = [];
      
      if (roomTypesResponse.data) {
        if (roomTypesResponse.data.results) {
          // Paginated response
          roomTypesData = roomTypesResponse.data.results;
          setRoomTypesPagination(prev => ({
            ...prev,
            count: roomTypesResponse.data.count,
            totalPages: roomTypesResponse.data.total_pages
          }));
          
          // Update room type stats if available
          if (roomTypesResponse.data.stats) {
            setRoomTypeStats(roomTypesResponse.data.stats);
          }
        } else if (Array.isArray(roomTypesResponse.data)) {
          // Non-paginated fallback
          roomTypesData = roomTypesResponse.data;
        }
      }
      
      setRoomTypes(roomTypesData);
    } catch (err) {
      console.error('Error fetching room types:', err);
      setError('Không thể tải dữ liệu loại phòng. Vui lòng thử lại sau.');
      setRoomTypes([]);
    }
  };

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
    setSelectedImages([]);
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

      // Submit room to API
      const response = await api.post(endpoints.rooms.create, addRoomData);
      const newRoom = response.data;

      // Upload images if any selected
      if (selectedImages.length > 0) {
        await handleUploadImages(newRoom.id);
      }
      
      // Refresh rooms list
      await fetchRoomsData();

      // Close modal and reset form
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

  // Image handling functions
  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Một số file không hợp lệ. Chỉ chấp nhận file ảnh dưới 10MB.');
    }

    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const handleRemoveSelectedImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadImages = async (roomId) => {
    if (selectedImages.length === 0) return;

    try {
      setImageLoading(true);
      await roomImageHelpers.uploadImages(roomId, selectedImages);
      setSelectedImages([]);
      
      // Refresh room images if we're viewing them
      if (selectedRoomForImages === roomId) {
        await loadRoomImages(roomId);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setError('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setImageLoading(false);
    }
  };

  const loadRoomImages = async (roomId) => {
    try {
      const response = await roomImageHelpers.getRoomImages(roomId);
      setRoomImages(response.data.images || []);
    } catch (error) {
      console.error('Error loading room images:', error);
      setRoomImages([]);
    }
  };

  const handleSetPrimaryImage = async (imageId) => {
    try {
      await roomImageHelpers.setPrimaryImage(imageId);
      
      // Refresh room images
      if (selectedRoomForImages) {
        await loadRoomImages(selectedRoomForImages);
      }
    } catch (error) {
      console.error('Error setting primary image:', error);
      setError('Không thể đặt ảnh chính. Vui lòng thử lại.');
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await roomImageHelpers.deleteImage(imageId);
      
      // Refresh room images
      if (selectedRoomForImages) {
        await loadRoomImages(selectedRoomForImages);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('Không thể xóa ảnh. Vui lòng thử lại.');
    }
  };

  const handleViewRoomImages = async (roomId) => {
    setSelectedRoomForImages(roomId);
    await loadRoomImages(roomId);
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
      await fetchRoomTypesData();

      // Close modal
      handleCloseRoomTypeModal();
    } catch (err) {
      console.error('Error saving room type:', err);
      setError(err.response?.data?.message || 'Không thể lưu loại phòng. Vui lòng thử lại.');
    } finally {
      setRoomTypeLoading(false);
    }
  };

  const handleDeleteRoomType = (roomType) => {
    setRoomTypeToDelete(roomType);
    setOpenDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirm(false);
    setRoomTypeToDelete(null);
  };

  const handleConfirmDeleteRoomType = async () => {
    if (!roomTypeToDelete) return;

    try {
      setDeleteLoading(true);
      await api.delete(endpoints.roomTypes.delete(roomTypeToDelete.id));
      
      // Refresh room types list
      await fetchRoomTypesData();
      
      // Close confirmation dialog
      handleCloseDeleteConfirm();
    } catch (err) {
      console.error('Error deleting room type:', err);
      setError(err.response?.data?.message || 'Không thể xóa loại phòng. Vui lòng thử lại.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      // Close view modal if open
      setOpenViewModal(false);
      
      setSelectedRoom(room);
      setEditRoomData({
        room_number: room.room_number,
        room_type: room.room_type,
        status: room.status
      });
      setOpenEditModal(true);
    }
  };

  const handleDeleteRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setOpenDeleteRoomConfirm(true);
    }
  };

  const handleViewRoom = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      setOpenViewModal(true);
      // Load room images for display
      handleViewRoomImages(roomId);
    }
  };

  // Edit room handlers
  const handleCloseEditModal = () => {
    setOpenEditModal(false);
    setSelectedRoom(null);
    setEditRoomData({
      room_number: '',
      room_type: '',
      status: 'available'
    });
    setError(null);
  };

  const handleEditRoomChange = (field, value) => {
    setEditRoomData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitEditRoom = async () => {
    try {
      setEditLoading(true);
      setError(null);

      // Validate form
      if (!editRoomData.room_number.trim()) {
        setError('Vui lòng nhập số phòng');
        return;
      }
      if (!editRoomData.room_type) {
        setError('Vui lòng chọn loại phòng');
        return;
      }

      // Submit to API
      await api.put(endpoints.rooms.update(selectedRoom.id), editRoomData);
      
      // Refresh rooms list
      await fetchRoomsData();

      // Close modal
      handleCloseEditModal();
    } catch (err) {
      console.error('Error updating room:', err);
      setError(err.response?.data?.message || 'Không thể cập nhật phòng. Vui lòng thử lại.');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete room handlers
  const handleCloseDeleteRoomConfirm = () => {
    setOpenDeleteRoomConfirm(false);
    setSelectedRoom(null);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!selectedRoom) return;

    try {
      setDeleteRoomLoading(true);
      await api.delete(endpoints.rooms.delete(selectedRoom.id));
      
      // Refresh rooms list
      await fetchRoomsData();
      
      // Close confirmation dialog
      handleCloseDeleteRoomConfirm();
    } catch (err) {
      console.error('Error deleting room:', err);
      setError(err.response?.data?.message || 'Không thể xóa phòng. Vui lòng thử lại.');
    } finally {
      setDeleteRoomLoading(false);
    }
  };

  // View room handlers
  const handleCloseViewModal = () => {
    setOpenViewModal(false);
    setSelectedRoom(null);
    setRoomImages([]);
    setSelectedRoomForImages(null);
  };

  // Pagination handlers
  const handleRoomsPageChange = (event, newPage) => {
    setRoomsPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRoomTypesPageChange = (event, newPage) => {
    setRoomTypesPagination(prev => ({ ...prev, page: newPage }));
  };

  // Search handlers
  const handleRoomSearchChange = (value) => {
    setRoomSearchTerm(value);
    // Reset to page 1 when searching
    setRoomsPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRoomStatusFilterChange = (value) => {
    setRoomStatusFilter(value);
    // Reset to page 1 when filtering
    setRoomsPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRoomTypeFilterChange = (value) => {
    setRoomTypeFilter(value);
    // Reset to page 1 when filtering
    setRoomsPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setRoomSearchTerm('');
    setRoomStatusFilter('');
    setRoomTypeFilter('');
    setRoomsPagination(prev => ({ ...prev, page: 1 }));
  };

  // Debouncing for search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Search will be triggered by the main useEffect
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [roomSearchTerm]);

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
            
            {/* Search and Stats Section */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Search and Filters - Left Side */}
              <Grid item xs={12} lg={5}>
                <Paper sx={{ p: 3, height: 'fit-content' }}>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <SearchIcon sx={{ mr: 1 }} />
                    Tìm kiếm và lọc phòng
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Tìm theo số phòng..."
                        value={roomSearchTerm}
                        onChange={(e) => handleRoomSearchChange(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Trạng thái</InputLabel>
                        <Select
                          value={roomStatusFilter}
                          onChange={(e) => handleRoomStatusFilterChange(e.target.value)}
                          label="Trạng thái"
                        >
                          <MenuItem value="">Tất cả</MenuItem>
                          <MenuItem value="available">Trống</MenuItem>
                          <MenuItem value="booked">Đã đặt</MenuItem>
                          <MenuItem value="occupied">Đang sử dụng</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Loại phòng</InputLabel>
                        <Select
                          value={roomTypeFilter}
                          onChange={(e) => handleRoomTypeFilterChange(e.target.value)}
                          label="Loại phòng"
                        >
                          <MenuItem value="">Tất cả</MenuItem>
                          {allRoomTypes.map((type) => (
                            <MenuItem key={type.id} value={type.id}>
                              {type.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<ClearIcon />}
                        onClick={handleClearFilters}
                        fullWidth
                        size="small"
                        disabled={!roomSearchTerm && !roomStatusFilter && !roomTypeFilter}
                      >
                        Xóa bộ lọc
                      </Button>
                    </Grid>
                  </Grid>
                  
                  {/* Active filters display */}
                  {(roomSearchTerm || roomStatusFilter || roomTypeFilter) && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Đang lọc:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {roomSearchTerm && (
                          <Chip
                            label={`Tìm kiếm: "${roomSearchTerm}"`}
                            size="small"
                            onDelete={() => handleRoomSearchChange('')}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {roomStatusFilter && (
                          <Chip
                            label={`Trạng thái: ${roomStatusFilter === 'available' ? 'Trống' : 
                                                  roomStatusFilter === 'booked' ? 'Đã đặt' : 'Đang sử dụng'}`}
                            size="small"
                            onDelete={() => handleRoomStatusFilterChange('')}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {roomTypeFilter && (
                          <Chip
                            label={`Loại: ${allRoomTypes.find(rt => rt.id.toString() === roomTypeFilter)?.name || ''}`}
                            size="small"
                            onDelete={() => handleRoomTypeFilterChange('')}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Stats Cards - Right Side */}
              <Grid item xs={12} lg={7}>
                <Grid container spacing={2} sx={{ height: 'fit-content' }}>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Tổng số phòng
                        </Typography>
                        <Typography variant="h4" component="div" fontWeight="bold">
                          {roomStats.total_rooms}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Phòng trống
                        </Typography>
                        <Typography variant="h4" component="div" color="success.main" fontWeight="bold">
                          {roomStats.available_rooms}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Phòng đã đặt
                        </Typography>
                        <Typography variant="h4" component="div" color="warning.main" fontWeight="bold">
                          {roomStats.booked_rooms}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center', py: 2 }}>
                        <Typography color="textSecondary" gutterBottom variant="body2">
                          Đang sử dụng
                        </Typography>
                        <Typography variant="h4" component="div" color="error.main" fontWeight="bold">
                          {roomStats.occupied_rooms}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
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
                    {loading ? (
                      // Loading skeleton rows
                      Array.from({ length: roomsPagination.pageSize }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton variant="text" width={80} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="text" width={120} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="text" width={150} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="rectangular" width={80} height={24} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="rectangular" width={150} height={32} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : rooms.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Box sx={{ py: 4 }}>
                            <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                              {(roomSearchTerm || roomStatusFilter || roomTypeFilter) 
                                ? 'Không tìm thấy phòng nào phù hợp với bộ lọc'
                                : 'Không có phòng nào'
                              }
                            </Typography>
                            {(roomSearchTerm || roomStatusFilter || roomTypeFilter) && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={handleClearFilters}
                                startIcon={<ClearIcon />}
                              >
                                Xóa bộ lọc
                              </Button>
                            )}
                          </Box>
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
                            <Tooltip title="Quản lý ảnh">
                              <IconButton onClick={() => handleViewRoomImages(room.id)}>
                                <ImageIcon />
                              </IconButton>
                            </Tooltip>
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

            {/* Rooms Pagination */}
            {roomsPagination.totalPages > 1 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Hiển thị {((roomsPagination.page - 1) * roomsPagination.pageSize) + 1}-{Math.min(roomsPagination.page * roomsPagination.pageSize, roomsPagination.count)} 
                  trên {roomsPagination.count} phòng
                  {(roomSearchTerm || roomStatusFilter || roomTypeFilter) && ' (đã lọc)'}
                </Typography>
                
                <Pagination
                  count={roomsPagination.totalPages}
                  page={roomsPagination.page}
                  onChange={handleRoomsPageChange}
                  variant="outlined"
                  shape="rounded"
                  color="primary"
                  size="medium"
                  showFirstButton
                  showLastButton
                  sx={{ 
                    '& .MuiPaginationItem-root': {
                      borderRadius: '8px',
                      margin: '0 2px',
                    },
                    '& .Mui-selected': {
                      backgroundColor: 'primary.main !important',
                      color: 'white',
                    },
                  }}
                />
              </Box>
            )}
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
                          {roomTypeStats.total_room_types}
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
                    {loading ? (
                      // Loading skeleton rows
                      Array.from({ length: roomTypesPagination.pageSize }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box>
                              <Skeleton variant="text" width={150} />
                              <Skeleton variant="text" width={200} />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="text" width={120} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="rectangular" width={80} height={24} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="text" width={40} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="text" width={60} />
                          </TableCell>
                          <TableCell>
                            <Skeleton variant="rectangular" width={100} height={32} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : roomTypes.length === 0 ? (
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
                            {roomTypeStats.room_counts_by_type[roomType.id] || 0} phòng
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="Chỉnh sửa">
                              <IconButton onClick={() => handleEditRoomType(roomType)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <IconButton 
                                onClick={() => handleDeleteRoomType(roomType)} 
                                color="error"
                                disabled={roomTypeStats.room_counts_by_type[roomType.id] > 0}
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

            {/* RoomTypes Pagination */}
            {roomTypesPagination.totalPages > 1 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Hiển thị {((roomTypesPagination.page - 1) * roomTypesPagination.pageSize) + 1}-{Math.min(roomTypesPagination.page * roomTypesPagination.pageSize, roomTypesPagination.count)} 
                  trên {roomTypesPagination.count} loại phòng
                </Typography>
                
                <Pagination
                  count={roomTypesPagination.totalPages}
                  page={roomTypesPagination.page}
                  onChange={handleRoomTypesPageChange}
                  variant="outlined"
                  shape="rounded"
                  color="primary"
                  size="medium"
                  showFirstButton
                  showLastButton
                  sx={{ 
                    '& .MuiPaginationItem-root': {
                      borderRadius: '8px',
                      margin: '0 2px',
                    },
                    '& .Mui-selected': {
                      backgroundColor: 'primary.main !important',
                      color: 'white',
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Add Room Modal */}
      <Dialog 
        open={openAddModal} 
        onClose={handleCloseAddModal}
        maxWidth="md"
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
            {/* Basic Room Information */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Thông tin cơ bản
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            </Box>

            <Divider />

            {/* Room Images */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Ảnh phòng
              </Typography>
              
              {/* Upload Button */}
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  sx={{ mb: 2 }}
                >
                  Chọn ảnh
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </Button>
                
                <Typography variant="body2" color="textSecondary">
                  Chọn nhiều ảnh (tối đa 10MB/ảnh). Ảnh đầu tiên sẽ được đặt làm ảnh chính.
                </Typography>
              </Box>

              {/* Selected Images Preview */}
              {selectedImages.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Ảnh đã chọn ({selectedImages.length})
                  </Typography>
                  
                  <ImageList cols={3} rowHeight={120} sx={{ mb: 2 }}>
                    {selectedImages.map((file, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          loading="lazy"
                          style={{ 
                            height: '120px', 
                            objectFit: 'cover' 
                          }}
                        />
                        <ImageListItemBar
                          title={index === 0 ? 'Ảnh chính' : `Ảnh ${index + 1}`}
                          subtitle={file.name}
                          actionIcon={
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                              onClick={() => handleRemoveSelectedImage(index)}
                            >
                              <CloseIcon />
                            </IconButton>
                          }
                        />
                        {index === 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              bgcolor: 'primary.main',
                              color: 'white',
                              borderRadius: 1,
                              px: 1,
                              py: 0.5,
                              fontSize: '0.75rem'
                            }}
                          >
                            Ảnh chính
                          </Box>
                        )}
                      </ImageListItem>
                    ))}
                  </ImageList>
                </Box>
              )}
            </Box>
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

      {/* Delete RoomType Confirmation Dialog */}
      <Dialog 
        open={openDeleteConfirm} 
        onClose={handleCloseDeleteConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DeleteIcon sx={{ mr: 2, color: 'error.main' }} />
            <Typography variant="h6">
              Xác nhận xóa loại phòng
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Hành động này không thể hoàn tác!
          </Alert>
          
          {roomTypeToDelete && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Bạn có chắc chắn muốn xóa loại phòng:
              </Typography>
              
              <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.300' }}>
                <Typography variant="h6" color="error.main" sx={{ mb: 1 }}>
                  {roomTypeToDelete.name}
                </Typography>
                {roomTypeToDelete.description && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {roomTypeToDelete.description}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Giá:</strong> {parseFloat(roomTypeToDelete.base_price).toLocaleString('vi-VN')} VND/đêm
                </Typography>
                <Typography variant="body2">
                  <strong>Sức chứa:</strong> {roomTypeToDelete.max_guests} khách
                </Typography>
              </Paper>

              {rooms.some(room => room.room_type === roomTypeToDelete.id) && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <strong>Không thể xóa!</strong> Loại phòng này đang được sử dụng bởi {rooms.filter(room => room.room_type === roomTypeToDelete.id).length} phòng.
                  Vui lòng xóa hoặc chuyển các phòng sang loại khác trước.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDeleteConfirm} variant="outlined">
            Hủy bỏ
          </Button>
          <Button 
            onClick={handleConfirmDeleteRoomType} 
            variant="contained"
            color="error"
            disabled={deleteLoading || (roomTypeToDelete && rooms.some(room => room.room_type === roomTypeToDelete.id))}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteLoading ? 'Đang xóa...' : 'Xóa loại phòng'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Room Images Management Modal */}
      <Dialog
        open={selectedRoomForImages !== null}
        onClose={() => setSelectedRoomForImages(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Quản lý ảnh phòng {selectedRoomForImages && rooms.find(r => r.id === selectedRoomForImages)?.room_number}
            </Typography>
            <IconButton onClick={() => setSelectedRoomForImages(null)}>
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

          {/* Upload Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Thêm ảnh mới
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                disabled={imageLoading}
              >
                Chọn ảnh
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </Button>
              
              {selectedImages.length > 0 && (
                <Button
                  variant="contained"
                  onClick={() => handleUploadImages(selectedRoomForImages)}
                  disabled={imageLoading}
                  startIcon={imageLoading ? <CircularProgress size={16} /> : <UploadIcon />}
                >
                  {imageLoading ? 'Đang tải lên...' : `Tải lên ${selectedImages.length} ảnh`}
                </Button>
              )}
            </Box>

            {/* Selected Images Preview */}
            {selectedImages.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Ảnh đã chọn
                </Typography>
                <ImageList cols={4} rowHeight={120} sx={{ mb: 2 }}>
                  {selectedImages.map((file, index) => (
                    <ImageListItem key={index}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        loading="lazy"
                        style={{ height: '120px', objectFit: 'cover' }}
                      />
                      <ImageListItemBar
                        title={file.name}
                        actionIcon={
                          <IconButton
                            sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                            onClick={() => handleRemoveSelectedImage(index)}
                          >
                            <CloseIcon />
                          </IconButton>
                        }
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Existing Images */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Ảnh hiện tại ({roomImages.length})
            </Typography>
            
            {roomImages.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="textSecondary">
                  Chưa có ảnh nào cho phòng này
                </Typography>
              </Box>
            ) : (
              <ImageList cols={3} rowHeight={200}>
                {roomImages.map((image) => (
                  <ImageListItem key={image.id}>
                    <img
                      src={image.image_url}
                      alt={image.caption || 'Room image'}
                      loading="lazy"
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                    <ImageListItemBar
                      title={image.caption || 'Không có tiêu đề'}
                      subtitle={image.is_primary ? 'Ảnh chính' : ''}
                      actionIcon={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Tooltip title={image.is_primary ? 'Ảnh chính' : 'Đặt làm ảnh chính'}>
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                              onClick={() => !image.is_primary && handleSetPrimaryImage(image.id)}
                              disabled={image.is_primary}
                            >
                              {image.is_primary ? <StarIcon /> : <StarBorderIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa ảnh">
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                              onClick={() => handleDeleteImage(image.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    />
                    {image.is_primary && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          bgcolor: 'primary.main',
                          color: 'white',
                          borderRadius: 1,
                          px: 1,
                          py: 0.5,
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <StarIcon sx={{ fontSize: '1rem' }} />
                        Ảnh chính
                      </Box>
                    )}
                  </ImageListItem>
                ))}
              </ImageList>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedRoomForImages(null)} variant="outlined">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Room Modal */}
      <Dialog 
        open={openViewModal} 
        onClose={handleCloseViewModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Chi Tiết Phòng {selectedRoom?.room_number}
            </Typography>
            <IconButton onClick={handleCloseViewModal}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedRoom && (
            <Grid container spacing={3}>
              {/* Room Information */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Thông tin phòng
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Số phòng
                      </Typography>
                      <Typography variant="h5" color="primary.main" fontWeight="bold">
                        {selectedRoom.room_number}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Loại phòng
                      </Typography>
                      <Typography variant="body1">
                        {selectedRoom.room_type_name || 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Giá phòng
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {selectedRoom.room_type_price 
                          ? `${parseFloat(selectedRoom.room_type_price).toLocaleString('vi-VN')} VND/đêm`
                          : 'Liên hệ'
                        }
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Trạng thái
                      </Typography>
                      <Chip
                        label={getStatusText(selectedRoom.status)}
                        color={getStatusColor(selectedRoom.status)}
                        size="medium"
                      />
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary">
                        Ngày tạo
                      </Typography>
                      <Typography variant="body2">
                        {new Date(selectedRoom.created_at).toLocaleDateString('vi-VN')}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Room Images */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Ảnh phòng ({roomImages.length})
                  </Typography>
                  
                  {roomImages.length === 0 ? (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: 200,
                        bgcolor: 'grey.100',
                        borderRadius: 1
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                      <Typography variant="body2" color="textSecondary">
                        Chưa có ảnh nào
                      </Typography>
                    </Box>
                  ) : (
                    <ImageList cols={2} rowHeight={120}>
                      {roomImages.map((image) => (
                        <ImageListItem key={image.id}>
                          <img
                            src={image.image_url}
                            alt={image.caption || 'Room image'}
                            loading="lazy"
                            style={{ 
                              height: '120px', 
                              objectFit: 'cover' 
                            }}
                          />
                          <ImageListItemBar
                            title={image.caption || 'Không có tiêu đề'}
                            subtitle={image.is_primary ? 'Ảnh chính' : ''}
                            actionIcon={
                              image.is_primary && (
                                <StarIcon sx={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                              )
                            }
                          />
                        </ImageListItem>
                      ))}
                    </ImageList>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseViewModal} variant="outlined">
            Đóng
          </Button>
          <Button 
            onClick={() => handleEditRoom(selectedRoom?.id)} 
            variant="contained"
            startIcon={<EditIcon />}
          >
            Chỉnh sửa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Room Modal */}
      <Dialog 
        open={openEditModal} 
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Chỉnh Sửa Phòng {selectedRoom?.room_number}
            </Typography>
            <IconButton onClick={handleCloseEditModal}>
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
              value={editRoomData.room_number}
              onChange={(e) => handleEditRoomChange('room_number', e.target.value)}
              fullWidth
              required
              placeholder="Ví dụ: 101, A203, ..."
            />
            
            <FormControl fullWidth required>
              <InputLabel>Loại phòng</InputLabel>
              <Select
                value={editRoomData.room_type}
                onChange={(e) => handleEditRoomChange('room_type', e.target.value)}
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
                value={editRoomData.status}
                onChange={(e) => handleEditRoomChange('status', e.target.value)}
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
          <Button onClick={handleCloseEditModal} variant="outlined">
            Hủy
          </Button>
          <Button 
            onClick={handleSubmitEditRoom} 
            variant="contained"
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={16} /> : <EditIcon />}
          >
            {editLoading ? 'Đang cập nhật...' : 'Cập nhật phòng'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Room Confirmation Dialog */}
      <Dialog 
        open={openDeleteRoomConfirm} 
        onClose={handleCloseDeleteRoomConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DeleteIcon sx={{ mr: 2, color: 'error.main' }} />
            <Typography variant="h6">
              Xác nhận xóa phòng
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Hành động này không thể hoàn tác!
          </Alert>
          
          {selectedRoom && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Bạn có chắc chắn muốn xóa phòng:
              </Typography>
              
              <Paper sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.300' }}>
                <Typography variant="h6" color="error.main" sx={{ mb: 1 }}>
                  {selectedRoom.room_number}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Loại phòng:</strong> {selectedRoom.room_type_name || 'N/A'}
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Giá:</strong> {selectedRoom.room_type_price 
                    ? `${parseFloat(selectedRoom.room_type_price).toLocaleString('vi-VN')} VND/đêm`
                    : 'Liên hệ'
                  }
                </Typography>
                
                <Typography variant="body2">
                  <strong>Trạng thái:</strong> 
                  <Chip
                    label={getStatusText(selectedRoom.status)}
                    color={getStatusColor(selectedRoom.status)}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
              </Paper>

              {selectedRoom.status !== 'available' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <strong>Cảnh báo!</strong> Phòng này hiện đang {getStatusText(selectedRoom.status).toLowerCase()}. 
                  Việc xóa có thể ảnh hưởng đến các đặt phòng hiện tại.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDeleteRoomConfirm} variant="outlined">
            Hủy bỏ
          </Button>
          <Button 
            onClick={handleConfirmDeleteRoom} 
            variant="contained"
            color="error"
            disabled={deleteRoomLoading}
            startIcon={deleteRoomLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteRoomLoading ? 'Đang xóa...' : 'Xóa phòng'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Room Images Management Modal */}
      <Dialog 
        open={selectedRoomForImages !== null && !openViewModal} 
        onClose={() => {
          setSelectedRoomForImages(null);
          setRoomImages([]);
          setSelectedImages([]);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Quản Lý Ảnh Phòng {rooms.find(r => r.id === selectedRoomForImages)?.room_number}
            </Typography>
            <IconButton onClick={() => {
              setSelectedRoomForImages(null);
              setRoomImages([]);
              setSelectedImages([]);
            }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Upload Section */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Tải ảnh mới
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  sx={{ mb: 2 }}
                >
                  Chọn ảnh
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                  />
                </Button>
                
                <Typography variant="body2" color="textSecondary">
                  Chọn nhiều ảnh (tối đa 10MB/ảnh). Ảnh đầu tiên sẽ được đặt làm ảnh chính.
                </Typography>
              </Box>

              {/* Selected Images Preview */}
              {selectedImages.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Ảnh đã chọn
                  </Typography>
                  <ImageList cols={4} rowHeight={120} sx={{ mb: 2 }}>
                    {selectedImages.map((file, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          loading="lazy"
                          style={{ height: '120px', objectFit: 'cover' }}
                        />
                        <ImageListItemBar
                          title={file.name}
                          actionIcon={
                            <IconButton
                              sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                              onClick={() => handleRemoveSelectedImage(index)}
                            >
                              <CloseIcon />
                            </IconButton>
                          }
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                  
                  <Button
                    variant="contained"
                    onClick={() => handleUploadImages(selectedRoomForImages)}
                    disabled={imageLoading}
                    startIcon={imageLoading ? <CircularProgress size={16} /> : <UploadIcon />}
                  >
                    {imageLoading ? 'Đang tải lên...' : 'Tải ảnh lên'}
                  </Button>
                </Box>
              )}
            </Paper>

            {/* Existing Images */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Ảnh hiện tại ({roomImages.length})
              </Typography>
              
              {roomImages.length === 0 ? (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: 200,
                    bgcolor: 'grey.100',
                    borderRadius: 1
                  }}
                >
                  <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="body2" color="textSecondary">
                    Chưa có ảnh nào
                  </Typography>
                </Box>
              ) : (
                <ImageList cols={3} rowHeight={200}>
                  {roomImages.map((image) => (
                    <ImageListItem key={image.id}>
                      <img
                        src={image.image_url}
                        alt={image.caption || 'Room image'}
                        loading="lazy"
                        style={{ 
                          height: '200px', 
                          objectFit: 'cover' 
                        }}
                      />
                      <ImageListItemBar
                        title={image.caption || 'Không có tiêu đề'}
                        subtitle={image.is_primary ? 'Ảnh chính' : ''}
                        actionIcon={
                          <Box sx={{ display: 'flex' }}>
                            {!image.is_primary && (
                              <Tooltip title="Đặt làm ảnh chính">
                                <IconButton
                                  sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                  onClick={() => handleSetPrimaryImage(image.id)}
                                >
                                  <StarBorderIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Xóa ảnh">
                              <IconButton
                                sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                                onClick={() => handleDeleteImage(image.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      />
                      {image.is_primary && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            bgcolor: 'primary.main',
                            color: 'white',
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <StarIcon sx={{ fontSize: '1rem' }} />
                          Ảnh chính
                        </Box>
                      )}
                    </ImageListItem>
                  ))}
                </ImageList>
              )}
            </Paper>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => {
              setSelectedRoomForImages(null);
              setRoomImages([]);
              setSelectedImages([]);
            }}
            variant="outlined"
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RoomsManagement;