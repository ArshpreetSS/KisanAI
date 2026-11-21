# Supabase Setup Guide for Kisan AI

This guide walks you through setting up Supabase as the backend database and Email OTP authentication system for Kisan AI.

---

### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in (or create a free account).
2. Click **New project**.
3. Fill in:
   - **Name**: `Kisan AI`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Choose the closest region (e.g. `ap-south-1` Mumbai if you are in India).
4. Click **Create new project** and wait ~1-2 minutes for provisioning to finish.

---

### Step 2: Get Your Project URL & Publishable Key
1. In your Supabase Dashboard, click the **Project Settings** (gear icon) in the bottom-left sidebar.
2. Select **API** under Configuration.
3. Locate the following two values:
   - **Project URL**: e.g., `https://your-project-id.supabase.co`
   - **Project API Keys** → **anon / public**: Starts with `eyJhbGci...`
4. Copy both values. *(Never use or expose the `service_role` key in frontend code!)*

---

### Step 3: Run Database Migrations (SQL Setup)
1. In the left sidebar of your Supabase dashboard, click the **SQL Editor** (icon with `>_`).
2. Click **New Query**.
3. Copy the entire contents of `supabase/schema.sql` (or `supabase/migrations/20261121000000_create_profiles.sql`) and paste it into the editor.
4. Click **Run** (or press `Ctrl+Enter`).
5. You should see `Success. No rows returned`.
6. Click **Table Editor** in the left sidebar; you will now see the `public.profiles` table with Row Level Security (RLS) enabled.

---

### Step 4: Configure Email OTP Template (6-Digit Token)
By default, Supabase sends a Magic Link URL. To ensure users receive a **6-digit numerical OTP** instead:
1. In your Supabase Dashboard, go to **Authentication** → **Email Templates**.
2. Select the **Magic Link** template (or **Confirmation** template).
3. Change the subject to: `Your Kisan AI Verification Code`
4. Replace the email body with the following:

```html
<h2>Your Kisan AI Verification Code</h2>
<p>Use the following 6-digit one-time passcode (OTP) to sign in to your Kisan AI account:</p>
<h1 style="font-size: 32px; letter-spacing: 6px; font-family: monospace; color: #16a34a; font-weight: bold;">{{ .Token }}</h1>
<p>This code is valid for 60 minutes. Do not share this code with anyone.</p>
<p>If you did not request this code, you can safely ignore this email.</p>
```

5. Click **Save**.

---

### Step 5: Configure Site URL & Redirect URLs
1. In your Supabase Dashboard, navigate to **Authentication** → **URL Configuration**.
2. Set **Site URL**:
   - For local development: `http://localhost:3000`
   - For production (Vercel): `https://your-vercel-domain.vercel.app`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/**`
   - `https://your-vercel-domain.vercel.app/**`
4. Click **Save**.

---

### Step 6: Add Environment Variables
Add your credentials to your local `.env` and to your Vercel Dashboard:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

On Vercel:
1. Go to your Project on Vercel → **Settings** → **Environment Variables**.
2. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
3. Redeploy.

---

### Step 7: Test Real Email OTP Login
1. Open the Kisan AI website (`http://localhost:3000` or your Vercel deployment).
2. Go to Interface 4 (or click **Sign In** in the top navigation).
3. Enter your real email address and click **Send 6-Digit Verification Code**.
4. Check your inbox for the 6-digit OTP code.
5. Enter the 6 digits in the verification boxes.
6. You will be authenticated, your session will persist across page refreshes, and your profile will be stored in your Supabase `profiles` table!
