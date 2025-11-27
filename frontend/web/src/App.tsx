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


const theme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
    },
    secondary: {
      main: '#7c3aed',
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
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

      <Route
        path="/team/:teamId/projects"
        element={
          isAuthenticated ? <ProjectList /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/team/:teamId/project/:projectId"
        element={
          isAuthenticated ? <ProjectDetail /> : <Navigate to="/login" replace />
        }
      />
      
      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/team/:teamId"
        element={
          isAuthenticated ? <TeamDetail /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/team/:teamId/settings"
        element={
          isAuthenticated ? <TeamSettings /> : <Navigate to="/login" replace />
        }
      />
      
      {/* Catch all route - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
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
          v7_startTransition: true, // Add this line
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