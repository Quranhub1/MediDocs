import React, { useState } from 'react';
import BackgroundImages from './BackgroundImages';
import { submitContactForm } from '../services/FirestoreService';

const ContactSection = ({ onContactClick }) => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await submitContactForm(formState);
      if (result.success) {
        setSubmitStatus('success');
        setFormState({ name: '', email: '', subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappUrl = 'https://wa.me/256756454646';
  const callUrl = 'tel:+256749846848';

  return (
    <section className="relative min-h-screen mb-8">
      <BackgroundImages />
      <div className="relative z-10 bg-white/50 min-h-screen py-12 px-4 sm:px-8 md:px-12">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Contact Us
          </h2>

          {submitStatus === 'success' && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
              <p className="font-medium">Thank you for your message!</p>
              <p className="text-sm">We'll get back to you within 24 hours.</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p className="font-medium">Oops! Something went wrong.</p>
              <p className="text-sm">Please try again later.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <p className="text-gray-600">
                Have a question, feedback, or need help with your study materials? Reach out and our team will respond as soon as possible.
              </p>

              <div className="space-y-4">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 transition-all duration-200 shadow-sm"
                  aria-label="Chat with MediDocs on WhatsApp"
                >
                  <span className="w-11 h-11 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm" aria-hidden="true">
                    <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 3.5C9.1 3.5 3.5 9.1 3.5 16c0 2.2.6 4.3 1.7 6.1L3.4 28.5l6.5-1.7c1.8 1.1 3.9 1.7 6.1 1.7 6.9 0 12.5-5.6 12.5-12.5S22.9 3.5 16 3.5Z" fill="white"/>
                      <path d="M11.9 9.5c-.3-.6-.6-.6-.9-.6h-.8c-.3 0-.7.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.1 1.4 3.3c.2.2 2.3 3.6 5.7 4.9 2.8 1.1 3.4.9 4 .9.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.2-.3-.3-.7-.5l-2.1-1c-.3-.2-.6-.1-.8.2l-.8 1c-.2.2-.4.3-.7.1-1-.5-1.9-1.1-2.7-1.8-.8-.8-1.4-1.6-1.8-2.6-.1-.3 0-.5.2-.7l.6-.7c.2-.2.2-.4.1-.7l-.9-2.1Z" fill="#25D366"/>
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">WhatsApp</p>
                    <p className="text-green-700">0756 454 646</p>
                    <p className="text-xs text-green-600 mt-0.5">Tap to start a WhatsApp chat</p>
                  </div>
                </a>

                <a
                  href={callUrl}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 shadow-sm"
                  aria-label="Call MediDocs directly"
                >
                  <span className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl shadow-sm" aria-hidden="true">📞</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Call Us</p>
                    <p className="text-blue-700">0749 846 848</p>
                    <p className="text-xs text-blue-600 mt-0.5">Tap to call directly</p>
                  </div>
                </a>

                <div className="flex items-start gap-3">
                  <span className="mt-1 text-blue-500">📧</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-gray-600">kaigwaakram123@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-blue-500">📍</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-gray-600">Kampala, Uganda</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-left">
                <button
                  onClick={onContactClick}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Need immediate help? Chat with us live
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    value={formState.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="contact-subject"
                  name="subject"
                  value={formState.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter subject"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formState.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your message"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-full text-sm transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-xl ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
