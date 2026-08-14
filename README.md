# MediDocs Uganda

MediDocs Uganda is a medical education platform built with React, Firebase, and Tailwind CSS. It provides Ugandan medical students with access to study materials, AI-powered learning assistance, and subscription-based premium content.

## Features

- **User Authentication**: Email/password and Google sign-in via Firebase Auth
- **AI Study Assistant**: Real Groq-powered chat with document-aware recommendations, page guidance, summarization, and text-to-speech
- **Course Browser**: Browse courses, semesters, and course units with hierarchical navigation
- **Document Library**: Read online or download study materials with thumbnail previews
- **Manual Mobile Money Payments**: Subscription billing with weekly, monthly, and yearly plans in UGX
- **Admin Dashboard**: Manage documents, users, payments, and subscriptions
- **Responsive Design**: Mobile-first UI with Tailwind CSS, works on all screen sizes
- **Performance Optimized**: Local caching, lazy loading, and memoized rendering

## Project Structure

```
├── public/
│   └── index.html          # Main HTML template
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Header.js
│   │   ├── Sidebar.js
│   │   ├── BottomNav.js
│   │   ├── MainContent.js
│   │   ├── HeroSection.js
│   │   ├── StatsSection.js
│   │   ├── LatestDocuments.js
│   │   ├── DocumentCarousel.js
│   │   ├── CourseGrid.js
│   │   ├── AboutSection.js
│   │   ├── ContactSection.js
│   │   ├── PrivacySection.js
│   │   ├── LoginModal.js
│   │   ├── RegisterModal.js
│   │   ├── PaymentModal.js
│   │   ├── AIStudyAssistant.js
│   │   └── AdminDashboard.js
│   ├── context/
│   │   └── AuthContext.js  # Authentication state and user management
│   ├── services/
│   │   └── FirestoreService.js # Data fetching, caching, payments, uploads
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── server.js               # Express backend for AI proxy and Paystack verification
├── package.json
├── .env.example
├── firestore.rules
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Firebase project
- Groq API key
- Paystack account

### Installation

```bash
git clone <repository-url>
cd medidocs-react
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_OPENAI_API_KEY=your_groq_api_key
REACT_APP_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
```

### Development

Run the React frontend only:
```bash
npm start
```

Run both frontend and backend:
```bash
npm run dev
```

The Express backend runs on port 4000 by default and provides:
- `/api/ai/chat` - Server-side Groq proxy with in-memory caching
- `/api/paystack/verify` - Paystack transaction verification
- `/api/paystack/webhook` - Paystack webhook handler

### Production Build

```bash
npm run build
```

Build artifacts will be in the `build/` directory. Serve with the Express backend for full functionality.

## Payment Integration

MediDocs uses manual Mobile Money payments in UGX:

- Weekly: UGX 5,000
- Monthly: UGX 15,000
- Yearly: UGX 60,000

Users are prompted to send the amount to **KABALI MARINA** at **256749846848** via Mobile Money, then submit the payment for verification.

After submission, the admin reviews and approves subscriptions from the Admin Dashboard.

## Admin Dashboard

The admin dashboard includes:

- **Documents**: Add, edit, delete, and manage study materials with real thumbnail uploads
- **Users**: Register new users, approve subscriptions, ban/unban accounts
- **Payments**: View payment history and approve subscription payments
- **Course Management**: Create courses, semesters, and units

Admin access is controlled by email `kaigwaakram123@gmail.com` or phone `256749846848`.

## AI Assistant

The AI assistant is powered by Groq and includes:

- Document-aware responses using Firestore context
- Recommendations based on relevant study materials
- Navigation guidance to specific courses, semesters, units, and documents
- Summarization support
- Text-to-speech playback
- Client-side IndexedDB caching and server-side in-memory caching

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Android Chrome)

## License

MIT
