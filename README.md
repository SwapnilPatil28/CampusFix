# CampusFix

**A campus issue board where students can be heard and operations teams can show their work.**

CampusFix helps students report problems with campus facilities, technology, safety, dining, and shared spaces. Other students can say whether they are affected, add context, and follow reports. Operations staff see issues routed to their team and publish status updates that everyone can follow.

## Problem and target users

Campus problems are often reported in scattered chats, passed along informally, or repeated because students cannot see whether anyone has already raised them. Students need a clear place to surface shared problems; campus operations teams need a useful queue and a way to communicate progress.

CampusFix is for campus students and the staff responsible for campus operations.

## Key workflows

1. **Report an issue:** Sign in, describe what is wrong, choose a category and campus location, and optionally attach one photo (up to 5 MB) or video (up to 50 MB). The backend uploads the media and creates the report in one request.
2. **Show campus impact:** Students can mark “I’m affected” or “Haven’t experienced it.” Each account has one current response per report and can change or clear it.
3. **Discuss and follow:** Students add comments and follow reports. Following can be viewed from the **Following** sidebar filter; new status updates and the timeline are shown on the issue page.
4. **Resolve transparently:** Staff see an oldest-first queue for their team, open a report, and publish a status and note. The dashboard’s live status totals include reopened reports in the Open count. Students can see the full update history. If a resolved issue is still happening, students other than the reporter can flag it for staff review. The first flag changes the internal status to **Reported still unresolved**, while student views continue to show **Resolved**. Staff can mark it resolved or move it back into active work. If the last student flag is withdrawn, the status returns to Resolved; when the reporting student reopens it, flags clear and it returns to the active queue.
5. **Keep reports accurate:** A student can directly reopen their own issue only after Operations resolves it, or delete their report at any status. Deletion also removes its comments and attached Cloudinary media.
6. **Find the right reports:** Search titles, descriptions, and locations; each search word can match anywhere in those fields, including part of a word. Filter by team, category, and status; sort by recent, trending, or oldest.
7. **Manage an account:** Campus members register with a Scaler email. Students provide a roll number; operations staff provide a department, employee ID, and private access code. The profile page supports a photo, raised issues, comments, and followed reports.

## Roles and permissions

- **Student:** Register, report issues, attach a photo or video, respond to impact polls, comment, follow reports, and flag a resolved report that still needs work.
- **Operations staff:** All student actions plus a team-specific queue and status updates for reports assigned to their team.
- **Administrator:** Can update reports across teams.

Registration supports Scaler students and campus operations staff. Student registration requires a roll number. Operations registration requires a department, employee ID, and the private `OPS_ACCESS_CODE` configured by the administrator. Public registration can create an operations staff account, but cannot create an administrator account. Sign-in and registration accept only `@sst.scaler.com` and `@scaler.com` addresses.

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, Framer Motion |
| Backend | Node.js, Express 5 REST API |
| Persistence | MongoDB and Mongoose |
| Identity | JWT in an HttpOnly cookie, bcrypt password hashing |
| Media storage | Cloudinary Node.js SDK, Multer memory upload |
| Other | Axios, React Toastify, Lucide icons |

## Architecture

The React single-page app talks to an Express API. Express verifies the signed HttpOnly session cookie for account-specific actions, enforces Scaler email domains, validates inputs, and applies role/team checks before allowing staff updates. Operations registration checks a server-only access code. Mongoose stores users, profile details, reports, impact responses, comments, followers, and status history. Report lists support server-side search and filters. Multer holds one size-limited image or video in memory; the backend sends it to Cloudinary using the signed Node.js SDK, then stores its secure delivery URL and asset ID with the report or account. Cloudinary credentials and the operations code stay on the server.

```text
React + Vite
   ├── Public issue feed and search
   ├── Student report and issue detail workflows
   └── Staff queue and status updates
             │ JSON + HttpOnly JWT cookie
             ▼
Express 5 API ─── MongoDB / Mongoose
      └────────── Cloudinary image storage
```

## Run locally

### Prerequisites

- Node.js 18 or later and npm
- A MongoDB instance (local MongoDB or MongoDB Atlas)
- A Cloudinary account for report photo and video uploads (optional while developing other features)

### Install and configure

From the repository root:

```bash
npm run install:all
```

Copy the environment templates to `.env` and fill in the MongoDB URL and a long random JWT secret:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Windows PowerShell equivalent:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

`backend/.env` needs at least:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MONGODB_URL=mongodb://127.0.0.1:27017/campusfix
JWT_SECRET=replace_with_a_long_random_secret
OPS_ACCESS_CODE=replace_with_a_private_operations_registration_code
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Cloudinary’s cloud name and API key/secret are available in the Cloudinary Console. Keep the API secret in `backend/.env` only. If those three settings are absent, the app still runs but media uploads return a clear configuration message. If Cloudinary returns HTTP 403, inspect upload restrictions and product environment settings in the Cloudinary Console; a 403 means Cloudinary disallowed the upload request.

### Start the application

Open two terminals at the repository root:

```bash
npm run dev:backend
npm run dev:frontend
```

The app opens at [http://localhost:5173](http://localhost:5173). The API health check is [http://localhost:5000/api/health](http://localhost:5000/api/health).

## Environment variables

| Variable | Service | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | Backend | No | Express port; defaults to `5000` |
| `NODE_ENV` | Backend | No | Set `production` for secure cross-site cookies |
| `FRONTEND_URL` | Backend | Production | Comma-separated exact browser origins allowed to make credentialed API requests; local default is `http://localhost:5173` |
| `MONGODB_URL` | Backend | Yes | MongoDB connection string |
| `JWT_SECRET` | Backend | Yes | Secret used to sign session tokens; keep private |
| `OPS_ACCESS_CODE` | Backend | For operations registration | Private code shared with authorized staff; never expose it in the frontend |
| `CLOUDINARY_CLOUD_NAME` | Backend | For media uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Backend | For media uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Backend | For media uploads | Cloudinary API secret; never expose it in frontend variables |
| `VITE_API_URL` | Frontend | No | API base URL; defaults to `http://localhost:5000/api` |

Keep `.env` files and credentials out of Git. The example files contain placeholders only.

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an allowed-domain student or code-authorized operations account |
| `POST` | `/api/auth/login` | Sign in and set HttpOnly session cookie |
| `GET` | `/api/auth/me` | Get the signed-in user |
| `GET` | `/api/auth/profile/:id` | View a profile, issue activity, comments, and followed reports (sign-in required) |
| `POST` | `/api/auth/profile/avatar` | Upload a profile image (multipart `image`, max 5 MB) |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/issues` | Search and filter the issue feed |
| `POST` | `/api/issues` | Create a report with optional multipart `image` (max 5 MB), or JSON without media |
| `POST` | `/api/issues/video` | Create a report with multipart `video` (max 50 MB) |
| `GET` | `/api/issues/:id` | Get report, comments, and status timeline |
| `PATCH` | `/api/issues/:id/reopen` | Let the reporting student reopen a currently Ops-resolved issue |
| `DELETE` | `/api/issues/:id` | Delete the reporting student's issue and associated comments/media |
| `POST` | `/api/issues/:id/vote` | Set or clear an impact response |
| `POST` | `/api/issues/:id/comments` | Add a comment |
| `DELETE` | `/api/issues/:id/comments/:commentId` | Delete your own comment |
| `POST` | `/api/issues/:id/comments/:commentId/like` | Like a comment |
| `DELETE` | `/api/issues/:id/comments/:commentId/like` | Remove a comment like |
| `POST` | `/api/issues/:id/follow` | Follow or unfollow a report |
| `POST` | `/api/issues/:id/reopen-requests` | Flag a resolved issue as still unresolved |
| `DELETE` | `/api/issues/:id/reopen-requests` | Withdraw your unresolved flag |
| `PATCH` | `/api/issues/:id/status` | Staff update status and public note |
| `GET` | `/api/issues/staff/queue` | Team-scoped unresolved issue queue |
| `GET` | `/api/issues/staff/queue/reopen-requests` | Team-scoped resolved issues students have flagged as still unresolved |

## Deploy to Render and Vercel

The repository is a monorepo with two deployable applications. Deploy the API first so you have its public URL, then deploy the frontend. Do not add `.env` files or credentials to GitHub.

### 1. Prepare MongoDB Atlas and Cloudinary

- Create a MongoDB Atlas database and a database user with access to the CampusFix database. Configure Atlas network access so the Render service can connect. Keep the database password URL-encoded if it contains reserved URL characters.
- Confirm the Cloudinary account has the `cloud_name`, API key, and API secret needed for signed server uploads. Images and videos are uploaded by the Render API, not directly by the browser.
- Generate a unique, long random `JWT_SECRET` and choose a private `OPS_ACCESS_CODE`. The latter allows trusted operations staff to register; it does not grant administrator access.

### 2. Deploy the backend on Render

Create a **Web Service** from the GitHub repository with these settings:

| Setting | Value |
| --- | --- |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Add these environment variables in the Render service dashboard (use real values there, never in this README or Git):

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URL` | Your Atlas connection string |
| `JWT_SECRET` | Your generated private secret |
| `OPS_ACCESS_CODE` | Your private operations registration code |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FRONTEND_URL` | Exact allowed frontend origins, comma-separated if needed, e.g. `https://campusfix.vercel.app,https://campusfix-git-main-yourname.vercel.app` |

Render supplies `PORT`; the server uses it automatically. After deploy, open `https://YOUR-RENDER-SERVICE.onrender.com/api/health` and confirm it returns a JSON `status: "ok"` response. Copy the service origin (without `/api`) for the frontend setting.

### 3. Deploy the frontend on Vercel

Import the same GitHub repository as a Vercel project and set:

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite (or Other) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Add the Vercel environment variable `VITE_API_URL` with the full API base URL, for example `https://YOUR-RENDER-SERVICE.onrender.com/api`. Set it for the Production environment (and Preview too if you plan to use preview deployments). Vite embeds this value at build time, so redeploy after changing it.

`frontend/vercel.json` already rewrites client-side routes to `index.html`, so directly opening routes such as `/issues/:id` or `/profile/:id` works after deployment.

### 4. Connect the two deployed origins

Once Vercel provides the production domain, set Render’s `FRONTEND_URL` to that exact origin (scheme and host only; no trailing slash or path), save the variable, and redeploy/restart the Render service. To use Vercel preview deployments, add each exact preview origin to the comma-separated list; `*.vercel.app` wildcards are not accepted. If you add a custom domain to Vercel, include that origin too.

Production sign-in uses an HttpOnly, Secure cookie with `SameSite=None` and Axios sends credentials. This is necessary for the separate Vercel and Render domains. Verify sign-in, refresh, sign-out, and an authenticated action in a normal browser session after deployment. Browser privacy settings that block third-party cookies can affect a cross-domain cookie. For the most reliable browser session behavior, use a custom domain and serve the API under the same site (for example, `campus.example.edu` and `api.campus.example.edu`) or configure a Vercel external rewrite for `/api/:path*` to the Render API and set `VITE_API_URL=/api`. Keep the SPA fallback rewrite after the API rewrite if you add one.

### 5. Smoke-check the live app

- Open the Vercel home page and directly load an issue and profile URL.
- Register a student with an allowed Scaler email, sign in, and refresh to confirm the session persists.
- Create a report, comment on it, and try search/filtering.
- Test a photo and (if needed) a video upload to confirm Render, Cloudinary, and request size settings work together.
- Register an operations account using the private access code, then confirm its team queue and status update.
- Open the site in a private/incognito window to verify the public feed works without a pre-existing session. Do not use demo credentials; none are configured.

Report media is stored in Cloudinary, so it persists independently of Render’s filesystem. The API accepts an image up to 5 MB or video up to 50 MB. A Render free service may take time to wake after inactivity; wait for the first health check before testing the frontend.

## Project structure

```text
CampusFix/
├── backend/
│   ├── middleware/      # Authentication, authorization, image/video upload filters
│   ├── config/          # Cloudinary server-side configuration and stream uploads
│   ├── models/          # User, issue, and comment schemas
│   ├── routes/          # Auth, issue, and comment API workflows
│   ├── index.js
├── frontend/
│   └── src/             # React app and responsive styling
├── package.json         # Root helper scripts
└── README.md
```

## Product notes

Campus names and reports already in a development database may be sample content. Demo login accounts are not provided. Configure a private `OPS_ACCESS_CODE` before inviting operations staff to register; administrator access must be provisioned separately by a trusted operator.
