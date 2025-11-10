# How to Run the Employee Portal

## ✅ What I Just Did For You

1. ✅ Generated a secure JWT secret (random password for encrypting login tokens)
2. ✅ Created `.env.local` file with the JWT secret
3. ✅ Everything is ready to run!

## 🚀 How to Start the Application

### Step 1: Open Terminal in the zk-hr-app folder

You're already in the right folder: `D:\coding\zkt-test\zk-hr-app`

### Step 2: Start the Development Server

Run this command:

```bash
npm run dev
```

### Step 3: Open Your Browser

Once you see "Ready" in the terminal, open:

- **Employee Login**: http://localhost:3000/employee/login
- **Admin Dashboard**: http://localhost:3000/

## 📝 What is JWT_SECRET?

**JWT_SECRET** is like a password that encrypts your login tokens. Think of it like:
- A secret key that locks/unlocks your login sessions
- It's stored in `.env.local` (not in your code, so it's safe)
- I generated a random secure one for you: `SD9D6Bbh2tzqctAMifKg8RJAtMDKZvcl2xnwS2kzMRkECMkD+zRbW72mrJFF3ehN`

**You don't need to understand it** - it's just a technical requirement. The important thing is it's set up and working! ✅

## 🎯 Quick Test

1. Start the server: `npm run dev`
2. Go to: http://localhost:3000/employee/login
3. Enter a ZK User ID (like `1` or `2` - any employee ID from your database)
4. If no password is set, you'll be asked to create one
5. After login, you'll see the employee dashboard!

## 💡 Tips

- **Stop the server**: Press `Ctrl + C` in the terminal
- **Restart**: Just run `npm run dev` again
- **Check if it's running**: Look for "Ready" message in terminal
- **Port 3000 busy?**: The terminal will tell you and use a different port

## ❓ Troubleshooting

**"JWT_SECRET not found" error?**
- The `.env.local` file should be in `zk-hr-app` folder
- Make sure it contains: `JWT_SECRET=SD9D6Bbh2tzqctAMifKg8RJAtMDKZvcl2xnwS2kzMRkECMkD+zRbW72mrJFF3ehN`

**"Port already in use"?**
- Another app is using port 3000
- Either stop that app, or the server will use a different port (check terminal output)

**Can't login?**
- Make sure the employee exists in your database
- Check that the ZK User ID is correct
- If password doesn't work, admin can reset it from employee management page

---

**That's it! You're ready to go!** 🎉



