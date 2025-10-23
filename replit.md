# Soundwave - Enhanced Spotify Clone

## Overview
Soundwave is a modern music streaming application inspired by Spotify, featuring an enhanced UI/UX with improved spacing, typography, and visual design. Built with React, Express, and TypeScript, it provides a polished music browsing and playback experience.

**Status**: Active development - MVP Phase 2 complete (Authentication & Database)

## Features
- **User Authentication**: Secure username/password authentication with bcrypt
- **User Accounts**: Personalized experience with user-specific data
- **Browse Music**: Explore featured playlists, new albums, and browse by genre
- **Search**: Instant search across songs, artists, albums, and user playlists
- **Music Player**: Full-featured player with play/pause, skip, shuffle, repeat
- **Personal Playlists**: Create and manage custom playlists (private, user-specific)
- **Queue Management**: View and manage upcoming tracks
- **Responsive Design**: Beautiful UI that works across all screen sizes
- **Dark Theme**: Polished dark theme with vibrant green accents

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React with Vite
- **Routing**: Wouter for SPA navigation
- **State Management**: 
  - React Query (TanStack Query) for server state
  - React Context (MusicPlayerContext) for global player state
- **UI Components**: Shadcn UI with Radix primitives
- **Styling**: Tailwind CSS with custom design tokens

### Backend (Express + TypeScript)
- **Server**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom username/password with bcrypt hashing and session management
- **Storage**: PostgreSQL-backed DatabaseStorage
- **Data Models**: Users, Sessions, Songs, Albums, Artists, Playlists

### Design System
- **Fonts**: Inter (UI), DM Sans (Display/Headlines)
- **Colors**: Deep charcoal background with vibrant green (#8FE854) accents
- **Spacing**: Consistent spacing scale (4, 6, 8, 12, 16px)
- **Components**: Custom-styled Shadcn components following Spotify-inspired patterns

## Project Structure
```
client/
  ├── src/
  │   ├── components/       # Reusable UI components
  │   │   ├── ui/          # Shadcn base components
  │   │   ├── app-sidebar.tsx
  │   │   ├── album-card.tsx
  │   │   ├── track-list.tsx
  │   │   ├── music-player.tsx
  │   │   ├── queue-sheet.tsx
  │   │   └── create-playlist-dialog.tsx
  │   ├── pages/           # Page components
  │   │   ├── home.tsx
  │   │   ├── search.tsx
  │   │   ├── library.tsx
  │   │   ├── album.tsx
  │   │   └── playlist.tsx
  │   ├── contexts/        # React contexts
  │   │   └── MusicPlayerContext.tsx
  │   ├── lib/            # Utilities
  │   │   ├── assets.ts   # Image imports
  │   │   └── queryClient.ts
  │   ├── App.tsx         # Main app component
  │   └── index.css       # Global styles
  
server/
  ├── routes.ts           # API routes (authenticated & public)
  ├── storage.ts          # Database storage interface
  ├── db.ts              # Database connection & Drizzle setup
  ├── auth.ts            # Session configuration and middleware
  └── index.ts            # Server entry point

shared/
  └── schema.ts           # Drizzle schema & Zod validators

attached_assets/
  └── generated_images/   # AI-generated album covers
```

## Data Models

### User
- id (varchar, UUID), username (unique, required), passwordHash (bcrypt hashed), email (optional), firstName, lastName

### Session
- sid (varchar), sess (jsonb), expire (timestamp)

### Artist
- id, name, imageUrl, genre

### Album
- id, title, artistId, coverUrl, year, genre

### Song
- id, title, artistId, albumId, duration, audioUrl

### Playlist
- id, name, description, coverUrl, songIds[], **userId** (foreign key - user-specific)

## Key Pages
1. **Landing** (`/` - logged out) - Welcome page with tabbed login/register forms
2. **Home** (`/` - logged in) - Featured playlists, new albums, genre browsing
3. **Search** (`/search`) - Search interface with tabbed results
4. **Library** (`/library`) - User's personal playlists and collections
5. **Album** (`/album/:id`) - Album details with track listing
6. **Playlist** (`/playlist/:id`) - Playlist details and track management
7. **Artist** (`/artist/:id`) - Artist profile with albums and top songs

## Music Player Features
- Global player state via React Context
- Play/pause, skip forward/backward
- Shuffle and repeat modes
- Progress bar with seek functionality
- Volume control
- Queue management (view, reorder, remove tracks)
- Now playing display with album art

## API Endpoints

### Authentication
- `GET /api/auth/user` - Get current user or null if logged out (Public)
- `POST /api/auth/register` - Create new user account with username/password (Public)
- `POST /api/auth/login` - Login with username/password (Public)
- `POST /api/auth/logout` - End user session (Authenticated)

### Music Library (Public)
- `GET /api/songs` - Get all songs
- `GET /api/albums` - Get all albums
- `GET /api/artists` - Get all artists
- `GET /api/artists/:id` - Get artist details
- `GET /api/albums/:id` - Get album details

### Search (Authenticated)
- `GET /api/search?q=query` - Search songs, albums, artists, and user's playlists

### Playlists (Authenticated - User-Scoped)
- `GET /api/playlists` - Get authenticated user's playlists
- `GET /api/playlists/:id` - Get user's playlist (ownership required)
- `POST /api/playlists` - Create new playlist for current user
- `PATCH /api/playlists/:id` - Update user's playlist (ownership required)
- `DELETE /api/playlists/:id` - Delete user's playlist (ownership required)
- `POST /api/playlists/:id/songs` - Add song to user's playlist (ownership required)
- `DELETE /api/playlists/:id/songs/:songId` - Remove song from user's playlist (ownership required)

## Design Philosophy
- **Content-First**: No traditional hero section; immediate access to music
- **Enhanced Spacing**: More generous padding for better readability
- **Strong Typography**: Clear hierarchy with DM Sans for headlines
- **Smooth Interactions**: Subtle hover states, smooth transitions
- **Accessibility**: Proper contrast ratios, keyboard navigation support

## Development Notes
- Design guidelines documented in `design_guidelines.md`
- All interactive elements have `data-testid` attributes for testing
- Responsive grid layouts adapt from 2 to 5 columns based on viewport
- Loading states use skeleton screens for better UX
- Empty states provide clear guidance to users

## Security Architecture
- **Authentication**: Custom username/password with bcrypt hashing (10 salt rounds)
- **Password Security**: Minimum 8 characters, securely hashed before storage
- **Session Management**: PostgreSQL-backed sessions with connect-pg-simple
- **Session Secret**: Configurable via SESSION_SECRET environment variable
- **Authorization**: All playlist operations require authentication
- **Data Isolation**: Storage layer enforces userId scoping with AND conditions
- **Fail-Secure**: Playlist endpoints return same error for missing/unauthorized playlists
- **Cross-Tenant Protection**: Users can only access their own playlists
- **Defense in Depth**: Both route and storage layers enforce security

## Recent Changes

### Phase 3: Custom Authentication (2025-10-23)
- Replaced Replit Auth with custom username/password authentication
- Added bcrypt password hashing with 10 salt rounds
- Updated users table: username (unique, required), passwordHash, email (optional)
- Implemented registration endpoint with username/password validation
- Implemented login endpoint with credential verification
- Created tabbed login/register UI with React Hook Form and Zod validation
- Added proper error handling and toast notifications
- Verified end-to-end authentication flow with comprehensive tests

### Phase 2: Authentication & Database (2025-10-23)
- Migrated from in-memory storage to PostgreSQL database
- Implemented session management with PostgreSQL session store
- Created users table with session-based authentication
- Implemented user-specific playlists with userId foreign key
- Enforced playlist privacy at storage layer (database-level scoping)
- Protected all playlist endpoints with authentication and ownership checks
- Added landing page for logged-out users
- Built logout functionality in app header
- Scoped search results to show only user's own playlists

### Phase 1: Frontend MVP (2025-10-23)
- Initial frontend implementation with all core components
- Generated 12 AI album covers for diverse music genres
- Implemented global music player state management
- Created sidebar navigation with collapsible menu
- Built search with instant filtering and tabbed results
- Seeded database with 10 artists, 10 albums, 30 songs, 3 sample playlists
