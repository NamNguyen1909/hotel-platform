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
  Skeleton
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Search as SearchIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import api, { endpoints } from '../services/apis';

const StaffsManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'staff',
    is_active: true
  });

  // Fetch staff users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        user_type: 'staff',
        search: searchTerm,
        page: page + 1,
        page_size: rowsPerPage
      };
      const response = await api.get(endpoints.users, { params });
      setUsers(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setAlert({ open: true, message: 'Lỗi khi tải danh sách nhân viên', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, page, rowsPerPage]);

  const handleCreateUser = async () => {
    try {
      await api.post(endpoints.users, formData);
      setAlert({ open: true, message: 'Tạo nhân viên thành công!', severity: 'success' });
      setOpenDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      setAlert({ open: true, message: 'Lỗi khi tạo nhân viên', severity: 'error' });
    }
  };

  const handleUpdateUser = async () => {
    try {
      await api.patch(`${endpoints.users}${editingUser.id}/`, formData);
      setAlert({ open: true, message: 'Cập nhật nhân viên thành công!', severity: 'success' });
      setOpenDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      setAlert({ open: true, message: 'Lỗi khi cập nhật nhân viên', severity: 'error' });
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.patch(`${endpoints.users}${user.id}/`, { is_active: !user.is_active });
      setAlert({ 
        open: true, 
        message: `${!user.is_active ? 'Kích hoạt' : 'Vô hiệu hóa'} nhân viên thành công!`, 
        severity: 'success' 
      });
      fetchUsers();
    } catch (error) {
      setAlert({ open: true, message: 'Lỗi khi thay đổi trạng thái nhân viên', severity: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: 'staff',
      is_active: true
    });
    setEditingUser(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setOpenDialog(true);
  };

  const openEditDialog = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      role: user.role,
      is_active: user.is_active
    });
    setEditingUser(user);
    setOpenDialog(true);
  };

  const getRoleChip = (role) => {
    const roleConfig = {
      admin: { label: 'Quản trị viên', color: 'error' },
      owner: { label: 'Chủ sở hữu', color: 'warning' },
      staff: { label: 'Nhân viên', color: 'primary' },
      customer: { label: 'Khách hàng', color: 'default' }
    };
    const config = roleConfig[role] || roleConfig.customer;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <BadgeIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Quản lý nhân viên
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quản lý thông tin và tài khoản nhân viên
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={openCreateDialog}
                sx={{ height: '56px' }}
              >
                Thêm nhân viên
              </Button>
            </Grid>
          </Grid>

          {loading ? (
            <Box>
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} variant="rectangular" height={60} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nhân viên</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Số điện thoại</TableCell>
                      <TableCell>Vai trò</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Thao tác</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {user.first_name} {user.last_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                @{user.username}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <EmailIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                            {user.email}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PhoneIcon sx={{ mr: 1, fontSize: 16, color: 'text.secondary' }} />
                            {user.phone || 'Chưa có'}
                          </Box>
                        </TableCell>
                        <TableCell>{getRoleChip(user.role)}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.is_active ? 'Hoạt động' : 'Vô hiệu hóa'}
                            color={user.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Chỉnh sửa">
                              <IconButton size="small" onClick={() => openEditDialog(user)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                              <IconButton
                                size="small"
                                color={user.is_active ? 'error' : 'success'}
                                onClick={() => handleToggleActive(user)}
                              >
                                {user.is_active ? <BlockIcon /> : <ActivateIcon />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(totalCount / rowsPerPage)}
                  page={page + 1}
                  onChange={(event, newPage) => setPage(newPage - 1)}
                  color="primary"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Tên đăng nhập"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              disabled={!!editingUser}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Họ"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Tên"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Số điện thoại"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Vai trò"
              >
                <MenuItem value="staff">Nhân viên</MenuItem>
                <MenuItem value="admin">Quản trị viên</MenuItem>
                <MenuItem value="owner">Chủ sở hữu</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={editingUser ? handleUpdateUser : handleCreateUser}
          >
            {editingUser ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StaffsManagement;
