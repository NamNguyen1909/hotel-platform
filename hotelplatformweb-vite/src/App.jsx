
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Rooms from './pages/Rooms';
import MyBookings from './pages/MyBookings';
import Payments from './pages/Payments';
import RoomsManagement from './pages/RoomsManagement';
import StaffsManagement from './pages/StaffsManagement';
import CustomersManagement from './pages/CustomersManagement';
<<<<<<< Updated upstream
import Bookings from './pages/Bookings';
import Invoices from './pages/Invoices';
=======
import Analytics from './pages/Analytics';
>>>>>>> Stashed changes

// Component wrapper để check route và hiển thị header
const AppContent = () => {
  const location = useLocation();
  
  // Ẩn header ở trang login và register
  const hideHeaderRoutes = ['/login', '/register'];
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <>
      {shouldShowHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path='/profile' element={<Profile />} />
        <Route path="/rooms-management" element={<RoomsManagement />} />
        <Route path="/staffs-management" element={<StaffsManagement />} />
        <Route path="/customers-management" element={<CustomersManagement />} />
<<<<<<< Updated upstream
        <Route path="/staff/bookings" element={<Bookings />} />
        <Route path="/staff/invoices" element={<Invoices />} />
=======
        <Route path="/analytics" element={<Analytics />} />
>>>>>>> Stashed changes
        {/* Thêm các route khác nếu cần */}
      </Routes>
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
