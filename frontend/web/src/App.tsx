// src/App.tsx
import React, { useEffect, useState } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useLocation 
} from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState, AppDispatch } from './shared/store/store';
import { setCredentials } from './shared/store/slices/authSlice';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import TeamDetail from './components/TeamDetail';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import { authAPI } from './shared/services/api';
import TeamSettings from './components/TeamSettings';
import InvitationAccept from './components/InvitationAccept';
import InvitationReject from './components/InvitationReject';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import MainLayout from './Layout/MainLayout';
import CreateTeamPage from './pages/CreateTeamPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#7c3aed',
    },
    background: {
      default: '#f8fafc',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
  },
});

// Create a component to handle route-based authentication
const AppRoutes: React.FC = () => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // Don't redirect if we're on team pages during loading
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            border: '4px solid #e5e7eb', 
            borderTop: '4px solid #2563eb', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/invitation/accept/:token" element={<InvitationAccept />} />
      <Route path="/invitation/reject/:token" element={<InvitationReject />} />

      {/* Protected routes with MainLayout */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <MainLayout>
              <Dashboard />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/team/:teamId"
        element={
          isAuthenticated ? (
            <MainLayout>
              <TeamDetail />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/team/:teamId/settings"
        element={
          isAuthenticated ? (
            <MainLayout>
              <TeamSettings />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/team/create"
        element={
          isAuthenticated ? (
            <CreateTeamPage />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/projects"
        element={
          isAuthenticated ? (
            <MainLayout>
              <ProjectList />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/team/:teamId/projects"
        element={
          isAuthenticated ? (
            <MainLayout>
              <ProjectList />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/team/:teamId/project/:projectId"
        element={
          isAuthenticated ? (
            <MainLayout>
              <ProjectDetail />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Additional routes that can be added later */}
      {/* 
      <Route
        path="/projects"
        element={
          isAuthenticated ? (
            <MainLayout>
              <ProjectsPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/my-work"
        element={
          isAuthenticated ? (
            <MainLayout>
              <MyWorkPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/chat"
        element={
          isAuthenticated ? (
            <MainLayout>
              <ChatPage />
            </MainLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      */}

      {/* Catch all route - redirect to dashboard if authenticated, home if not */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <Navigate to="/" replace />
        } 
      />
    </Routes>
  );
};

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and get user data
          const response = await authAPI.getProfile();
          dispatch(setCredentials({ 
            user: response.data, 
            token 
          }));
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('token');
          console.error('Invalid token:', error);
        }
      }
      setAuthChecked(true);
    };

    initializeAuth();
  }, [dispatch]);

  // Show loading until auth is checked
  if (!authChecked) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            border: '4px solid #e5e7eb', 
            borderTop: '4px solid #2563eb', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Initializing app...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter future={{
          v7_startTransition: true,
        }}>
          <AuthInitializer>
            <div className="App">
              <AppRoutes />
            </div>
          </AuthInitializer>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;