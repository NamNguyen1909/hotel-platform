// InvoiceDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Grid,
} from '@mui/material';
import { QRCodeCanvas } from 'qrcode.react'; // Use named import
import api from '../services/apis';
import authUtils from '../services/auth';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // Add success state
  const [paymentUrl, setPaymentUrl] = useState(null);

  // Kiểm tra quyền nhân viên
  useEffect(() => {
    const checkPermission = async () => {
      const user = await authUtils.getCurrentUser();
      if (!['staff', 'admin', 'owner'].includes(user?.role)) {
        setError('Bạn không có quyền xem hóa đơn.');
        navigate('/');
      }
    };
    if (authUtils.isAuthenticated()) {
      checkPermission();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Lấy chi tiết hóa đơn
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await api.get(`/payments/${id}/`);
        setInvoice(response.data);
        setLoading(false);
      } catch (err) {
        setError('Không thể tải chi tiết hóa đơn.');
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  // Tạo URL thanh toán VNPay
  const handleGeneratePaymentUrl = async () => {
    try {
      const response = await api.get(`/vnpay/create-payment/?amount=${invoice.amount}`);
      setPaymentUrl(response.data.payment_url);
    } catch (err) {
      setError('Không thể tạo mã QR thanh toán.');
    }
  };

  // In hóa đơn
  const handlePrint = () => {
    window.print();
  };

  // Xử lý callback từ VNPay
  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.vnp_ResponseCode === '00') {
          setSuccess('Thanh toán thành công!');
          setInvoice((prev) => ({ ...prev, status: true, paid_at: new Date() }));
        } else {
          setError(data.message || 'Thanh toán thất bại.');
        }
      } catch (err) {
        console.error('Error parsing VNPay response:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (loading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
  }

  if (!invoice) {
    return <Typography sx={{ m: 4 }}>Không tìm thấy hóa đơn.</Typography>;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#8B4513' }}>
        Hóa Đơn #{invoice.id}
      </Typography>

      {success && <Alert severity="success" sx={{ m: 4 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1">
              <strong>Khách hàng:</strong> {invoice.customer_detail?.full_name || 'N/A'}
            </Typography>
            <Typography variant="body1">
              <strong>Email:</strong> {invoice.customer_detail?.email || 'N/A'}
            </Typography>
            <Typography variant="body1">
              <strong>Số điện thoại:</strong> {invoice.customer_detail?.phone || 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1">
              <strong>Số tiền:</strong> {parseFloat(invoice.amount).toLocaleString('vi-VN')} VND
            </Typography>
            <Typography variant="body1">
              <strong>Trạng thái:</strong> {invoice.status ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </Typography>
            <Typography variant="body1">
              <strong>Ngày thanh toán:</strong>{' '}
              {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('vi-VN') : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1">
              <strong>Chi tiết thuê phòng:</strong>
            </Typography>
            <Typography variant="body2">
              Check-in: {new Date(invoice.rental_detail.check_in_date).toLocaleDateString('vi-VN')}
            </Typography>
            <Typography variant="body2">
              Check-out: {new Date(invoice.rental_detail.check_out_date).toLocaleDateString('vi-VN')}
            </Typography>
            <Typography variant="body2">
              Số khách: {invoice.rental_detail.guest_count}
            </Typography>
          </Grid>
        </Grid>

        {!invoice.status && (
          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              sx={{ bgcolor: '#DAA520', '&:hover': { bgcolor: '#B8860B' } }}
              onClick={handleGeneratePaymentUrl}
            >
              Tạo Mã QR Thanh Toán
            </Button>
            {paymentUrl && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body1">Quét mã QR để thanh toán:</Typography>
                <QRCodeCanvas value={paymentUrl} size={200} />
              </Box>
            )}
          </Box>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            sx={{ bgcolor: '#DAA520', '&:hover': { bgcolor: '#B8860B' } }}
            onClick={handlePrint}
          >
            In Hóa Đơn
          </Button>
          <Button
            variant="outlined"
            sx={{ ml: 2, borderColor: '#DAA520', color: '#DAA520' }}
            onClick={() => navigate('/invoices')}
          >
            Quay Lại
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default InvoiceDetail;