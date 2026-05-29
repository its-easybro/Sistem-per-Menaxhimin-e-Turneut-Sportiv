import { createContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { AUTH_API_URL } from '../config/api';
import api from '../config/axiosInstance';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Holds the currently authenticated user object or null when signed out.
  const [user, setUser] = useState(null);
  // Prevents rendering auth-dependent UI before initial session check completes.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restores an existing session from the server when the app first mounts.
    const checkLoggedIn = async () => {
      try {
        const response = await api.get('/api/auth/me');

        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user', error);
        // Fallback to signed-out state if session lookup fails.
        setUser(null);
      }

      // Marks auth bootstrap as finished in both success and error paths.
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Logs in with credentials and stores returned user info in context state.
  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });

    if (!response.data) {
      throw new Error('Login failed');
    }

    const nextUser = response.data.userData || response.data.user || null;

    // Commit the user state before the caller navigates to a protected route.
    flushSync(() => {
      setUser(nextUser);
    });
    return response.data;
  };

  // Attempts server logout, then always clears local user state.
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    }

    setUser(null);
  };

  const updateUser = (nextUser) => {
    setUser((currentUser) =>
      typeof nextUser === 'function' ? nextUser(currentUser) : nextUser,
    );
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
