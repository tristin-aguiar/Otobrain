# Putting Otobrain online

About 30 minutes, no coding. You will use three free accounts: GitHub (already done), Supabase (database, logins, file storage) and Vercel (hosting).

Never paste passwords or keys into a chat. They go only into the Supabase and Vercel websites.

## 1. Create the database (Supabase)

1. Go to https://supabase.com and sign up (signing in with GitHub is easiest).
2. Click **New project**. Name it `otobrain`, create a strong database password and save it in your password manager, pick the region closest to you, and create the project. It takes a minute or two.
3. In the left menu open **SQL Editor** → **New query**.
4. Open `supabase/migrations/0001_v1_schema.sql` in this repository on GitHub, click **Copy raw file**, paste it into the editor and click **Run**. It should say "Success. No rows returned".
5. Click **New query** again and do the same with `supabase/migrations/0002_program_lock_and_authors.sql`.
6. Open **Project Settings** → **API** (may be called **API Keys** or **Data API**). Keep this tab open: you need the **Project URL** and the **anon public** key (newer projects may call it the **publishable** key).

## 2. Put the site online (Vercel)

1. Go to https://vercel.com and sign up with GitHub.
2. Click **Add New…** → **Project**, find **Otobrain**, click **Import**.
3. Open **Environment Variables** and add two:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL from Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon (publishable) key from Supabase
4. Click **Deploy**. When it finishes, copy your site address (something like `https://otobrain-xxxx.vercel.app`).

## 3. Connect logins to your site address

Back in Supabase, open **Authentication** → **URL Configuration**:

- **Site URL**: your Vercel address
- **Redirect URLs**: add your Vercel address followed by `/auth/confirm`, e.g. `https://otobrain-xxxx.vercel.app/auth/confirm`

Save.

## 4. Create your account and make yourself admin

1. Open your site, click **Create an account**, and sign up.
2. Click the link in the confirmation email, then sign in.
3. In Supabase **SQL Editor**, run this once with your email:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

4. Reload the site. You will see **+ New** buttons on every library page and **Import chapters** on the curriculum.

## 5. Optional, later

- **Your own domain**: in Vercel open the project → **Settings** → **Domains**. Then update the two Supabase URLs from step 3.
- **Email for other users**: Supabase's built-in email is limited to a few messages per hour, which is fine for you alone. Before inviting others, set up a sending service under **Authentication** → **Emails** → **SMTP settings**.
- **Backups**: check what your Supabase plan includes before other people rely on the site.

## Adding content

- **Curriculum** → **Import chapters**: pick a book, paste the table of contents one chapter per line as `number | title | subspecialty | subsite`, and import.
- **Pathology, Consult guides, Radiology, Basic science** → **+ New**: each form starts with the section template. Start each section with `##` and put one point per line. Tick **Published** when an entry is ready for others to see; until then it is a draft only you can see.
- **This week in Otolaryngology** → **+ New post**: choose a category, who can see it, and optionally a publish time.

Never enter patient names, record numbers, dates of birth or other identifiers anywhere on the site.
