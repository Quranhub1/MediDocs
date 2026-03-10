# Studypedia Uganda — Deployment Guide

## Architecture

```
Frontend (index.html)  →  Backend (Render.com)  →  Firebase Firestore
                       →  Groq AI API
```

- **Frontend**: `index.html` hosted on GitHub Pages (or any static host)
- **Backend**: `server.js` (Express) hosted on Render.com — keeps all API keys secret

---

## PART 1: Prepare Firebase Admin SDK Credentials

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Click **Project Settings** (gear icon) → **Service Accounts**
3. Click **Generate new private key** → download the JSON file
4. You'll need these fields from the JSON:
   - `project_id`
   - `private_key_id`
   - `private_key`
   - `client_email`
   - `client_id`

---

## PART 2: Deploy Backend on Render.com

### 1. Push backend files to GitHub

Create a **new GitHub repository** (e.g. `studypedia-server`) and push these files:
```
server.js
package.json
.gitignore
.env.example
```

> ⚠️ Do NOT push `.env` or `.env.local` — they are in `.gitignore`

```bash
git init
git add server.js package.json .gitignore .env.example DEPLOYMENT_GUIDE.md
git commit -m "Initial backend setup"
git branch -M main
git remote add origin https://github.com/yourusername/studypedia-server.git
git push -u origin main
```

### 2. Create a Web Service on Render

1. Go to [render.com](https://render.com) → Sign up / Log in with GitHub
2. Click **New +** → **Web Service**
3. Connect your `studypedia-server` repository
4. Configure:
   - **Name**: `studypedia-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 3. Add Environment Variables on Render

In your Render service → **Settings** → **Environment** → add each variable:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |
| `ALLOWED_ORIGINS` | `https://yourusername.github.io,http://localhost:3000` |
| `GROQ_API_KEY` | Your Groq API key from [console.groq.com](https://console.groq.com) |
| `FIREBASE_PROJECT_ID` | From service account JSON |
| `FIREBASE_PRIVATE_KEY_ID` | From service account JSON |
| `FIREBASE_PRIVATE_KEY` | From service account JSON (include the full `-----BEGIN...-----END...` with `\n`) |
| `FIREBASE_CLIENT_EMAIL` | From service account JSON |
| `FIREBASE_CLIENT_ID` | From service account JSON |

### 4. Get Your Render URL

After deployment, Render gives you a URL like:
```
https://studypedia-server.onrender.com
```

---

## PART 3: Update Frontend

In `index.html`, find this line (around line 362):
```javascript
const API_BASE_URL = 'https://studypedia-server.onrender.com';
```
Replace `studypedia-server` with your actual Render service name if different.

---

## PART 4: Deploy Frontend on GitHub Pages

1. Create a GitHub repo named `yourusername.github.io` (make it **Public**)
2. Push `index.html` to it:

```bash
git clone https://github.com/yourusername/yourusername.github.io.git
cd yourusername.github.io
cp /path/to/index.html index.html
git add index.html
git commit -m "Deploy Studypedia frontend"
git push
```

3. Your site will be live at: `https://yourusername.github.io`

---

## PART 5: Update CORS on Render

After deploying the frontend, update the `ALLOWED_ORIGINS` environment variable on Render to include your GitHub Pages URL:

```
https://yourusername.github.io,http://localhost:3000
```

Then **redeploy** the Render service (it will auto-redeploy on env var changes).

---

## Testing

### Test backend health
```bash
curl https://studypedia-server.onrender.com/health
```

### Test AI proxy
```bash
curl -X POST https://studypedia-server.onrender.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Test payment status
```bash
curl https://studypedia-server.onrender.com/api/payments/status/test-user-id
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| CORS Error | Add your frontend URL to `ALLOWED_ORIGINS` on Render and redeploy |
| Firebase Admin error | Check that `FIREBASE_PRIVATE_KEY` has proper `\n` line breaks |
| Groq API error | Verify `GROQ_API_KEY` is correct and has credits |
| Render cold start | Free tier sleeps after 15 min inactivity — first request may take ~30s |
| 404 on Render | Ensure `server.js` exists and `package.json` has `"start": "node server.js"` |

---

## Security Notes

- ✅ Firebase API key and Groq API key are **never exposed** in the frontend HTML
- ✅ All sensitive operations go through the backend server
- ✅ `.env` files are in `.gitignore`
- ⚠️ The `/api/payments/all` endpoint has no auth — add Firebase ID token verification before going to production
