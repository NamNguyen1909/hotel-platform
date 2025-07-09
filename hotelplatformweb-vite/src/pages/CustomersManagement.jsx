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
  AlertTitle,
  Snackbar,
  CircularProgress,
  Grid,
  Divider,
  Stack,
  InputAdornment
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
  MonetizationOn as MoneyIcon
} from '@mui/icons-material';
import api, { endpoints } from '../services/apis';

const CustomersManagement = () => {
  console.log('CustomersManagement component rendering...');
  
  // States for data
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  
  // States for UI
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for modals
  const [openAddEdit, setOpenAddEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false); // Dùng cho toggle active/inactive
  
  // States for current data
  const [currentCustomer, setCurrentCustomer] = useState(null);
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
    role: 'customer',
    is_active: true,
    customer_type: 'NEW'
  });
  
  // States for alerts
  const [alert, setAlert] = useState({ open: false, type: 'success', message: '' });

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers when search term changes
  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const loadCustomers = async () => {
    console.log('Loading customers...');
    setLoading(true);
    try {
      console.log('Calling API:', endpoints.users.customersList);
      const response = await api.get(endpoints.users.customersList);
      console.log('API response:', response.data);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error loading customers:', error);
      showAlert('error', 'Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Filter by search term only
    if (searchTerm.trim()) {
      filtered = filtered.filter(customer =>
        customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.id_card?.includes(searchTerm)
      );
    }

    setFilteredCustomers(filtered);
  };

  const showAlert = (type, message) => {
    setAlert({ open: true, type, message });
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      phone: '',
      id_card: '',
      address: '',
      role: 'customer',
      is_active: true,
      customer_type: 'NEW'
    });
  };

  const handleAddCustomer = () => {
    resetForm();
    setEditMode(false);
    setCurrentCustomer(null);
    setOpenAddEdit(true);
  };

  const handleEditCustomer = (customer) => {
    setFormData({
      username: customer.username || '',
      email: customer.email || '',
      password: '', // Don't populate password for security
      full_name: customer.full_name || '',
      phone: customer.phone || '',
      id_card: customer.id_card || '',
      address: customer.address || '',
      role: customer.role || 'customer',
      is_active: customer.is_active !== undefined ? customer.is_active : true,
      customer_type: customer.customer_type || 'NEW'
    });
    setCurrentCustomer(customer);
    setEditMode(true);
    setOpenAddEdit(true);
  };

  const handleViewCustomer = (customer) => {
    setCurrentCustomer(customer);
    setOpenView(true);
  };

  const handleToggleActiveCustomer = (customer) => {
    setCurrentCustomer(customer);
    setOpenDelete(true); // Sử dụng lại modal này cho toggle active
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
      
      // Don't send empty password for edit
      if (editMode && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }

      if (editMode) {
        // Cập nhật customer existing
        await api.put(endpoints.users.update(currentCustomer.id), dataToSubmit);
        showAlert('success', 'Cập nhật khách hàng thành công');
      } else {
        // Tạo customer mới - sử dụng endpoint create thông thường
        const response = await api.post(endpoints.users.create, dataToSubmit);
        showAlert('success', 'Thêm khách hàng thành công');
      }
      
      setOpenAddEdit(false);
      loadCustomers();
    } catch (error) {
      console.error('Error submitting customer:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.response?.data?.error ||
                          'Có lỗi xảy ra';
      showAlert('error', errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setSubmitLoading(true);
    try {
      // Gọi API toggle active customer
      const response = await api.post(endpoints.users.toggleActive(currentCustomer.id));
      
      // Lấy thông báo từ backend response
      const message = response.data.message || 'Thay đổi trạng thái khách hàng thành công';
      showAlert('success', message);
      setOpenDelete(false);
      loadCustomers();
    } catch (error) {
      console.error('Error toggling customer active status:', error);
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.response?.data?.detail || 
                          'Lỗi khi thay đổi trạng thái khách hàng';
      showAlert('error', errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getCustomerTypeChip = (customerType) => {
    const typeColors = {
      NEW: { color: 'default', label: 'Mới', icon: <PersonIcon /> },
      REGULAR: { color: 'primary', label: 'Thường xuyên', icon: <PersonIcon /> },
      VIP: { color: 'warning', label: 'VIP', icon: <StarIcon /> },
      SUPER_VIP: { color: 'error', label: 'Super VIP', icon: <StarIcon /> },
      UNKNOWN: { color: 'default', label: 'Không xác định', icon: <PersonIcon /> }
    };
    
    const typeInfo = typeColors[customerType] || typeColors.NEW;
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

  // Simple fallback render for debugging
  if (loading && customers.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Đang tải danh sách khách hàng...
        </Typography>
      </Box>
    );
  }

  console.log('Rendering CustomersManagement with customers:', customers.length);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', color: 'white' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                Quản lý khách hàng
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Quản lý thông tin và tài khoản khách hàng
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCustomer}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                Thêm khách hàng
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                Tổng số khách hàng: <strong>{filteredCustomers.length}</strong>
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
                    Khách hàng
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Thông tin liên hệ
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Loại KH
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Trạng thái
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    Thống kê
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5', textAlign: 'center' }}>
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2 }}>
                        Đang tải danh sách khách hàng...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {searchTerm ? 'Không tìm thấy khách hàng nào' : 'Chưa có khách hàng nào'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : 'C'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {customer.full_name || 'Chưa có tên'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              @{customer.username}
                            </Typography>
                            {customer.id_card && (
                              <Typography variant="caption" color="text.secondary">
                                CMND/CCCD: {customer.id_card}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">{customer.email}</Typography>
                          </Box>
                          {customer.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2">{customer.phone}</Typography>
                            </Box>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {getCustomerTypeChip(customer.customer_type)}
                      </TableCell>
                      <TableCell>
                        {getStatusChip(customer.is_active)}
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {customer.total_bookings || 0} booking
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {new Intl.NumberFormat('vi-VN', { 
                                style: 'currency', 
                                currency: 'VND' 
                              }).format(customer.total_spent || 0)}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Xem chi tiết">
                            <IconButton
                              size="small"
                              onClick={() => handleViewCustomer(customer)}
                              color="info"
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => handleEditCustomer(customer)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={customer.is_active ? "Vô hiệu hóa" : "Kích hoạt"}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleActiveCustomer(customer)}
                              color={customer.is_active ? "error" : "success"}
                            >
                              {customer.is_active ? <BlockIcon /> : <ActivateIcon />}
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
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog 
        open={openAddEdit} 
        onClose={() => setOpenAddEdit(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {editMode ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
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
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Loại khách hàng</InputLabel>
                <Select
                  value={formData.customer_type}
                  onChange={(e) => handleFormChange('customer_type', e.target.value)}
                  label="Loại khách hàng"
                >
                  <MenuItem value="NEW">Mới</MenuItem>
                  <MenuItem value="REGULAR">Thường xuyên</MenuItem>
                  <MenuItem value="VIP">VIP</MenuItem>
                  <MenuItem value="SUPER_VIP">Super VIP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Thông tin chi tiết khách hàng
          </Typography>
        </DialogTitle>
        <DialogContent>
          {currentCustomer && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Tên đăng nhập:</Typography>
                <Typography variant="body1">{currentCustomer.username}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Email:</Typography>
                <Typography variant="body1">{currentCustomer.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Họ và tên:</Typography>
                <Typography variant="body1">{currentCustomer.full_name || 'Chưa có'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Số điện thoại:</Typography>
                <Typography variant="body1">{currentCustomer.phone || 'Chưa có'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">CMND/CCCD:</Typography>
                <Typography variant="body1">{currentCustomer.id_card || 'Chưa có'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Loại khách hàng:</Typography>
                {getCustomerTypeChip(currentCustomer.customer_type)}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Trạng thái:</Typography>
                {getStatusChip(currentCustomer.is_active)}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Ngày tạo:</Typography>
                <Typography variant="body1">
                  {new Date(currentCustomer.created_at).toLocaleDateString('vi-VN')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Địa chỉ:</Typography>
                <Typography variant="body1">{currentCustomer.address || 'Chưa có'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Thống kê hoạt động
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Tổng số booking:</Typography>
                    <Typography variant="h6" color="primary">
                      {currentCustomer.total_bookings || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Tổng chi tiêu:</Typography>
                    <Typography variant="h6" color="success.main">
                      {new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND' 
                      }).format(currentCustomer.total_spent || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
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
        open={openDelete} 
        onClose={() => setOpenDelete(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {currentCustomer?.is_active ? 'Vô hiệu hóa khách hàng' : 'Kích hoạt khách hàng'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Bạn có chắc chắn muốn {currentCustomer?.is_active ? 'vô hiệu hóa' : 'kích hoạt'} khách hàng{' '}
            <strong>{currentCustomer?.full_name || currentCustomer?.username}</strong> không?
          </Typography>
          {currentCustomer?.is_active && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Khách hàng sẽ không thể đăng nhập sau khi bị vô hiệu hóa.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>
            Hủy
          </Button>
          <Button 
            onClick={handleToggleActive}
            variant="contained"
            color={currentCustomer?.is_active ? "error" : "success"}
            disabled={submitLoading}
            startIcon={submitLoading ? <CircularProgress size={20} /> : null}
          >
            {currentCustomer?.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
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

export default CustomersManagement;
