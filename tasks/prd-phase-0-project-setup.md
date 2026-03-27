# PRD: Phase 0 — Project Setup

## Introduction

Bootstrap the surfsapp monorepo with a working Docker Compose environment containing three isolated services: a Vue 3 + TypeScript frontend (Vite), a Node.js + TypeScript backend (Express), and a MongoDB container with empty collections pre-created. Both application services must support hot reload so that code changes are reflected immediately without restarting containers. At the end of Phase 0, a developer should be able to run one command (`docker compose up`) and have the full stack running locally.

---

## Goals

- Single command (`docker compose up`) starts all three services
- Frontend hot reload works inside Docker (Vite HMR)
- Backend hot reload works inside Docker (`tsx --watch`)
- MongoDB starts with empty collections ready for Phase 3 seeding
- Services can communicate: frontend → backend API, backend → MongoDB
- No application logic yet — structure and plumbing only

---

## User Stories

### US-001: Monorepo folder structure
**Description:** As a developer, I want a clean monorepo layout so that frontend, backend, and infrastructure are clearly separated.

**Acceptance Criteria:**
- [ ] Root contains: `docker-compose.yml`, `ui/`, `backend/`, `.gitignore`
- [ ] `ui/` contains a Vite + Vue 3 + TypeScript scaffold (yarn)
- [ ] `backend/` contains a Node.js + TypeScript + Express skeleton (npm)
- [ ] Each service has its own `package.json` and `tsconfig.json`
- [ ] Root `.gitignore` covers `node_modules`, `dist`, `.env`, `.DS_Store`

### US-002: Docker Compose orchestration
**Description:** As a developer, I want `docker compose up` to start all three services so I don't need to manage them individually.

**Acceptance Criteria:**
- [ ] `docker-compose.yml` defines three services: `ui`, `backend`, `mongo`
- [ ] Each service builds from its own `Dockerfile`
- [ ] Services are connected via a shared Docker network
- [ ] Environment variables passed via `.env` file (gitignored); `.env.example` committed
- [ ] `docker compose up` starts all three without errors
- [ ] `docker compose down` stops and removes containers cleanly

### US-003: Frontend scaffold with hot reload
**Description:** As a developer, I want the Vue 3 frontend to reflect code changes instantly inside Docker so I don't need to rebuild the container.

**Acceptance Criteria:**
- [ ] Vite dev server runs on port `5173`, accessible at `http://localhost:5173`
- [ ] Vite HMR (hot module replacement) works — editing a `.vue` file updates the browser without a full reload
- [ ] `vite.config.ts` sets `server.host: true` and `server.watch.usePolling: true` for Docker compatibility
- [ ] App renders a minimal placeholder page (e.g. "surfsapp — coming soon")
- [ ] TypeScript strict mode enabled in `tsconfig.json`
- [ ] `yarn typecheck` passes with zero errors

### US-004: Backend skeleton with hot reload
**Description:** As a developer, I want the Express backend to reload on file changes inside Docker so I can iterate without rebuilding.

**Acceptance Criteria:**
- [ ] Express server runs on port `3000`, accessible at `http://localhost:3000`
- [ ] `GET /health` returns `{ status: "ok", timestamp: "<ISO string>" }` with HTTP 200
- [ ] `tsx --watch src/index.ts` is the dev start command — file changes restart the process automatically
- [ ] TypeScript strict mode enabled in `tsconfig.json`
- [ ] `npm run typecheck` passes with zero errors
- [ ] CORS configured to allow requests from `http://localhost:5173`

### US-005: MongoDB container with init script
**Description:** As a developer, I want MongoDB to start with the required empty collections already created so Phase 3 can begin seeding immediately.

**Acceptance Criteria:**
- [ ] MongoDB runs on port `27017`
- [ ] Database name: `surfsapp`
- [ ] Init script creates three empty collections on first start: `beaches`, `forecastsnapshots`, `settings`
- [ ] Init script is idempotent — running twice does not error
- [ ] Backend can connect to MongoDB on startup and logs a successful connection message
- [ ] MongoDB data persisted via a named Docker volume (data survives `docker compose restart`)

### US-006: Inter-service connectivity
**Description:** As a developer, I want to confirm all services can reach each other so I know the network is wired correctly before building features.

**Acceptance Criteria:**
- [ ] Backend `GET /health` response includes `{ mongo: "connected" }` confirming DB connection
- [ ] Frontend can call `GET http://localhost:3000/health` and receive a 200 response (manual browser/curl test)
- [ ] No CORS errors in browser console when frontend calls backend

---

## Functional Requirements

- FR-1: `docker compose up` must start `ui`, `backend`, and `mongo` services in dependency order (`mongo` before `backend`, `backend` before `ui` is optional but recommended)
- FR-2: Frontend Vite dev server must run on port 5173 with HMR enabled
- FR-3: Backend Express server must run on port 3000 with `tsx --watch` hot reload
- FR-4: MongoDB must run on port 27017 with a named volume for data persistence
- FR-5: A `mongo-init.js` script must create `beaches`, `forecastsnapshots`, and `settings` collections in the `surfsapp` database on first container start
- FR-6: Backend must connect to MongoDB using the `MONGO_URI` environment variable
- FR-7: `GET /health` endpoint must return service status including MongoDB connection state
- FR-8: CORS on the backend must whitelist `http://localhost:5173`
- FR-9: Each service must have a `Dockerfile` using an appropriate Node.js base image
- FR-10: A `.env.example` file must be committed documenting all required environment variables

---

## Non-Goals

- No application routes beyond `/health` (beaches API comes in Phase 3)
- No beach data or seed scripts (Phase 3)
- No scoring engine (Phase 5)
- No authentication or user management
- No production Docker configuration (dev only in Phase 0)
- No CI/CD pipeline setup

---

## Technical Considerations

**Frontend (`ui/`):**
- Package manager: `yarn`
- Vite config must set `server.host: '0.0.0.0'` and `server.watch: { usePolling: true }` for Docker volume mount compatibility
- Vue 3 with Composition API, TypeScript, strict mode

**Backend (`backend/`):**
- Package manager: `npm`
- TypeScript with `tsx` for dev execution (`npm install -D tsx typescript @types/node @types/express`)
- `src/index.ts` as entry point
- MongoDB connection via `mongoose` or native `mongodb` driver (mongoose recommended for Phase 3 models)
- Graceful shutdown: listen for `SIGTERM` and close DB connection

**MongoDB:**
- Image: `mongo:7`
- Init script mounted via Docker volume to `/docker-entrypoint-initdb.d/`
- Named volume: `mongo-data`

**Environment variables (`.env.example`):**
```
MONGO_URI=mongodb://mongo:27017/surfsapp
PORT=3000
NODE_ENV=development
```

**Docker networking:**
- All services on a shared bridge network named `surfsapp-network`
- Backend connects to mongo using the service name `mongo` as hostname

---

## Folder Structure (target end state)

```
surfsapp/
├── .env                        # gitignored
├── .env.example                # committed
├── .gitignore
├── docker-compose.yml
├── docs/
├── tasks/
├── ui/
│   ├── Dockerfile
│   ├── package.json            # yarn
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       └── App.vue             # placeholder page
└── backend/
    ├── Dockerfile
    ├── package.json            # npm
    ├── tsconfig.json
    └── src/
        ├── index.ts            # Express app + /health route
        └── db/
            ├── connection.ts   # MongoDB connect/disconnect
            └── mongo-init.js   # Init script (collections)
```

---

## Success Metrics

- `docker compose up` completes with all three services healthy in under 60 seconds on first run
- Editing `App.vue` updates the browser within 2 seconds (HMR)
- Editing `src/index.ts` restarts the backend within 3 seconds (`tsx --watch`)
- `GET http://localhost:3000/health` returns `{ status: "ok", mongo: "connected" }`
- Zero TypeScript errors in both `ui/` and `backend/`

---

## Decisions

- **Dockerfile:** Single-stage only — no multi-stage build in Phase 0. Dev simplicity over build optimisation.
- **Hot reload strategy:** Bind-mount source directories into containers. Source code lives on the host, containers see changes instantly without rebuilds. `node_modules` uses a named volume to avoid overwriting host installs with container installs.
