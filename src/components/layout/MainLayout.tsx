'use client';

import { Box, Container, useMediaQuery, useTheme } from '@mui/material';
import { Sidebar } from './Sidebar';
import { ReactNode } from 'react';

const drawerWidth = 280;

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '400px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            borderRadius: '0 0 50% 50%',
            zIndex: 0,
          },
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            pt: isMobile ? 10 : 4,
            pb: 4,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
}
