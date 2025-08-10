import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';

const StaffsManagementSimple = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AdminIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Quản lý nhân viên
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Trang quản lý nhân viên đang được phát triển...
        </Typography>
      </Paper>
    </Box>
  );
};

export default StaffsManagementSimple;
