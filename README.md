![GitHub Release](https://img.shields.io/github/v/release/weemeal/weemeal-frontend-react)

# WeeMeal
A modern recipe management application with shopping list integration.

![Bildschirmfoto 2026-03-01 um 12.10.31.png](doc/Bildschirmfoto%202026-03-01%20um%2012.10.31.png)

![Bildschirmfoto 2026-03-01 um 12.11.18.png](doc/Bildschirmfoto%202026-03-01%20um%2012.11.18.png)

![Bildschirmfoto 2026-03-01 um 12.11.30.png](doc/Bildschirmfoto%202026-03-01%20um%2012.11.30.png)

![Bildschirmfoto 2026-03-01 um 12.11.43.png](doc/Bildschirmfoto%202026-03-01%20um%2012.11.43.png)

## Tech Stack

- **Framework**: Next.js 16+ (App Router, Turbopack)
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: NextAuth.js v4 with Keycloak
- **Styling**: Tailwind CSS
- **Drag & Drop**: @hello-pangea/dnd
- **Testing**: Vitest + Testing Library
- **Language**: TypeScript

## Features

- Recipe CRUD operations
- Drag & drop ingredient reordering
- Section headers for ingredient grouping
- Portion scaling with localStorage persistence
- QR code generation for Bring! shopping list integration
- Markdown support for recipe instructions
- Recipe notes with auto-save
- Source attribution (book with page or URL)
- Tags with AI-powered generation
- Image upload or AI-powered image search
- Full-text search functionality
- Responsive design
- **Seasonal availability**: Automatic season detection based on ingredient availability
  - AI-powered analysis with Claude API (fallback to static mapping)
  - 70+ seasonal ingredients mapped for German regional availability
  - Season filter on homepage with localStorage persistence
  - "Gemischte Saison" indicator for recipes with conflicting seasonal ingredients

## Requirements

- Node.js 18+
- Docker & Docker Compose

## Getting Started

### 1. Start Docker Services

```bash
docker-compose up -d
```

This starts:

- **MongoDB** at `localhost:27017`
- **Mongo Express** (DB UI) at `http://localhost:8081`
- **Keycloak** at `http://localhost:8080` (admin/admin)

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

The project uses `.env.local` for local development:

```bash
# MongoDB (Docker)
MONGODB_URI=mongodb://weemeal:weemeal_dev@localhost:27017/weemeal?authSource=admin

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-secret-change-in-production

# Keycloak (optional - auth disabled if not configured)
KEYCLOAK_CLIENT_ID=weemeal-app
KEYCLOAK_CLIENT_SECRET=weemeal-dev-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/weemeal

# App
NEXT_PUBLIC_APP_VERSION=1.0.0-dev

# AI Features (optional - enables AI-powered season detection and tag generation)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Admin Endpoints
ADMIN_SECRET=your-admin-secret
```

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

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # NextAuth endpoints
│   │   └── recipes/      # Recipe CRUD + extensions
│   ├── recipe/           # Recipe pages
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── navbar/           # Navigation
│   ├── footer/           # Footer
│   ├── recipe/           # Recipe-specific components
│   └── ui/               # Reusable UI components
├── lib/                   # Backend utilities
│   ├── mongodb/          # Database connection + models
│   ├── auth/             # NextAuth configuration
│   └── validations/      # Zod schemas
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── __tests__/            # Test files
├── scripts/              # Migration scripts
└── docker/               # Docker configuration
```

## API Endpoints

| Method | Endpoint                        | Description                      |
|--------|---------------------------------|----------------------------------|
| GET    | `/api/recipes`                  | Get all recipes (with search)    |
| POST   | `/api/recipes`                  | Create a new recipe              |
| GET    | `/api/recipes/[id]`             | Get a single recipe              |
| PUT    | `/api/recipes/[id]`             | Update a recipe                  |
| DELETE | `/api/recipes/[id]`             | Delete a recipe                  |
| PATCH  | `/api/recipes/[id]/notes`       | Update recipe notes              |
| PATCH  | `/api/recipes/[id]/source`      | Update recipe source             |
| GET    | `/api/recipes/[id]/image`       | Generate/fetch recipe image      |
| POST   | `/api/recipes/generate-tags`    | Generate tags with AI            |
| POST   | `/api/recipes/generate-seasons` | Generate seasons for ingredients |
| GET    | `/api/recipes/bring/[id]`       | Get Schema.org HTML for Bring!   |
| POST   | `/api/admin/migrate-seasons`    | Migrate seasons for all recipes  |

## Data Migration

To migrate data from the old PostgreSQL database:

1. Export data using the SQL script in `scripts/export-postgres.sql`
2. Run the migration:
   ```bash
   npx tsx scripts/migrate-data.ts recipes.json
   ```

## Admin Endpoints

### Migrate Seasons

Update seasonal availability for all recipes:

```bash
# Only recipes without seasons
curl -X POST "https://your-domain/api/admin/migrate-seasons?secret=ADMIN_SECRET"

# Force recalculate all recipes
curl -X POST "https://your-domain/api/admin/migrate-seasons?secret=ADMIN_SECRET&force=true"
```

## Docker Services

| Service            | URL                     | Credentials           |
|--------------------|-------------------------|-----------------------|
| MongoDB            | `localhost:27017`       | weemeal / weemeal_dev |
| Mongo Express      | `http://localhost:8081` | -                     |
| Keycloak Admin     | `http://localhost:8080` | admin / admin         |
| Keycloak Test User | -                       | testuser / test123    |

## Docker Hub

Docker Images can be found
on [Docker Hub](https://hub.docker.com/repository/docker/darthkali/weemeal-frontend-react/general).

## Forking and Docker Hub Integration

If you want to fork this project, update the GitHub Actions workflows:

1. In `.github/workflows/publish.yml` and `.github/workflows/release.yml`:
    - `IMAGE_NAME`: The name of your Docker image
    - Docker hub path: The path to your Docker Hub repository

2. Set up GitHub Secrets:
    - `DOCKER_HUB_USER`: Your Docker Hub username
    - `DOCKER_HUB_PASS`: Your Docker Hub password
    - `RELEASE_TOKEN`: A GitHub token

## License

MIT
