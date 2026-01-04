# 919 Events

A full-stack event management platform built with React Router v7, featuring role-based authentication, interactive maps, and a comprehensive event listing system for the 919 area code region.

## Features

- **User Authentication**: Powered by Clerk with role-based access control (User, Author, Admin)
- **Event Management**: Create, edit, and delete events with rich details
- **Interactive Map**: Mapbox integration for visualizing event locations
- **Role System**:
  - Users can browse events
  - Authors can create and manage their own events
  - Admins have full platform control
- **Author Applications**: Users can apply to become event authors
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Toast notifications with Sonner
- **Animated UI**: GSAP-powered animations

## Tech Stack

### Frontend
- React Router v7 (with SSR)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state management)
- GSAP (animations)
- React Hook Form
- Mapbox GL / React Map GL

### Backend
- React Router server functions
- Clerk (authentication & user management)
- Prisma (ORM)
- PostgreSQL (database)

### Deployment
- Vercel-ready with `@vercel/react-router`

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Clerk account
- Mapbox account (for map features)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd clerk-react-router-quickstart
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see below)

4. Generate Prisma client and push database schema:
```bash
npm run db:generate
npm run db:push
```

5. (Optional) Seed the database:
```bash
npm run db:seed
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
PRISMA_POSTGRESQL_URL=postgresql://user:password@localhost:5432/database_name

# Mapbox (optional, for map features)
VITE_MAPBOX_TOKEN=pk.eyJ...
```

### Getting API Keys

- **Clerk**: Sign up at [clerk.com](https://clerk.com) and create a new application
- **PostgreSQL**: Set up a local database or use a service like [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)
- **Mapbox**: Create an account at [mapbox.com](https://mapbox.com) and get an access token

## Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run typecheck    # Run TypeScript type checking
```

### Database
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:seed      # Seed database with sample data
```

### Admin Management
```bash
npm run set-admin    # Promote a user to admin role
```

### Production
```bash
npm run build        # Build for production
npm run start        # Start production server
```

## Project Structure

```
clerk-react-router-quickstart/
├── app/
│   ├── routes/              # Route components
│   │   ├── home.tsx         # Landing page
│   │   ├── events.tsx       # Events listing
│   │   ├── map.tsx          # Interactive map view
│   │   ├── my-events.tsx    # Author's events management
│   │   ├── submit.tsx       # Create new event
│   │   ├── apply-author.tsx # Author application form
│   │   └── admin.tsx        # Admin dashboard
│   ├── components/          # Reusable components
│   ├── stores/              # Zustand stores
│   ├── hooks/               # Custom React hooks
│   ├── root.tsx             # Root layout with auth
│   └── app.css              # Global styles
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Database seeding
├── scripts/
│   └── set-admin.ts         # Admin management script
└── public/                  # Static assets
```

## Database Schema

### Event Model
- Event details (title, description, date, location)
- Geographic data (latitude, longitude, address)
- Categories and metadata
- Creator tracking

### AuthorApplication Model
- User application details
- Application status (pending, approved, rejected)
- Review tracking

## Role-Based Access Control

The application implements a three-tier role system via Clerk's metadata:

1. **User** (default): Can browse and view events
2. **Author**: Can create and manage their own events
3. **Admin**: Full platform control, can manage all events and review author applications

To promote a user to admin, use:
```bash
npm run set-admin
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Deployment

This project is configured for Vercel deployment:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

The `@vercel/react-router` preset is already configured in `react-router.config.ts`.

## License

MIT
