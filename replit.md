# Soundwave - Enhanced Spotify Clone

## Overview
Soundwave is a music streaming application inspired by Spotify, offering an enhanced UI/UX, user authentication, personalized playlists, and an artist application/management system. It fosters an artist-driven music ecosystem, starting empty and growing organically as artists upload their music.

## User Preferences
I prefer that the agent focuses on iterative development, delivering functional, tested code in small, manageable increments. Before making any major architectural changes or introducing new dependencies, please ask for approval. I value clear, concise explanations and prefer code that is well-documented and adheres to modern best practices. Do not make changes to the `attached_assets/generated_images/` folder.

## System Architecture

### UI/UX Decisions
- **Design Philosophy**: Content-first approach with enhanced spacing, strong typography (Inter, DM Sans), and no traditional hero section.
- **Theming**: Polished dark theme (`#000000` background) with vibrant purple accents (`hsl(270 70% 55%)`).
- **Components**: Custom-styled Shadcn UI components based on Radix primitives, inspired by Spotify.
- **Responsiveness**: Grid layouts adapt from 2 to 5 columns.
- **Interactions**: Subtle hover states, smooth transitions.
- **Accessibility**: Proper contrast and keyboard navigation.
- **Loading States**: Skeleton screens.
- **Empty States**: Clear guidance for absent content.

### Technical Implementations
- **Frontend**: React with Vite, Wouter (routing), React Query (server state), React Context (global player state). Tailwind CSS for styling.
- **Backend**: Express.js server with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM. Starts empty.
- **Authentication**: Custom username/password, bcrypt hashing (10 salt rounds), `connect-pg-simple` for session management.
- **Authorization**: Role-based access control (admin, artist).
- **Security**: Comprehensive measures including secure password hashing, session management, authorization checks, cross-tenant protection, and fail-secure design.
- **Music Player**: Global state via React Context, HTML5 audio for playback, full controls, queue management, now playing display, and timestamped lyrics with multi-language support.
- **File Storage**: Replit Object Storage with presigned URLs for secure uploads of audio files (MP3, WAV, OGG, M4A) and square album artwork. Custom ACL for protected access.
- **Artist System**: Two-step verification (admin approval, then 1-hour automatic verification), upload blocking for pending artists, and a dedicated dashboard. Artists can edit their profiles (bio, image).
- **Admin Panel**: Manage artist applications, user roles (promote/demote admin), and delete user accounts.
- **Stream Tracking**: Counts streams for songs and artists.
- **Follow Artists**: Users can follow/unfollow artists, view follower counts, and see followed artists on a dedicated page.

### Feature Specifications
- **User Management**: Secure registration, login, session management, and admin-level user control.
- **Music Browsing**: Explore featured content, new albums, and genres.
- **Search**: Instant search across songs, artists, albums, and playlists.
- **Personal Playlists**: Create, manage, and edit private user playlists.
- **Artist Dashboard**: Interface for artists to manage uploaded music, edit profiles, and upload songs with an integrated multi-step flow including genre selection, scheduled release dates, and optional payment-gated promotion.
- **Expandable Music Player**: Spotify-style mini and full-screen player views.
- **Scheduled Releases System**: Background job for automatic publication of songs on their release date.

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Session Store**: `connect-pg-simple`
- **File Storage**: Replit Object Storage via `@google-cloud/storage`
- **File Uploads**: Uppy (`@uppy/core`, `@uppy/react`, `@uppy/aws-s3`, etc.)
- **UI Libraries**: Shadcn UI, Radix UI Primitives
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Styling**: Tailwind CSS
- **Authentication Hashing**: bcrypt
- **Form Validation**: React Hook Form, Zod
- **Spotify API**: `@spotify/web-api-ts-sdk` (helper module)