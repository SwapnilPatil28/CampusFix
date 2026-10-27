# CampusFix

**A campus issue board where students can be heard and operations teams can show their work.**

CampusFix helps students report problems with campus facilities, technology, safety, dining, and shared spaces. Other students can say whether they are affected, add context, and follow reports. Operations staff see issues routed to their team and publish status updates that everyone can follow.

## Problem and target users

Campus problems are often reported in scattered chats, passed along informally, or repeated because students cannot see whether anyone has already raised them. Students need a clear place to surface shared problems; campus operations teams need a useful queue and a way to communicate progress.

CampusFix is for campus students and the staff responsible for campus operations.

## Key workflows

1. **Report an issue:** Sign in, describe what is wrong, choose a category and campus location, tag an operations team, and optionally attach a photo.
2. **Show campus impact:** Students can mark “I’m affected” or “Haven’t experienced it.” Each account has one current response per report and can change or clear it.
3. **Discuss and follow:** Students add comments and follow reports. Following can be viewed from the **Following** sidebar filter; new status updates and the timeline are shown on the issue page.
4. **Resolve transparently:** Staff see an oldest-first queue for their team, open a report, and publish a status and note. Students can see the full update history.
5. **Find the right reports:** Search titles, descriptions, and locations; filter by team, category, and status; sort by recent, trending, or oldest.

## Roles and permissions

- **Student:** Register, report issues, attach a photo, respond to impact polls, comment, and follow reports.
- **Operations staff:** All student actions plus a team-specific queue and status updates for reports assigned to their team.
- **Administrator:** Can update reports across teams.

New registrations are students by default. Staff and administrator accounts should be provisioned through a trusted process; this demo does not expose a public staff-role signup form. Demo staff and administrator accounts are included in the seed data.

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

The React single-page app talks to an Express JSON API. Express verifies the signed HttpOnly session cookie for account-specific actions, validates inputs, and applies role/team checks before allowing staff updates. Mongoose stores users, reports, impact responses, comments, followers, and status history. Report lists support server-side search and filters. Multer holds each size-limited upload in memory; the backend sends it to Cloudinary using the signed Node.js SDK, then stores the secure delivery URL and asset ID with the report. Cloudinary credentials stay on the server.

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
- A Cloudinary account for report photo uploads (optional while developing other features)

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
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

`frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Cloudinary’s cloud name and API key/secret are available in the Cloudinary Console. Keep the API secret in `backend/.env` only. If those three settings are absent, the app still runs but the upload endpoint returns a clear configuration message.

### Start the application

Open two terminals at the repository root:

```bash
npm run dev:backend
npm run dev:frontend
```

The app opens at [http://localhost:5173](http://localhost:5173). The API health check is [http://localhost:5000/api/health](http://localhost:5000/api/health).

### Optional demo data

On a **fresh, empty database**, run this once from the repository root:

```bash
npm run seed
```

The seed script adds sample users, reports, comments, and status histories. It is intentionally a one-time seed and will conflict with the unique email index if run again without clearing those sample records.

| View | Email | Password |
| --- | --- | --- |
| Student | `student@campusfix.demo` | `CampusFix2026!` |
| Facilities staff | `facilities@campusfix.demo` | `CampusFix2026!` |
| IT staff | `it@campusfix.demo` | `CampusFix2026!` |
| Administrator | `admin@campusfix.demo` | `CampusFix2026!` |

These are demo-only credentials. Do not use them for a public production database. Assign staff and administrator roles through a trusted administrator workflow or a controlled database operation; never let public registration choose a privileged role.

## Environment variables

| Variable | Service | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | Backend | No | Express port; defaults to `5000` |
| `NODE_ENV` | Backend | No | Set `production` for secure cross-site cookies |
| `FRONTEND_URL` | Backend | No | Allowed browser origin for credentialed API requests |
| `MONGODB_URL` | Backend | Yes | MongoDB connection string |
| `JWT_SECRET` | Backend | Yes | Secret used to sign session tokens; keep private |
| `CLOUDINARY_CLOUD_NAME` | Backend | For photo uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Backend | For photo uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Backend | For photo uploads | Cloudinary API secret; never expose it in frontend variables |
| `VITE_API_URL` | Frontend | No | API base URL; defaults to `http://localhost:5000/api` |

Keep `.env` files and credentials out of Git. The example files contain placeholders only.

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a student account |
| `POST` | `/api/auth/login` | Sign in and set HttpOnly session cookie |
| `GET` | `/api/auth/me` | Get the signed-in user |
| `POST` | `/api/auth/logout` | Clear the session cookie |
| `GET` | `/api/issues` | Search and filter the issue feed |
| `POST` | `/api/issues` | Create a report |
| `GET` | `/api/issues/:id` | Get report, comments, and status timeline |
| `POST` | `/api/issues/upload` | Upload a JPG, PNG, GIF, or WebP image (max 5 MB) |
| `POST` | `/api/issues/:id/vote` | Set or clear an impact response |
| `POST` | `/api/issues/:id/comments` | Add a comment |
| `POST` | `/api/issues/:id/follow` | Follow or unfollow a report |
| `PATCH` | `/api/issues/:id/status` | Staff update status and public note |
| `GET` | `/api/issues/staff/queue` | Team-scoped unresolved issue queue |

## Deployment

1. Create a MongoDB Atlas database and allow the backend host to connect. Use a restricted database user and a strong JWT secret.
2. Deploy `backend` as a Node service with `npm install` as the build command and `npm start` as the start command. Configure `MONGODB_URL`, `JWT_SECRET`, all three Cloudinary values, `NODE_ENV=production`, and `FRONTEND_URL` in the host’s secret settings.
3. Deploy `frontend` as a Vite static app with `npm run build` and `dist` as the output directory. Set `VITE_API_URL` to the deployed API origin plus `/api`.
4. Set `FRONTEND_URL` to the exact deployed frontend origin. Production auth cookies use `Secure` and `SameSite=None` to support a separately hosted frontend and API.
5. Report photos are stored in Cloudinary, so they persist independently from the backend service’s filesystem. The backend accepts image files up to 5 MB and only forwards JPG, PNG, GIF, or WebP MIME types.

## Project structure

```text
CampusFix/
├── backend/
│   ├── middleware/      # Authentication, authorization, API errors
│   ├── config/          # Cloudinary server-side configuration
│   ├── models/          # User and issue schemas
│   ├── routes/          # Auth and issue API workflows
│   ├── index.js
│   └── seed.js
├── frontend/
│   └── src/             # React app and responsive styling
├── package.json         # Root helper scripts
└── README.md
```

## Product notes

Campus names, example reports, and demo credentials are sample content. Replace them with your campus details before sharing a public deployment. Staff provisioning is a deployment responsibility for a production campus instance.
