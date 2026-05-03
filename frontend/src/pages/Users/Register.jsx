import React from 'react';
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import axios from 'axios';
import { AUTH_API_URL } from '../../config/api';
import { Eye, EyeOff } from 'lucide-react';


const Register = () => {
  // Captures registration form input values.
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Stores a user-friendly error when registration fails.
  const [error, setError] = useState('');
  // Tracks submit lifecycle to support loading UI behavior.
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Reuses shared login action to sign in immediately after registration.
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  // Submits registration, then auto-authenticates the new user.
  const handleSubmit = async (e) => {
    // Prevents full-page reload on form submit.
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Creates the user account on the auth API.
      await axios.post(`${AUTH_API_URL}/register`, { username, email, password }, { withCredentials: true });
      // Logs in right away so the user does not need to sign in manually.
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError("Error occurred while registering");
      console.log(err.message);
    } finally {
      // Marks request completion for UI state reset.
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-800">Create Account</h1>
            <p className="text-gray-600">Join the platform by filling in your details</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                autoComplete='on'
                id="username"
                type="text"
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                autoComplete='on'
                id="email"
                type="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  plaaceholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
