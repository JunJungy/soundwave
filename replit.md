# Soundwave - Enhanced Spotify Clone

## Overview
Soundwave is a music streaming application inspired by Spotify, featuring an enhanced UI/UX with improved spacing, typography, and visual design. It provides a polished music browsing and playback experience, including user authentication, personalized playlists, and an artist application and management system. The platform starts empty and grows organically as artists upload their music, creating an authentic, artist-driven music ecosystem.

## User Preferences
I prefer that the agent focuses on iterative development, delivering functional, tested code in small, manageable increments. Before making any major architectural changes or introducing new dependencies, please ask for approval. I value clear, concise explanations and prefer code that is well-documented and adheres to modern best practices. Do not make changes to the `attached_assets/generated_images/` folder.

## System Architecture

### UI/UX Decisions
- **Design Philosophy**: Content-First with no traditional hero section, immediate access to music. Enhanced spacing for readability, strong typography with Inter (UI) and DM Sans (Display/Headlines).
- **Theming**: Polished dark theme with true black background (`#000000`) and vibrant purple (`hsl(270 70% 55%)`) accents.
- **Components**: Custom-styled Shadcn UI components built on Radix primitives, following Spotify-inspired patterns.
- **Responsiveness**: Responsive design with grid layouts adapting from 2 to 5 columns based on viewport.
- **Interactions**: Subtle hover states and smooth transitions.
- **Accessibility**: Proper contrast ratios and keyboard navigation support.
- **Loading States**: Skeleton screens for improved user experience.
- **Empty States**: Clear guidance for users when content is absent.

### Technical Implementations
- **Frontend**: React with Vite, Wouter for routing, React Query (TanStack Query) for server state, and React Context for global player state. Styling with Tailwind CSS and custom design tokens.
- **Backend**: Express.js server with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM for data management. Starts empty - no pre-seeded content.
- **Authentication**: Custom username/password authentication with bcrypt hashing (10 salt rounds) and PostgreSQL-backed session management using `connect-pg-simple`.
- **Authorization**: Role-based access control for admin and artist functionalities.
- **Security**: Comprehensive security measures including secure password hashing, session management, authorization checks at both route and storage layers, cross-tenant protection, and fail-secure design.
- **Music Player**: Global state management via React Context using HTML5 audio for playback. Full playback controls (play/pause, skip, shuffle, repeat, progress bar, volume), queue management, and now playing display.
- **File Storage**: Replit Object Storage integration with presigned URLs for secure file uploads. Artists upload actual audio files (MP3, WAV, OGG, M4A) and square album artwork (no branded logos). Custom ACL policy system for protected file access.
- **Artist System**: Users can apply to become artists with a two-step verification process:
  - **Step 1: Admin Approval** - Admin reviews and approves artist application, setting status to 'pending'
  - **Step 2: Automatic Verification** - Background job (runs every 10 minutes) auto-verifies artists up to 1 hour after admin approval
  - **Upload Blocking** - Artists with pending verification cannot upload music (403 responses from POST /api/albums and /api/songs)
  - **Dashboard UI** - Pending artists see "Account Verification in Progress" message with "Check Status" button instead of upload buttons
  - **Stream Tracking** - Real-time tracking for songs and artists (future: badge verification at milestone thresholds)
- **Admin Panel**: Functionality for reviewing artist applications, managing users (promote/demote admin status), and deleting user accounts with owner protection.

### Feature Specifications
- **User Management**: Secure registration, login, and session management. Admin users can manage other users.
- **Music Browsing**: Explore featured playlists, new albums, genres.
- **Search**: Instant search across songs, artists, albums, and user playlists.
- **Personal Playlists**: Create, manage, and edit user-specific private playlists.
- **Artist Dashboard**: Dedicated interface for artists to manage their uploaded music.
- **Stream Tracking**: Counts streams for songs and artists, influencing artist verification.
- **Follow Artists**: Users can follow/unfollow artists to track their favorite musicians.
  - Follow/Unfollow button on artist pages
  - Follower count display on artist profiles
  - Dedicated "Following" page to view all followed artists
  - Real-time updates across the platform via React Query cache invalidation

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Session Store**: `connect-pg-simple` (for PostgreSQL-backed sessions)
- **File Storage**: Replit Object Storage via `@google-cloud/storage`
- **File Uploads**: Uppy (`@uppy/core`, `@uppy/react`, `@uppy/aws-s3`, `@uppy/dashboard`, `@uppy/drag-drop`, `@uppy/file-input`)
- **UI Libraries**: Shadcn UI, Radix UI Primitives
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Styling**: Tailwind CSS
- **Authentication Hashing**: bcrypt
- **Form Validation**: React Hook Form, Zod (for schema validation)
- **Spotify API**: `@spotify/web-api-ts-sdk` (helper module ready for OAuth integration)

## Recent Changes

### October 31, 2025 (Latest)
- **CRITICAL BUG FIX - Song Duration Tracking**: Fixed progress bar not reaching 100% when songs finish playing
  - Added `duration` state to MusicPlayerContext tracking actual audio duration from HTML5 Audio element
  - Audio element automatically loads duration metadata via `loadedmetadata` and `durationchange` events
  - Progress bar now uses actual audio file duration instead of potentially incorrect database duration value
  - ExpandablePlayer updated to receive duration prop from context instead of currentTrack.duration
  - Ensures progress bar accurately reflects song playback and reaches 100% exactly when song ends
  - Fixes issue where 2-3 minute songs were showing incorrect durations and incomplete progress
- **Color Scheme Update**: Changed primary color from Spotify green to vibrant purple
  - Updated all primary, ring, and chart color variables in both light and dark modes
  - Light mode: `hsl(270 70% 45%)`, Dark mode: `hsl(270 70% 55%)`
- **Follow Artists Feature**: Users can now follow/unfollow artists and track their favorites
  - Added `follows` table to database schema (userId, artistId, createdAt)
  - Backend API routes: POST/DELETE /api/artists/:id/follow, GET /api/artists/:id/followers, GET /api/following
  - Storage layer methods: followArtist, unfollowArtist, isFollowing, getFollowerCount, getFollowedArtists
  - Follow/Unfollow button on artist pages with real-time status updates
  - Follower count display on artist profiles (formatted: 1K, 1M, etc.)
  - "Following" page at `/following` showing grid of all followed artists
  - "Following" link added to sidebar navigation
  - React Query cache invalidation keeps all views in sync
  - Toast notifications for follow/unfollow actions
  - Login required for following (proper authorization guards)
- **Edit Artist Profile Feature**: Artists can now update their profile image and bio
  - Added `bio` field to artists schema (text, nullable)
  - Created `updateArtistProfileSchema` for validated profile updates
  - Backend endpoint: PUT /api/artists/me with zod validation and authorization checks
  - Edit Profile page at `/edit-artist-profile` with react-hook-form + zodResolver
  - Profile image upload via ObjectUploader (max 5MB, image files only)
  - Bio textarea with 1000 character limit and validation
  - Authorization enforced: only verified artists can edit their profiles
  - "Edit Profile" button added to Artist Dashboard
  - Verified badge (✓) now displays on Artist Dashboard, Search results, and Artist pages
  - Form state properly managed via useEffect to prevent React render issues
  - All changes invalidate artist cache for real-time updates across the platform
- **Expandable Music Player**: Spotify-style expandable player with mini and full-screen views
  - Mini player bar at bottom (80px height) shows album artwork, song title, artist, and play controls
  - Click mini player to expand to full-screen overlay with large artwork and complete controls
  - Desktop view: Shows previous/next/queue buttons in mini player
  - Mobile view: Shows only essential play/pause button in mini player
  - Expanded view features: Large album artwork (max-w-md), progress bar with seek, all playback controls (shuffle, previous, play/pause, next, repeat), volume slider
  - Built with Shadcn Sheet component for smooth transitions
  - Maintains all existing MusicPlayerContext functionality
  - Accessibility improvements: aria-labels on all icon-only buttons, proper button sizing via Shadcn variants
  - Click propagation prevented on buttons within mini player for correct expand behavior

### October 30, 2025
- **Unified Song Upload System**: Replaced separate album/song creation with streamlined upload flow
  - Removed "New Album" and "New Song" buttons, replaced with single "Upload a Song" action
  - Multi-step validation UI with progress tracking for artwork and audio uploads
  - Genre selection dropdown with 17 options (Pop, Rock, Hip-Hop, R&B, Country, Electronic, Jazz, Classical, Indie, Folk, Metal, Punk, Reggae, Blues, Latin, K-pop, Other)
  - Scheduled release date picker - songs can be scheduled for future publication
  - Payment-gated promotion options:
    - Global Promotion ($4): Featured placement across the platform
    - Other Platforms ($5): Cross-platform distribution
  - Terms of service agreement checkbox required before upload
  - Integrated Stripe payment processing for monetization options
- **Scheduled Releases System**: Background job automatically publishes songs on their release date
  - Songs schema expanded with `releaseDate`, `releaseStatus` (draft/pending_review/scheduled/published)
  - Background job runs every 10 minutes to check for scheduled releases
  - Idempotent release transitions - songs move from 'scheduled' to 'published' when date arrives
  - Storage methods added: `getAllSongs()` and `updateSong()` for release management
- **Song Schema Enhancements**: Extended songs table with new fields
  - `genre`: Selected from dropdown (nullable)
  - `artworkUrl`: Square album artwork URL (nullable)
  - `releaseDate`: Timestamp for scheduled releases
  - `releaseStatus`: Current publication status
  - `globalPromotion`, `otherPlatforms`: Boolean flags for monetization
  - `paymentIntentId`: Stripe payment reference (nullable)
  - `artworkCheckStatus`, `audioCheckStatus`: Validation tracking ('pending'/'approved'/'rejected')
  - Made `albumId` nullable - songs can exist independently without albums
- **Artist Dashboard Cleanup**: Simplified UI for song-first workflow
  - Removed legacy album creation form and dialogs
  - "No Albums Yet" empty state now shows "Upload Song" action
  - Cleaned up unused imports and state management

### October 30, 2025
- **Two-step artist verification system**: Implemented post-approval waiting period before artists can upload
  - Added `verificationStatus` (pending/verified) and `approvedAt` timestamp fields to artists table
  - Admin approval sets artist to 'pending' status with timestamp
  - Background job auto-verifies artists after 1 hour (runs every 10 minutes)
  - Server blocks uploads for pending artists (403 response)
  - Artist Dashboard shows "Account Verification in Progress" message during pending state
  - Fixed loading race condition to ensure artist data loads before rendering dashboard
  - Admin approval toast updated to mention 1-hour verification wait
- **Fixed registration/login flow**: Removed unused form field defaults causing validation errors
  - Simplified registration form to only require username and password
  - Fixed form validation to match current schema (removed email, firstName, lastName defaults)
- **Mobile responsive fixes**: Improved admin panel layout for mobile devices
  - User management buttons: Now stack vertically on mobile with shortened text
  - Admin panel tabs: Changed from overlapping grid to horizontally scrollable list on mobile
  - Buttons display full width on mobile (< 640px), compact on desktop (≥ 640px)
  - Tab text shortened on mobile: "Make Admin" → "Make", "Delete" → icon only

### October 29, 2025
- **Removed pre-seeded content**: Database now starts empty for authentic artist-driven growth
- **Removed YouTube integration**: Completely removed YouTube dependencies for actual audio file uploads
  - Removed `youtubeId` field from songs schema
  - Removed YouTube iframe player component
  - Migrated to HTML5 audio player for standard audio file playback
- **Object Storage integration**: Implemented Replit Object Storage for file uploads
  - Audio files: MP3, WAV, OGG, M4A (max 20MB)
  - Album artwork: Square images, no branded logos (max 5MB)
  - Secure presigned URL generation for authenticated uploads
  - Custom ACL policy system for public/protected file access
  - ObjectUploader component with Uppy dashboard for seamless UX
- **Artist upload flow**: Artists can now upload actual music files
  - Upload audio files directly from artist dashboard
  - Upload square album artwork with validation
  - Files stored securely in Replit Object Storage
  - Uploaded songs appear immediately on home page
- **Empty states**: Added proper empty state messaging when no albums or playlists exist