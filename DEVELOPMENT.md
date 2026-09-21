# Developing WeeMeal

Everything you need to run WeeMeal from source. For running the published
Docker image, see [README.md](README.md).

## Requirements

- Node.js 18+
- Docker & Docker Compose (for MongoDB)

## Getting Started

### 1. Start the Docker services

```bash
docker-compose up -d
```

This starts:

- **MongoDB** at `localhost:27017`
- **Mongo Express** (DB UI) at `http://localhost:8081`
- **Keycloak** at `http://localhost:8080`, with the `weemeal` realm imported —
  only needed for `AUTH_MODE=keycloak`, see below

Both are development-only containers; the app itself runs on the host via
`npm run dev`.

| Service       | URL                     | Credentials           |
|---------------|-------------------------|-----------------------|
| MongoDB       | `localhost:27017`       | weemeal / weemeal_dev |
| Mongo Express | `http://localhost:8081` | –                     |
| Keycloak      | `http://localhost:8080` | admin / admin         |

Only MongoDB is required; start it alone with `docker compose up -d mongodb`.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

Copy `.env.example` to `.env` (or `.env.local`) and fill it in. For plain
recipe work the MongoDB URI is enough — WeeMeal then runs without a login,
because `AUTH_MODE` defaults to `none`:

```bash
MONGODB_URI=mongodb://weemeal:weemeal_dev@localhost:27017/weemeal?authSource=admin
```

To work on anything auth-related, switch the mode on:

```bash
AUTH_MODE=local
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:3000
SEED_ADMIN_USER=root
SEED_ADMIN_PASSWORD=<12-72 chars, upper + lower + digit + special>
```

To work on the keycloak mode, use the Keycloak that ships with the compose
file (see [Testing the keycloak mode](#testing-the-keycloak-mode) below):

```bash
AUTH_MODE=keycloak
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=http://localhost:3000
KEYCLOAK_ISSUER=http://localhost:8080/realms/weemeal
KEYCLOAK_CLIENT_ID=weemeal
KEYCLOAK_CLIENT_SECRET=weemeal-dev-secret
```

The admin seed is idempotent: it only creates the admin while none exists.
Changing `SEED_ADMIN_PASSWORD` afterwards does **not** reset an existing
account — reset it from the admin panel, or drop the `users` collection to let
the seed run again.

`.env.example` documents every variable; the deployment-facing reference with
all three auth modes lives in the [README](README.md#environment-variables).

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Available Scripts

```bash
# Development
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint

# Testing
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
npm run test:unit     # Run only unit tests

# Docker
npm run docker:up     # Start all services
npm run docker:down   # Stop all services
npm run docker:logs   # View logs
npm run docker:reset  # Stop and remove volumes
```

Typecheck with `npx tsc --noEmit`.

## Testing an auth mode end to end

`AUTH_MODE` is read at runtime, so one build can run every mode. The
production build is a standalone server, which `next start` does not serve —
use the standalone entry point:

```bash
npm run build
cd .next/standalone
MONGODB_URI=... PORT=3100 node server.js
```

Note that the build copies the project's `.env` into `.next/standalone/`, so
that file wins over an unset variable. Move it aside to test the default
(`none`) mode.

## Testing the keycloak mode

`docker-compose up -d` also starts a Keycloak at `http://localhost:8080`
(admin console: `admin` / `admin`). It imports the realm
`docker/keycloak/realm-weemeal.json` on first start, which already contains:

- the confidential client `weemeal` with the secret `weemeal-dev-secret`,
  redirecting to `http://localhost:3000/api/auth/callback/keycloak` (and 3100,
  for testing the standalone build)
- the client roles `weemeal-user` and `weemeal-admin`
- protocol mappers that put both client and realm roles into the **ID token** —
  Keycloak's built-in mappers only fill the access token, and `resolveRole`
  reads the ID token. This realm is the working reference for that mapper
  config; the [README](README.md#authentication) has the click path for a real
  instance
- four test users, all with the password `Str0ng!Passw0rd`:

| User            | Roles                          | Expected result       |
|-----------------|--------------------------------|-----------------------|
| `kc-admin`      | `weemeal-user`, `weemeal-admin`| signed in as `admin`  |
| `kc-user`       | `weemeal-user`                 | signed in as `user`   |
| `kc-admin-only` | `weemeal-admin`                | **refused** — entry hangs on `weemeal-user` |
| `kc-outsider`   | none                           | **refused**           |

Then start the app with the block above and log in at
`http://localhost:3000/login`.

The realm is imported only when it does not exist yet, so edits to the JSON
need a fresh container:

```bash
docker compose rm -sf keycloak && docker compose up -d keycloak
```

Keycloak runs in dev mode with an in-memory database — nothing survives that
recreate, which is the point.

### Checking that the session follows Keycloak

The WeeMeal session is re-checked against the realm once the access token has
expired — five minutes with the default realm settings. To watch it happen, log
in, then end the session in Keycloak from the outside:

```bash
adm=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -d client_id=admin-cli -d grant_type=password -d username=admin -d password=admin \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")
uid=$(curl -s -H "Authorization: Bearer $adm" \
  "http://localhost:8080/admin/realms/weemeal/users?username=kc-user" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])")
curl -s -X POST -H "Authorization: Bearer $adm" \
  "http://localhost:8080/admin/realms/weemeal/users/$uid/logout"
```

Within the access token's lifetime the next request lands on `/login`. The same
goes for disabling the user or revoking `weemeal-user`; granting or revoking
`weemeal-admin` changes the role on the running session instead. To shorten the
wait, set the realm's *Access Token Lifespan* (Realm settings → Tokens) to a
minute.

**Abmelden** in WeeMeal also ends the Keycloak session, so the next login asks
for the password again instead of going through via SSO. Check with
`curl -s -H "Authorization: Bearer $adm" \
  "http://localhost:8080/admin/realms/weemeal/users/$uid/sessions"` — the list
is empty afterwards.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── account/           # Change your own password (local auth mode)
│   ├── admin/             # User management (local auth mode)
│   ├── api/               # API routes
│   │   ├── account/      # Own password
│   │   ├── admin/        # User management + maintenance endpoints
│   │   ├── auth/         # Auth.js endpoints
│   │   ├── images/       # Image upload/serve/delete
│   │   └── recipes/      # Recipe CRUD + extensions
│   ├── login/            # Login page
│   ├── recipe/           # Recipe pages
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── account/          # Password change form
│   ├── admin/            # Admin panel
│   ├── auth/             # Login form, Keycloak sign-in
│   ├── navbar/           # Navigation
│   ├── footer/           # Footer
│   ├── recipe/           # Recipe-specific components
│   └── ui/               # Reusable UI components
├── lib/                   # Backend utilities
│   ├── api/              # HTTP error mapping
│   ├── auth/             # Password policy, guards, admin seed, role mapping
│   ├── mongodb/          # Database connection + models
│   ├── images/           # Image storage helpers
│   └── validations/      # Zod schemas
├── auth.ts                # Auth.js setup (Node side, providers)
├── auth.config.ts         # Edge-safe Auth.js config + AUTH_MODE
├── proxy.ts               # Route protection (former middleware.ts)
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── __tests__/            # Test files
├── scripts/              # Maintenance scripts
└── docs/adr/             # Architecture decision records
```

## Domain documentation

- [`CONTEXT.md`](CONTEXT.md) — the project's vocabulary. Use these terms in
  code, issues and commits.
- [`docs/adr/`](docs/adr) — the decisions behind the architecture, including
  the auth modes (ADR 0001, ADR 0003) and the shared recipe pool (ADR 0002).
- [`AGENTS.md`](AGENTS.md) — how coding agents should work in this repo.

## Forking and Docker Hub Integration

If you want to fork this project, update `.github/workflows/ci-cd.yml`:

1. Change the image name and Docker Hub path in the build and push steps
   (currently `docker.io/darthkali/weemeal`).

2. Set up GitHub Secrets:
    - `DOCKER_HUB_USER`: Your Docker Hub username
    - `DOCKER_HUB_PASS`: Your Docker Hub password or access token

## License

MIT
