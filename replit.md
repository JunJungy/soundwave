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

## Recent Changes

### October 31, 2025 (Latest)
- **Auto-Time Lyrics Feature**: Smart AI-powered lyrics timing system
  - **Smart Distribution Algorithm**: Automatically distributes plain lyrics across song duration
    - 80% of duration divided evenly among lyrics lines
    - 20% of duration allocated to pauses (detected by blank lines in input)
    - Blank lines in plain text create longer pauses before the next line
    - Times rounded to one decimal place for clean alignment
  - **Audio Duration Extraction**: HTML5 Audio automatically detects duration from uploaded files
    - Extracts metadata when audio file is uploaded
    - Updates form duration field for accurate database storage
    - Shows detected duration below lyrics textarea (MM:SS format)
    - Toast notification confirms: "Audio Processed - Duration detected: 3:24"
    - Fallback to 180s if metadata extraction fails (with warning toast)
  - **Two-Option Workflow** for adding lyrics:
    - **Option 1 (Auto-Time)**: Paste plain lyrics → Upload audio → Click "Auto-Time Lyrics" button
    - **Option 2 (Manual)**: Add timestamps manually in format `[startTime-endTime] lyrics text`
  - **"Auto-Time Lyrics" Button**: Disabled until both audio uploaded and lyrics entered
    - One-click conversion from plain text to timestamped format
    - Success toast shows: "Lyrics Auto-Timed - 12 lines distributed across 204s"
  - **Intelligent Pause Detection**: Recognizes blank lines as intentional pauses in songs
- **Language Selection & Timestamped Lyrics Display**: Full multi-language support with real-time highlighting
  - Language selection dropdown with 18 languages (English, Spanish, Japanese, Korean, Chinese, French, German, Italian, Portuguese, Russian, Arabic, Hindi, Dutch, Swedish, Polish, Turkish, Thai, Vietnamese)
  - Lyrics stored as JSONB: `{ lines: [{ startTime: number, endTime: number, text: string }] }`
  - Real-time line-by-line highlighting in expanded player (purple accent)
  - Optimized auto-scrolling that only triggers when active line changes
  - Scroll position resets to top when switching tracks
  - Validation: enforces endTime > startTime to prevent overlapping highlights