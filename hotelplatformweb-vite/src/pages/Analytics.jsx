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
      const response = await api.get(`${endpoints.stats.overview}?year=${selectedYear}&month=${selectedMonth}`);
      setStatsData(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      showAlert('error', 'Lỗi khi tải dữ liệu thống kê');
      // Mock data for demo
      setStatsData({
        totalRevenue: 125650000,
        totalBookings: 89,
        totalCustomers: 234,
        occupancyRate: 78.5,
        monthlyRevenue: [
          { month: 'T1', revenue: 98500000, bookings: 67 },
          { month: 'T2', revenue: 112300000, bookings: 78 },
          { month: 'T3', revenue: 125650000, bookings: 89 },
          { month: 'T4', revenue: 134200000, bookings: 92 },
          { month: 'T5', revenue: 142100000, bookings: 95 },
          { month: 'T6', revenue: 156800000, bookings: 103 }
        ],
        topRooms: [
          { room_number: '101', bookings: 24, revenue: 36000000 },
          { room_number: '201', bookings: 22, revenue: 44000000 },
          { room_number: '301', bookings: 20, revenue: 50000000 },
          { room_number: '102', bookings: 18, revenue: 27000000 },
          { room_number: '202', bookings: 16, revenue: 32000000 }
        ],
        recentBookings: [
          { id: 1, customer_name: 'Nguyễn Văn A', room_number: '101', total_price: 1500000, created_at: '2024-12-20' },
          { id: 2, customer_name: 'Trần Thị B', room_number: '201', total_price: 2000000, created_at: '2024-12-19' },
          { id: 3, customer_name: 'Lê Văn C', room_number: '301', total_price: 2500000, created_at: '2024-12-18' },
          { id: 4, customer_name: 'Phạm Thị D', room_number: '102', total_price: 1500000, created_at: '2024-12-17' },
          { id: 5, customer_name: 'Hoàng Văn E', room_number: '202', total_price: 2000000, created_at: '2024-12-16' }
        ]
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
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const StatCard = ({ title, value, icon, color, trend, trendValue }) => (
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
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </CardContent>
    </Card>
  );

  // Simple chart component using CSS
  const SimpleBarChart = ({ data, height = 200 }) => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Doanh thu theo tháng ({selectedYear})
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'end', gap: 1, height: height }}>
        {data.map((item, index) => {
          const maxRevenue = Math.max(...data.map(d => d.revenue));
          const barHeight = (item.revenue / maxRevenue) * (height - 40);
          
          return (
            <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ mb: 1, fontWeight: 'bold' }}>
                {formatCurrency(item.revenue)}
              </Typography>
              <Box
                sx={{
                  width: '100%',
                  height: barHeight,
                  background: (theme) => `linear-gradient(to top, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  borderRadius: '4px 4px 0 0',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: 2
                  }
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, fontWeight: 'bold' }}>
                {item.month}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.bookings} đơn
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

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
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(statsData.totalRevenue)}
            icon={<MoneyIcon />}
            color="#2E8B57"
            trend="up"
            trendValue="12.5"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tổng đặt phòng"
            value={statsData.totalBookings}
            icon={<BookingIcon />}
            color="#FF8C00"
            trend="up"
            trendValue="8.3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Khách hàng"
            value={statsData.totalCustomers}
            icon={<PeopleIcon />}
            color="#8B4513"
            trend="up"
            trendValue="15.2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tỷ lệ lấp đầy"
            value={`${statsData.occupancyRate}%`}
            icon={<HotelIcon />}
            color="#DAA520"
            trend="down"
            trendValue="2.1"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <SimpleBarChart data={statsData.monthlyRevenue} />
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Top phòng theo doanh thu
              </Typography>
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
                        {room.bookings} lượt đặt
                      </Typography>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(room.revenue)}
                    </Typography>
                  </Box>
                ))}
              </Box>
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
                        {booking.customer_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={booking.room_number} 
                        size="small" 
                        color="secondary"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {formatCurrency(booking.total_price)}
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
