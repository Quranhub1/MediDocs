# MediDocs Uganda - Netlify Deployment Guide

## Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub** ✅ Already done!
   - Repository: https://github.com/Quranhub1/MediDocs

2. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Select "GitHub" and authorize Netlify
   - Select the repository: `Quranhub1/MediDocs`

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: `18`

4. **Deploy**
   - Click "Deploy site"
   - Your site will be live at a URL like `https://medidocs-uganda.netlify.app`

---

## Option 2: Drag & Drop (Manual)

1. **Build locally** (if you have Node.js):
   ```bash
   cd studypedia-react
   npm install
   npm run build
   ```

2. **Upload to Netlify**:
   - Go to https://app.netlify.com/drop
   - Drag the `build` folder to the drop zone
   - Your site will be live instantly!

---

## Netlify Free Tier Includes:
- ✅ 100GB bandwidth/month
- ✅ 500 build minutes/month
- ✅ Custom domains
- ✅ Free SSL (HTTPS)
- ✅ Continuous deployment from Git

## Custom Domain (Optional)
After deployment:
1. Go to Domain settings in Netlify
2. Add your custom domain
3. Update DNS records as instructed
