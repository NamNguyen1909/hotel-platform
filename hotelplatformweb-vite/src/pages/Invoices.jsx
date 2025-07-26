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
import api from '../services/apis';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await api.get('/payments/');
        setInvoices(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError('Không thể tải danh sách hóa đơn. Vui lòng thử lại sau.');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontFamily: 'Inter', color: '#8B4513', fontWeight: 700 }}
        >
          Quản Lý Hóa Đơn
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: '#DAA520' }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : !Array.isArray(invoices) || invoices.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Chưa có hóa đơn nào.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {invoices.map((invoice) => (
              <Grid item xs={12} sm={6} md={4} key={invoice.id}>
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
                      Hóa đơn #{invoice.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Khách hàng: {invoice.customer_detail?.full_name || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Số tiền: {parseFloat(invoice.amount).toLocaleString('vi-VN')} VND
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Trạng thái: {invoice.status ? 'Đã thanh toán' : 'Chưa thanh toán'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter' }}>
                      Ngày thanh toán: {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('vi-VN') : 'N/A'}
                    </Typography>
                    {!invoice.status && (
                      <Button
                        variant="contained"
                        sx={{
                          mt: 2,
                          bgcolor: '#DAA520',
                          '&:hover': { bgcolor: '#B8860B' },
                          fontFamily: 'Inter',
                        }}
                        onClick={() => navigate(`/invoice/${invoice.id}`)}
                      >
                        Xem Chi Tiết
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            <Button
              variant="contained"
              sx={{ bgcolor: '#DAA520', '&:hover': { bgcolor: '#B8860B' }, mt: 2 }}
              onClick={() => navigate('/create-invoice')}
            >
              Tạo Hóa Đơn
            </Button>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default Invoices;
