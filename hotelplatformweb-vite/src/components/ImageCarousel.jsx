import React from 'react';
import { Box } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import LazyImage from './LazyImage';

const ImageCarousel = ({ 
  images = [], 
  height = 300, 
  showNavigation = true,
  showPagination = true,
  autoplay = true,
  loop = true,
  borderRadius = 3,
  aspectRatio = '16/9'
}) => {
  if (!images || images.length === 0) {
    return (
      <Box
        sx={{
          height: height,
          borderRadius: borderRadius,
          overflow: 'hidden',
          position: 'relative',
          aspectRatio: aspectRatio,
        }}
      >
        <LazyImage
          src="/images/default-room.jpg"
          alt="Default room"
          width="100%"
          height="100%"
          skeletonHeight={height}
          borderRadius={borderRadius}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderRadius: borderRadius,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        aspectRatio: aspectRatio,
      }}
    >
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        navigation={showNavigation}
        pagination={showPagination ? { clickable: true } : false}
        autoplay={autoplay ? { delay: 3000, disableOnInteraction: false } : false}
        loop={loop}
        style={{ height: '100%' }}
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <LazyImage
              src={image.url}
              alt={image.alt || image.caption || `Room image ${index + 1}`}
              width="100%"
              height="100%"
              skeletonHeight={height}
              borderRadius={0}
              style={{ borderRadius: 0 }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  );
};

export default ImageCarousel;
