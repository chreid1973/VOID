# Void — Vercel + Supabase + Cloudflare Setup Guide

Everything you need to go from zero to a live, fully functional deployment — entirely on free tier accounts.

---

## Stack Overview

| Layer        | Service          | Free tier limits                              |
|--------------|------------------|-----------------------------------------------|
| Frontend     | Vercel Hobby     | Unlimited deploys, 100GB bandwidth/mo          |
| Database     | Supabase Free    | 500MB storage, 5GB egress, 2 projects          |
| Auth         | Clerk Free       | 10,000 monthly active users                    |
| File storage | Cloudflare R2    | 10GB storage, 10M reads, 1M writes/mo          |
| DNS + CDN    | Cloudflare Free  | Unlimited bandwidth, DDoS protection, SSL      |

**Monthly cost: $0.** You can run a real app on this for a long time before hitting any limits.

---

## Architecture Diagram

```
User browser
     │
     ▼
Cloudflare (DNS + CDN + DDoS protection)
     │
     ▼
Vercel Edge Network (global)
     ├── Next.js pages (SSR / SSG)
     └── API Routes (serverless functions)
          ├── Supabase PostgreSQL  ← posts, comments, votes, users
          ├── Clerk               ← authentication
          └── Cloudflare R2       ← images (presigned upload, direct from browser)
```

---

## Part 1 — Supabase (Database)

### 1.1 Create your project

1. Go to **supabase.com** → Sign up (free)
2. Click **New Project**
3. Fill in:
   - **Name**: void-app (or anything)
   - **Database Password**: Generate a strong one — **save it**, you'll need it
   - **Region**: Pick the one closest to your users
4. Wait ~2 minutes for provisioning

### 1.2 Get your connection strings

Go to your project → **Settings** → **Database** → scroll to **Connection string**

You need **two** URLs:

**Transaction pooler** (for the app at runtime):
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```
Add `?pgbouncer=true&connection_limit=1` to the end.

**Direct connection** (for running migrations from your local machine):
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

Copy both into your `.env.local`:
```bash
DATABASE_URL="postgresql://postgres.xxxx:PASS@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:PASS@db.xxxx.supabase.co:5432/postgres"
```

> **Why two URLs?** Vercel serverless functions are short-lived and can't hold persistent DB connections. Supabase's PgBouncer pooler (port 6543) handles connection management. But Prisma's migration tool needs a real persistent connection, hence the direct URL just for local use.

### 1.3 Run migrations from your local machine

```bash
# Never run migrations from Vercel — always run them locally
npm run db:migrate     # runs against DIRECT_URL
npm run db:seed        # seeds initial communities
```

---

## Part 2 — Clerk (Authentication)

### 2.1 Create your app

1. Go to **clerk.com** → Sign up (free)
2. Create application → name it "Void"
3. Choose sign-in methods: **Email + Password** is fine to start; add Google/GitHub OAuth later
4. Once created, go to **API Keys** and copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### 2.2 Configure redirect URLs (for production)

In Clerk Dashboard → **Paths**:
- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- After sign-in: `/`
- After sign-up: `/`

Under **Allowed redirect URLs**, add:
- `https://yourdomain.com`
- `https://www.yourdomain.com`
- `http://localhost:3000` (for local dev)

---

## Part 3 — Cloudflare R2 (Image Storage)

### 3.1 Create a Cloudflare account

1. Go to **cloudflare.com** → Sign up (free)
2. You'll add your domain here too (Part 5)

### 3.2 Create an R2 bucket

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**
2. Name it `void-media` (or any name — update `.env.local` to match)
3. Region: Automatic (Cloudflare distributes globally)

### 3.3 Enable public access

1. Go to your bucket → **Settings** → **Public Access**
2. Enable the **R2.dev subdomain** — this gives you a public URL like:
   `https://pub-xxxxxxxxxxxx.r2.dev`
3. Copy this URL into your `.env.local` as `NEXT_PUBLIC_R2_PUBLIC_URL`

> For a custom domain on R2 (e.g. `media.yourdomain.com`), add a CNAME in Cloudflare DNS later.

### 3.4 Create API credentials

1. Cloudflare Dashboard → **R2** → **Manage R2 API Tokens**
2. **Create API Token**:
   - Permissions: **Object Read & Write**
   - Specify bucket: `void-media`
3. Copy the **Access Key ID** and **Secret Access Key** into `.env.local`
4. Also copy your **Account ID** (top-right of the R2 page)

### 3.5 How uploads work

The app never routes file bytes through Vercel (which has a 4.5MB body limit). Instead:

```
1. Browser asks your API for a presigned upload URL (/api/upload)
2. API returns: { uploadUrl, key }  ← signed R2 URL valid for 2 minutes
3. Browser uploads directly to R2 using that URL
4. Browser tells your API "upload complete, here's the key"
5. API saves the key to the database (Post.imageKey)
6. Images are served from R2's public URL — no Vercel bandwidth used
```

---

## Part 4 — Vercel (Hosting)

### 4.1 Push your code to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/yourname/void-app.git
git push -u origin main
```

### 4.2 Import to Vercel

1. Go to **vercel.com** → Sign up with GitHub (free Hobby plan)
2. **Add New Project** → Import your `void-app` repo
3. Framework: **Next.js** (auto-detected)
4. Build command: `npm run build` (default)
5. Output: `.next` (default)

### 4.3 Add environment variables

In Vercel → Project → **Settings** → **Environment Variables**, add ALL of these:

```
DATABASE_URL              → your Supabase pooler URL
DIRECT_URL                → your Supabase direct URL (for reference, not used at runtime)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL      = /sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL      = /sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = /
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = /
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME          = void-media
NEXT_PUBLIC_R2_PUBLIC_URL          = https://pub-xxxx.r2.dev
NEXT_PUBLIC_APP_URL                = https://yourdomain.com
```

Set all variables for **Production**, **Preview**, and **Development**.

### 4.4 Deploy

Click **Deploy**. Vercel builds and deploys in ~90 seconds. You get a `.vercel.app` URL immediately.

> Every `git push main` triggers an automatic redeploy. Feature branches get their own preview URLs automatically.

---

## Part 5 — Cloudflare (DNS + CDN)

### 5.1 Add your domain to Cloudflare

1. Cloudflare Dashboard → **Add a Site**
2. Enter your domain → select **Free plan**
3. Cloudflare scans your existing DNS records
4. Change your domain's nameservers (at your registrar) to the two Cloudflare provided nameservers
5. Wait for propagation (usually 5–30 minutes)

### 5.2 Point your domain at Vercel

In Cloudflare DNS → Add these records:

| Type  | Name | Content                     | Proxy status |
|-------|------|-----------------------------|--------------|
| CNAME | @    | cname.vercel-dns.com        | DNS only ☁️  |
| CNAME | www  | cname.vercel-dns.com        | DNS only ☁️  |

> **Important**: Set proxy status to **DNS only** (grey cloud), NOT proxied (orange cloud).
> Vercel has its own global edge network — proxying through Cloudflare on top can cause SSL certificate conflicts.
> You still get Cloudflare's DDoS protection and DNS speed benefits in DNS-only mode.

### 5.3 Add domain to Vercel

1. Vercel → Project → **Settings** → **Domains**
2. Add `yourdomain.com` and `www.yourdomain.com`
3. Vercel auto-provisions a Let's Encrypt SSL cert — HTTPS works in minutes

### 5.4 Optional Cloudflare extras (all free)

**Page Rules → Always use HTTPS**: Redirects any http:// traffic.

**Security → Bot Fight Mode**: ON — blocks obvious bot traffic.

**Speed → Auto Minify**: Enable HTML, CSS, JS minification.

**Caching → Cache Rules**: Cache `/_next/static/*` at the edge for better performance globally.

---

## Part 6 — Deployment Workflow

### Daily development
```bash
npm run dev           # local dev at localhost:3000
```

### Database changes
```bash
# Edit prisma/schema.prisma
npm run db:migrate    # runs locally against DIRECT_URL, creates migration file
git add prisma/
git commit -m "add xyz to schema"
git push              # Vercel redeploys — migration already applied to Supabase
```

> Never run `prisma migrate` in a Vercel build step — it requires DIRECT_URL which 
> bypasses the pooler and isn't suitable for serverless runtime.

### Deploying updates
```bash
git add .
git commit -m "feat: add comment sorting"
git push main         # triggers automatic Vercel redeploy (~60s)
```

---

## Free Tier Limits — When Will You Hit Them?

| Service       | Limit                    | Hits at roughly...               |
|---------------|--------------------------|----------------------------------|
| Supabase DB   | 500MB storage            | ~500K posts with full text       |
| Supabase      | 5GB egress/month         | ~50K active users                |
| Vercel        | 100GB bandwidth/month    | Enormous — unlikely to hit       |
| Vercel        | 100hr serverless compute | ~1M API requests/month           |
| Cloudflare R2 | 10GB storage             | ~10,000 uploaded images          |
| Cloudflare R2 | 10M reads/month          | ~10,000 users viewing images     |
| Clerk         | 10,000 MAUs              | 10,000 monthly active users      |

**Bottom line**: You can comfortably run a real community of a few thousand users entirely free.

---

## API Reference

| Method | Endpoint                   | Auth? | Description                          |
|--------|----------------------------|-------|--------------------------------------|
| GET    | /api/posts                 | No    | Feed (sort, community, page, limit)  |
| POST   | /api/posts                 | Yes   | Create post                          |
| GET    | /api/posts/:id             | No    | Single post + user vote state        |
| PATCH  | /api/posts/:id             | Yes   | Edit post (author only)              |
| DELETE | /api/posts/:id             | Yes   | Delete post (author only)            |
| GET    | /api/posts/:id/comments    | No    | Full nested comment tree             |
| POST   | /api/posts/:id/comments    | Yes   | Add comment or reply                 |
| POST   | /api/votes                 | Yes   | Vote on post or comment (±1 or 0)   |
| GET    | /api/communities           | No    | List all communities                 |
| POST   | /api/communities           | Yes   | Create community                     |
| POST   | /api/upload                | Yes   | Get presigned R2 upload URL          |

---

## Troubleshooting

**"prepared statement already exists" error from Prisma**
→ Your DATABASE_URL is pointing at the direct connection (5432) instead of the pooler (6543). Fix the URL and add `?pgbouncer=true&connection_limit=1`.

**Vercel build fails with "Can't resolve '@prisma/client'"**
→ The `postinstall` script in package.json runs `prisma generate` — make sure it's there. Vercel runs `npm install` which triggers postinstall automatically.

**Images not loading after upload**
→ Check that the R2 bucket has public access enabled and `NEXT_PUBLIC_R2_PUBLIC_URL` matches the bucket's public URL exactly (no trailing slash).

**Clerk redirects to wrong URL in production**
→ Add your production domain to the Clerk dashboard under Allowed redirect URLs.

**CNAME @ record not supported by your registrar**
→ Some registrars don't support CNAME on the root domain. Either use Cloudflare as your registrar (free transfers), or use an A record pointing to Vercel's IP: `76.76.21.21`.
#   V O I D  
 