import React from 'react';
import { People as PeopleIcon } from '@mui/icons-material';
import UserList from '../components/UserList';

const CustomersManagement = () => {
  return (
    <UserList
      userType="customer"
      title="Quản lý khách hàng"
      description="Quản lý thông tin và tài khoản khách hàng"
      icon={<PeopleIcon />}
      showCustomerType={true}
      showStats={true}
    />
  );
};

export default CustomersManagement;
