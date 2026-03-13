import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Play, Users, DollarSign, HelpCircle, FileText, Mail, Phone, ChevronDown } from '@heroicons/react/24/outline';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Play },
    { name: 'Dashboard', path: '/dashboard', icon: DollarSign },
    { name: 'Videos', path: '/videos', icon: Play },
    { name: 'Referral', path: '/referral', icon: Users },
    { name: 'Withdraw', path: '/withdraw', icon: DollarSign },
    { name: 'FAQ', path: '/faq', icon: HelpCircle },
    { name: 'Terms', path: '/terms', icon: FileText },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-800">
              Tesla Wealth
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-3 py-2 text-sm font-medium ${
                    location.pathname === link.path
                      ? 'bg-blue-600 text-white rounded-lg'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors'
                  }`}
                >
                  <link.icon className="mr-1 h-4 w-4 inline" />
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-800 p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`block px-3 py-2 text-sm font-medium ${
                  location.pathname === link.path
                    ? 'bg-blue-600 text-white rounded-lg'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors'
                }`}
              >
                <link.icon className="mr-1 h-4 w-4 inline" />
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;