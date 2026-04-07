import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { AuthService } from '../services/authService';
import { ApiClient } from '../config/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const authService = AuthService.getInstance();
  const apiClient = ApiClient.getInstance();

  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = await authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Failed to load stored user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Register auth error handler to automatically logout and update state
  useEffect(() => {
    const handleAuthError = async () => {
      console.log('401 error detected in AuthProvider - logging out and updating state');
      try {
        await authService.logout();
        setUser(null); // Update React state to trigger redirect to login
      } catch (error) {
        console.error('Error during automatic logout:', error);
        setUser(null); // Still clear user state even if logout fails
      }
    };

    // Register the handler with API client
    apiClient.setAuthErrorHandler(handleAuthError);

    // Cleanup on unmount
    return () => {
      apiClient.setAuthErrorHandler(null);
    };
  }, [authService, apiClient]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userData = await authService.login(email, password);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};