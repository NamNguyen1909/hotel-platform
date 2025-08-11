import React from 'react';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import UserList from '../components/UserList.jsx';

const StaffsManagement = () => {
  return (
    <UserList
      userType="staff"
      title="Quản lý nhân viên"
      description="Quản lý thông tin và tài khoản nhân viên"
      icon={<AdminIcon />}
      showCustomerType={false}
      showStats={false}
    />
  );
};

export default StaffsManagement;
