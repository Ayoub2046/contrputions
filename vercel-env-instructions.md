# Vercel Environment Variables — How to Import

Your local environment file [`vercel.env`](./vercel.env) is saved locally in this project root (and excluded from Git for security).

### Method 1: Import directly in Vercel Dashboard
1. Go to your project on [vercel.com](https://vercel.com)
2. Go to **Settings** > **Environment Variables**
3. Click the **"Import .env"** button and select your local `vercel.env` file (or paste its content)
4. Select environments: **Production**, **Preview**, and **Development**
5. Click **Save**

---

### Method 2: Copy from your local `vercel.env`
Open your local `vercel.env` file in VS Code and copy all lines into the Vercel dashboard.

---

### After Saving:
Go to **Deployments** > click `...` on the latest deployment > click **Redeploy** so the new variables take effect.
