import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  CheckCircle,
  Error,
  ArrowBack
} from '@mui/icons-material';

const PaymentResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Parse URL parameters để lấy kết quả thanh toán
    const urlParams = new URLSearchParams(location.search);
    const status = urlParams.get('status');
    const msg = urlParams.get('message');
    const bookingId = urlParams.get('booking_id');

    // Simulate loading time
    setTimeout(() => {
      setPaymentStatus(status);
      setMessage(msg || (status === 'success' ? 'Thanh toán thành công!' : 'Thanh toán thất bại!'));
      setLoading(false);
    }, 1500);

    // Auto redirect sau 5 giây
    const redirectTimer = setTimeout(() => {
      if (status === 'success') {
        navigate('/staff/bookings', { replace: true });
      } else {
        navigate('/staff/bookings', { replace: true });
      }
    }, 5000);

    return () => clearTimeout(redirectTimer);
  }, [location.search, navigate]);

  const handleGoBack = () => {
    navigate('/staff/bookings', { replace: true });
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Đang xử lý kết quả thanh toán...
        </Typography>
      </Box>
    );
  }

  const isSuccess = paymentStatus === 'success';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: 2
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 500, 
          width: '100%',
          textAlign: 'center',
          boxShadow: 3
        }}
      >
        <CardContent sx={{ padding: 4 }}>
          {/* Icon */}
          <Box sx={{ mb: 3 }}>
            {isSuccess ? (
              <CheckCircle 
                sx={{ 
                  fontSize: 80, 
                  color: 'success.main' 
                }} 
              />
            ) : (
              <Error 
                sx={{ 
                  fontSize: 80, 
                  color: 'error.main' 
                }} 
              />
            )}
          </Box>

          {/* Title */}
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ 
              color: isSuccess ? 'success.main' : 'error.main',
              fontWeight: 'bold'
            }}
          >
            {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại!'}
          </Typography>

          {/* Message */}
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 3,
              color: 'text.secondary',
              fontSize: '1.1rem'
            }}
          >
            {message}
          </Typography>

          {/* Alert */}
          <Alert 
            severity={isSuccess ? 'success' : 'error'} 
            sx={{ mb: 3, textAlign: 'left' }}
          >
            {isSuccess 
              ? 'Booking đã được xác nhận và thanh toán thành công. Bạn sẽ được chuyển hướng về trang quản lý booking.'
              : 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.'
            }
          </Alert>

          {/* Action Button */}
          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={handleGoBack}
            size="large"
            sx={{ 
              minWidth: 200,
              backgroundColor: isSuccess ? 'success.main' : 'primary.main',
              '&:hover': {
                backgroundColor: isSuccess ? 'success.dark' : 'primary.dark',
              }
            }}
          >
            Quay lại danh sách booking
          </Button>

          {/* Auto redirect notice */}
          <Typography 
            variant="caption" 
            display="block" 
            sx={{ 
              mt: 2,
              color: 'text.disabled'
            }}
          >
            Tự động chuyển hướng sau 5 giây...
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentResult;
