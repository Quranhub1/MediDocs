import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Videos from './pages/Videos';
import Referral from './pages/Referral';
import Withdraw from './pages/Withdraw';
import FAQ from './pages/FAQ';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import Header from './components/Header';
import Footer from './components/Footer';
import { UserProvider } from './hooks/useUser';
import { VideoProvider } from './hooks/useVideos';
import { ReferralProvider } from './hooks/useReferral';
import { ToastProvider } from './hooks/useToast';

function App() {
  return (
    <UserProvider>
      <VideoProvider>
        <ReferralProvider>
          <ToastProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <Header />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/videos" element={<Videos />} />
                  <Route path="/referral" element={<Referral />} />
                  <Route path="/withdraw" element={<Withdraw />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Footer />
              </div>
            </Router>
          </ToastProvider>
        </ReferralProvider>
      </VideoProvider>
    </UserProvider>
  );
}

export default App;