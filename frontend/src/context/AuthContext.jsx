import { createContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { AUTH_API_URL } from '../config/api';

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
        const response = await fetch(`${AUTH_API_URL}/me`, {
          method: 'GET',
          // Sends HTTP-only auth cookies with the request.
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          // Treats any non-OK response as unauthenticated.
          setUser(null);
        }
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
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Required so cookie-based sessions are set by the backend.
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const nextUser = data.userData || data.user || null;

    // Commit the user state before the caller navigates to a protected route.
    flushSync(() => {
      setUser(nextUser);
    });
    return data;
  };

  // Attempts server logout, then always clears local user state.
  const logout = async () => {
    try {
      await fetch(`${AUTH_API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed', error);
    }

    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
