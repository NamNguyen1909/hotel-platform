import React, { useState, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';

const LazyImage = ({ 
  src, 
  alt, 
  width = '100%', 
  height = '100%', 
  style = {},
  skeletonHeight = 200,
  borderRadius = 2,
  ...props 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      setImageError(true);
      return;
    }

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
    };
    
    img.onerror = () => {
      setImageError(true);
      setImageLoaded(true);
    };
  }, [src]);

  if (!imageLoaded) {
    return (
      <Skeleton
        variant="rectangular"
        width={width}
        height={skeletonHeight}
        sx={{ 
          borderRadius: borderRadius,
          bgcolor: 'rgba(139, 69, 19, 0.1)',
          ...style
        }}
      />
    );
  }

  if (imageError) {
    return (
      <Box
        component="img"
        src="/images/default-room.jpg"
        alt={alt || 'Default room image'}
        width={width}
        height={height}
        sx={{
          objectFit: 'cover',
          borderRadius: borderRadius,
          ...style
        }}
        {...props}
      />
    );
  }

  return (
    <Box
      component="img"
      src={imageSrc}
      alt={alt || 'Room image'}
      width={width}
      height={height}
      sx={{
        objectFit: 'cover',
        borderRadius: borderRadius,
        transition: 'opacity 0.3s ease',
        ...style
      }}
      {...props}
    />
  );
};

export default LazyImage;