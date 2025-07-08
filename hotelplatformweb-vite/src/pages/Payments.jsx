import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Button,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/payments/', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        setPayments(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError('Không thể tải danh sách thanh toán. Vui lòng thử lại sau.');
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const handlePayNow = async (paymentId) => {
    try {
      const response = await axios.get(`/vnpay/create-payment/?amount=${payments.find(p => p.id === paymentId).amount}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      window.location.href = response.data.payment_url;
    } catch (err) {
      console.error('Error creating payment URL:', err);
      setError('Không thể tạo link thanh toán. Vui lòng thử lại sau.');
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700 }}
        >
          Thanh Toán Của Tôi
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: '#DAA520' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : !Array.isArray(payments) || payments.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Bạn chưa có thanh toán nào.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {payments.map((payment) => (
              <Grid item xs={12} sm={6} md={4} key={payment.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s ease',
                    },
                  }}
                >
                  <CardContent>
                    <Typography
                      gutterBottom
                      variant="h5"
                      component="div"
                      sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 600 }}
                    >
                      Thanh toán #{payment.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Số tiền: {parseFloat(payment.amount).toLocaleString('vi-VN')} VND
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Phương thức: {payment.payment_method === 'stripe' ? 'Stripe' :
                        payment.payment_method === 'vnpay' ? 'VNPay' : 'Tiền mặt'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Trạng thái: {payment.status ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Ngày thanh toán: {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('vi-VN') : 'N/A'}
                    </Typography>
                    {!payment.status && (
                      <Button
                        variant="contained"
                        sx={{
                          mt: 2,
                          bgcolor: '#DAA520',
                          '&:hover': { bgcolor: '#B8860B' },
                          fontFamily: 'Inter',
                        }}
                        onClick={() => handlePayNow(payment.id)}
                      >
                        Thanh Toán Ngay
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Payments;