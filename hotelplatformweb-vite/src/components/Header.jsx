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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/apis';
import authUtils from '../services/auth';

// Định nghĩa menu items theo role
const menuItemsByRole = {
  admin: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Quản lý phòng', icon: <Hotel />, path: '/rooms-management' },
    { text: 'Quản lý khách hàng', icon: <People />, path: '/customers-management' },
    { text: 'Quản lý nhân viên', icon: <AdminPanelSettings />, path: '/staffs-management' },
  ],
  owner: [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Thống kê', icon: <Assessment />, path: '/analytics' },
    { text: 'Quản lý phòng', icon: <Hotel />, path: '/rooms-management' },
    { text: 'Quản lý khách hàng', icon: <People />, path: '/customers-management' },
    { text: 'Quản lý nhân viên', icon: <AdminPanelSettings />, path: '/staffs-management' },
  ],
  staff: [
    { text: 'Phòng', icon: <Hotel />, path: '/rooms' },
    { text: 'Khách hàng', icon: <People />, path: '/customers-management' },
    { text: 'Đặt phòng', icon: <Book />, path: '/staff/bookings' },
    { text: 'Hóa đơn', icon: <Receipt />, path: '/staff/invoices' },
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
  const [notifications, setNotifications] = useState(0);

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
          setNotifications(0);
        }
      } else {
        setUser(null);
        setUserRole('guest');
        setNotifications(0);
      }
    };

    fetchUserInfo();
  }, []);

  // Polling để lấy thông báo mới - tối ưu hóa để giảm queries
  useEffect(() => {
    let intervalId;

    const fetchNotifications = async () => {
      if (authUtils.isAuthenticated()) {
        try {
          const response = await api.get('/notifications/');
          const unreadCount = response.data.unread_count || 0;
          setNotifications(unreadCount);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          setNotifications(0);
        }
      } else {
        setNotifications(0);
      }
    };

    // Chỉ setup polling khi user đã authenticated
    if (authUtils.isAuthenticated() && user) {
      fetchNotifications(); // Gọi ngay lần đầu
      intervalId = setInterval(fetchNotifications, 60000); // Polling mỗi 60 giây (tăng từ 30s để giảm tải)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId); // Dọn dẹp interval khi component unmount
      }
    };
  }, [user?.id]); // Chỉ re-run khi user ID thay đổi, không phải toàn bộ user object

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
    try {
      await authUtils.logout();
      setUser(null);
      setUserRole('guest');
      setNotifications(0);
      handleNavigation('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
    handleCloseUserMenu();
  };

  const handleNotificationsClick = async () => {
    if (authUtils.isAuthenticated()) {
      try {
        await api.post('/notifications/mark-all-read/');
        setNotifications(0);
        handleNavigation('/notifications');
      } catch (error) {
        console.error('Error marking notifications as read:', error);
        handleNavigation('/notifications');
      }
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
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" elevation={2}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Logo cho desktop */}
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
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              🏨 Hotel Platform
            </Typography>

            {/* Mobile menu button */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="menu"
                onClick={handleDrawerToggle}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
            </Box>

            {/* Logo cho mobile */}
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
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              🏨 Hotel
            </Typography>

            {/* Desktop menu */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  onClick={() => handleNavigation(item.path)}
                  startIcon={item.icon}
                  sx={{
                    my: 2,
                    mx: 1,
                    color: 'white',
                    display: 'block',
                    textTransform: 'none',
                    fontWeight: 500,
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

            {/* Right side - Notifications & User menu */}
            <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
              {authUtils.isAuthenticated() && (
                <Tooltip title="Thông báo">
                  <IconButton
                    size="large"
                    color="inherit"
                    onClick={handleNotificationsClick}
                    sx={{ mr: 1 }}
                  >
                    <Badge badgeContent={notifications} color="error">
                      <Notifications />
                    </Badge>
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Tài khoản">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  {user?.avatar ? (
                    <Avatar alt={user.username} src={user.avatar} />
                  ) : (
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
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
                    <Typography variant="subtitle1" fontWeight="bold">
                      {user.full_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                    <Typography variant="caption" color="primary.main" fontWeight="bold">
                      {userRole.toUpperCase()}
                    </Typography>
                  </Box>
                )}
                {userMenuItems.map((item, index) => (
                  <MenuItem key={index} onClick={item.action}>
                    <Typography textAlign="center">{item.text}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile drawer */}
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