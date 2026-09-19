![GitHub Release](https://img.shields.io/github/v/release/weemeal/weemeal-frontend-react)

# WeeMeal
A modern recipe management application with shopping list integration.

![Bildschirmfoto 2026-03-01 um 12.10.31.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.10.31.png)

![Bildschirmfoto 2026-03-01 um 12.11.18.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.11.18.png)

![Bildschirmfoto 2026-03-01 um 12.11.30.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.11.30.png)

![Bildschirmfoto 2026-03-01 um 12.11.43.png](docs/images/Bildschirmfoto%202026-03-01%20um%2012.11.43.png)

## Tech Stack

- **Framework**: Next.js 16+ (App Router, Turbopack)
- **Database**: MongoDB (Mongoose ODM)
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
- Source attribution (book with page, URL, or free text)
- Tags
- Image upload
- Full-text search functionality

## Roadmap

- Authentication (planned next; not yet implemented)

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

# App
NEXT_PUBLIC_APP_VERSION=1.0.0-dev
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
│   │   ├── admin/        # Admin/maintenance endpoints
│   │   ├── images/       # Image upload/serve/delete
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
│   ├── images/           # Image storage helpers
│   └── validations/      # Zod schemas
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
├── __tests__/            # Test files
├── scripts/              # Maintenance scripts
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
| GET    | `/api/recipes/bring/[id]`       | Get Schema.org HTML for Bring!   |
| POST   | `/api/images`                   | Upload an image                  |
| GET    | `/api/images/[id]`              | Serve an image                   |
| DELETE | `/api/images/[id]`              | Delete an image                  |
| GET    | `/api/admin/migrate-images`     | Admin: migrate images            |

## Admin Endpoints

`GET /api/admin/migrate-images` migrates existing recipe images to filesystem
storage. Protect it with the `ADMIN_SECRET` environment variable.

## Docker Services

| Service            | URL                     | Credentials           |
|--------------------|-------------------------|-----------------------|
| MongoDB            | `localhost:27017`       | weemeal / weemeal_dev |
| Mongo Express      | `http://localhost:8081` | -                     |

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
