# Soundwave - Enhanced Spotify Clone

## Overview
Soundwave is a music streaming application inspired by Spotify, designed to foster an artist-driven music ecosystem. It features user authentication, personalized playlists, and an artist application/management system, growing organically as artists upload their music. The platform aims to provide an enhanced UI/UX and comprehensive features for both listeners and artists.

## User Preferences
I prefer that the agent focuses on iterative development, delivering functional, tested code in small, manageable increments. Before making any major architectural changes or introducing new dependencies, please ask for approval. I value clear, concise explanations and prefer code that is well-documented and adheres to modern best practices. Do not make changes to the `attached_assets/generated_images/` folder.

## System Architecture

### UI/UX Decisions
- **Design Philosophy**: Content-first approach with enhanced spacing, strong typography (Inter, DM Sans), and no traditional hero section.
- **Theming**: Polished dark theme (`#000000` background) with vibrant purple accents (`hsl(270 70% 55%)`).
- **Components**: Custom-styled Shadcn UI components based on Radix primitives.
- **Responsiveness**: Grid layouts adapt from 2 to 5 columns.
- **Interactions**: Subtle hover states, smooth transitions, skeleton screens for loading, and clear empty states.
- **Accessibility**: Proper contrast and keyboard navigation.

### Technical Implementations
- **Frontend**: React with Vite, Wouter (routing), React Query (server state), React Context (global player state), and Tailwind CSS for styling.
- **Backend**: Express.js server with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Custom username/password, bcrypt hashing, `connect-pg-simple` for session management. Supports email-based registration/login, with permanent email binding for security.
- **Authorization**: Role-based access control (admin, artist).
- **Security**: Comprehensive measures including secure password hashing, session management, authorization checks, cross-tenant protection, fail-secure design, and a comprehensive ban system (user/IP bans with Discord notifications).
- **Music Player**: Global state via React Context, HTML5 audio, full controls, queue management, now playing display, and timestamped lyrics with multi-language support and real-time highlighting. Lyrics can be auto-timed or manually entered.
- **File Storage**: Replit Object Storage with presigned URLs for secure uploads of audio files (MP3, WAV, OGG, M4A) and square album artwork, with custom ACL for protected access. Includes song deletion with full cleanup.
- **Artist System**: Two-step verification (admin approval, then 1-hour automatic verification), upload blocking, dedicated dashboard for profile editing and song uploads. Songs can have scheduled release dates and optional payment-gated promotion.
- **Admin Panel**: Manages artist applications, user roles, user accounts, ban appeals, and IP/user bans.
- **Stream Tracking**: Counts streams for songs and artists.
- **Follow Artists**: Users can follow/unfollow artists and view follower counts.
- **Personal Playlists**: Users can create, manage, and edit private playlists.
- **Discord Integration**: Users can create accounts via Discord, link existing accounts, and manage Discord binding via a settings page. A ban appeals system is integrated, allowing users to submit appeals which are reviewed in the admin panel with email notifications.

### Feature Specifications
- **User Management**: Secure registration, login, session management, and admin-level user/ban control.
- **Music Browsing & Search**: Explore content and search across songs, artists, albums, and playlists.
- **Artist Dashboard**: Interface for artists to manage music, profiles, and uploads with scheduled releases.
- **Expandable Music Player**: Spotify-style mini and full-screen player views.

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
- **SMTP**: For email notifications (requires configuration)