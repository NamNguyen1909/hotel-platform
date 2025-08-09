import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Discount as DiscountIcon,
  Payment as PaymentIcon,
  Hotel as HotelIcon,
  Person as PersonIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import api, { endpoints } from '../services/apis';

const CheckoutDialog = ({ open, onClose, bookingId, onCheckoutSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [selectedDiscountCode, setSelectedDiscountCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [priceCalculation, setPriceCalculation] = useState(null);

  // Load checkout info khi dialog mở
  useEffect(() => {
    if (open && bookingId) {
      fetchCheckoutInfo();
    }
  }, [open, bookingId]);

  // Tính lại giá khi thay đổi discount code
  useEffect(() => {
    if (checkoutInfo && bookingId) {
      calculatePrice();
    }
  }, [selectedDiscountCode, checkoutInfo]);

  const fetchCheckoutInfo = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(endpoints.bookings.checkoutInfo(bookingId));
      setCheckoutInfo(response.data);
      
      // Set default payment method
      if (response.data.payment_methods?.length > 0) {
        setPaymentMethod(response.data.payment_methods[0].value);
      }
      
    } catch (error) {
      console.error('Error fetching checkout info:', error);
      setError(error.response?.data?.error || 'Lỗi khi tải thông tin checkout');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async () => {
    try {
      const response = await api.post(endpoints.bookings.calculateCheckoutPrice(bookingId), {
        discount_code_id: selectedDiscountCode || null,
      });
      setPriceCalculation(response.data);
    } catch (error) {
      console.error('Error calculating price:', error);
      // Don't show error for price calculation, just show original price
      setPriceCalculation({
        original_price: checkoutInfo?.estimated_price || '0',
        final_price: checkoutInfo?.estimated_price || '0',
        discount_amount: '0',
        discount_percentage: '0',
      });
    }
  };

  const handleCheckout = async () => {
    try {
      setSubmitting(true);
      setError('');

      const response = await api.post(endpoints.bookings.checkout(bookingId), {
        payment_method: paymentMethod,
        discount_code_id: selectedDiscountCode || null,
      });

      // Handle VNPay URL response
      if (response.data.vnpay_url && paymentMethod === 'vnpay') {
        // Close dialog before redirecting to VNPay
        onClose();
        
        // Redirect to VNPay payment page
        window.location.href = response.data.vnpay_url;
        return;
      }

      // Handle other payment methods (cash/stripe) - no alerts, just success callback
      if (onCheckoutSuccess) {
        onCheckoutSuccess(response.data);
      }

      // Close dialog
      onClose();

    } catch (error) {
      console.error('Error during checkout:', error);
      setError(error.response?.data?.error || 'Lỗi trong quá trình checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString));
  };

  const getCustomerTypeLabel = (type) => {
    const types = {
      regular: 'Khách hàng thường',
      vip: 'Khách hàng VIP',
      premium: 'Khách hàng Premium',
    };
    return types[type] || type;
  };

  const getCustomerTypeColor = (type) => {
    const colors = {
      regular: 'default',
      vip: 'warning',
      premium: 'error',
    };
    return colors[type] || 'default';
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Đang tải thông tin checkout...</Typography>
        </DialogContent>
      </Dialog>
    );
  }

  if (!checkoutInfo) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Alert severity="error">Không thể tải thông tin checkout</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Đóng</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ReceiptIcon />
        Thanh toán Check-out
        <Button
          onClick={onClose}
          sx={{ ml: 'auto', minWidth: 'auto', p: 1 }}
          color="inherit"
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Customer Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6">Thông tin khách hàng</Typography>
                </Box>
                <Typography><strong>Tên:</strong> {checkoutInfo.customer.full_name}</Typography>
                <Typography><strong>Email:</strong> {checkoutInfo.customer.email}</Typography>
                <Typography><strong>Điện thoại:</strong> {checkoutInfo.customer.phone}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={getCustomerTypeLabel(checkoutInfo.customer.customer_type)}
                    color={getCustomerTypeColor(checkoutInfo.customer.customer_type)}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Booking Information */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <HotelIcon color="primary" />
                  <Typography variant="h6">Thông tin đặt phòng</Typography>
                </Box>
                <Typography><strong>Mã booking:</strong> #{checkoutInfo.booking.id}</Typography>
                <Typography><strong>Phòng:</strong> {checkoutInfo.booking.room_details?.map(r => r.room_number).join(', ')}</Typography>
                <Typography><strong>Check-in:</strong> {formatDate(checkoutInfo.rental.check_in_date)}</Typography>
                <Typography><strong>Check-out dự kiến:</strong> {formatDate(checkoutInfo.rental.check_out_date)}</Typography>
                <Typography><strong>Số khách:</strong> {checkoutInfo.booking.guest_count}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Discount Code Selection */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DiscountIcon color="primary" />
                  <Typography variant="h6">Mã giảm giá</Typography>
                </Box>
                <FormControl fullWidth>
                  <InputLabel>Chọn mã giảm giá (tùy chọn)</InputLabel>
                  <Select
                    value={selectedDiscountCode}
                    onChange={(e) => setSelectedDiscountCode(e.target.value)}
                    label="Chọn mã giảm giá (tùy chọn)"
                  >
                    <MenuItem value="">Không sử dụng mã giảm giá</MenuItem>
                    {checkoutInfo.available_discount_codes.map((code) => (
                      <MenuItem key={code.id} value={code.id}>
                        <Box>
                          <Typography variant="subtitle1">
                            {code.code} - {code.discount_percentage}% OFF
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Có hiệu lực đến {formatDate(code.valid_to)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Method */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PaymentIcon color="primary" />
                  <Typography variant="h6">Phương thức thanh toán</Typography>
                </Box>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Chọn phương thức thanh toán</FormLabel>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {checkoutInfo.payment_methods.map((method) => (
                      <FormControlLabel
                        key={method.value}
                        value={method.value}
                        control={<Radio />}
                        label={method.label}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* Price Breakdown */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Chi tiết thanh toán
                </Typography>
                
                {priceCalculation ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Tổng tiền phòng:</Typography>
                      <Typography>{formatCurrency(priceCalculation.original_price)}</Typography>
                    </Box>
                    
                    {priceCalculation.discount_amount > 0 && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                        <Typography>
                          Giảm giá ({priceCalculation.discount_percentage}%):
                        </Typography>
                        <Typography>
                          -{formatCurrency(priceCalculation.discount_amount)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">Tổng thanh toán:</Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(priceCalculation.final_price)}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Tổng tiền:</Typography>
                    <Typography>{formatCurrency(checkoutInfo.estimated_price)}</Typography>
                  </Box>
                )}

                {paymentMethod === 'cash' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Thanh toán bằng tiền mặt: Nhân viên sẽ xác nhận thanh toán trực tiếp với khách hàng.
                  </Alert>
                )}

                {paymentMethod === 'vnpay' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2" component="div">
                      <strong>Thanh toán VNPay:</strong><br />
                      • Hệ thống sẽ tạo hóa đơn chờ thanh toán<br />
                      • Vui lòng chuyển khoản theo thông tin và liên hệ lễ tân để xác nhận<br />
                      • Phòng sẽ được giải phóng sau khi thanh toán thành công
                    </Typography>
                  </Alert>
                )}

                {paymentMethod === 'stripe' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Thanh toán thẻ tín dụng: Xử lý thanh toán qua Stripe (Coming soon).
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Hủy
        </Button>
        <Button
          onClick={handleCheckout}
          variant="contained"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} /> : <PaymentIcon />}
        >
          {submitting ? 'Đang xử lý...' : `Thanh toán ${priceCalculation ? formatCurrency(priceCalculation.final_price) : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheckoutDialog;
