import React from 'react';
import { Calendar, Clock, DollarSign, Users, HelpCircle, FileText, Mail, Phone } from '@heroicons/react/24/outline';

const Footer = () => {
  const footerLinks = [
    { name: 'Home', path: '/', icon: Clock },
    { name: 'Dashboard', path: '/dashboard', icon: DollarSign },
    { name: 'Videos', path: '/videos', icon: Clock },
    { name: 'Referral', path: '/referral', icon: Users },
    { name: 'Withdraw', path: '/withdraw', icon: DollarSign },
    { name: 'FAQ', path: '/faq', icon: HelpCircle },
    { name: 'Terms', path: '/terms', icon: FileText },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-blue-500 mb-4">
              Tesla Wealth
            </h3>
            <p className="text-gray-400 mb-4">
              Earn money watching videos and invite friends to earn even more with our 10% commission system.
            </p>
            <div className="flex space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                Join Now
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                Login
              </button>
            </div>
          </div>

          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.path} className="text-gray-400 hover:text-white transition-colors">
                    <link.icon className="mr-2 h-4 w-4 inline" />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <HelpCircle className="mr-2 h-4 w-4 inline" />
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <FileText className="mr-2 h-4 w-4 inline" />
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Mail className="mr-2 h-4 w-4 inline" />
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">
              Contact
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Phone className="mr-2 h-4 w-4 inline" />
                <span className="text-gray-400">+256749846848</span>
              </li>
              <li className="flex items-center">
                <Mail className="mr-2 h-4 w-4 inline" />
                <span className="text-gray-400">info@zenithassets.com</span>
              </li>
              <li className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 inline" />
                <span className="text-gray-400">Mon-Fri 9AM-6PM EST</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2026 Zenith assets. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              Disclaimer
            </a>
          </div>
        </div>
      </div>
    <footer>
  );
};

export default Footer;