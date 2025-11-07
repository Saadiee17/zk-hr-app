# 🔧 Deployment Troubleshooting Guide

Common issues and how to fix them when deploying to Vercel.

---

## ❌ Issue 1: Build Failed - "Module not found"

### Symptoms:
- Build fails with error like: `Module not found: Can't resolve 'xyz'`
- Or: `Cannot find module '@mantine/core'`

### Solution:
1. Make sure `package.json` has all dependencies listed
2. In Vercel, go to your project → Settings → General
3. Check "Install Command" is set to: `npm install`
4. Redeploy

### Prevention:
- Always run `npm install` locally before pushing to GitHub
- Make sure `node_modules` is NOT uploaded to GitHub (it's in .gitignore)

---

## ❌ Issue 2: Build Failed - "Environment variable not found"

### Symptoms:
- Build succeeds but app shows errors
- Error: `SUPABASE_URL is not defined`
- Error: `process.env.SUPABASE_SERVICE_ROLE_KEY is undefined`

### Solution:
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Check that ALL variables are added:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `PYTHON_BRIDGE_URL`
3. For EACH variable, make sure all environments are checked:
   - ☑ Production
   - ☑ Preview
   - ☑ Development
4. After adding/changing variables, click "Redeploy" (or push a new commit)

### Important:
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Variables WITHOUT `NEXT_PUBLIC_` are server-only (more secure)
- After changing environment variables, you MUST redeploy

---

## ❌ Issue 3: Site Works But Shows "Failed to fetch" Errors

### Symptoms:
- Site loads but shows errors in browser console
- Can't load employee data
- Database connection errors

### Solution:

**Step 1: Check Environment Variables**
- Go to Vercel → Settings → Environment Variables
- Verify all Supabase variables are correct
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is the full key (starts with `eyJ...`)

**Step 2: Check Supabase Connection**
- Go to Supabase Dashboard → Settings → API
- Verify your project URL matches `SUPABASE_URL`
- Test if Supabase is accessible

**Step 3: Check Database Password**
- Verify `DATABASE_URL` has correct password
- Format: `postgresql://postgres:PASSWORD@db.pshttookanrjlrmwhqnt.supabase.co:5432/postgres`
- Get password from: Supabase Dashboard → Settings → Database

**Step 4: Check Browser Console**
- Press F12 → Console tab
- Look for specific error messages
- Copy error and search online or contact support

---

## ❌ Issue 4: Python Bridge Connection Errors

### Symptoms:
- Errors about `PYTHON_BRIDGE_URL`
- "Failed to connect to Python Bridge"
- "Connection refused"

### Why This Happens:
- `PYTHON_BRIDGE_URL` is set to `http://localhost:8080`
- `localhost` doesn't work in production (Vercel can't access your local computer)

### Solutions:

**Option A: Host Python Bridge Separately**
1. Host your Python bridge on:
   - Railway (railway.app)
   - Render (render.com)
   - DigitalOcean
   - AWS/Azure/GCP
   - Any VPS/server
2. Update `PYTHON_BRIDGE_URL` in Vercel to your hosted URL
3. Example: `https://your-bridge.railway.app/api/zk/logs`

**Option B: Remove Bridge Features (Temporary)**
1. Features that need bridge:
   - Syncing attendance logs (`/api/sync`)
   - Syncing employees (`/api/sync-employees`)
   - Syncing schedules to device (`/api/device/sync-schedules`)
2. These features will show errors but won't break the app
3. You can use the app for viewing/managing data without syncing

**Option C: Use Different URL**
- If your bridge is hosted elsewhere, update the URL
- Make sure it's accessible from the internet (not localhost)

---

## ❌ Issue 5: "Cannot GET /" or 404 Errors

### Symptoms:
- Site loads but shows 404 on some pages
- Navigation doesn't work
- Routes not found

### Solution:
1. Check that your project structure is correct:
   ```
   zk-hr-app/
   ├── src/
   │   └── app/
   │       ├── page.jsx (homepage)
   │       └── [other pages]
   ├── package.json
   └── next.config.js
   ```
2. Make sure you're using Next.js App Router (not Pages Router)
3. Verify all files are pushed to GitHub
4. Check Vercel build logs for any warnings

---

## ❌ Issue 6: Build Takes Too Long or Times Out

### Symptoms:
- Build runs for 10+ minutes
- Build fails with timeout error

### Solution:
1. Check build logs in Vercel
2. Look for what's taking time:
   - Installing dependencies? (normal, 1-2 minutes)
   - Building? (normal, 1-3 minutes)
   - Something else?
3. If dependencies are slow:
   - Check `package.json` - remove unused packages
   - Consider using `npm ci` instead of `npm install` (faster)
4. If build is slow:
   - Check for large files in your project
   - Remove unnecessary files
   - Check `next.config.js` for optimization settings

---

## ❌ Issue 7: "Deployment Failed" - No Specific Error

### Symptoms:
- Vercel shows "Deployment Failed" but no clear error

### Solution:
1. Click on the failed deployment
2. Go to "Build Logs" tab
3. Scroll through the logs
4. Look for:
   - Red error messages
   - "Error:" or "Failed:" keywords
   - Stack traces
5. Common causes:
   - Missing environment variables
   - Syntax errors in code
   - Missing dependencies
   - Wrong Node.js version

---

## ❌ Issue 8: Changes Not Appearing After Deployment

### Symptoms:
- Pushed code to GitHub
- Vercel deployed successfully
- But changes don't show on live site

### Solution:
1. **Clear Browser Cache:**
   - Press Ctrl+Shift+Delete
   - Clear cached images and files
   - Or use Incognito/Private mode

2. **Check Deployment:**
   - Go to Vercel dashboard
   - Verify latest deployment completed
   - Check deployment time matches when you pushed

3. **Hard Refresh:**
   - Press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - This forces browser to reload everything

4. **Check Branch:**
   - Make sure you pushed to `main` branch (or the branch Vercel watches)
   - Check Vercel Settings → Git → Production Branch

---

## ❌ Issue 9: "Module parse failed" or Syntax Errors

### Symptoms:
- Build fails with syntax errors
- "Unexpected token" errors
- Parse errors

### Solution:
1. **Test Locally First:**
   ```powershell
   cd zk-hr-app
   npm run build
   ```
2. Fix any errors locally before pushing
3. Common syntax errors:
   - Missing closing brackets `}` or `)`
   - Missing commas in objects/arrays
   - Typos in variable names
   - Wrong import paths

4. **Use ESLint:**
   ```powershell
   npm run lint
   ```
   Fix any linting errors

---

## ❌ Issue 10: Database Connection Errors

### Symptoms:
- "Connection to database failed"
- "Authentication failed"
- "Database does not exist"

### Solution:

**Step 1: Verify DATABASE_URL Format**
```
postgresql://postgres:PASSWORD@db.pshttookanrjlrmwhqnt.supabase.co:5432/postgres
```
- Replace `PASSWORD` with actual password
- No spaces in the URL
- Password might need URL encoding if it has special characters

**Step 2: Get Correct Password**
- Supabase Dashboard → Settings → Database
- Find "Database Password"
- If you forgot it, you can reset it (but this will disconnect existing connections)

**Step 3: Test Connection**
- Use a database client (like pgAdmin or DBeaver)
- Try connecting with the same credentials
- If it works there, the URL format is correct

**Step 4: Check Supabase Status**
- Go to Supabase Dashboard
- Check if project is active
- Check if database is running

---

## ✅ Quick Health Check

Run through this checklist if something's not working:

- [ ] All environment variables added to Vercel
- [ ] All variables checked for all environments (Production, Preview, Development)
- [ ] Supabase credentials are correct
- [ ] Database password is correct in DATABASE_URL
- [ ] Code builds locally (`npm run build`)
- [ ] No syntax errors in code
- [ ] All files pushed to GitHub
- [ ] Latest deployment completed successfully
- [ ] Cleared browser cache
- [ ] Checked browser console for errors (F12)

---

## 📞 Getting More Help

### Vercel Support:
1. Go to: https://vercel.com/support
2. Click "Contact Support"
3. Include:
   - Your project URL
   - Deployment URL
   - Error messages
   - Build logs

### Check Logs:
- **Vercel:** Project → Deployments → Click deployment → Build Logs
- **Browser:** F12 → Console tab (for runtime errors)
- **Supabase:** Dashboard → Logs (for database errors)

### Useful Links:
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Supabase Docs: https://supabase.com/docs

---

## 💡 Pro Tips

1. **Always test locally first:**
   ```powershell
   npm run build
   npm start
   ```

2. **Check build logs:**
   - Even successful deployments - check for warnings

3. **Use Preview Deployments:**
   - Vercel creates preview for every branch
   - Test before merging to main

4. **Monitor Environment Variables:**
   - Keep a list of all variables
   - Document what each one does
   - Update when you change them

5. **Version Control:**
   - Commit often
   - Write clear commit messages
   - Tag important releases

---

**Remember: Most issues are environment variables or build configuration. Check those first!**

