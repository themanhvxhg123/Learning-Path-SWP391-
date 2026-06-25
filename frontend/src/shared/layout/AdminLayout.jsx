import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { SIDEBAR_WIDTH } from './Sidebar';
import { pageContentSx } from './MainLayout';
import { HEADER_HEIGHT } from './MainLayout';
import { AdminLayoutGuard } from '@/shared/routing/RoleShellRedirects';

export default function AdminLayout() {
  return (
    <AdminLayoutGuard>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#FFFFFF',
        }}
      >
        <Header
          logoTo="/admin/accounts"
          profilePath="/admin/profile"
          showMyCoursesButton={false}
        />
        <Sidebar variant="admin" />

        <Box
          component="main"
          sx={{
            ml: `${SIDEBAR_WIDTH}px`,
            flex: 1,
            bgcolor: '#FFFFFF',
            minHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
          }}
        >
          <Box sx={pageContentSx}>
            <Outlet />
          </Box>
        </Box>
      </Box>

      <Footer />
    </AdminLayoutGuard>
  );
}
