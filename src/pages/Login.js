aimport React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUser, createUser } from '../firebase';

const Login = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('zenith_user');
    if (user) {
      const parsedUser = JSON.parse(user);
      // Redirect admin to admin dashboard, others to dashboard
      if (parsedUser.phone === '0749846848') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!phone || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Check if admin
    const isAdmin = phone === '0749846848';
    const redirectPath = isAdmin ? '/admin' : '/dashboard';

    try {
      const user = await getUser(phone);
      
      if (user) {
        if (user.password === password) {
          localStorage.setItem('zenith_user', JSON.stringify(user));
          navigate(redirectPath);
        } else {
          setError('Invalid phone number or password');
        }
      } else {
        const newUser = {
          phone,
          password,
          balance: 0,
          commission: 0,
          referrals: 0,
          videosWatched: 0,
          referralCode: phone,
          referredBy: null,
          createdAt: new Date().toISOString()
        };
        
        const result = await createUser(newUser);
        if (result.success) {
          localStorage.setItem('zenith_user', JSON.stringify(newUser));
          navigate(redirectPath);
        } else {
          setError('Login failed. Please try again.');
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      const storedUser = localStorage.getItem('user_' + phone);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.password === password) {
          localStorage.setItem('zenith_user', JSON.stringify(user));
          navigate(redirectPath);
        } else {
          setError('Invalid phone number or password');
        }
      } else {
        const newUser = {
          phone,
          password,
          balance: 0,
          commission: 0,
          referrals: 0,
          videosWatched: 0,
          referralCode: phone,
          referredBy: null,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('user_' + phone, JSON.stringify(newUser));
        localStorage.setItem('zenith_user', JSON.stringify(newUser));
        navigate(redirectPath);
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
        >
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Welcome Back
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-600"
            >
              Sign in to continue earning
            </motion.p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07xxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-semibold">
                Sign Up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
