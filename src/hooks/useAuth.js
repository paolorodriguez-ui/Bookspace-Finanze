import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToAuthChanges,
  loginUser,
  logoutUser,
  registerUser,
  resetPassword,
  isFirebaseConfigured
} from '../firebase';

/**
 * Hook para manejar la autenticación de usuarios
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(isFirebaseConfigured());

    const unsubscribe = subscribeToAuthChanges((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);
    return result;
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    const result = await logoutUser();
    setLoading(false);
    return result;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    setLoading(true);
    const result = await registerUser(email, password, displayName);
    setLoading(false);
    return result;
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    return await resetPassword(email);
  }, []);

  return {
    user,
    loading,
    isConfigured,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    sendPasswordReset
  };
};
