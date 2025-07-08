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
    '0px 2px 1px -1px rgba(139, 69, 19, 0.2),0px 1px 1px 0px rgba(139, 69, 19, 0.14),0px 1px 3px 0px rgba(139, 69, 19, 0.12)',
    '0px 3px 1px -2px rgba(139, 69, 19, 0.2),0px 2px 2px 0px rgba(139, 69, 19, 0.14),0px 1px 5px 0px rgba(139, 69, 19, 0.12)',
    '0px 3px 3px -2px rgba(139, 69, 19, 0.2),0px 3px 4px 0px rgba(139, 69, 19, 0.14),0px 1px 8px 0px rgba(139, 69, 19, 0.12)',
    '0px 2px 4px -1px rgba(139, 69, 19, 0.2),0px 4px 5px 0px rgba(139, 69, 19, 0.14),0px 1px 10px 0px rgba(139, 69, 19, 0.12)',
    '0px 3px 5px -1px rgba(139, 69, 19, 0.2),0px 5px 8px 0px rgba(139, 69, 19, 0.14),0px 1px 14px 0px rgba(139, 69, 19, 0.12)',
    '0px 3px 5px -1px rgba(139, 69, 19, 0.2),0px 6px 10px 0px rgba(139, 69, 19, 0.14),0px 1px 18px 0px rgba(139, 69, 19, 0.12)',
    '0px 4px 5px -2px rgba(139, 69, 19, 0.2),0px 7px 10px 1px rgba(139, 69, 19, 0.14),0px 2px 16px 1px rgba(139, 69, 19, 0.12)',
    '0px 5px 5px -3px rgba(139, 69, 19, 0.2),0px 8px 10px 1px rgba(139, 69, 19, 0.14),0px 3px 14px 2px rgba(139, 69, 19, 0.12)',
    '0px 5px 6px -3px rgba(139, 69, 19, 0.2),0px 9px 12px 1px rgba(139, 69, 19, 0.14),0px 3px 16px 2px rgba(139, 69, 19, 0.12)',
    '0px 6px 6px -3px rgba(139, 69, 19, 0.2),0px 10px 14px 1px rgba(139, 69, 19, 0.14),0px 4px 18px 3px rgba(139, 69, 19, 0.12)',
    '0px 6px 7px -4px rgba(139, 69, 19, 0.2),0px 11px 15px 1px rgba(139, 69, 19, 0.14),0px 4px 20px 3px rgba(139, 69, 19, 0.12)',
    '0px 7px 8px -4px rgba(139, 69, 19, 0.2),0px 12px 17px 2px rgba(139, 69, 19, 0.14),0px 5px 22px 4px rgba(139, 69, 19, 0.12)',
    '0px 7px 8px -4px rgba(139, 69, 19, 0.2),0px 13px 19px 2px rgba(139, 69, 19, 0.14),0px 5px 24px 4px rgba(139, 69, 19, 0.12)',
    '0px 7px 9px -4px rgba(139, 69, 19, 0.2),0px 14px 21px 2px rgba(139, 69, 19, 0.14),0px 5px 26px 4px rgba(139, 69, 19, 0.12)',
    '0px 8px 9px -5px rgba(139, 69, 19, 0.2),0px 15px 22px 2px rgba(139, 69, 19, 0.14),0px 6px 28px 5px rgba(139, 69, 19, 0.12)',
    '0px 8px 10px -5px rgba(139, 69, 19, 0.2),0px 16px 24px 2px rgba(139, 69, 19, 0.14),0px 6px 30px 5px rgba(139, 69, 19, 0.12)',
    '0px 8px 11px -5px rgba(139, 69, 19, 0.2),0px 17px 26px 2px rgba(139, 69, 19, 0.14),0px 6px 32px 5px rgba(139, 69, 19, 0.12)',
    '0px 9px 11px -5px rgba(139, 69, 19, 0.2),0px 18px 28px 2px rgba(139, 69, 19, 0.14),0px 7px 34px 6px rgba(139, 69, 19, 0.12)',
    '0px 9px 12px -6px rgba(139, 69, 19, 0.2),0px 19px 29px 2px rgba(139, 69, 19, 0.14),0px 7px 36px 6px rgba(139, 69, 19, 0.12)',
    '0px 10px 13px -6px rgba(139, 69, 19, 0.2),0px 20px 31px 3px rgba(139, 69, 19, 0.14),0px 8px 38px 7px rgba(139, 69, 19, 0.12)',
    '0px 10px 13px -6px rgba(139, 69, 19, 0.2),0px 21px 33px 3px rgba(139, 69, 19, 0.14),0px 8px 40px 7px rgba(139, 69, 19, 0.12)',
    '0px 10px 14px -6px rgba(139, 69, 19, 0.2),0px 22px 35px 3px rgba(139, 69, 19, 0.14),0px 8px 42px 7px rgba(139, 69, 19, 0.12)',
    '0px 11px 14px -7px rgba(139, 69, 19, 0.2),0px 23px 36px 3px rgba(139, 69, 19, 0.14),0px 9px 44px 8px rgba(139, 69, 19, 0.12)',
    '0px 11px 15px -7px rgba(139, 69, 19, 0.2),0px 24px 38px 3px rgba(139, 69, 19, 0.14),0px 9px 46px 8px rgba(139, 69, 19, 0.12)',
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