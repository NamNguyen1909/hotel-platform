import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Skeleton,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Badge as BadgeIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/apis';
import authUtils from '../services/auth';

const Profile = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // States
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_card: '',
    address: '',
  });

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        if (!authUtils.isAuthenticated()) {
          navigate('/login');
          return;
        }

        const userData = await authUtils.getCurrentUser();
        if (userData) {
          setUser(userData);
          setFormData({
            full_name: userData.full_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            id_card: userData.id_card || '',
            address: userData.address || '',
          });
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Không thể tải thông tin người dùng');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  // Handle form change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Kích thước file không được vượt quá 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Vui lòng chọn file hình ảnh hợp lệ');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setAvatarDialogOpen(true);
    }
  };

  // Upload avatar
  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      // Upload avatar
      const response = await api.put(endpoints.users.updateProfile, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data) {
        setUser(prev => ({ ...prev, avatar: response.data.avatar }));
        setSuccess('Cập nhật avatar thành công!');
        setAvatarDialogOpen(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setError('Không thể cập nhật avatar. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate form
      if (!formData.full_name || !formData.email) {
        setError('Vui lòng nhập đầy đủ họ tên và email');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Email không hợp lệ');
        return;
      }

      // Phone validation (optional)
      if (formData.phone && formData.phone.trim()) {
        const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
        if (!phoneRegex.test(formData.phone.trim())) {
          setError('Số điện thoại không hợp lệ');
          return;
        }
      }

      // ID card validation (optional)
      if (formData.id_card && formData.id_card.trim()) {
        const idCardRegex = /^[0-9]{9,12}$/;
        if (!idCardRegex.test(formData.id_card.trim())) {
          setError('CMND/CCCD phải có 9-12 chữ số');
          return;
        }
      }

      const updateData = { ...formData };
      
      // Remove empty optional fields
      if (!updateData.phone?.trim()) delete updateData.phone;
      if (!updateData.id_card?.trim()) delete updateData.id_card;
      if (!updateData.address?.trim()) delete updateData.address;

      const response = await api.put(endpoints.users.updateProfile, updateData);

      if (response.data) {
        setUser(prev => ({ ...prev, ...response.data }));
        setSuccess('Cập nhật thông tin thành công!');
        setEditing(false);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.email) {
          setError('Email này đã được sử dụng');
        } else if (errorData.phone) {
          setError('Số điện thoại này đã được sử dụng');
        } else if (errorData.detail) {
          setError(errorData.detail);
        } else {
          setError('Đã xảy ra lỗi khi cập nhật thông tin');
        }
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      id_card: user.id_card || '',
      address: user.address || '',
    });
    setEditing(false);
    setError('');
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    const roleNames = {
      admin: 'Quản trị viên',
      owner: 'Chủ khách sạn',
      staff: 'Nhân viên',
      customer: 'Khách hàng',
    };
    return roleNames[role] || role;
  };

  // Get role color
  const getRoleColor = (role) => {
    const roleColors = {
      admin: 'error',
      owner: 'warning',
      staff: 'info',
      customer: 'success',
    };
    return roleColors[role] || 'default';
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
            <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width={150} height={30} />
          </Box>
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Skeleton variant="rectangular" height={56} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        {/* Header với Avatar */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #DAA520 100%)',
            color: 'white',
            p: 4,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <Box position="relative" display="inline-block">
            <Avatar
              src={user?.avatar}
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 2,
                border: '4px solid white',
                boxShadow: theme.shadows[8],
              }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || <PersonIcon sx={{ fontSize: 60 }} />}
            </Avatar>
            <IconButton
              sx={{
                position: 'absolute',
                bottom: 8,
                right: -8,
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': { backgroundColor: 'grey.100' },
              }}
              component="label"
            >
              <PhotoCamera />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </IconButton>
          </Box>

          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {user?.full_name || 'Chưa cập nhật tên'}
          </Typography>
          
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} flexWrap="wrap">
            <Chip
              label={getRoleDisplayName(user?.role)}
              color={getRoleColor(user?.role)}
              sx={{ fontWeight: 'bold' }}
            />
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              @{user?.username}
            </Typography>
          </Box>
        </Box>

        {/* Alert Messages */}
        <Box p={3}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="bold">
              Thông tin cá nhân
            </Typography>
            {!editing ? (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
              >
                Chỉnh sửa
              </Button>
            ) : (
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Hủy
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Profile Form */}
          <Grid container spacing={3}>
            {/* Họ và tên */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Họ và tên"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                disabled={!editing || saving}
                required
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            {/* Tên đăng nhập (read-only) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tên đăng nhập"
                value={user?.username || ''}
                disabled
                InputProps={{
                  startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                helperText="Tên đăng nhập không thể thay đổi"
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!editing || saving}
                required
                InputProps={{
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            {/* Số điện thoại */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Số điện thoại"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!editing || saving}
                InputProps={{
                  startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
                placeholder="Nhập số điện thoại"
              />
            </Grid>

            {/* CMND/CCCD */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="CMND/CCCD"
                name="id_card"
                value={formData.id_card}
                onChange={handleInputChange}
                disabled={!editing || saving}
                placeholder="Nhập số CMND/CCCD"
              />
            </Grid>

            {/* Ngày tạo tài khoản */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ngày tạo tài khoản"
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : ''}
                disabled
                InputProps={{
                  startAdornment: <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>

            {/* Địa chỉ */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Địa chỉ"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                disabled={!editing || saving}
                multiline
                rows={3}
                InputProps={{
                  startAdornment: <LocationIcon sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 1 }} />,
                }}
                placeholder="Nhập địa chỉ"
              />
            </Grid>
          </Grid>

          {/* Customer Stats (for customers only) */}
          {user?.role === 'customer' && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Thống kê khách hàng
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {user?.total_bookings || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tổng số lần đặt phòng
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="secondary.main" fontWeight="bold">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user?.total_spent || 0)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Tổng chi tiêu
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Chip
                        label={user?.customer_type || 'NEW'}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Loại khách hàng
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </Paper>

      {/* Avatar Upload Dialog */}
      <Dialog
        open={avatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cập nhật Avatar</DialogTitle>
        <DialogContent>
          {avatarPreview && (
            <Box display="flex" justifyContent="center" mb={2}>
              <Avatar
                src={avatarPreview}
                sx={{ width: 200, height: 200 }}
              />
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Bạn có muốn cập nhật avatar này không?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAvatarDialogOpen(false);
              setAvatarFile(null);
              setAvatarPreview(null);
            }}
            disabled={saving}
          >
            Hủy
          </Button>
          <Button
            onClick={handleAvatarUpload}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Đang tải lên...' : 'Cập nhật'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
