# Sistem per Menaxhimin e Turneut Sportiv

Platforme full-stack per organizimin, menaxhimin dhe ndjekjen publike te turneve sportive. Projekti perfshin panel administrimi, panel organizatori, panel gjyqtari dhe faqe publike per shikuesit.

## Permbledhje

Aplikacioni ndihmon ne menaxhimin e ciklit kryesor te nje turneu sportiv:

- krijimi i sporteve, ekipeve, lojtareve, fushave dhe turneve;
- regjistrimi i ekipeve ne turne;
- planifikimi i ndeshjeve dhe caktimi i gjyqtareve;
- regjistrimi i rezultateve dhe ngjarjeve live;
- renditjet publike te turneve;
- gjenerimi dhe shfaqja publike e bracket-eve knockout;
- autentikimi me role per admin, organizator dhe gjyqtar.

## Funksionalitetet Kryesore

- **Autentikim dhe sesione**: login/register me cookie `token` per JWT afatshkurter dhe cookie `sessionId` per sesion te qendrueshem.
- **Role dhe akses**: admin, organizator, gjyqtar dhe perdorues publik.
- **Menaxhim turnesh**: krijim turnesh, lidhje me sport, lokacion, data dhe organizator.
- **Menaxhim ekipesh dhe lojtaresh**: regjistrim ekipesh, profile lojtaresh dhe lidhje me sportin perkates.
- **Ndeshje live**: perditesime ne kohe reale me Socket.IO dhe cron job per statuset e ndeshjeve.
- **Rezultate dhe renditje**: ruajtje rezultatesh, fitues, MVP dhe tabela standings.
- **Bracket knockout**: gjenerim, seed-im, planifikim ndeshjesh dhe avancim fituesish.
- **Faqe publike**: live matches, standings, brackets dhe players pa nevoje per login.
- **Kontakt dhe reset password**: forme kontakti dhe email per rikuperim fjalekalimi.

## Teknologjite

### Frontend

- React
- Vite
- React Router
- Tailwind CSS
- Axios
- Socket.IO Client
- Framer Motion
- Lucide React / React Icons

### Backend

- Node.js
- Express
- PostgreSQL
- Prisma
- Socket.IO
- JWT
- Cookie Parser
- Joi
- Nodemailer
- Node Cron

## Struktura e Projektit

```text
.
+-- backend/
|   +-- prisma/
|   |   +-- schema.prisma
|   +-- src/
|   |   +-- config/
|   |   +-- lib/
|   |   +-- middleware/
|   |   +-- routes/
|   |   +-- services/
|   |   +-- server.js
|   +-- package.json
+-- frontend/
|   +-- src/
|   |   +-- components/
|   |   +-- config/
|   |   +-- context/
|   |   +-- pages/
|   |   +-- socket.js
|   |   +-- App.jsx
|   +-- package.json
+-- README.md
```

## Kerkesat

Para se ta nisni projektin, sigurohuni qe keni:

- Node.js te instaluar;
- PostgreSQL te instaluar dhe nje databaze te krijuar;
- npm;
- kredencialet e databazes;
- opsionalisht nje Gmail app password per dergimin e email-eve te reset password.

## Konfigurimi Lokal

### 1. Klono projektin

```bash
git clone <repo-url>
cd Sistem-per-Menaxhimin-e-Turneut-Sportiv
```

### 2. Instalo varesite

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

### 3. Konfiguro backend-in

Krijo nje file `.env` brenda `backend/`:

```env
PORT=3005
CLIENT_URL=http://localhost:5173

DATABASE_URL="postgresql://postgres:password@localhost:5432/tournament_db?schema=public"

DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=tournament_db
DB_PORT=5432

JWT_SECRET=change_this_secret

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
NODE_ENV=development
```

`DATABASE_URL` perdoret nga Prisma. Variablat `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` dhe `DB_PORT` perdoren nga lidhja ekzistuese `pg` ne backend.

### 4. Konfiguro frontend-in

Krijo nje file `.env` brenda `frontend/`:

```env
VITE_API_URL=http://localhost:3005
```

Shenim: frontend-i ka default `http://localhost:5000`, ndersa backend-i ka default `3005`. Per kete arsye, vendosni `VITE_API_URL=http://localhost:3005` ose ndryshoni `PORT` ne backend sipas nevojes.

### 5. Gjenero Prisma client

Nga folderi `backend/`:

```bash
npx prisma generate
```

Nese po e krijoni databazen nga zero, perdorni menyren qe i pershtatet projektit tuaj:

```bash
npx prisma migrate dev
```

ose:

```bash
npx prisma db push
```

## Nisja e Projektit

Hapni dy terminale.

Terminali 1 - backend:

```bash
cd backend
npm run dev
```

Backend-i starton zakonisht ne:

```text
http://localhost:3005
```

Terminali 2 - frontend:

```bash
cd frontend
npm run dev
```

Frontend-i starton zakonisht ne:

```text
http://localhost:5173
```

## Komandat e Dobishme

Frontend:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Backend:

```bash
npm run dev
npx prisma generate
npx prisma studio
```

Aktualisht skripti `npm test` ne backend eshte placeholder dhe nuk ka suite testesh te konfiguruar.

## Rruget Kryesore

### Faqe publike

- `/` - faqja kryesore
- `/live-matches` - ndeshjet live
- `/public/standings` - renditjet publike
- `/brackets` ose `/public/brackets` - bracket-et publike
- `/public/players` - lojtaret publik
- `/contact-us` - kontakt

### Admin

- `/dashboard`
- `/sports`
- `/teams`
- `/players`
- `/venues`
- `/matches`
- `/match-results`
- `/match-referees`
- `/tournaments`
- `/referees`
- `/standings`
- `/admin/brackets`
- `/admin/live-matches`
- `/users`
- `/sessions`

### Organizator

- `/organizer/dashboard`
- `/organizer/tournaments`
- `/organizer/matches`
- `/organizer/live-matches`
- `/organizer/teams`
- `/organizer/standings`
- `/organizer/brackets`

### Gjyqtar

- `/referee/dashboard`
- `/referee/matches`
- `/referee/live-matches`
- `/referee/match-results`

## API Kryesore

Backend-i monton disa router-a kryesore:

- `/api/auth` - login, register, refresh, logout, reset password
- `/sports`
- `/players`
- `/users`
- `/venues`
- `/teams`
- `/matches`
- `/match-events`
- `/tournaments`
- `/match-results`
- `/match-referees`
- `/tournament-registrations`
- `/referees`
- `/standings`
- `/brackets`
- `/contactUs`
- `/sessions`
- `/profile`
- `/dashboard`

## Autentikimi

Pas login/register, backend-i vendos dy cookie:

- `token`: JWT afatshkurter qe perdoret per request-et e mbrojtura;
- `sessionId`: id e sesionit ne databaze, qe perdoret per te rifreskuar token-in.

Endpoint-i `/api/auth/refresh` verifikon `sessionId` dhe leshon nje `token` te ri nese sesioni eshte ende valid.

## Shenime per Zhvillim

- Sigurohuni qe PostgreSQL eshte ndezur para se te nisni backend-in.
- Sigurohuni qe `CLIENT_URL` ne backend perputhet me URL-ne e frontend-it.
- Sigurohuni qe `VITE_API_URL` ne frontend perputhet me URL-ne e backend-it.
- Per cookie auth, request-et frontend duhet te perdorin kredenciale/cookies.
- Socket.IO perdor te njejten `VITE_API_URL` si API-ja.
- Per reset password me Gmail, perdorni app password, jo password-in normal te email-it.

## Licenca

Ky projekt eshte krijuar per qellime akademike dhe zhvillimore.
