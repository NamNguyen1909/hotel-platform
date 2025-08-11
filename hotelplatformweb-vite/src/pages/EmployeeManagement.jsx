import React from 'react';
import { Badge as BadgeIcon } from '@mui/icons-material';
import UserList from '../components/UserList';

const EmployeeManagement = () => {
  return (
    <UserList
      userType="staff"
      title="Quản lý nhân viên"
      description="Quản lý thông tin và tài khoản nhân viên"
      icon={<BadgeIcon />}
      showRole={true}
      showStats={true}
    />
  );
};

export default EmployeeManagement;
