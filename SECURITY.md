# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in MediDocs, please report it responsibly by contacting the maintainer directly rather than opening a public issue.

## Known Issues and Remediation

### Exposed Firebase API Keys (Git History)

**Status**: Remediated in current code. Historical exposure requires key rotation.

**What happened**: Earlier commits contained hardcoded Firebase API keys in `src/firebase.js`. These have been removed and replaced with environment variable references.

**Required action**:
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings > General > Your apps > Web app**
4. Regenerate or restrict the API key
5. Update the new key in your `.env` file

**Prevention**: 
- All secrets are stored in `.env` files which are gitignored
- A pre-commit hook checks for accidentally committed secrets
- Never hardcode API keys, tokens, or passwords in source files

## Security Best Practices

### Environment Variables
- All sensitive configuration is loaded from environment variables
- `.env` files are excluded from version control via `.gitignore`
- `.env.example` provides a template without real values

### Server Security
- Paystack references are sanitized before use in outgoing HTTP requests
- Rate limiting is applied to API endpoints to prevent abuse
- AI proxy caches responses to reduce external API exposure
- The backend never exposes the Groq API key to the client

### Authentication
- Firebase Authentication handles user identity
- Admin access is restricted by verified email/phone
- Banned users are blocked from accessing the application

## Dependencies

This project uses `react-scripts` 5.0.1 with dependency overrides to address known vulnerabilities in transitive dependencies. Run `npm audit` regularly and update dependencies as security patches are released.
