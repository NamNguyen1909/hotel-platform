import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Hotel as HotelIcon,
  BookOnline as BookingIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import api, { endpoints } from '../services/apis';

const Analytics = () => {
  // States
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalCustomers: 0,
    occupancyRate: 0,
    monthlyRevenue: [],
    topRooms: [],
    recentBookings: []
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [alert, setAlert] = useState({ open: false, type: 'success', message: '' });

  // Available years for selection
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'Tháng 1' }, { value: 2, label: 'Tháng 2' }, { value: 3, label: 'Tháng 3' },
    { value: 4, label: 'Tháng 4' }, { value: 5, label: 'Tháng 5' }, { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' }, { value: 8, label: 'Tháng 8' }, { value: 9, label: 'Tháng 9' },
    { value: 10, label: 'Tháng 10' }, { value: 11, label: 'Tháng 11' }, { value: 12, label: 'Tháng 12' }
  ];

  useEffect(() => {
    loadStats();
  }, [selectedYear, selectedMonth]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const url = `${endpoints.stats.overview}?year=${selectedYear}&month=${selectedMonth}`;
      console.log('Loading stats from:', url); // Debug log
      const response = await api.get(url);
      console.log('Stats data received:', response.data); // Debug log
      setStatsData(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      console.error('Error details:', error.response?.data || error.message);
      showAlert('error', 'Không thể tải dữ liệu thống kê từ server');
      
      // Đặt về trạng thái trống thay vì mock data
      setStatsData({
        totalRevenue: 0,
        totalBookings: 0,
        totalCustomers: 0,
        occupancyRate: 0,
        monthlyRevenue: [],
        topRooms: [],
        recentBookings: []
      });
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ open: true, type, message });
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '0₫';
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const StatCard = ({ title, value, icon, color, trend, trendValue, tooltip }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            backgroundColor: color + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {React.cloneElement(icon, { sx: { color: color, fontSize: 32 } })}
          </Box>
          {trend && (
            <Chip
              size="small"
              icon={trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${trendValue || 0}%`}
              color={trend === 'up' ? 'success' : 'error'}
              variant="outlined"
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: color, mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" title={tooltip}>
          {title}
          {tooltip && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
              💡 {tooltip}
            </Typography>
          )}
        </Typography>
      </CardContent>
    </Card>
  );

  // Simple chart component using CSS
  const SimpleBarChart = ({ data, height = 350 }) => {
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const chartAreaHeight = height - 120; // Giảm khoảng cách cho labels
    
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', textAlign: 'center' }}>
          Doanh thu theo tháng ({selectedYear})
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'end', 
          gap: 1, 
          height: chartAreaHeight,
          px: 2,
          pb: 2
        }}>
          {data.map((item, index) => {
            const barHeight = maxRevenue > 0 ? (item.revenue / maxRevenue) * (chartAreaHeight - 80) : 0;
            const hasData = item.revenue > 0;
            
            return (
              <Box 
                key={index} 
                sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  minWidth: 0 // Prevent flex item from growing too much
                }}
              >
                {/* Revenue amount on top */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mb: 1, 
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    color: hasData ? 'primary.main' : 'text.disabled',
                    minHeight: '20px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {hasData ? formatCurrency(item.revenue) : '0đ'}
                </Typography>
                
                {/* Bar */}
                <Box
                  sx={{
                    width: '80%',
                    height: Math.max(barHeight, 4), // Minimum height 4px
                    background: hasData 
                      ? (theme) => `linear-gradient(to top, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                      : (theme) => theme.palette.grey[300],
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: hasData ? 'scale(1.05)' : 'none',
                      boxShadow: hasData ? 2 : 0
                    },
                    mb: 1
                  }}
                  title={`${item.month}: ${formatCurrency(item.revenue)} - ${item.bookings} đơn`}
                />
                
                {/* Month label */}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'bold',
                    mb: 0.5,
                    color: 'text.primary'
                  }}
                >
                  {item.month}
                </Typography>
                
                {/* Bookings count */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.7rem',
                    textAlign: 'center'
                  }}
                >
                  {item.bookings || 0} đơn
                </Typography>
              </Box>
            );
          })}
        </Box>
        
        {/* Legend */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            💡 Hover vào cột để xem chi tiết
          </Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Card sx={{ 
        mb: 3, 
        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        color: 'white'
      }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 1, 
                  textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  color: '#E8F5E8',
                  letterSpacing: '-0.5px'
                }}
              >
                <AnalyticsIcon sx={{ 
                  mr: 2, 
                  verticalAlign: 'middle', 
                  fontSize: 40,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }} />
                Thống kê & Báo cáo
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                  opacity: 0.95,
                  color: '#F0F8F0',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                Phân tích doanh thu và hiệu suất hoạt động khách sạn
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'white' }}>Năm</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      label="Năm"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                        '& .MuiSvgIcon-root': { color: 'white' }
                      }}
                    >
                      {years.map(year => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: 'white' }}>Tháng</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      label="Tháng"
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                        '& .MuiSvgIcon-root': { color: 'white' }
                      }}
                    >
                      {months.map(month => (
                        <MenuItem key={month.value} value={month.value}>{month.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Đang tải dữ liệu thống kê từ server...
            </Typography>
          </Box>
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(statsData.totalRevenue || 0)}
            icon={<MoneyIcon />}
            color="#2E8B57"
            trend={statsData.totalRevenue > 0 ? "up" : null}
            trendValue={statsData.totalRevenue > 0 ? "12.5" : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tổng đặt phòng"
            value={statsData.totalBookings || 0}
            icon={<BookingIcon />}
            color="#FF8C00"
            trend={statsData.totalBookings > 0 ? "up" : null}
            trendValue={statsData.totalBookings > 0 ? "8.3" : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Khách hàng"
            value={statsData.totalCustomers || 0}
            icon={<PeopleIcon />}
            color="#8B4513"
            trend={statsData.totalCustomers > 0 ? "up" : null}
            trendValue={statsData.totalCustomers > 0 ? "15.2" : null}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tỷ lệ lấp đầy"
            value={`${statsData.occupancyRate || 0}%`}
            icon={<HotelIcon />}
            color="#DAA520"
            trend={statsData.occupancyRate > 50 ? "up" : statsData.occupancyRate > 0 ? "down" : null}
            trendValue={statsData.occupancyRate > 0 ? "2.1" : null}
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 500 }}>
            {statsData.monthlyRevenue && statsData.monthlyRevenue.length > 0 ? (
              <SimpleBarChart data={statsData.monthlyRevenue} height={460} />
            ) : (
              <Box sx={{ 
                height: 460, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2
              }}>
                <AnalyticsIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                <Typography variant="h6" color="text.secondary">
                  Chưa có dữ liệu doanh thu
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Dữ liệu sẽ hiển thị khi có booking được thanh toán thành công
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Năm: {selectedYear} | Tháng: {selectedMonth}
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 500 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Top phòng theo doanh thu
              </Typography>
              {statsData.topRooms && statsData.topRooms.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {statsData.topRooms.map((room, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        label={`#${index + 1}`}
                        size="small"
                        color={index === 0 ? 'warning' : index === 1 ? 'default' : 'default'}
                        sx={{ minWidth: 35 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          Phòng {room.room_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {room.bookings || 0} lượt đặt
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(room.revenue || 0)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <HotelIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Chưa có dữ liệu phòng
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Thống kê sẽ hiển thị khi có booking
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Bookings Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Đặt phòng gần đây
          </Typography>
          {statsData.recentBookings && statsData.recentBookings.length > 0 ? (
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Mã đặt phòng
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Khách hàng
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Phòng
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Tổng tiền
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      Ngày đặt
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statsData.recentBookings.map((booking) => (
                    <TableRow key={booking.id} hover>
                      <TableCell>
                        <Chip 
                          label={`#${booking.id}`} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {booking.customer_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={booking.room_number || 'N/A'} 
                          size="small" 
                          color="secondary"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {formatCurrency(booking.total_price || 0)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(booking.created_at)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BookingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Chưa có dữ liệu đặt phòng
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Danh sách sẽ hiển thị khi có booking mới
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

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
          variant="filled"
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Analytics;
