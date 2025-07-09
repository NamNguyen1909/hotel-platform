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
  CheckCircle as ActivateIcon
} from '@mui/icons-material';
import api, { endpoints } from '../services/apis';

const StaffsManagement = () => {
  // States for data
  const [staffs, setStaffs] = useState([]);
  const [filteredStaffs, setFilteredStaffs] = useState([]);
  
  // States for UI
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for modals
  const [openAddEdit, setOpenAddEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [openDelete, setOpenDelete] = useState(false); // Dùng cho toggle active/inactive
  
  // States for current data
  const [currentStaff, setCurrentStaff] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // States for form
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'staff',
    is_active: true
  });
  
  // States for alerts
  const [alert, setAlert] = useState({ open: false, type: 'success', message: '' });

  // Load staffs on component mount
  useEffect(() => {
    loadStaffs();
  }, []);

  // Filter staffs when search term changes
  useEffect(() => {
    filterStaffs();
  }, [staffs, searchTerm]);

  const loadStaffs = async () => {
    setLoading(true);
    try {
      const response = await api.get(endpoints.users.staffslist);
      setStaffs(response.data);
    } catch (error) {
      console.error('Error loading staffs:', error);
      showAlert('error', 'Lỗi khi tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  const filterStaffs = () => {
    let filtered = staffs;

    // Filter by search term only
    if (searchTerm.trim()) {
      filtered = filtered.filter(staff =>
        staff.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.phone?.includes(searchTerm)
      );
    }

    setFilteredStaffs(filtered);
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
      role: 'staff',
      is_active: true
    });
  };

  const handleAddStaff = () => {
    resetForm();
    setEditMode(false);
    setCurrentStaff(null);
    setOpenAddEdit(true);
  };

  const handleEditStaff = (staff) => {
    setFormData({
      username: staff.username || '',
      email: staff.email || '',
      password: '', // Don't populate password for security
      full_name: staff.full_name || '',
      phone: staff.phone || '',
      role: staff.role || 'staff',
      is_active: staff.is_active !== undefined ? staff.is_active : true
    });
    setCurrentStaff(staff);
    setEditMode(true);
    setOpenAddEdit(true);
  };

  const handleViewStaff = (staff) => {
    setCurrentStaff(staff);
    setOpenView(true);
  };

  const handleDeleteStaff = (staff) => {
    setCurrentStaff(staff);
    setOpenDelete(true);
  };

  const handleToggleActiveStaff = (staff) => {
    setCurrentStaff(staff);
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
        // Cập nhật staff existing
        await api.put(endpoints.users.update(currentStaff.id), dataToSubmit);
        showAlert('success', 'Cập nhật nhân viên thành công');
      } else {
        // Tạo staff mới - sử dụng endpoint chuyên biệt
        const response = await api.post(endpoints.users.createStaff, dataToSubmit);
        const message = response.data.message || 'Thêm nhân viên thành công';
        showAlert('success', message);
      }
      
      setOpenAddEdit(false);
      loadStaffs();
    } catch (error) {
      console.error('Error submitting staff:', error);
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
      // Gọi API mới cho toggle active staff
      const response = await api.post(endpoints.users.toggleActive(currentStaff.id));
      
      // Lấy thông báo từ backend response
      const message = response.data.message || 'Thay đổi trạng thái nhân viên thành công';
      showAlert('success', message);
      setOpenDelete(false);
      loadStaffs();
    } catch (error) {
      console.error('Error toggling staff active status:', error);
      
      // Hiển thị thông báo lỗi chi tiết từ backend
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.response?.data?.detail || 
                          'Lỗi khi thay đổi trạng thái nhân viên';
      showAlert('error', errorMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const getRoleChip = (role) => {
    const roleColors = {
      owner: { color: 'error', label: 'Chủ sở hữu' },
      manager: { color: 'warning', label: 'Quản lý' },
      staff: { color: 'primary', label: 'Nhân viên' },
      customer: { color: 'default', label: 'Khách hàng' }
    };
    
    const roleInfo = roleColors[role] || roleColors.customer;
    return (
      <Chip 
        label={roleInfo.label} 
        color={roleInfo.color} 
        size="small" 
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
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <WorkIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" color="primary.main">
            Quản Lý Nhân Viên
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Quản lý thông tin nhân viên trong hệ thống khách sạn
        </Typography>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'background.default',
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={handleAddStaff}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  Thêm Nhân Viên
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Đang tải danh sách nhân viên...
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                      Nhân viên
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                      Thông tin liên hệ
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                      Trạng thái
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStaffs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            {searchTerm ? 'Không tìm thấy nhân viên' : 'Chưa có nhân viên nào'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy thêm nhân viên đầu tiên'}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaffs.map((staff, index) => (
                      <TableRow 
                        key={staff.id} 
                        hover 
                        sx={{ 
                          '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              sx={{ 
                                mr: 2, 
                                bgcolor: 'primary.main',
                                width: 40,
                                height: 40
                              }}
                            >
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {staff.full_name || staff.username}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                @{staff.username}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'primary.main' }} />
                              <Typography variant="body2">
                                {staff.email}
                              </Typography>
                            </Box>
                            {staff.phone && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'primary.main' }} />
                                <Typography variant="body2">
                                  {staff.phone}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(staff.is_active)}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="Xem chi tiết">
                              <IconButton 
                                size="small" 
                                onClick={() => handleViewStaff(staff)}
                                sx={{ 
                                  color: 'info.main',
                                  '&:hover': { bgcolor: 'info.light', color: 'white' }
                                }}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditStaff(staff)}
                                sx={{ 
                                  color: 'warning.main',
                                  '&:hover': { bgcolor: 'warning.main', color: 'white' }
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={staff.is_active ? "Vô hiệu hóa" : "Kích hoạt"}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleToggleActiveStaff(staff)}
                                sx={{ 
                                  color: staff.is_active ? 'error.main' : 'success.main',
                                  '&:hover': { 
                                    bgcolor: staff.is_active ? 'error.main' : 'success.main', 
                                    color: 'white' 
                                  }
                                }}
                              >
                                {staff.is_active ? <BlockIcon /> : <ActivateIcon />}
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
        <DialogTitle>
          {editMode ? 'Chỉnh Sửa Nhân Viên' : 'Thêm Nhân Viên Mới'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tên đăng nhập"
                value={formData.username}
                onChange={(e) => handleFormChange('username', e.target.value)}
                disabled={editMode}
                required
                helperText={editMode ? "Không thể thay đổi tên đăng nhập" : ""}
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
            <Grid item xs={12}>
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
                label={editMode ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"}
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                required={!editMode}
                helperText={editMode ? "Chỉ nhập nếu muốn thay đổi mật khẩu" : ""}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                placeholder="0123456789"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={formData.is_active}
                  label="Trạng thái"
                  onChange={(e) => handleFormChange('is_active', e.target.value)}
                >
                  <MenuItem value={true}>
                    <Chip label="Hoạt động" color="success" size="small" />
                  </MenuItem>
                  <MenuItem value={false}>
                    <Chip label="Không hoạt động" color="default" size="small" />
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {!editMode && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <AlertTitle>Thông tin</AlertTitle>
                  Nhân viên mới sẽ được tạo với vai trò "Nhân viên" và có thể đăng nhập ngay sau khi tạo.
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setOpenAddEdit(false)}
            variant="outlined"
            size="large"
          >
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={submitLoading}
            size="large"
            sx={{ minWidth: 120 }}
          >
            {submitLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              editMode ? 'Cập nhật' : 'Thêm mới'
            )}
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
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            Chi Tiết Nhân Viên
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {currentStaff && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                <Avatar sx={{ width: 64, height: 64, mr: 3, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                  <PersonIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {currentStaff.full_name || currentStaff.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    @{currentStaff.username}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {getStatusChip(currentStaff.is_active)}
                  </Box>
                </Box>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <EmailIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Email
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {currentStaff.email}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <PhoneIcon sx={{ fontSize: 20, mr: 1, color: 'primary.main' }} />
                      <Typography variant="subtitle2" color="text.secondary">
                        Số điện thoại
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={500}>
                      {currentStaff.phone || 'Chưa cập nhật'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Ngày tham gia
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {currentStaff.created_at ? new Date(currentStaff.created_at).toLocaleDateString('vi-VN') : 'Không có'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Cập nhật lần cuối
                    </Typography>
                    <Typography variant="body1" fontWeight={500}>
                      {currentStaff.updated_at ? new Date(currentStaff.updated_at).toLocaleDateString('vi-VN') : 'Không có'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setOpenView(false)}
            variant="outlined"
            size="large"
          >
            Đóng
          </Button>
          <Button 
            onClick={() => {
              setOpenView(false);
              handleEditStaff(currentStaff);
            }}
            variant="contained"
            startIcon={<EditIcon />}
            size="large"
          >
            Chỉnh sửa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toggle Active Confirmation Modal */}
      <Dialog 
        open={openDelete} 
        onClose={() => setOpenDelete(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="div" color={currentStaff?.is_active ? "error.main" : "success.main"}>
            {currentStaff?.is_active ? "Vô hiệu hóa nhân viên" : "Kích hoạt nhân viên"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Alert severity={currentStaff?.is_active ? "warning" : "info"}>
            <AlertTitle>
              {currentStaff?.is_active ? "Xác nhận vô hiệu hóa" : "Xác nhận kích hoạt"}
            </AlertTitle>
            Bạn có chắc chắn muốn {currentStaff?.is_active ? "vô hiệu hóa" : "kích hoạt"} nhân viên{" "}
            <strong>{currentStaff?.full_name || currentStaff?.username}</strong>?
            <br />
            <br />
            {currentStaff?.is_active ? (
              <span>
                Nhân viên sẽ không thể đăng nhập vào hệ thống sau khi bị vô hiệu hóa.
                <br />
                Bạn có thể kích hoạt lại tài khoản này bất cứ lúc nào.
              </span>
            ) : (
              <span>
                Nhân viên sẽ có thể đăng nhập và sử dụng hệ thống sau khi được kích hoạt.
              </span>
            )}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setOpenDelete(false)}
            variant="outlined"
            size="large"
          >
            Hủy
          </Button>
          <Button 
            onClick={handleToggleActive}
            color={currentStaff?.is_active ? "error" : "success"}
            variant="contained"
            disabled={submitLoading}
            size="large"
            sx={{ minWidth: 140 }}
            startIcon={currentStaff?.is_active ? <BlockIcon /> : <ActivateIcon />}
          >
            {submitLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              currentStaff?.is_active ? "Vô hiệu hóa" : "Kích hoạt"
            )}
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
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StaffsManagement;
