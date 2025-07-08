import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const Dashboard = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1">
          Chào mừng bạn đến với trang quản lý khách sạn!
        </Typography>
      </Box>
    </Container>
  );
};

export default Dashboard;