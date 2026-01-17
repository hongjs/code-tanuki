'use client';

import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import CodeIcon from '@mui/icons-material/Code';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <img src="/icon.png" alt="Code Tanuki Logo" width={32} height={32} style={{ marginRight: 8, borderRadius: '4px' }} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => router.push('/review')}
          >
            Code Tanuki
          </Typography>
          <Button
            color="inherit"
            onClick={() => router.push('/review')}
            sx={{
              fontWeight: pathname === '/review' ? 700 : 400,
            }}
          >
            Review
          </Button>
          <Button
            color="inherit"
            onClick={() => router.push('/history')}
            sx={{
              fontWeight: pathname === '/history' ? 700 : 400,
            }}
          >
            History
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
