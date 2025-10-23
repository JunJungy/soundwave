# Soundwave - Enhanced Spotify Clone

## Overview
Soundwave is a modern music streaming application inspired by Spotify, featuring an enhanced UI/UX with improved spacing, typography, and visual design. Built with React, Express, and TypeScript, it provides a polished music browsing and playback experience.

**Status**: Active development - MVP Phase 1 complete (Frontend)

## Features
- **Browse Music**: Explore featured playlists, new albums, and browse by genre
- **Search**: Instant search across songs, artists, albums, and playlists
- **Music Player**: Full-featured player with play/pause, skip, shuffle, repeat
- **Playlists**: Create and manage custom playlists
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
- **Storage**: In-memory storage (MemStorage)
- **Data Models**: Songs, Albums, Artists, Playlists

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
  ├── routes.ts           # API routes
  ├── storage.ts          # Data storage interface
  └── index.ts            # Server entry point

shared/
  └── schema.ts           # Shared TypeScript types & Zod schemas

attached_assets/
  └── generated_images/   # AI-generated album covers
```

## Data Models

### Artist
- id, name, imageUrl, genre

### Album
- id, title, artistId, coverUrl, year, genre

### Song
- id, title, artistId, albumId, duration, audioUrl

### Playlist
- id, name, description, coverUrl, songIds[]

## Key Pages
1. **Home** (`/`) - Featured playlists, new albums, genre browsing
2. **Search** (`/search`) - Search interface with tabbed results
3. **Library** (`/library`) - User's playlists and collections
4. **Album** (`/album/:id`) - Album details with track listing
5. **Playlist** (`/playlist/:id`) - Playlist details and track management

## Music Player Features
- Global player state via React Context
- Play/pause, skip forward/backward
- Shuffle and repeat modes
- Progress bar with seek functionality
- Volume control
- Queue management (view, reorder, remove tracks)
- Now playing display with album art

## API Endpoints (Planned)
- `GET /api/songs` - Get all songs
- `GET /api/albums` - Get all albums
- `GET /api/artists` - Get all artists
- `GET /api/playlists` - Get all playlists
- `POST /api/playlists` - Create new playlist
- `PATCH /api/playlists/:id` - Update playlist
- `DELETE /api/playlists/:id` - Delete playlist

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

## Recent Changes
- 2025-10-23: Initial frontend implementation with all core components
- Generated 12 AI album covers for diverse music genres
- Implemented global music player state management
- Created sidebar navigation with collapsible menu
- Built search with instant filtering and tabbed results
