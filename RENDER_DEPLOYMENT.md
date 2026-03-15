# MediDocs Uganda - Render.com Deployment Guide

## Quick Deploy Steps

1. **Go to Render.com** and sign up/login
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub: select `Quranhub1/MediDocs`
4. Configure:
   - **Build Command**: `cd studypedia-react && npm install && npm run build`
   - **Publish directory**: `studypedia-react/build`
5. Click **"Create Static Site"**

---

## Troubleshooting

If you get "Base directory does not exist" error:
- Make sure to use the full build command: `cd studypedia-react && npm install && npm run build`
- Publish directory: `studypedia-react/build`

---

## After Deploy

Your site will be live at: `https://medidocs-uganda.onrender.com`

## Custom Domain (Optional)

1. Go to your site on Render → Settings → Custom Domains
2. Add your domain
3. Update DNS records as instructed
