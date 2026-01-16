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
          <CodeIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => router.push('/review')}
          >
            CodeOwl
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
