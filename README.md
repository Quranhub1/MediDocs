# Studypedia Uganda - React Version

This is a React conversion of the Studypedia Uganda medical education platform. The original HTML/CSS/JS implementation has been refactored into a modern React application with improved structure, maintainability, and a more stylish design.

## Features

- **User Authentication**: Login/Register with email/password and Google authentication
- **AI Search**: AI-powered study assistance using Groq API (proxied through backend)
- **Course Browser**: Browse CLT and Diploma courses with visual icons
- **Latest Documents**: View latest study materials with thumbnail support
- **Document Interaction**: Read online or download study materials
- **Manual Payment System**: Simple manual payment process for premium access (no API integration)
- **Contact Form**: Reach out to support team
- **AI Chat**: Interactive AI study assistant
- **Responsive Design**: Beautifully rendered on both mobile and desktop devices
- **Modern UI**: Stylish gradients, shadows, and animations
- **Modals**: Login, register, payment, contact, and AI chat modals
- **Sidebar Navigation**: Collapsible menu for easy navigation
- **Hero Section**: Attractive landing page with call-to-action buttons
- **Statistics Section**: Highlights key features and benefits

## Project Structure

```
studypedia-react/
├── public/
│   ├── index.html          # Main HTML template
│   └── favicon.ico         # Application icon
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Header.js       # App header with navigation and auth buttons
│   │   ├── Sidebar.js      # Collapsible navigation sidebar
│   │   ├── MainContent.js  # Main content area router
│   │   ├── HeroSection.js  # Attractive landing section
│   │   ├── StatsSection.js # Features highlights
│   │   ├── LatestDocuments.js # Document listing with thumbnail support
│   │   ├── CourseGrid.js   # Course browsing interface
│   │   ├── AboutSection.js # About us information
│   │   ├── ContactSection.js # Contact form
│   │   ├── PrivacySection.js # Privacy policy
│   │   ├── LoginModal.js   # Authentication modal
│   │   ├── RegisterModal.js # Registration modal
│   │   ├── PaymentModal.js # Manual payment processing modal
│   │   └── AIChatModal.js  # AI study assistant modal
│   ├── context/            # React context providers
│   │   └── AuthContext.js  # Authentication state management
│   ├── App.js              # Main application component
│   ├── App.css             # Global styles and responsive adjustments
│   └── index.js            # Application entry point
├── package.json            # Project dependencies and scripts
└README.md                  # This file
```

## Key Improvements Over Original

1. **Component-Based Architecture**: Better separation of concerns
2. **State Management**: React state hooks for UI state
3. **Context API**: Global authentication state
4. **Reusable Components**: Modular UI elements
5. **Improved Maintainability**: Easier to update and extend
6. **React Best Practices**: Functional components with hooks
7. **Enhanced Thumbnail Support**: Better image/document preview handling
8. **Modern Stylish Design**: Beautiful gradients, shadows, and animations
9. **Mobile-First Approach**: Optimized for both mobile and desktop viewing
10. **Simplified Payment System**: Manual payment process without complex API integration

## Thumbnail Implementation

The LatestDocuments component now supports intelligent thumbnail display:

1. **Priority Order for Thumbnails**:
   - `thumbnail` field (if provided)
   - `thumbnailUrl` field (if provided)
   - `previewImage` field (if provided)
   - Fallback to filePath-based detection

2. **File Type Detection**:
   - Images (jpg, jpeg, png, gif, webp, svg): Shows actual image preview
   - PDFs: Shows PDF icon with label
   - Other documents: Shows generic document icon

3. **Responsive Display**:
   - Aspect ratio containers for proper scaling
   - Hover effects and shadows for interactivity
   - Mobile-optimized layouts

## Backend Integration

This React app is designed to work with the existing Studypedia backend deployed on Render.com at:
`https://studypedia-server-1.onrender.com`

The app makes API calls to:
- `/api/ai/chat` - For AI search and chat functionality
- Health check endpoint for monitoring

**Note**: Payment processing has been simplified to a manual system - no API integration is required for payments.

## Manual Payment System

Instead of complex API integrations with payment gateways, the application now uses a simple manual payment process:

1. Users are instructed to pay 50,000 UGX via Mobile Money or Bank Transfer
2. After payment, they enter their transaction reference number
3. Administrators manually verify payments and grant access
4. This eliminates the need for Pesapal or other payment gateway integrations

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd studypedia-react
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm start
   ```

2. Open your browser to:
   ```
   http://localhost:3000
   ```

### Building for Production

1. Create an optimized production build:
   ```bash
   npm run build
   ```

2. The build artifacts will be in the `build/` directory, ready for deployment.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
REACT_APP_API_URL=https://studypedia-server-1.onrender.com
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Deployment

The application can be deployed to various platforms:

### Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`

### Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Deploy: `netlify deploy --prod`

### Firebase Hosting
1. Install Firebase CLI: `npm i -g firebase-tools`
2. Initialize: `firebase init`
3. Deploy: `firebase deploy`

## Available Scripts

In the project directory, you can run:

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Removes the build tool and copies configuration files

## Browser Support

The application supports all modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Android Chrome)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Tailwind CSS for utility-first styling
- React team for the excellent UI library
- Google Fonts for the Inter typeface
- Firebase for authentication and database services
- Groq for AI capabilities