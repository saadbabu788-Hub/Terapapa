# 🚀 Prank Exclusive Content Gateway (Netlify Deployable)

This project is fully structured and optimized to be deployed to **Netlify**, **Vercel**, **GitHub Pages**, **InfinityFree**, or any other hosting provider with absolutely zero configuration!

---

## ⚡ Quick Netlify Deployment Guide

You can deploy this website to Netlify in less than 1 minute using either of these two super-simple methods:

### Method 1: Netlify Drag & Drop (Easiest - No accounts/code required)
1. In your local development environment, run the build command to generate the production-ready static files:
   ```bash
   npm run build
   ```
2. Open your file explorer and locate the newly generated **`dist`** folder at the root of your project.
3. Open [Netlify Drop](https://app.netlify.com/drop) in your web browser.
4. **Drag and drop the entire `dist` folder** directly into the upload area on Netlify.
5. Boom! Your site is live! 🎉

---

### Method 2: Git / GitHub Integration (Automatic deployments on every push)
1. Push this project to a **GitHub**, **GitLab**, or **Bitbucket** repository.
2. Log in to [Netlify](https://app.netlify.com/) and click **"Add new site"** ➔ **"Import an existing project"**.
3. Select your repository provider and choose this repository.
4. Netlify will **automatically detect** the configuration from the included `netlify.toml` file:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. Click **"Deploy"**! Netlify will build and host your site automatically. Every time you push code to GitHub, your site will update in seconds.

---

## 🛠️ Project Technical Structure
- **Vite SPA Architecture**: The site uses Vite with Tailwind CSS for extremely fast load times and optimized bundles.
- **`netlify.toml` Included**: Out-of-the-box configuration that maps build outputs and handles routing redirects.
- **Client-Side Persistence (IndexedDB)**: The Custom Audio Upload Admin feature runs entirely inside the user's browser via IndexedDB. This means you do **NOT** need a database server or backend APIs to save your custom MP3 file; it is kept securely in the browser!
- **`public/audio.mp3`**: The default fallback sound file.

---

## 🔒 Admin Dashboard Panel
- **Passcode**: `999`
- **Access**: Click the tiny, subtle gear icon (⚙️) in the bottom-right corner of the website.
- **Features**: Enter passcode `999` to unlock the dashboard, where you can upload any MP3 file up to 15MB. The uploaded audio will replace the default `audio.mp3` and play instantly when users trigger the verification!
