# Muslims Usual Day Tracking System — Authentication Update

## What's included
- Sign Up form (display name, email, password)
- Log In with email/password
- Log Out
- Restores the current Supabase session on page load
- Shows signed-in user's display name or email
- Uses Supabase Auth JS v2 from CDN
- Keeps the existing website prototype features
- SQL schema for user profiles and community tables

## Configure Supabase
1. Create a project at https://supabase.com/.
2. In Supabase, open **Project Settings → API** (or **Connect**) and copy the Project URL and anon/public key.
3. Open `config.js` and replace:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_PUBLIC_KEY`
4. In Supabase **Authentication → Providers**, make sure Email is enabled.
5. In **Authentication → URL Configuration**, set your local site URL and allowed redirect URLs. For local testing with VS Code Live Server, the URL is commonly `http://127.0.0.1:5500` or `http://localhost:5500`; use the exact URL Live Server opens.
6. Open `supabase/schema.sql` in the Supabase SQL Editor and run it.
7. Use Live Server in VS Code to run `index.html`. Do not rely on `file://` for auth redirects.
8. Try Sign Up. If email confirmation is enabled, check your inbox and confirm the address before logging in.

## Security notes
- The anon/public key is intended for frontend use only when Row Level Security is enabled and correctly configured.
- NEVER use the Supabase `service_role` key in `config.js` or any frontend code.
- Authentication is connected by this update, but Q&A and report data are still localStorage demo data. They are not synced between users yet.
- The moderator panel is still a demo and is not protected by a moderator role. Do not deploy it as a real admin panel until server-side authorization and RLS policies are implemented and tested.
- Do not store passwords in your own database; Supabase Auth handles them.
