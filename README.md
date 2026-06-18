This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment variables

Copy `.env.example` to `.env.local` for local development and set the same keys in
your Vercel project (Project → Settings → Environment Variables). See `.env.example`
for the full list.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase **Transaction pooler** URI (port 6543). |
| `NEXTAUTH_SECRET` (or `AUTH_SECRET`) | yes | Random secret used to sign JWTs. Generate with `openssl rand -base64 32`. **Must be set in production or login fails.** |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase anon/publishable key. |
| `NEXTAUTH_URL` (or `AUTH_URL`) | optional | Only set in production if you override host detection. **Never set this to `http://localhost:3000` in Vercel** — it breaks login/redirects. The app sets `trustHost: true`, so this can usually be omitted on Vercel. |
| `INVITE_CODE` | optional | Registration invite code (defaults to `friends2024`). |

### Troubleshooting deployed login

If login works locally but **fails on Vercel**, it is almost always an environment-variable problem (the code already sets `trustHost: true`):

1. **`error=Configuration` / server error** → `NEXTAUTH_SECRET`/`AUTH_SECRET` is missing in Vercel. Add it and redeploy.
2. **Redirects to `localhost`** → `NEXTAUTH_URL`/`AUTH_URL` is set to a localhost value in Vercel. Delete it (or set it to the production domain) and redeploy.
3. **"Invalid email or password"** → Vercel's `DATABASE_URL` points to a different database than your local one, so the account/password isn't there. Point it at the same Supabase project.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
