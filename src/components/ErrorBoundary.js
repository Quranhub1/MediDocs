import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '2rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h1 style={{ fontFamily: 'Inter, sans-serif', color: '#059669', marginBottom: '1rem' }}>MediDocs</h1>
            <p style={{ fontFamily: 'Inter, sans-serif', color: '#6b7280', marginBottom: '1.5rem' }}>Something went wrong. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ fontFamily: 'Inter, sans-serif', padding: '0.75rem 1.5rem', background: '#059669', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
