# Sistem per Menaxhimin e Turneut Sportiv

Platforme full-stack per organizimin, menaxhimin dhe ndjekjen publike te turneve sportive. Projekti perfshin panel administrimi, panel organizatori, panel gjyqtari dhe faqe publike per shikuesit.

## Live Demo

- **Frontend:** https://sistem-per-menaxhimin-e-turneut-sportiv-3gei-g8zrsjj9x.vercel.app/
- **Backend API:** https://sistem-per-menaxhimin-e-turneut-sportiv.onrender.com
- **Database:** Supabase (PostgreSQL)

## Deployment

- **Database**: Hosted on Supabase (PostgreSQL)
- **Backend**: Deployed on Render (Node/Express)
- **Frontend**: Deployed on Vercel (Vite/React)

Prisma connects to Supabase using the connection string from Supabase's dashboard (Settings → Database → Connection String).

> **Note:** Cross-domain cookies (`sameSite: "none"`) require `secure: true`, which only works over HTTPS — both Render and Vercel provide this by default.

### Backend Environment Variables (Render)

```env
PORT=3005
NODE_ENV=production
CLIENT_URL=https://sistem-per-menaxhimin-e-turneut-sportiv-3gei-g8zrsjj9x.vercel.app

DB_HOST=aws-0-eu-west-1.pooler.supabase.com
DB_USER=your-project-ref
DB_NAME=sistem_per_menaxhimin_e_turneut_sportiv
DB_PORT=5432
DATABASE_URL="postgresql://postgres.mtkgnanpjcxbohzllxou:***********@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"

JWT_SECRET=secret_here
JWT_REFRESH_SECRET=refresh_here

EMAIL_USER=email-here
EMAIL_PASS=pw-here
```

### Frontend Environment Variables (Vercel)

```env
VITE_API_URL=https://sistem-per-menaxhimin-e-turneut-sportiv.onrender.com
```

## Funksionalitetet Kryesore

- **Autentikim dhe sesione**: login/register me cookie `token` per JWT afatshkurter dhe cookie `sessionId` per sesion te qendrueshem.
- **Role dhe akses**: admin, organizator, gjyqtar dhe perdorues publik.
- **Menaxhim turnesh**: krijim turnesh, lidhje me sport, lokacion, data dhe organizator.
- **Ndeshje live**: perditesime ne kohe reale me Socket.IO dhe cron job per statuset e ndeshjeve.
- **Bracket knockout**: gjenerim, seed-im, planifikim ndeshjesh dhe avancim fituesish.
- **Faqe publike**: live matches, standings, brackets dhe players pa nevoje per login.

## Teknologjite

- **Frontend:** React, Vite, Tailwind CSS, Socket.IO Client, Framer Motion, Axios.
- **Backend:** Node.js, Express, PostgreSQL, Prisma, Socket.IO, JWT.

## Konfigurimi Lokal

Për të ekzekutuar projektin lokalisht:

1. **Klono projektin:**
   ```bash
   git clone <repo-url>
   cd Sistem-per-Menaxhimin-e-Turneut-Sportiv
   ```

2. **Backend:**
   ```bash
   cd backend
   npm install
   # Konfiguro .env lokalisht (DATABASE_URL etj.)
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

3. **Frontend:**
   ```bash
   cd frontend
   npm install
   # Konfiguro .env me VITE_API_URL=http://localhost:3005
   npm run dev
   ```

## Licenca

Ky projekt eshte krijuar per qellime akademike dhe zhvillimore.
