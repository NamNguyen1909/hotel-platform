import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Rooms from './pages/Rooms';
import MyBookings from './pages/MyBookings';
import Payments from './pages/Payments';
import RoomsManagement from './pages/RoomsManagement';
import CustomersManagement from './pages/CustomersManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import Bookings from './pages/Bookings';
import Invoices from './pages/Invoices';
import Analytics from './pages/Analytics';
import RoomDetail from './pages/RoomDetail';
import BookingForm from './pages/BookingForm';
import InvoiceDetail from './pages/InvoiceDetail';
import PaymentResult from './pages/PaymentResult';

const AppContent = () => {
  const location = useLocation();
  
  const hideHeaderFooterRoutes = ['/login', '/register'];
  const shouldShowHeaderFooter = !hideHeaderFooterRoutes.includes(location.pathname);

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh' 
    }}>
      {shouldShowHeaderFooter && <Header />}
      <Box sx={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/rooms-management" element={<RoomsManagement />} />
          <Route path="/staffs-management" element={<EmployeeManagement />} />
          <Route path="/customers-management" element={<CustomersManagement />} />
          <Route path="/staff/bookings" element={<Bookings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/rooms/:id" element={<RoomDetail />} />
          <Route path="/book" element={<BookingForm />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoice/:id" element={<InvoiceDetail />} />
          <Route path="/payment-result" element={<PaymentResult />} />
        </Routes>
      </Box>
      {shouldShowHeaderFooter && <Footer />}
    </Box>
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