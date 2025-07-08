import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  Tooltip,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Notifications,
  Logout,
  Dashboard,
  Hotel,
  People,
  Book,
  Payment,
  Settings,
  Assessment,
  Home,
  PersonAdd,
  Login,
  AdminPanelSettings,
  RoomService,
  Receipt,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import authUtils from '../services/auth';

// Định nghĩa menu items theo role
const menuItemsByRole = {
  admin: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Quản lý phòng', icon: <Hotel />, path: '/rooms' },
    { text: 'Quản lý khách hàng', icon: <People />, path: '/customers' },
    { text: 'Đặt phòng', icon: <Book />, path: '/bookings' },
    { text: 'Thanh toán', icon: <Payment />, path: '/payments' },
    { text: 'Báo cáo', icon: <Assessment />, path: '/reports' },
    { text: 'Quản lý nhân viên', icon: <AdminPanelSettings />, path: '/staff' },
    { text: 'Cài đặt', icon: <Settings />, path: '/settings' },
  ],
  owner: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Quản lý phòng', icon: <Hotel />, path: '/rooms' },
    { text: 'Quản lý khách hàng', icon: <People />, path: '/customers' },
    { text: 'Đặt phòng', icon: <Book />, path: '/bookings' },
    { text: 'Thanh toán', icon: <Payment />, path: '/payments' },
    { text: 'Báo cáo', icon: <Assessment />, path: '/reports' },
    { text: 'Quản lý nhân viên', icon: <AdminPanelSettings />, path: '/staff' },
    { text: 'Cài đặt', icon: <Settings />, path: '/settings' },
  ],
  staff: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Phòng', icon: <Hotel />, path: '/rooms' },
    { text: 'Khách hàng', icon: <People />, path: '/customers' },
    { text: 'Đặt phòng', icon: <Book />, path: '/bookings' },
    { text: 'Dịch vụ', icon: <RoomService />, path: '/services' },
    { text: 'Hóa đơn', icon: <Receipt />, path: '/invoices' },
  ],
  customer: [
    { text: 'Trang chủ', icon: <Home />, path: '/' },
    { text: 'Phòng', icon: <Hotel />, path: '/rooms' },
    { text: 'Đặt phòng của tôi', icon: <Book />, path: '/my-bookings' },
    { text: 'Thanh toán', icon: <Payment />, path: '/payments' },
  ],
  guest: [
    { text: 'Trang chủ', icon: <Home />, path: '/' },
    { text: 'Phòng', icon: <Hotel />, path: '/rooms' },
    { text: 'Đăng nhập', icon: <Login />, path: '/login' },
    { text: 'Đăng ký', icon: <PersonAdd />, path: '/register' },
  ],
};

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorElUser, setAnchorElUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('guest');
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Lấy thông tin user và role
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (authUtils.isAuthenticated()) {
        try {
          const userData = await authUtils.getCurrentUser();
          setUser(userData);
          setUserRole(userData?.role || 'customer');
        } catch (error) {
          console.error('Error fetching user info:', error);
          setUserRole('guest');
        }
      } else {
        setUser(null);
        setUserRole('guest');
      }
    };

    fetchUserInfo();
  }, [location.pathname]);

  // Lấy danh sách thông báo
  useEffect(() => {
    const fetchNotifications = async () => {
      if (authUtils.isAuthenticated()) {
        try {
          const response = await axios.get('/api/notifications/', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const unreadNotifications = response.data.filter(notification => !notification.is_read);
          setNotifications(unreadNotifications);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      }
    };

    fetchNotifications();
  }, []);

  // Xử lý tìm kiếm
  const handleSearch = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/rooms?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
    handleCloseUserMenu();
  };

  const handleLogout = async () => {
    await authUtils.logout();
    handleCloseUserMenu();
    navigate('/login');
  };

  // Đánh dấu thông báo đã đọc
  const handleNotificationsClick = async () => {
    try {
      await axios.post('/api/notifications/mark_all_as_read/', {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setNotifications([]);
      handleNavigation('/notifications');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // Lấy menu items theo role hiện tại
  const menuItems = menuItemsByRole[userRole] || menuItemsByRole.guest;

  // User menu items
  const userMenuItems = authUtils.isAuthenticated()
    ? [
        { text: 'Hồ sơ', action: () => handleNavigation('/profile') },
        { text: 'Cài đặt', action: () => handleNavigation('/account-settings') },
        { text: 'Đăng xuất', action: handleLogout },
      ]
    : [
        { text: 'Đăng nhập', action: () => handleNavigation('/login') },
        { text: 'Đăng ký', action: () => handleNavigation('/register') },
      ];

  // Mobile drawer content
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, color: 'primary.main', fontWeight: 'bold' }}>
        🏨 Hotel Platform
      </Typography>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ px: 2, py: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm phòng..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mt: 1 }}
        />
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={2}
        sx={{
          background: 'linear-gradient(90deg, #8B4513 0%, #A0522D 100%)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Typography
              variant="h6"
              noWrap
              component="div"
              onClick={() => handleNavigation('/')}
              sx={{
                mr: 2,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'Inter',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#DAA520',
                textDecoration: 'none',
              }}
            >
              🏨 Hotel Platform
            </Typography>

            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="menu"
                onClick={handleDrawerToggle}
                color="inherit"
              >
                <MenuIcon sx={{ color: '#DAA520' }} />
              </IconButton>
            </Box>

            <Typography
              variant="h5"
              noWrap
              component="div"
              onClick={() => handleNavigation('/')}
              sx={{
                mr: 2,
                display: { xs: 'flex', md: 'none' },
                flexGrow: 1,
                fontFamily: 'Inter',
                fontWeight: 700,
                cursor: 'pointer',
                color: '#DAA520',
                textDecoration: 'none',
              }}
            >
              🏨 Hotel
            </Typography>

            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, mr: 2 }}>
              <TextField
                variant="outlined"
                placeholder="Tìm kiếm phòng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#DAA520' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  maxWidth: 300,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: 1,
                  '& .MuiInputBase-input': {
                    color: '#DAA520',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                }}
              />
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  onClick={() => handleNavigation(item.path)}
                  startIcon={item.icon}
                  sx={{
                    my: 2,
                    mx: 1,
                    color: '#DAA520',
                    display: 'block',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontFamily: 'Inter',
                    backgroundColor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>

            <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
              {authUtils.isAuthenticated() && (
                <Tooltip title="Thông báo">
                  <IconButton
                    size="large"
                    color="inherit"
                    onClick={handleNotificationsClick}
                    sx={{ mr: 1 }}
                  >
                    <Badge badgeContent={notifications.length} color="error">
                      <Notifications sx={{ color: '#DAA520' }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Tài khoản">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  {user?.avatar ? (
                    <Avatar alt={user.full_name} src={user.avatar} />
                  ) : (
                    <Avatar sx={{ bgcolor: '#DAA520' }}>
                      {user?.full_name?.charAt(0)?.toUpperCase() || <AccountCircle />}
                    </Avatar>
                  )}
                </IconButton>
              </Tooltip>

              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                {user && (
                  <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #eee' }}>
                    <Typography variant="subtitle1" fontWeight="bold" fontFamily="Inter">
                      {user.full_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                    <Typography variant="caption" color="primary.main" fontWeight="bold" fontFamily="Inter">
                      {userRole.toUpperCase()}
                    </Typography>
                  </Box>
                )}
                {userMenuItems.map((item, index) => (
                  <MenuItem key={index} onClick={item.action}>
                    <Typography textAlign="center" fontFamily="Inter">{item.text}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            background: 'linear-gradient(145deg, #ffffff 0%, #fefefe 100%)',
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Header;