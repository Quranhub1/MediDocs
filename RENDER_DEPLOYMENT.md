# Deployment Guide for Render

This guide will help you deploy your Studypedia React app to Render.com.

## Prerequisites

1. A Render.com account (sign up at https://render.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Node.js installed locally for testing

## Step 1: Prepare Your Code

First, make sure all your React files are in the `studypedia-react` directory and your code is ready for deployment:

1. Test your app locally:
```bash
cd studypedia-react
npm install
npm run build
```

2. Make sure your code is pushed to your Git repository:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Deploy to Render

### Option A: Deploy as a Static Site (Recommended for React)

1. Log in to Render.com and go to your Dashboard
2. Click "New +" and select "Static Site"
3. Connect your GitHub/GitLab/Bitbucket repository
4. Select the branch to deploy (usually "main")
5. Configure the build settings:
   - **Build Command**: `npm run build`
   - **Publish directory**: `build`
   
6. Click "Create Static Site"

### Option B: Deploy as a Web Service

If you need server-side functionality or want more control:

1. Log in to Render.com and go to your Dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub/GitLab/Bitbucket repository
4. Select the branch to deploy (usually "main")
5. Configure the settings:
   - **Name**: `studypedia-frontend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build`

6. Add environment variables if needed:
   - `REACT_APP_API_URL`: Your backend URL (e.g., https://studypedia-server-1.onrender.com)

7. Click "Create Web Service"

## Step 3: Configure Environment Variables

If you're using environment variables in your React app:

1. Go to your deployed service on Render
2. Click "Environment" in the left sidebar
3. Add the following variables:
   ```
   REACT_APP_API_URL=https://studypedia-server-1.onrender.com
   ```

Note: React environment variables must start with `REACT_APP_` to be accessible in the app.

## Step 4: Update Your Backend (If Needed)

If your React app communicates with your backend, make sure to update the CORS settings in your backend to allow requests from your new Render URL.

In your backend's server.js, add:
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://your-frontend-app.onrender.com', 'http://localhost:3000']
}));
```

## Step 5: Test Your Deployment

1. Once deployed, click the URL provided by Render
2. Test the following:
   - Homepage loads correctly
   - Navigation works
   - Login/Register modals open
   - Documents display with thumbnails
   - Course grid displays properly

## Troubleshooting

### Common Issues:

1. **Build fails**: Check that Node version is correct in package.json
2. **API calls fail**: Verify environment variables are set correctly
3. **404 errors**: Make sure the publish directory is set to "build"
4. **CORS errors**: Update backend CORS settings to allow your Render URL

### Fixing Build Issues:

If the build fails, check your package.json has the correct scripts:

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

## Custom Domain (Optional)

To use a custom domain:

1. Go to your Static Site/Web Service settings on Render
2. Click "Custom Domains"
3. Add your domain name
4. Update your DNS records as instructed by Render

## Continuous Deployment

Render automatically deploys when you push to your connected Git branch. To set this up:

1. Connect your Git repository to Render
2. Make sure automatic deploys are enabled
3. Every push to main will trigger a new deployment

## Support

If you encounter issues:
- Check Render's documentation: https://render.com/docs
- Contact Render support through their dashboard
- Check the deployment logs in the Render dashboard for error messages