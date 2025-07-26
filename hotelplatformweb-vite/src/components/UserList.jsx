import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Divider,
  Stack,
  InputAdornment,
  Pagination,
  TablePagination,
  Skeleton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Work as WorkIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Star as StarIcon,
  MonetizationOn as MoneyIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import api, { endpoints } from '../services/apis';

const UserList = ({ 
  userType = 'customer', // 'customer' hoặc 'staff'
  title,
  description,
  icon,
  showCustomerType = false,
  showStats = false
}) => {
  // States for data
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  // States for pagination
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 15,
    totalPages: 0
  });
  
  // States for UI
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState('');
  
  // States for modals
  const [openAddEdit, setOpenAddEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openToggleActive, setOpenToggleActive] = useState(false);
  
  // States for current data
  const [currentUser, setCurrentUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // States for form
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    id_card: '',
    address: '',
    role: userType,
    is_active: true,
    customer_type: 'new'
  });
  
  // States for alerts
  const [alert, setAlert] = useState({ open: false, type: 'success', message: '' });

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, [userType, pagination.page, searchTerm, customerTypeFilter]);

  // Manage inert attribute for accessibility when modals are open
  useEffect(() => {
    const rootElement = document.getElementById('root');
    if (openAddEdit || openView || openToggleActive) {
      // Add inert to #root when any modal is open
      if (rootElement) {
        rootElement.setAttribute('inert', '');
        rootElement.removeAttribute('aria-hidden'); // Remove aria-hidden to avoid conflicts
      }
    } else {
      // Remove inert when modals are closed
      if (rootElement) {
        rootElement.removeAttribute('inert');
      }
    }

    return () => {
      // Cleanup on unmount
      if (rootElement) {
        rootElement.removeAttribute('inert');
        rootElement.removeAttribute('aria-hidden');
      }
    };
  }, [openAddEdit, openView, openToggleActive]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const endpoint = userType === 'staff' ? endpoints.users.staffslist : endpoints.users.customersList;
      console.log('Calling API:', endpoint);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.pageSize.toString()
      });
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (customerTypeFilter && userType === 'customer') {
        params.append('customer_type', customerTypeFilter);
      }
      
      const response = await api.get(`${endpoint}?${params.toString()}`);
      console.log('API response:', response.data);
      
      // Handle paginated response
      if (response.data.results) {
        setUsers(response.data.results);
        setPagination(prev => ({
          ...prev,
          count: response.data.count,
          totalPages: response.data.total_pages
        }));
      } else {
        // Fallback for non-paginated response
        setUsers(response.data);
      }
    } catch (error) {
      console.error(`Error loading ${userType}s:`, error);
      showAlert('error', `Lỗi khi tải danh sách ${userType === 'staff' ? 'nhân viên' : 'khách hàng'}`);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ open: true, type, message });
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  // Pagination handlers
  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (event) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: event.target.value,
      page: 1 // Reset to first page when changing page size
    }));
  };

  // Search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, customerTypeFilter]);

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      phone: '',
      id_card: '',
      address: '',
      role: userType,
      is_active: true,
      customer_type: 'new'
    });
  };

  const handleAdd = () => {
    resetForm();
    setEditMode(false);
    setCurrentUser(null);
    setOpenAddEdit(true);
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      id_card: user.id_card || '',
      address: user.address || '',
      role: user.role || userType,
      is_active: user.is_active !== undefined ? user.is_active : true,
      customer_type: user.customer_type || 'new'
    });
    setCurrentUser(user);
    setEditMode(true);
    setOpenAddEdit(true);
  };

  const handleView = (user) => {
    setCurrentUser(user);
    setOpenView(true);
  };

  const handleToggleActive = (user) => {
    setCurrentUser(user);
    setOpenToggleActive(true);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      const dataToSubmit = { ...formData };
      
      if (editMode && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }

      if (editMode) {
        await api.put(endpoints.users.update(currentUser.id), dataToSubmit);
        showAlert('success', `Cập nhật ${userType === 'staff' ? 'nhân viên thành công' : 'khách hàng thành công'}`);
      } else {
        const endpoint = userType === 'staff' ? endpoints.users.createStaff : endpoints.users.create;
        await api.post(endpoint, dataToSubmit);
        showAlert('success', `Thêm ${userType === 'staff' ? 'nhân viên' : 'khách hàng'} thành công`);
      }
      
      setOpenAddEdit(false);
      loadUsers();
    } catch (error) {
      console.error(`Error submitting ${userType}:`, error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Có lỗi xảy ra';
      showAlert('error', errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleActiveConfirm = async () => {
    setSubmitLoading(true);
    try {
      const response = await api.post(endpoints.users.toggleActive(currentUser.id));
      const message = response.data.message || `Thay đổi trạng thái ${userType === 'staff' ? 'nhân viên' : 'khách hàng'} thành công`;
      showAlert('success', message);
      setOpenToggleActive(false);
      loadUsers();
    } catch (error) {
      console.error(`Error toggling ${userType} active status:`, error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.response?.data?.detail || 
                          `Lỗi khi thay đổi trạng thái ${userType === 'staff' ? 'nhân viên' : 'khách hàng'}`;
      showAlert('error', errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getCustomerTypeChip = (customerType) => {
    const typeColors = {
      'new': { color: 'default', label: 'Mới', icon: <PersonIcon /> },
      'regular': { color: 'primary', label: 'Thường', icon: <PersonIcon /> },
      'vip': { color: 'warning', label: 'VIP', icon: <StarIcon /> },
      'super_vip': { color: 'error', label: 'Super VIP', icon: <StarIcon /> },
      'unknown': { color: 'default', label: 'Không xác định', icon: <PersonIcon /> }
    };
    
    const typeInfo = typeColors[customerType] || typeColors['new'];
    return (
      <Chip 
        label={typeInfo.label} 
        color={typeInfo.color} 
        size="small"
        icon={typeInfo.icon}
        sx={{ fontWeight: 600 }}
      />
    );
  };

  const getStatusChip = (isActive) => {
    return (
      <Chip 
        label={isActive ? 'Hoạt động' : 'Vô hiệu hóa'} 
        color={isActive ? 'success' : 'error'} 
        size="small"
        icon={isActive ? <ActivateIcon sx={{ fontSize: 16 }} /> : <BlockIcon sx={{ fontSize: 16 }} />}
        sx={{
          fontWeight: 600,
          '& .MuiChip-icon': {
            fontSize: 16
          }
        }}
      />
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Card sx={{ 
        mb: 3, 
        background: (theme) => userType === 'staff' 
          ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
          : `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
        color: 'white',
        boxShadow: (theme) => userType === 'staff' 
          ? `0 8px 32px ${theme.palette.primary.main}30`
          : `0 8px 32px ${theme.palette.secondary.main}30`
      }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 1, 
                  textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  color: userType === 'staff' ? '#E8F5E8' : '#FFF8DC',
                  letterSpacing: '-0.5px'
                }}
              >
                {icon && React.cloneElement(icon, { 
                  sx: { 
                    mr: 2, 
                    verticalAlign: 'middle', 
                    fontSize: 40,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                  } 
                })}
                {title}
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  opacity: 0.95,
                  color: userType === 'staff' ? '#F0F8F0' : '#FFFEF7',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                {description}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  color: userType === 'staff' ? 'success.main' : 'secondary.main',
                  fontWeight: 'bold',
                  border: '2px solid rgba(255,255,255,0.8)',
                  '&:hover': { 
                    backgroundColor: 'white',
                    color: userType === 'staff' ? 'success.dark' : 'secondary.dark',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Thêm {userType === 'staff' ? 'nhân viên' : 'khách hàng'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={showCustomerType ? 4 : 6}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm theo tên, email, số điện thoại, CMND..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                size="small"
              />
            </Grid>
            {showCustomerType && (
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Loại khách hàng</InputLabel>
                  <Select
                    value={customerTypeFilter}
                    label="Loại khách hàng"
                    onChange={(e) => setCustomerTypeFilter(e.target.value)}
                  >
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="new">Khách mới</MenuItem>
                    <MenuItem value="regular">Khách thường</MenuItem>
                    <MenuItem value="vip">VIP</MenuItem>
                    <MenuItem value="super_vip">Super VIP</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} md={showCustomerType ? 4 : 6}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                Tổng số {userType === 'staff' ? 'nhân viên' : 'khách hàng'}: <strong>{pagination.count || 0}</strong>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    {userType === 'staff' ? 'Nhân viên' : 'Khách hàng'}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Thông tin liên hệ
                  </TableCell>
                  {showCustomerType && (
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Loại KH
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Trạng thái
                  </TableCell>
                  {showStats && (
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Thống kê
                    </TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', textAlign: 'center' }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Loading skeleton rows
                  Array.from({ length: pagination.pageSize }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Skeleton variant="circular" width={40} height={40} />
                          <Box>
                            <Skeleton variant="text" width={120} />
                            <Skeleton variant="text" width={80} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width={150} />
                        <Skeleton variant="text" width={100} />
                      </TableCell>
                      {showCustomerType && (
                        <TableCell>
                          <Skeleton variant="rectangular" width={60} height={24} />
                        </TableCell>
                      )}
                      {showStats && (
                        <TableCell>
                          <Skeleton variant="text" width={80} />
                        </TableCell>
                      )}
                      <TableCell>
                        <Skeleton variant="rectangular" width={100} height={32} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showCustomerType && showStats ? 6 : showCustomerType || showStats ? 5 : 4} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {searchTerm ? `Không tìm thấy ${userType === 'staff' ? 'nhân viên' : 'khách hàng'} nào` : `Chưa có ${userType === 'staff' ? 'nhân viên' : 'khách hàng'} nào`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: userType === 'staff' ? 'primary.main' : 'secondary.main' }}>
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : (userType === 'staff' ? 'S' : 'C')}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {user.full_name || 'Chưa có tên'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              @{user.username}
                            </Typography>
                            {user.id_card && (
                              <Typography variant="caption" color="text.secondary">
                                CMND/CCCD: {user.id_card}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{user.email}</Typography>
                          </Box>
                          {user.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{user.phone}</Typography>
                            </Box>
                          )}
                        </Stack>
                      </TableCell>
                      {showCustomerType && (
                        <TableCell>
                          {getCustomerTypeChip(user.customer_type)}
                        </TableCell>
                      )}
                      <TableCell>
                        {getStatusChip(user.is_active)}
                      </TableCell>
                      {showStats && (
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {user.total_bookings || 0} booking
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">
                                {new Intl.NumberFormat('vi-VN', { 
                                  style: 'currency', 
                                  currency: 'VND' 
                                }).format(user.total_spent || 0)}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                      )}
                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Xem chi tiết">
                            <IconButton
                              size="small"
                              onClick={() => handleView(user)}
                              color="info"
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(user)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={user.is_active ? "Vô hiệu hóa" : "Kích hoạt"}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActive(user)}
                              color={user.is_active ? "error" : "success"}
                            >
                              {user.is_active ? <BlockIcon /> : <ActivateIcon />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Hiển thị:
                </Typography>
                <Select
                  size="small"
                  value={pagination.pageSize}
                  onChange={handlePageSizeChange}
                  sx={{ minWidth: 80 }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={15}>15</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </Select>
                <Typography variant="body2" color="text.secondary">
                  / trang
                </Typography>
              </Box>
              
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
              />
              
              <Typography variant="body2" color="text.secondary">
                {((pagination.page - 1) * pagination.pageSize) + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.count)} 
                trên {pagination.count}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog 
        open={openAddEdit} 
        onClose={() => setOpenAddEdit(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle component="div" sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {editMode ? `Chỉnh sửa ${userType === 'staff' ? 'nhân viên' : 'khách hàng'}` : `Thêm ${userType === 'staff' ? 'nhân viên' : 'khách hàng'} mới`}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                autoFocus
                fullWidth
                label="Tên đăng nhập"
                value={formData.username}
                onChange={(e) => handleFormChange('username', e.target.value)}
                disabled={editMode}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Họ và tên"
                value={formData.full_name}
                onChange={(e) => handleFormChange('full_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CMND/CCCD"
                value={formData.id_card}
                onChange={(e) => handleFormChange('id_card', e.target.value)}
              />
            </Grid>
            {showCustomerType && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Loại khách hàng</InputLabel>
                  <Select
                    value={formData.customer_type}
                    onChange={(e) => handleFormChange('customer_type', e.target.value)}
                    label="Loại khách hàng"
                  >
                    <MenuItem value="new">Mới</MenuItem>
                    <MenuItem value="regular">Thường</MenuItem>
                    <MenuItem value="vip">VIP</MenuItem>
                    <MenuItem value="super_vip">Super VIP</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Địa chỉ"
                multiline
                rows={2}
                value={formData.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
              />
            </Grid>
            {!editMode && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Mật khẩu"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  required={!editMode}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={() => setOpenAddEdit(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={submitLoading}
            startIcon={submitLoading ? <CircularProgress size={20} /> : null}
          >
            {editMode ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Modal */}
      <Dialog 
        open={openView} 
        onClose={() => setOpenView(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle component="div">
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Thông tin chi tiết {userType === 'staff' ? 'nhân viên' : 'khách hàng'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {currentUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Tên đăng nhập:</Typography>
                <Typography variant="body1">{currentUser.username}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Email:</Typography>
                <Typography variant="body1">{currentUser.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Họ và tên:</Typography>
                <Typography variant="body1">{currentUser.full_name || 'Chưa có'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Số điện thoại:</Typography>
                <Typography variant="body1">{currentUser.phone || 'Chưa có'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">CMND/CCCD:</Typography>
                <Typography variant="body1">{currentUser.id_card || 'Chưa có'}</Typography>
              </Grid>
              {showCustomerType && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Loại khách hàng:</Typography>
                  {getCustomerTypeChip(currentUser.customer_type)}
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Trạng thái:</Typography>
                {getStatusChip(currentUser.is_active)}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Ngày tạo:</Typography>
                <Typography variant="body1">
                  {new Date(currentUser.created_at).toLocaleDateString('vi-VN')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Địa chỉ:</Typography>
                <Typography variant="body1">{currentUser.address || 'Chưa có'}</Typography>
              </Grid>
              {showStats && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Thống kê hoạt động
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Tổng số booking:</Typography>
                      <Typography variant="h6" color="primary">
                        {currentUser.total_bookings || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">Tổng chi tiêu:</Typography>
                      <Typography variant="h6" color="success.main">
                        {new Intl.NumberFormat('vi-VN', { 
                          style: 'currency', 
                          currency: 'VND' 
                        }).format(currentUser.total_spent || 0)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenView(false)}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle Active Modal */}
      <Dialog 
        open={openToggleActive} 
        onClose={() => setOpenToggleActive(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle component="div">
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {currentUser?.is_active ? `Vô hiệu hóa ${userType === 'staff' ? 'nhân viên' : 'khách hàng'}` : `Kích hoạt ${userType === 'staff' ? 'nhân viên' : 'khách hàng'}`}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Bạn có chắc chắn muốn {currentUser?.is_active ? 'vô hiệu hóa' : 'kích hoạt'} {userType === 'staff' ? 'nhân viên' : 'khách hàng'}{' '}
            <strong>{currentUser?.full_name || currentUser?.username}</strong> không?
          </Typography>
          {currentUser?.is_active && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {userType === 'staff' ? 'Nhân viên' : 'Khách hàng'} sẽ không thể đăng nhập sau khi bị vô hiệu hóa.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenToggleActive(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleToggleActiveConfirm}
            variant="contained"
            color={currentUser?.is_active ? "error" : "success"}
            disabled={submitLoading}
            startIcon={submitLoading ? <CircularProgress size={20} /> : null}
          >
            {currentUser?.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.type}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserList;