import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  bio: string | null;
  is_verified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Define login credentials interface
interface LoginCredentials {
  email_or_username: string;
  password: string;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks with proper error typing
export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
  }, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error: any) {
      // Normalize the error response
      const errorData = error.response?.data;
      
      if (errorData) {
        // If it's already an object with error details, return it as-is
        if (typeof errorData === 'object' && errorData !== null) {
          return rejectWithValue(errorData);
        }
        // If it's a string, return it
        if (typeof errorData === 'string') {
          return rejectWithValue(errorData);
        }
      }
      
      // Handle network errors or other issues
      if (error.message) {
        return rejectWithValue(error.message);
      }
      
      return rejectWithValue('Login failed. Please check your credentials and try again.');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authAPI.logout();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.error || 'Logout failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Registration failed';
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        // The error can be a string or an object from Django
        state.error = action.payload as any;
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Logout failed';
      });
  },
});

export const { clearError, setCredentials } = authSlice.actions;

// Export the LoginCredentials type
export type { LoginCredentials };

export default authSlice.reducer;