# 🚀 Complete Guide: Deploy Your Web App to Vercel (Step-by-Step)

This guide will walk you through deploying your HR Management app to Vercel so it's live on the internet. **No coding knowledge needed!**

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:
- ✅ Your code saved on your computer
- ✅ A GitHub account (free) - we'll create one if needed
- ✅ Your Supabase credentials ready

---

## Part 1: Prepare Your Code for GitHub

### Step 1.1: Create a GitHub Account (if you don't have one)

1. Go to **https://github.com**
2. Click the **"Sign up"** button (top right)
3. Enter your email, create a password, and follow the signup process
4. Verify your email when prompted

### Step 1.2: Install Git (if not installed)

1. Go to **https://git-scm.com/download/win**
2. Download Git for Windows
3. Run the installer - **click "Next" on everything** (default settings are fine)
4. Click **"Finish"** when done

### Step 1.3: Upload Your Code to GitHub

#### Option A: Using GitHub Desktop (Easiest - Recommended)

1. **Download GitHub Desktop:**
   - Go to **https://desktop.github.com/**
   - Click **"Download for Windows"**
   - Install it (click Next, Next, Install, Finish)

2. **Sign in to GitHub Desktop:**
   - Open GitHub Desktop
   - Click **"Sign in to GitHub.com"**
   - Enter your GitHub username and password

3. **Create a New Repository (Initialize in Existing Folder):**
   
   **Option A: Initialize Repository in Your Existing Folder (RECOMMENDED)**
   
   - Click **"File"** → **"New Repository"** (or click the "+" button)
   - **Repository name:** `zk-hr-app` (or any name you like)
   - **Description:** "HR Management System"
   - **Local path:** Click **"Choose..."** and navigate to: `D:\coding\zkt-test\zk-hr-app`
     - **Important:** Select the `zk-hr-app` folder itself (where your code already is)
   - **☐ UNCHECK "Initialize this repository with a README"** (since you already have files)
   - Click **"Create Repository"**
   - GitHub Desktop will detect all your existing files
   - At the bottom left, type a message: **"Initial commit"**
   - Click **"Commit to main"**
   - Click **"Publish repository"** (top right)
   - **☑ Uncheck "Keep this code private"** if you want it public (or keep it checked for private)
   - Click **"Publish Repository"**
   
   **Option B: Create New Folder and Copy Files (Alternative)**
   
   - Click **"File"** → **"New Repository"**
   - **Repository name:** `zk-hr-app`
   - **Description:** "HR Management System"
   - **Local path:** Set to `D:\coding\` (parent folder, NOT inside zkt-test)
   - **☑ Check "Initialize this repository with a README"**
   - Click **"Create Repository"**
   - Open File Explorer and copy ALL files from `D:\coding\zkt-test\zk-hr-app` to the new repository folder
   - Go back to GitHub Desktop, commit, and push

#### Option B: Using Command Line (Alternative)

1. Open **PowerShell** or **Command Prompt**
2. Navigate to your project:
   ```powershell
   cd D:\coding\zkt-test
   ```
3. Initialize Git (if not already done):
   ```powershell
   git init
   ```
4. Add all files:
   ```powershell
   git add .
   ```
5. Commit:
   ```powershell
   git commit -m "Initial commit"
   ```
6. Go to GitHub.com and create a new repository (click "+" → "New repository")
7. Copy the repository URL
8. Connect and push:
   ```powershell
   git remote add origin YOUR_REPOSITORY_URL
   git branch -M main
   git push -u origin main
   ```

---

## Part 2: Deploy to Vercel

### Step 2.1: Sign Up for Vercel

1. Go to **https://vercel.com**
2. Click **"Sign Up"** (top right)
3. Click **"Continue with GitHub"** (recommended - easiest)
4. Authorize Vercel to access your GitHub account
5. Click **"Authorize Vercel"**

### Step 2.2: Import Your Project

1. After signing in, you'll see the Vercel dashboard
2. Click the **"Add New..."** button (or **"Import Project"**)
3. You'll see a list of your GitHub repositories
4. **Find and click on** `zk-hr-app` (or whatever you named it)
5. Click **"Import"**

### Step 2.3: Configure Project Settings

On the "Import Project" page, you'll see these settings:

#### Framework Preset:
- **Should be:** "Next.js" (Vercel detects this automatically)
- **If not:** Select "Next.js" from the dropdown

#### Root Directory:
- **Leave it as:** `./` (default)
- **OR if your code is in a subfolder:** Click "Edit" and set it to `zk-hr-app`

#### Build and Output Settings:
- **Build Command:** `npm run build` (should be auto-filled)
- **Output Directory:** `.next` (should be auto-filled)
- **Install Command:** `npm install` (should be auto-filled)

**Click "Deploy"** - but WAIT! We need to add environment variables first!

### Step 2.4: Add Environment Variables (IMPORTANT!)

**BEFORE clicking "Deploy",** click on **"Environment Variables"** section (expand it).

You need to add these variables one by one:

#### Variable 1: SUPABASE_URL
1. Click **"Add"** or **"New"** button
2. **Key:** `SUPABASE_URL`
3. **Value:** `https://pshttookanrjlrmwhqnt.supabase.co`
4. **Environment:** Select all three: ☑ Production, ☑ Preview, ☑ Development
5. Click **"Save"**

#### Variable 2: SUPABASE_SERVICE_ROLE_KEY
1. Click **"Add"** again
2. **Key:** `SUPABASE_SERVICE_ROLE_KEY`
3. **Value:** (Get this from Supabase - see instructions below)
4. **Environment:** Select all three: ☑ Production, ☑ Preview, ☑ Development
5. Click **"Save"**

**How to get SUPABASE_SERVICE_ROLE_KEY:**
- Go to: https://supabase.com/dashboard/project/pshttookanrjlrmwhqnt
- Click **"Settings"** (⚙️ icon) in left sidebar
- Click **"API"**
- Scroll to **"Project API keys"**
- Find **"service_role"** (it says "secret" next to it)
- Click the **👁️ eye icon** to reveal it
- Click **"Copy"** to copy the entire key
- Paste it in Vercel

#### Variable 3: DATABASE_URL
1. Click **"Add"** again
2. **Key:** `DATABASE_URL`
3. **Value:** `postgresql://postgres:YOUR_PASSWORD@db.pshttookanrjlrmwhqnt.supabase.co:5432/postgres`
   - **Replace `YOUR_PASSWORD`** with your actual Supabase database password
   - To find it: Supabase Dashboard → Settings → Database → Database Password
4. **Environment:** Select all three: ☑ Production, ☑ Preview, ☑ Development
5. Click **"Save"**

#### Variable 4: NEXT_PUBLIC_SUPABASE_URL
1. Click **"Add"** again
2. **Key:** `NEXT_PUBLIC_SUPABASE_URL`
3. **Value:** `https://pshttookanrjlrmwhqnt.supabase.co`
4. **Environment:** Select all three: ☑ Production, ☑ Preview, ☑ Development
5. Click **"Save"**

#### Variable 5: NEXT_PUBLIC_SUPABASE_ANON_KEY
1. Click **"Add"** again
2. **Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaHR0b29rYW5yamxybXdocW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NzIyMjYsImV4cCI6MjA3NzQ0ODIyNn0.TazTnlJ0qh6HAcT2snSJC7P_0P1-5Ms9fpXTU0GDdzA`
4. **Environment:** Select all three: ☑ Production, ☑ Preview, ☑ Development
5. Click **"Save"**

#### Variable 6: PYTHON_BRIDGE_URL (Optional - for local bridge)
1. Click **"Add"** again
2. **Key:** `PYTHON_BRIDGE_URL`
3. **Value:** `http://localhost:8080/api/zk/logs` (or your actual bridge URL if hosted)
   - **Note:** If your Python bridge is running locally, this won't work in production
   - You'll need to host your Python bridge separately or update this URL
4. **Environment:** Select all three: ☑ Production, ☑ Preview, ☑ Development
5. Click **"Save"**

### Step 2.5: Deploy!

1. After adding all environment variables, scroll down
2. Click the big **"Deploy"** button
3. Wait 2-5 minutes while Vercel builds your app
4. You'll see a progress bar showing:
   - "Installing dependencies..."
   - "Building..."
   - "Deploying..."

### Step 2.6: Success! 🎉

When deployment is complete, you'll see:
- ✅ **"Congratulations! Your project has been deployed"**
- A URL like: `https://zk-hr-app.vercel.app` or `https://zk-hr-app-xyz123.vercel.app`

**Click on that URL** to see your live website!

---

## Part 3: After Deployment

### Step 3.1: Test Your Live Site

1. Open the URL Vercel gave you
2. Try navigating through your app
3. Check if everything works

### Step 3.2: Custom Domain (Optional)

If you want your own domain (like `myapp.com`):

1. In Vercel dashboard, click on your project
2. Go to **"Settings"** tab
3. Click **"Domains"** in the left sidebar
4. Enter your domain name
5. Follow Vercel's instructions to configure DNS

### Step 3.3: Update Your Python Bridge URL

**Important:** The `PYTHON_BRIDGE_URL` is set to `localhost`, which won't work in production.

**Options:**
1. **Host your Python bridge separately** (on a VPS, Railway, Render, etc.)
2. **Update the URL** in Vercel environment variables
3. **Or remove features** that depend on the Python bridge

---

## Part 4: Updating Your App (Making Changes)

Whenever you make changes to your code:

### Using GitHub Desktop:
1. Make your changes in your code
2. Open GitHub Desktop
3. You'll see your changes listed
4. Type a message (e.g., "Fixed employee edit button")
5. Click **"Commit to main"**
6. Click **"Push origin"** (top right)

### Vercel Auto-Deploys:
- Vercel automatically detects changes on GitHub
- It will rebuild and redeploy your app automatically
- You'll get a notification when it's done
- Usually takes 2-5 minutes

---

## Troubleshooting

### Problem: Build Failed
**Solution:**
1. Click on the failed deployment in Vercel
2. Check the "Build Logs" tab
3. Look for error messages
4. Common issues:
   - Missing environment variables
   - Wrong Node.js version
   - Missing dependencies

### Problem: Site Works But Shows Errors
**Solution:**
1. Check browser console (F12 → Console tab)
2. Verify all environment variables are set correctly
3. Make sure Supabase credentials are correct

### Problem: Can't Find My Repository on Vercel
**Solution:**
1. Make sure you've pushed your code to GitHub
2. In Vercel, click "Add New" → "Import Project"
3. If you don't see it, click "Adjust GitHub App Permissions"
4. Make sure Vercel has access to your repositories

### Problem: Environment Variables Not Working
**Solution:**
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Make sure variables are added for **all environments** (Production, Preview, Development)
3. After adding/changing variables, **redeploy** your app

---

## Quick Reference: Environment Variables Checklist

Make sure you have ALL of these in Vercel:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `PYTHON_BRIDGE_URL` (optional)

---

## Need Help?

- **Vercel Documentation:** https://vercel.com/docs
- **Vercel Support:** support@vercel.com
- **GitHub Help:** https://docs.github.com

---

## Summary Checklist

- [ ] Created GitHub account
- [ ] Installed Git/GitHub Desktop
- [ ] Uploaded code to GitHub
- [ ] Created Vercel account
- [ ] Imported project to Vercel
- [ ] Added all environment variables
- [ ] Deployed successfully
- [ ] Tested live site
- [ ] Updated Python bridge URL (if needed)

**You're all set! Your app is now live on the internet! 🎉**

