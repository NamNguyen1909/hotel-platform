import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  Avatar
} from '@mui/material';
import {
  Hotel as HotelIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const managementCards = [
    {
      title: 'Quản Lý Phòng',
      description: 'Quản lý thông tin phòng, hình ảnh và trạng thái',
      icon: <HotelIcon />,
      color: 'primary.main',
      path: '/rooms-management'
    },
    {
      title: 'Quản Lý Nhân Viên',
      description: 'Quản lý thông tin nhân viên và quyền truy cập',
      icon: <PeopleIcon />,
      color: 'success.main',
      path: '/staffs-management'
    },
    {
      title: 'Quản Lý Khách Hàng',
      description: 'Quản lý thông tin và tài khoản khách hàng',
      icon: <PeopleIcon />,
      color: 'secondary.main',
      path: '/customers-management'
    },
    {
      title: 'Thống Kê',
      description: 'Xem báo cáo doanh thu và thống kê hoạt động',
      icon: <AnalyticsIcon />,
      color: 'warning.main',
      path: '/analytics'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard Quản Lý
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Chào mừng bạn đến với hệ thống quản lý khách sạn!
        </Typography>

        <Grid container spacing={3}>
          {managementCards.map((card, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
                onClick={() => navigate(card.path)}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      bgcolor: card.color,
                      width: 56,
                      height: 56,
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(card.path);
                    }}
                  >
                    Truy cập
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;