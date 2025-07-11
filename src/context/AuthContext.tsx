import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiRequest, setUserForLogging, login as loginApi } from '../api';
import type { User } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ token: string; user: User }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await apiRequest<User>('/api/users/me');
        setUser(userData);
      } catch (error) {
        console.error('Failed to authenticate', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
    try {
      setLoading(true);
      
      // Use the login function from the API module which handles the /login endpoint
      const { token, user: userData } = await loginApi(email, password);
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      localStorage.setItem('token', token);
      
      // Ensure we have valid user data
      if (!userData) {
        throw new Error('No user data received');
      }
      
      setUser(userData);
      
      // Set user for logging if needed
      if (typeof setUserForLogging === 'function') {
        setUserForLogging(userData);
      }
      
      return { token, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      // Clear any partial state on error
      localStorage.removeItem('token');
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
