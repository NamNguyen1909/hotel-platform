// Cấu hình Material UI cho Hotel Management System
// Sử dụng font Inter (sans-serif) để tạo UI gọn gàng, hiện đại và dễ đọc
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#8B4513', // Nâu gỗ sang trọng - màu chủ đạo cho khách sạn
      light: '#A0522D',
      dark: '#654321',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#DAA520', // Vàng gold - tạo điểm nhấn sang trọng
      light: '#FFD700',
      dark: '#B8860B',
      contrastText: '#000000',
    },
    success: {
      main: '#2E8B57', // Xanh lá tự nhiên
      light: '#3CB371',
      dark: '#228B22',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#FF8C00', // Cam ấm áp
      light: '#FFA500',
      dark: '#FF7F00',
      contrastText: '#ffffff',
    },
    error: {
      main: '#DC143C', // Đỏ tươi nhưng không quá chói
      light: '#FF1493',
      dark: '#B22222',
      contrastText: '#ffffff',
    },
    background: {
      default: '#FFF8DC', // Kem nhẹ - tạo cảm giác ấm cúng
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2F4F4F', // Xám đậm thay vì đen thuần
      secondary: '#696969',
    },
    // Thêm màu tùy chỉnh cho khách sạn
    neutral: {
      main: '#F5F5DC', // Beige nhẹ
      light: '#FFFAF0',
      dark: '#D2B48C',
    },
  },
  typography: {
    fontFamily: [
      'Inter', // Font sans-serif hiện đại và sang trọng
      'Roboto', 
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      color: '#8B4513',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '2rem',
      color: '#8B4513',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      color: '#8B4513',
      letterSpacing: '-0.01em',
    },
    h4: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      color: '#8B4513',
      letterSpacing: '-0.005em',
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.95rem',
    },
  },
  shape: {
    borderRadius: 12, // Bo tròn nhiều hơn để tạo cảm giác mềm mại
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(139, 69, 19, 0.1)',
    '0px 4px 8px rgba(139, 69, 19, 0.15)',
    '0px 8px 16px rgba(139, 69, 19, 0.2)',
    // Thêm các shadow khác với màu nâu nhẹ
  ],
  components: {
    // Tùy chỉnh component Button
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '12px 28px',
          fontSize: '0.95rem',
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
          boxShadow: '0 4px 12px rgba(139, 69, 19, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #A0522D 0%, #8B4513 100%)',
            boxShadow: '0 6px 20px rgba(139, 69, 19, 0.4)',
          },
        },
        outlined: {
          borderColor: '#8B4513',
          color: '#8B4513',
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: 'rgba(139, 69, 19, 0.04)',
          },
        },
      },
    },
    
    // Tùy chỉnh component Paper cho card sang trọng
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(139, 69, 19, 0.12)',
          background: 'linear-gradient(145deg, #ffffff 0%, #fefefe 100%)',
          border: '1px solid rgba(218, 165, 32, 0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 12px 48px rgba(139, 69, 19, 0.18)',
            transform: 'translateY(-4px)',
          },
        },
        elevation1: {
          boxShadow: '0 4px 16px rgba(139, 69, 19, 0.08)',
        },
        elevation3: {
          boxShadow: '0 8px 32px rgba(139, 69, 19, 0.12)',
        },
      },
    },
    
    // Tùy chỉnh component TextField
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#fafafa',
            transition: 'all 0.3s ease-in-out',
            '& fieldset': {
              borderColor: 'rgba(139, 69, 19, 0.23)',
              borderWidth: '1.5px',
            },
            '&:hover fieldset': {
              borderColor: '#8B4513',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8B4513',
              borderWidth: '2px',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#696969',
            '&.Mui-focused': {
              color: '#8B4513',
            },
          },
        },
      },
    },
    
    // Tùy chỉnh AppBar cho header
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #DAA520 100%)',
          boxShadow: '0 4px 20px rgba(139, 69, 19, 0.3)',
        },
      },
    },
    
    // Tùy chỉnh Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        standardError: {
          backgroundColor: '#FFF5F5',
          color: '#DC143C',
          border: '1px solid rgba(220, 20, 60, 0.2)',
        },
        standardSuccess: {
          backgroundColor: '#F0FFF4',
          color: '#2E8B57',
          border: '1px solid rgba(46, 139, 87, 0.2)',
        },
        standardWarning: {
          backgroundColor: '#FFFAF0',
          color: '#FF8C00',
          border: '1px solid rgba(255, 140, 0, 0.2)',
        },
      },
    },
    
    // Tùy chỉnh Card
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(139, 69, 19, 0.12)',
          border: '1px solid rgba(218, 165, 32, 0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 12px 48px rgba(139, 69, 19, 0.18)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    
    // Tùy chỉnh Container
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '24px',
          paddingRight: '24px',
        },
      },
    },
  },
});

export default theme;