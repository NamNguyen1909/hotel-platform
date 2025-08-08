import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Card, CardContent, Grid, Chip, Button, Alert, Skeleton
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import api from '../services/apis';
import { endpoints } from '../services/apis';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(endpoints.invoices.detail(id));
        setInvoice(res.data);
        setError(null);
      } catch {
        setError('Không thể tải chi tiết hóa đơn. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="info">Không tìm thấy hóa đơn.</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ py: 8, backgroundColor: 'grey.100', minHeight: '100vh' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" align="center" sx={{ mb: 4 }}>
          Chi tiết Hóa Đơn #{invoice.id}
        </Typography>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ReceiptLongIcon fontSize="large" color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Hóa đơn #{invoice.id}</Typography>
              <Chip
                label={invoice.status ? 'Đã thanh toán' : 'Chưa thanh toán'}
                color={invoice.status ? 'success' : 'warning'}
                size="small"
                sx={{ ml: 'auto' }}
              />
            </Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Khách hàng: <strong>{invoice.customer_name || 'N/A'}</strong>
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              Ngày nhận phòng: <strong>{invoice.check_in_date ? new Date(invoice.check_in_date).toLocaleDateString('vi-VN') : 'N/A'}</strong>
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Ngày trả phòng: <strong>{invoice.check_out_date ? new Date(invoice.check_out_date).toLocaleDateString('vi-VN') : 'N/A'}</strong>
            </Typography>
            <Typography variant="h6" sx={{ mb: 2 }}>Chi tiết khoản phí</Typography>
            <Grid container spacing={2}>
              {(invoice.items || []).map(item => (
                <Grid item xs={12} key={item.room_id}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2">Phòng: <strong>{item.room_type || 'N/A'}</strong></Typography>
                    <Typography variant="body2">Giá cơ bản: <strong>{item.base_price ? item.base_price.toLocaleString('vi-VN') : 'N/A'} VND</strong></Typography>
                    <Typography variant="body2">Số ngày: <strong>{item.days || 'N/A'}</strong></Typography>
                    <Typography variant="body2">Phụ thu: <strong>{item.surcharge ? item.surcharge.toLocaleString('vi-VN') : '0'} VND</strong></Typography>
                    <Typography variant="body2">Tổng phụ: <strong>{item.subtotal ? item.subtotal.toLocaleString('vi-VN') : 'N/A'} VND</strong></Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Tổng tiền: <strong>{invoice.amount ? Number(invoice.amount).toLocaleString('vi-VN') : 'N/A'} VND</strong>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Ngày thanh toán: <strong>{invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('vi-VN') : '–'}</strong>
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/invoices')}
              sx={{ mt: 2 }}
            >
              Quay lại
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default InvoiceDetail;