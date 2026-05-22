# Setup Guide – Golf Practice OS

This guide walks you through everything needed to go from this codebase to a fully deployed, production-ready app with real user accounts, data persistence, and Google Calendar integration.

---

## 1. Initializing Git

```bash
# From the project root
git init
git add .
git commit -m "Initial commit: Golf Practice OS foundation"
```

Create a `.gitignore` (already included in the project) if you haven't already.

---

## 2. Creating a GitHub Repository

### Option A – Using GitHub CLI (recommended)

```bash
gh auth login
gh repo create golf-practice-os --public --source=. --remote=origin --push
```

### Option B – Manual

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `golf-practice-os`
3. Make it **Public** (required for free Vercel)
4. Do **not** initialize with README (you already have one)
5. Click **Create repository**
6. Follow the instructions to push your local repo:

```bash
git remote add origin https://github.com/YOUR_USERNAME/golf-practice-os.git
git branch -M main
git push -u origin main
```

---

## 3. Deploying to Vercel (Free Hobby Tier)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project**.
3. Import your `golf-practice-os` repository.
4. Vercel should auto-detect Next.js — leave all defaults.
5. **Before clicking Deploy**, add the following Environment Variables (you'll get them from Supabase in the next step):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

6. Click **Deploy**.

After the first deployment:
- Go to your project → **Settings → Environment Variables**
- Add the same two variables for **Production**, **Preview**, and **Development**.
- Redeploy if needed.

Your app will be live at something like `https://golf-practice-os.vercel.app`.

---

## 4. Setting Up Supabase

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to you.
3. Save the **Project URL** and **anon public** key (you'll need them for Vercel).

### Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**.
2. Open the file `supabase/schema.sql` from this project.
3. Copy and paste the entire contents into the SQL editor.
4. Click **Run**.

This creates the `practice_sessions` table with proper Row Level Security (RLS).

### Step 3: (Recommended) Enable Google Login

1. In Supabase, go to **Authentication → Providers**.
2. Enable **Google**.
3. Follow the instructions to create OAuth credentials in Google Cloud Console.
4. Add the following Authorized Redirect URI:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```

### Step 4: Add Environment Variables to Vercel

In Vercel, add:

- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

---

## 5. Google Calendar Integration

The one-click "Add to Google Calendar" feature works **out of the box** with zero extra configuration.

It uses the standard Google Calendar URL scheme (`calendar.google.com/calendar/render?action=TEMPLATE...`).

No API keys or OAuth setup is required for basic functionality.

**Optional future upgrade**: If you want two-way sync later, you can add Google OAuth through Supabase (the infrastructure is already prepared).

---

## 6. Post-Deployment Checklist

- [ ] Deployed successfully on Vercel
- [ ] Environment variables added (Supabase URL + anon key)
- [ ] Supabase schema executed
- [ ] Can sign up / log in with email or Google
- [ ] Can complete a Block Practice session and see it in History
- [ ] Can plan a session in Calendar and add it to Google Calendar
- [ ] App is installable as PWA (see icon section below)

---

## 7. Generating Proper PWA Icons (Important for Install Experience)

The app is already configured as a PWA. For the best native feel, you need proper PNG icons.

### Recommended Sizes

- `icon-192x192.png`
- `icon-512x512.png`
- `icon-maskable-512.png` (maskable version for Android)

### How to Generate Them

1. Open the file `public/icons/icon.svg` (included in the project).
2. Use one of these free tools:
   - [RealFaviconGenerator](https://realfavicongenerator.net)
   - [Progressier PWA Icon Generator](https://progressier.com/pwa-icon-generator)
   - Or any online SVG → PNG resizer

3. Upload the SVG and generate the required sizes.

4. Place the generated files in:
   ```
   public/icons/
   ```

5. Update `app/manifest.ts` if the filenames differ from the defaults.

Alternatively, the AI-generated images in your `.grok/sessions/.../images/` folder can be used as a starting point — just resize them to the required dimensions.

---

## 8. Local Development

```bash
npm install
cp .env.example .env.local
# Add your Supabase keys to .env.local
npm run dev
```

Visit `http://localhost:3000/login` to test authentication locally.

---

## 9. Generating Supabase Types (Optional but Recommended)

After your schema is live:

```bash
npx supabase gen types typescript --linked > types/supabase.ts
```

Then restart your dev server.

---

## 10. Common Issues & Fixes

- **"Not authenticated" errors**: Make sure environment variables are set in Vercel for all environments.
- **Google login not working**: Check that you added the correct redirect URI in both Supabase and Google Cloud Console.
- **PWA not installable**: Ensure you're on HTTPS (Vercel provides this) and have valid icons.
- **Sessions not saving**: Verify RLS policies are enabled and the schema was run correctly.

---

## You're Done!

You now have a fully functional, production-grade **Golf Practice OS** with:

- Real user accounts (email + Google)
- Persistent practice history
- Block, Random, and 6 Games
- Planning + one-click Google Calendar
- Installable PWA
- Beautiful first-time experience

Enjoy your deliberate practice!

If you want to add more features later (Mixed Sessions, stats dashboard, coach sharing, etc.), the codebase is structured to make that easy.

---

**Need help?** Open an issue in your GitHub repo or reach out.

Happy golfing! ⛳
