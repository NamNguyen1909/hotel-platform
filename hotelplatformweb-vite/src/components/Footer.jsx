import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
  Stack,
  Paper
} from '@mui/material';
import {
  Hotel as HotelIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
  GitHub as GitHubIcon,
  Code as CodeIcon
} from '@mui/icons-material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
        color: 'white',
        py: 6,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.5
        }
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={4}>
          {/* Hotel Information */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HotelIcon sx={{ fontSize: 32, color: '#FFD700' }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#E8F5E8' }}>
                  Hotel Platform
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#F0F8F0', lineHeight: 1.6 }}>
                Hệ thống quản lý khách sạn hiện đại, mang đến trải nghiệm đặt phòng tuyệt vời 
                và dịch vụ chất lượng cao cho khách hàng.
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton 
                  size="small" 
                  sx={{ color: '#4267B2', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  onClick={() => handleLinkClick('https://facebook.com')}
                >
                  <FacebookIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ color: '#1DA1F2', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  onClick={() => handleLinkClick('https://twitter.com')}
                >
                  <TwitterIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ color: '#E4405F', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  onClick={() => handleLinkClick('https://instagram.com')}
                >
                  <InstagramIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ color: '#0077B5', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                  onClick={() => handleLinkClick('https://linkedin.com')}
                >
                  <LinkedInIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#FFD700' }}>
              Liên kết nhanh
            </Typography>
            <Stack spacing={1}>
              {[
                { text: 'Trang chủ', href: '/' },
                { text: 'Phòng', href: '/rooms' },
                { text: 'Dịch vụ', href: '/services' },
                { text: 'Liên hệ', href: '/contact' },
                { text: 'Về chúng tôi', href: '/about' }
              ].map((link) => (
                <Link
                  key={link.text}
                  href={link.href}
                  color="inherit"
                  underline="hover"
                  sx={{ 
                    color: '#F0F8F0',
                    fontSize: '0.9rem',
                    '&:hover': { color: '#FFD700' }
                  }}
                >
                  {link.text}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Services */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#FFD700' }}>
              Dịch vụ
            </Typography>
            <Stack spacing={1}>
              {[
                'Đặt phòng trực tuyến',
                'Dịch vụ phòng 24/7',
                'Spa & Wellness',
                'Nhà hàng & Bar',
                'Hội nghị & Sự kiện'
              ].map((service) => (
                <Typography
                  key={service}
                  variant="body2"
                  sx={{ color: '#F0F8F0', fontSize: '0.9rem' }}
                >
                  {service}
                </Typography>
              ))}
            </Stack>
          </Grid>

          {/* Contact Info */}
          <Grid item xs={12} md={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#FFD700' }}>
              Thông tin liên hệ
            </Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#F0F8F0', fontSize: '0.9rem' }}>
                  123 Đường ABC, Quận XYZ, TP.HCM
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#F0F8F0', fontSize: '0.9rem' }}>
                  +84 123 456 789
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: '#F0F8F0', fontSize: '0.9rem' }}>
                  info@hotelplatform.com
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {/* Divider */}
        <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* Developer Information & Copyright */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={2}
              sx={{ 
                p: 2, 
                background: 'rgba(255,255,255,0.1)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CodeIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#FFD700' }}>
                  Phát triển bởi
                </Typography>
              </Box>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GitHubIcon sx={{ fontSize: 16, color: '#F0F8F0' }} />
                  <Link
                    href="https://github.com/NamNguyen1909"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      color: '#F0F8F0', 
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      '&:hover': { color: '#FFD700', textDecoration: 'underline' }
                    }}
                  >
                    Nam Nguyen
                  </Link>
                  <Typography variant="caption" sx={{ color: '#D0E0D0' }}>
                    • namnguyen19092004@gmail.com
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GitHubIcon sx={{ fontSize: 16, color: '#F0F8F0' }} />
                  <Link
                    href="https://github.com/FongFus"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      color: '#F0F8F0', 
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                      '&:hover': { color: '#FFD700', textDecoration: 'underline' }
                    }}
                  >
                    Phu Nguyen
                  </Link>
                  <Typography variant="caption" sx={{ color: '#D0E0D0' }}>
                    • npphus@gmail.com
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
              <Typography variant="body2" sx={{ color: '#F0F8F0', mb: 1 }}>
                © {currentYear} Hotel Platform. All rights reserved.
              </Typography>
              <Typography variant="caption" sx={{ color: '#D0E0D0' }}>
                Database Programming Project
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer;