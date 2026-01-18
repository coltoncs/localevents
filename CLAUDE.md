# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

919 Events - A full-stack event management platform for the 919 area code region. Built with React Router v7 (SSR), React 19, TypeScript, and PostgreSQL.

## Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:5173)
npm run typecheck        # TypeScript checking + React Router typegen

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed with sample data

# Admin
npm run set-admin        # Promote user to admin role

# Production
npm run build            # Build for production
npm run start            # Start production server
```

## Architecture

### Tech Stack
- **Frontend**: React Router v7 (SSR), React 19, Tailwind CSS, Zustand, GSAP
- **Backend**: React Router server functions, Clerk auth, Prisma ORM, PostgreSQL
- **Deployment**: Vercel (`@vercel/react-router` preset)

### Key Directories
- `app/routes/` - Page components with React Router file-based routing
- `app/components/` - Reusable UI components
- `app/stores/` - Zustand state stores (events, UI, role simulation)
- `app/utils/` - Server utilities (`*.server.ts` files run server-side only)
- `app/hooks/` - Custom React hooks
- `prisma/` - Database schema and seed script

### Route Configuration
Routes are defined in `app/routes.ts` and map to files in `app/routes/`:
- `/` → `home.tsx` (landing page)
- `/events` → `events.tsx` (event listing)
- `/events/:id/edit` → `events.$id.edit.tsx`
- `/map` → `map.tsx` (Mapbox map view)
- `/submit` → `submit.tsx` (create event - authors/admins only)
- `/my-events` → `my-events.tsx` (manage own events)
- `/admin` → `admin.tsx` (admin dashboard)

### Authentication & Roles
Three-tier role system via Clerk's publicMetadata:
- **user**: Browse events (default)
- **author**: Create/manage own events
- **admin**: Full platform control

Role checks in `app/utils/`:
- `roles.server.ts` - `getUserRole()`, `isAdmin()`, `isAuthor()`
- `permissions.server.ts` - `canUserCreateEvent()`, `canUserModifyEvent()`, `canUserManageAuthors()`

Admin role simulation: Admins can test as other roles via `simulatedRole` cookie (handled automatically).

### Data Flow
1. React Router loaders fetch data server-side
2. Prisma queries PostgreSQL
3. Components receive data via loader props
4. Zustand stores manage client-side state
5. Server actions handle form submissions

### State Stores (Zustand)
- `useEventStore` - Event data and selection
- `useUIStore` - UI state (sidebar, mobile menu, loading)
- `useRoleSimulationStore` - Admin role testing

### Database Models
- `Event` - Events with location, coordinates, categories, cost, recurrence
- `AuthorApplication` - Author application workflow with status tracking

### Path Alias
`~/*` maps to `./app/*` (configured in tsconfig.json)

## Environment Variables

Required in `.env`:
```
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=prisma://accelerate...     # Prisma Accelerate connection (runtime queries with caching)
PRISMA_POSTGRESQL_URL=postgresql://...  # Direct connection (migrations/seeding)
VITE_MAPBOX_TOKEN=pk.eyJ...             # For map features
```
