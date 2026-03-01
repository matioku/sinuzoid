import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = `${import.meta.env.VITE_AUTH_URL || 'http://localhost:9000'}/api`;

interface AuthProviderProps {
  children: ReactNode;
}

// Security enhancement: Use sessionStorage for access token (more secure)
// and localStorage only for refresh token
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Get stored tokens with improved security
  const getAccessToken = () => {
    // Access token in sessionStorage (cleared on tab close)
    return sessionStorage.getItem('access_token');
  };
  
  const getRefreshToken = () => {
    // Refresh token in localStorage (for persistence)
    return localStorage.getItem('refresh_token');
  };
  
  // Store tokens with security considerations
  const setTokens = (accessToken: string, refreshToken: string) => {
    // Access token: sessionStorage (more secure, lost on tab close)
    sessionStorage.setItem('access_token', accessToken);
    
    // Refresh token: localStorage (for session persistence)
    // In production, this should be an httpOnly cookie
    localStorage.setItem('refresh_token', refreshToken);
    
    // Optional: Set expiration for additional security
    const expirationTime = Date.now() + (60 * 60 * 1000); // 1 hour
    sessionStorage.setItem('token_expiry', expirationTime.toString());
  };
  
  // Clear tokens securely
  const clearTokens = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('token_expiry');
    localStorage.removeItem('refresh_token');
  };

  // Check if access token is expired
  const isTokenExpired = (): boolean => {
    const expiry = sessionStorage.getItem('token_expiry');
    if (!expiry) return true;
    return Date.now() > parseInt(expiry);
  };

  // API call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Une erreur est survenue');
    }

    return data;
  };

  // Authenticated API call helper with automatic token refresh
  const authenticatedApiCall = async (endpoint: string, options: RequestInit = {}) => {
    let token = getAccessToken();
    
    // Check if token exists and is not expired
    if (!token || isTokenExpired()) {
      // Try to refresh token automatically
      try {
        await refreshToken();
        token = getAccessToken();
      } catch (error) {
        logout();
        throw new Error('Session expirée, veuillez vous reconnecter');
      }
    }

    const config = {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      return await apiCall(endpoint, config);
    } catch (error: any) {
      // If token still invalid, try refresh once more
      if (error.message.includes('token') || error.message.includes('expired')) {
        try {
          await refreshToken();
          const newToken = getAccessToken();
          const retryConfig = {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };
          return await apiCall(endpoint, retryConfig);
        } catch (refreshError) {
          logout();
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
      }
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setUser(data.user);
      setTokens(data.tokens.access_token, data.tokens.refresh_token);
    } catch (error) {
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      await apiCall('/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    clearTokens();
  };

  const refreshToken = async () => {
    const refresh = getRefreshToken();
    if (!refresh) {
      throw new Error('No refresh token available');
    }

    try {
      const data = await apiCall('/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh }),
      });

      setTokens(data.tokens.access_token, data.tokens.refresh_token);
    } catch (error) {
      clearTokens();
      setUser(null);
      throw error;
    }
  };

  const getCurrentUser = async () => {
    try {
      const data = await authenticatedApiCall('/me');
      setUser(data.user);
    } catch (error) {
      // If we can't get current user, clear everything
      logout();
    }
  };

  // Check if user is logged in on app start
  useEffect(() => {
    const initAuth = async () => {
      const refreshTokenValue = getRefreshToken();
      
      // If we have a refresh token, try to get a new access token
      if (refreshTokenValue) {
        try {
          await refreshToken();
          await getCurrentUser();
        } catch (error) {
          // Refresh token might be invalid, clear everything
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
