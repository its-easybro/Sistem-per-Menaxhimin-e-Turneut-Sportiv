import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';

const Login = () => {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Holds user-facing error messages from failed login attempts.
  const [error, setError] = useState('');
  // Disables submit UI while the login request is in progress.
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Uses shared auth context to call backend login logic.
  const { login } = useContext(AuthContext);

  // Handle form submission
  const handleSubmit = async (e) => {
    // Prevents default browser form reload.
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);

      // Redirects admins to dashboard and regular users to the home page.
      if (data?.userData?.is_admin || data?.user?.is_admin) {
        navigate('/dashboard');
      } else if (data?.userData?.is_organizer || data?.user?.is_organizer) {
        navigate('/organizer/dashboard');
      } else if (data?.userData?.is_referee || data?.user?.is_referee) {
        navigate('/referee/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError("Invalid email or password");
      console.log(err.message);
    } finally {
      // Re-enables submit button after request finishes.
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                autoComplete='on'
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:bg-gray-400"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 pt-6 border-t border-gray-200 space-y-3 text-center">
            <div>
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="/register" className="text-blue-600 hover:text-blue-700 font-semibold transition duration-200">
                  Create one
                </a>
              </p>
            </div>
            <div>
              <a href="/forgot-password" className="inline-block text-blue-600 hover:text-blue-700 font-medium text-sm transition duration-200 hover:underline">
                Forgot your password?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



export default Login;
