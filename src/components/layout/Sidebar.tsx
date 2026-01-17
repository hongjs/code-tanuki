'use client';

import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import RateReviewIcon from '@mui/icons-material/RateReview';
import HistoryIcon from '@mui/icons-material/History';
import CodeIcon from '@mui/icons-material/Code';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';

const drawerWidth = 280;

const menuItems = [
  {
    text: 'Review',
    icon: <RateReviewIcon />,
    path: '/review',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    text: 'History',
    icon: <HistoryIcon />,
    path: '/history',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar
          sx={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            width: 48,
            height: 48,
          }}
        >
          <img src="/icon.png" alt="Code Tanuki" width={24} height={24} />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            Code Tanuki
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            AI-Powered Review
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mx: 2 }} />

      {/* Navigation Menu */}
      <List sx={{ px: 2, py: 3, flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  router.push(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
                sx={{
                  borderRadius: '12px',
                  py: 1.5,
                  px: 2,
                  background: isActive
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'transparent',
                  backdropFilter: isActive ? 'blur(10px)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: 'white',
                    minWidth: 36,
                    '& svg': {
                      fontSize: 20,
                      filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.875rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer */}
      <Box
        sx={{
          p: 3,
          background: 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.5 }}>
          Version 1.0.0
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          © 2024 Code Tanuki
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1300,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a4293 100%)',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Desktop Drawer */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              border: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
}
