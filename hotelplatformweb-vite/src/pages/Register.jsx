import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  PersonAdd as RegisterIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/apis';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    id_card: '',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (error) setError('');
  };

  const handleTogglePassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(prev => !prev);
  };

  const validateForm = () => {
    // Validate required fields
    if (!formData.full_name || !formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin bắt buộc');
      return false;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return false;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email không hợp lệ');
      return false;
    }

    // Validate phone number format (optional)
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        setError('Số điện thoại không hợp lệ');
        return false;
      }
    }

    // Validate ID card format (optional)
    if (formData.id_card && formData.id_card.trim()) {
      const idCardRegex = /^[0-9]{9,12}$/;
      if (!idCardRegex.test(formData.id_card.trim())) {
        setError('CMND/CCCD phải có 9-12 chữ số');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare data for API call
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name
      };

      // Add optional fields if they have values
      if (formData.phone && formData.phone.trim()) {
        registrationData.phone = formData.phone.trim();
      }
      if (formData.id_card && formData.id_card.trim()) {
        registrationData.id_card = formData.id_card.trim();
      }
      if (formData.address && formData.address.trim()) {
        registrationData.address = formData.address.trim();
      }

      // Call register API
      const response = await api.post(endpoints.auth.register, registrationData);

      setSuccess('Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error('Register error:', err);
      console.error('Error response data:', err.response?.data);
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Handle detailed field validation errors
        const fieldErrors = [];
        
        // Check for specific field errors
        if (errorData.username) {
          if (Array.isArray(errorData.username)) {
            fieldErrors.push(`Tên đăng nhập: ${errorData.username[0]}`);
          } else {
            fieldErrors.push('Tên đăng nhập đã tồn tại');
          }
        }
        
        if (errorData.email) {
          if (Array.isArray(errorData.email)) {
            fieldErrors.push(`Email: ${errorData.email[0]}`);
          } else {
            fieldErrors.push('Email đã được sử dụng');
          }
        }
        
        if (errorData.password) {
          if (Array.isArray(errorData.password)) {
            fieldErrors.push(`Mật khẩu: ${errorData.password[0]}`);
          } else {
            fieldErrors.push(`Mật khẩu: ${errorData.password}`);
          }
        }
        
        if (errorData.full_name) {
          if (Array.isArray(errorData.full_name)) {
            fieldErrors.push(`Họ tên: ${errorData.full_name[0]}`);
          } else {
            fieldErrors.push(`Họ tên: ${errorData.full_name}`);
          }
        }
        
        if (errorData.phone) {
          if (Array.isArray(errorData.phone)) {
            fieldErrors.push(`Số điện thoại: ${errorData.phone[0]}`);
          } else {
            fieldErrors.push(`Số điện thoại: ${errorData.phone}`);
          }
        }
        
        if (errorData.id_card) {
          if (Array.isArray(errorData.id_card)) {
            fieldErrors.push(`CMND/CCCD: ${errorData.id_card[0]}`);
          } else {
            fieldErrors.push(`CMND/CCCD: ${errorData.id_card}`);
          }
        }
        
        // Handle non-field errors
        if (errorData.non_field_errors) {
          if (Array.isArray(errorData.non_field_errors)) {
            fieldErrors.push(...errorData.non_field_errors);
          } else {
            fieldErrors.push(errorData.non_field_errors);
          }
        }
        
        // Handle detail error (general error message)
        if (errorData.detail && fieldErrors.length === 0) {
          fieldErrors.push(errorData.detail);
        }
        
        // Set the first error or join multiple errors
        if (fieldErrors.length > 0) {
          if (fieldErrors.length === 1) {
            setError(fieldErrors[0]);
          } else {
            setError(fieldErrors.join('\n'));
          }
        } else {
          setError('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
        }
      } else {
        setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4
        }}
      >
        <Paper 
          elevation={3} 
          sx={{
            padding: 4,
            width: '100%',
            maxWidth: 500,
            borderRadius: 2
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3
            }}
          >
            <RegisterIcon 
              sx={{ 
                fontSize: 40, 
                color: 'primary.main',
                mb: 2 
              }} 
            />
            <Typography component="h1" variant="h4" gutterBottom>
              Đăng ký
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Tạo tài khoản mới để sử dụng dịch vụ khách sạn của chúng tôi.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.split('\n').map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            {/* Họ và tên đầy đủ */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="full_name"
              label="Họ và tên"
              name="full_name"
              autoComplete="name"
              value={formData.full_name}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập họ và tên đầy đủ"
            />

            {/* Tên đăng nhập */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Tên đăng nhập"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập tên đăng nhập"
            />

            {/* Email */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập email"
            />
            
            {/* Mật khẩu */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập mật khẩu (ít nhất 8 ký tự)"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePassword}
                      edge="end"
                      disabled={loading}
                    >
                      {!showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Xác nhận mật khẩu */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Xác nhận mật khẩu"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập lại mật khẩu"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleToggleConfirmPassword}
                      edge="end"
                      disabled={loading}
                    >
                      {!showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Thông tin bổ sung (tùy chọn) */}
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              sx={{ mt: 3, mb: 1 }}
            >
              Thông tin bổ sung (không bắt buộc)
            </Typography>

            {/* Số điện thoại */}
            <TextField
              margin="normal"
              fullWidth
              id="phone"
              label="Số điện thoại"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập số điện thoại"
            />

            {/* CMND/CCCD */}
            <TextField
              margin="normal"
              fullWidth
              id="id_card"
              label="CMND/CCCD"
              name="id_card"
              value={formData.id_card}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập số CMND/CCCD"
            />

            {/* Địa chỉ */}
            <TextField
              margin="normal"
              fullWidth
              id="address"
              label="Địa chỉ"
              name="address"
              multiline
              rows={3}
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
              placeholder="Nhập địa chỉ"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2,
                py: 1.5,
                position: 'relative'
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Đăng ký'
              )}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Đã có tài khoản?{' '}
                <Link
                  component="button"
                  type="button"
                  variant="body2"
                  onClick={handleLoginClick}
                  sx={{
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                  disabled={loading}
                >
                  Đăng nhập ngay
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
