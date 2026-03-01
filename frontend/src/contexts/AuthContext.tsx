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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = `${import.meta.env.VITE_AUTH_URL || 'http://localhost:9000'}/api`;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  const getAccessToken = () => {
    return sessionStorage.getItem('access_token');
  };
  
  const getRefreshToken = () => {
    return localStorage.getItem('refresh_token');
  };
  
  const setTokens = (accessToken: string, refreshToken: string) => {
    sessionStorage.setItem('access_token', accessToken);
    
    localStorage.setItem('refresh_token', refreshToken);
    
    const expirationTime = Date.now() + (60 * 60 * 1000); // 1 hour
    sessionStorage.setItem('token_expiry', expirationTime.toString());
  };
  
  const clearTokens = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('token_expiry');
    localStorage.removeItem('refresh_token');
  };

  const isTokenExpired = (): boolean => {
    const expiry = sessionStorage.getItem('token_expiry');
    if (!expiry) return true;
    return Date.now() > parseInt(expiry);
  };

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

  const authenticatedApiCall = async (endpoint: string, options: RequestInit = {}) => {
    let token = getAccessToken();
    
    if (!token || isTokenExpired()) {
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

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authenticatedApiCall('/change-password', {
        method: 'POST',
        body: JSON.stringify({ 
          current_password: currentPassword, 
          new_password: newPassword 
        }),
      });
    } catch (error) {
      throw error;
    }
  };

  const getCurrentUser = async () => {
    try {
      const data = await authenticatedApiCall('/me');
      setUser(data.user);
    } catch (error) {
      logout();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const refreshTokenValue = getRefreshToken();
      
      if (refreshTokenValue) {
        try {
          await refreshToken();
          await getCurrentUser();
        } catch (error) {
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiry = () => {
      const expiry = sessionStorage.getItem('token_expiry');
      if (expiry) {
        const expiryTime = parseInt(expiry);
        const now = Date.now();
        const timeUntilExpiry = expiryTime - now;
        
        // Refresh token if it expires in less than 5 minutes
        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
          refreshToken().catch(() => {
            logout();
          });
        }
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    changePassword,
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
