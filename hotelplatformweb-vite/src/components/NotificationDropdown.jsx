import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Chip,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive,
  Circle,
  CheckCircle,
  Info,
  Warning,
  Error,
  MarkEmailRead,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../services/apis';

const NotificationDropdown = ({ notificationCount, onNotificationUpdate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  
  // Refs for infinite scroll
  const scrollContainerRef = useRef(null);
  const loadingRef = useRef(false);

  const open = Boolean(anchorEl);

  // Mở dropdown notifications
  const handleClick = async (event) => {
    setAnchorEl(event.currentTarget);
    if (!open) {
      await loadNotifications(true); // Reset và fetch page đầu
    }
  };

  // Đóng dropdown
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Fetch notifications từ API
  const loadNotifications = useCallback(async (reset = false) => {
    if (loadingRef.current) {
      return; // Prevent duplicate calls
    }
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      const currentPage = reset ? 1 : page;
      const response = await api.get(`/notifications/?page=${currentPage}&limit=10`);
      
      const newNotifications = response.data.results || [];
      
      if (reset) {
        setNotifications(newNotifications);
        setPage(2);
      } else {
        setNotifications(prev => [...prev, ...newNotifications]);
        setPage(prev => prev + 1);
      }
      
      // Check hasMore using current_page vs total_pages
      const currentPageNum = response.data.current_page || currentPage;
      const totalPages = response.data.total_pages || 1;
      const newHasMore = currentPageNum < totalPages;
      
      setHasMore(newHasMore);
      
      // Cập nhật số lượng unread
      if (onNotificationUpdate) {
        onNotificationUpdate(response.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, onNotificationUpdate]);

  // Handle scroll event for infinite loading
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    // Calculate scroll progress
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) <= 50; // Within 50px of bottom
    
    // Load more when near bottom OR scrolled to 80% of content
    const shouldLoadMore = (isNearBottom || scrollPercentage >= 0.8) && hasMore && !loading && !loadingRef.current;
    
    if (shouldLoadMore) {
      loadNotifications();
    }
  }, [hasMore, loading, loadNotifications]);

  // Load more notifications (kept for compatibility)
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadNotifications();
    }
  };

  // Đánh dấu đã đọc một notification
  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/mark_as_read/`);
      
      // Cập nhật local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      
      // Cập nhật count
      if (onNotificationUpdate) {
        const unreadCount = notifications.filter(n => !n.is_read && n.id !== notificationId).length;
        onNotificationUpdate(unreadCount);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark_all_as_read/');
      
      // Cập nhật local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      
      // Reset count
      if (onNotificationUpdate) {
        onNotificationUpdate(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Xóa notification - REMOVED: Chức năng không cần thiết
  // const deleteNotification = async (notificationId) => {
  //   // Đã bỏ chức năng xóa notification
  // };

  // Icon theo loại notification
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_confirmation':
        return <CheckCircle color="success" />;
      case 'payment_success':
        return <CheckCircle color="primary" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  // Format thời gian
  const formatNotificationTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: vi
      });
    } catch (error) {
      return 'Vừa xong';
    }
  };

  return (
    <>
      {/* Notification Bell Icon */}
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          ml: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        }}
      >
        <Badge badgeContent={notificationCount} color="error">
          {notificationCount > 0 ? (
            <NotificationsActive />
          ) : (
            <NotificationsIcon />
          )}
        </Badge>
      </IconButton>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            overflow: 'visible',
            mt: 1.5,
            '& .MuiList-root': {
              padding: 0
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Thông báo
            </Typography>
            {notifications.some(n => !n.is_read) && (
              <Button
                size="small"
                onClick={markAllAsRead}
                startIcon={<MarkEmailRead />}
                sx={{ fontSize: '0.75rem' }}
              >
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </Box>
        </Box>

        {/* Notifications List */}
        <Box 
          ref={scrollContainerRef}
          sx={{ 
            maxHeight: 350, 
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#a8a8a8',
            },
          }}
          onScroll={handleScroll}
        >
          {loading && notifications.length === 0 ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box textAlign="center" p={3}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
              <Typography color="textSecondary">
                Không có thông báo nào
              </Typography>
            </Box>
          ) : (
            <List>
              {notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{
                      backgroundColor: notification.is_read ? 'transparent' : '#f3f4f6',
                      '&:hover': {
                        backgroundColor: '#f8f9fa'
                      },
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.light' }}>
                        {getNotificationIcon(notification.notification_type)}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            fontWeight: notification.is_read ? 400 : 600,
                            mr: 1
                          }}
                        >
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography 
                            variant="body2" 
                            color="textSecondary"
                            component="span"
                            sx={{ 
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              mb: 0.5
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <br />
                          <Typography 
                            variant="caption" 
                            color="textSecondary"
                            component="span"
                            sx={{ mr: 1 }}
                          >
                            {formatNotificationTime(notification.created_at)}
                          </Typography>
                          {!notification.is_read && (
                            <Circle sx={{ fontSize: 8, color: 'primary.main', verticalAlign: 'middle' }} />
                          )}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}

          {/* Loading indicator for infinite scroll */}
          {loading && hasMore && (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={20} />
              <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                Đang tải thêm...
              </Typography>
            </Box>
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationDropdown;
