# ⚡ Quick Start: Deploy to Vercel (5 Minutes)

## 🎯 The Fastest Way to Deploy

### Step 1: Push Code to GitHub (2 minutes)

**Option A: Using GitHub Desktop (Easiest)**
1. Download: https://desktop.github.com
2. Install and sign in
3. File → New Repository → Name it `zk-hr-app`
4. Copy all files from `D:\coding\zkt-test\zk-hr-app` to the new repo folder
5. Commit → Publish Repository

**Option B: Using GitHub Website**
1. Go to github.com → Click "+" → "New repository"
2. Name: `zk-hr-app`
3. Upload all files from `zk-hr-app` folder
4. Click "Commit changes"

### Step 2: Deploy to Vercel (3 minutes)

1. **Go to:** https://vercel.com
2. **Sign up** with GitHub
3. **Click:** "Add New" → "Import Project"
4. **Select:** Your `zk-hr-app` repository
5. **Click:** "Environment Variables" (expand it)
6. **Add these 6 variables:**

```
SUPABASE_URL = https://pshttookanrjlrmwhqnt.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [Get from Supabase Dashboard → Settings → API]
DATABASE_URL = postgresql://postgres:YOUR_PASSWORD@db.pshttookanrjlrmwhqnt.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL = https://pshttookanrjlrmwhqnt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzaHR0b29rYW5yamxybXdocW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NzIyMjYsImV4cCI6MjA3NzQ0ODIyNn0.TazTnlJ0qh6HAcT2snSJC7P_0P1-5Ms9fpXTU0GDdzA
PYTHON_BRIDGE_URL = http://localhost:8080/api/zk/logs
```

7. **For each variable:** Check all environments (Production, Preview, Development)
8. **Click:** "Deploy"
9. **Wait:** 2-5 minutes
10. **Done!** Click the URL Vercel gives you

---

## 📸 Visual Guide: Where to Click

### Getting Service Role Key from Supabase:
```
Supabase Dashboard
  └─ Settings (⚙️ icon)
      └─ API
          └─ Project API keys
              └─ service_role (click 👁️ to reveal)
                  └─ Copy button
```

### Adding Variables in Vercel:
```
Vercel Import Page
  └─ Environment Variables (expand this section)
      └─ Click "Add" or "New"
          └─ Enter Key and Value
          └─ Check all environments ☑
          └─ Click "Save"
      └─ Repeat for each variable
```

---

## ⚠️ Important Notes

1. **Get SUPABASE_SERVICE_ROLE_KEY:**
   - Go to: https://supabase.com/dashboard/project/pshttookanrjlrmwhqnt/settings/api
   - Find "service_role" key
   - Click eye icon 👁️ to reveal
   - Copy the entire key

2. **Get DATABASE_PASSWORD:**
   - Go to: https://supabase.com/dashboard/project/pshttookanrjlrmwhqnt/settings/database
   - Find "Database Password"
   - Copy it and replace `YOUR_PASSWORD` in DATABASE_URL

3. **Python Bridge:**
   - `PYTHON_BRIDGE_URL` is set to localhost
   - This won't work in production unless you host the bridge separately
   - You can update this later or remove features that need it

---

## 🔄 Updating Your App Later

1. Make changes to your code
2. Push to GitHub (commit + push)
3. Vercel auto-deploys (takes 2-5 minutes)

That's it! No need to do anything in Vercel - it's automatic.

---

## ❓ Need More Help?

See the full guide: `DEPLOY_TO_VERCEL.md`




