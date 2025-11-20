# ✅ Deployment Checklist - Print This!

Use this checklist to make sure you don't miss anything when deploying.

---

## 📦 Pre-Deployment Checklist

- [ ] Code is working locally (test it first!)
- [ ] All files are saved
- [ ] No sensitive data in code (passwords, keys, etc.)
- [ ] `.env.local` file exists (for reference)

---

## 🔵 GitHub Setup

- [ ] Created GitHub account
- [ ] Installed Git or GitHub Desktop
- [ ] Created new repository on GitHub
- [ ] Copied all project files to repository
- [ ] Committed and pushed code to GitHub
- [ ] Verified code appears on GitHub.com

**Repository URL:** _________________________________

---

## 🔴 Vercel Setup

- [ ] Created Vercel account (signed up with GitHub)
- [ ] Clicked "Import Project"
- [ ] Selected my repository from list
- [ ] Verified framework is set to "Next.js"

---

## 🔐 Environment Variables (CRITICAL!)

Add each variable and check all environments (Production, Preview, Development):

- [ ] `SUPABASE_URL` = `https://pshttookanrjlrmwhqnt.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = _____________________________
  - *Got from: Supabase Dashboard → Settings → API → service_role key*
- [ ] `DATABASE_URL` = `postgresql://postgres:________@db.pshttookanrjlrmwhqnt.supabase.co:5432/postgres`
  - *Replace blank with your database password*
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://pshttookanrjlrmwhqnt.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- [ ] `PYTHON_BRIDGE_URL` = `http://localhost:8080/api/zk/logs` (or your hosted URL)

**All variables checked for:** ☑ Production ☑ Preview ☑ Development

---

## 🚀 Deployment

- [ ] Clicked "Deploy" button
- [ ] Waited for build to complete (2-5 minutes)
- [ ] Saw "Congratulations! Your project has been deployed"
- [ ] Copied the deployment URL

**Live URL:** _________________________________

---

## 🧪 Post-Deployment Testing

- [ ] Opened the live URL in browser
- [ ] Tested homepage loads
- [ ] Tested employee list page
- [ ] Tested employee profile page
- [ ] Tested login/authentication (if applicable)
- [ ] Checked browser console for errors (F12 → Console)
- [ ] Verified database connection works

**Issues Found:** _________________________________

---

## 📝 Notes

**Date Deployed:** _______________

**Deployment Notes:**
_________________________________
_________________________________
_________________________________

---

## 🔄 Future Updates

When updating your app:
- [ ] Make changes to code
- [ ] Commit and push to GitHub
- [ ] Wait for Vercel auto-deploy (2-5 minutes)
- [ ] Test changes on live site

---

## 📞 Support Contacts

**Vercel Support:** support@vercel.com
**GitHub Support:** https://docs.github.com
**Supabase Support:** https://supabase.com/support

---

**Print this page and check off items as you complete them!**









