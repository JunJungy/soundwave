# Soundwave - Enhanced Spotify Clone

## Overview
Soundwave is a music streaming application inspired by Spotify, featuring an enhanced UI/UX with improved spacing, typography, and visual design. It provides a polished music browsing and playback experience, including user authentication, personalized playlists, and an artist application and management system. The project's vision is to offer a comprehensive platform for music consumption and artist interaction, aiming for a significant presence in the digital music streaming market.

## User Preferences
I prefer that the agent focuses on iterative development, delivering functional, tested code in small, manageable increments. Before making any major architectural changes or introducing new dependencies, please ask for approval. I value clear, concise explanations and prefer code that is well-documented and adheres to modern best practices. Do not make changes to the `attached_assets/generated_images/` folder.

## System Architecture

### UI/UX Decisions
- **Design Philosophy**: Content-First with no traditional hero section, immediate access to music. Enhanced spacing for readability, strong typography with Inter (UI) and DM Sans (Display/Headlines).
- **Theming**: Polished dark theme with true black background (`#000000`) and vibrant Spotify green (`#1DB954`) accents.
- **Components**: Custom-styled Shadcn UI components built on Radix primitives, following Spotify-inspired patterns.
- **Responsiveness**: Responsive design with grid layouts adapting from 2 to 5 columns based on viewport.
- **Interactions**: Subtle hover states and smooth transitions.
- **Accessibility**: Proper contrast ratios and keyboard navigation support.
- **Loading States**: Skeleton screens for improved user experience.
- **Empty States**: Clear guidance for users when content is absent.

### Technical Implementations
- **Frontend**: React with Vite, Wouter for routing, React Query (TanStack Query) for server state, and React Context for global player state. Styling with Tailwind CSS and custom design tokens.
- **Backend**: Express.js server with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM for data management.
- **Authentication**: Custom username/password authentication with bcrypt hashing (10 salt rounds) and PostgreSQL-backed session management using `connect-pg-simple`.
- **Authorization**: Role-based access control for admin and artist functionalities.
- **Security**: Comprehensive security measures including secure password hashing, session management, authorization checks at both route and storage layers, cross-tenant protection, and fail-secure design.
- **Music Player**: Global state management via React Context, full playback controls (play/pause, skip, shuffle, repeat, progress bar, volume), queue management, and now playing display.
- **Artist System**: Users can apply to become artists, with admin review and approval. Approved artists can upload albums and songs. Real-time stream tracking for songs and artists, with automatic verification at 1 million total streams.
- **Admin Panel**: Functionality for reviewing artist applications, managing users (promote/demote admin status), and deleting user accounts with owner protection.

### Feature Specifications
- **User Management**: Secure registration, login, and session management. Admin users can manage other users.
- **Music Browsing**: Explore featured playlists, new albums, genres.
- **Search**: Instant search across songs, artists, albums, and user playlists.
- **Personal Playlists**: Create, manage, and edit user-specific private playlists.
- **Artist Dashboard**: Dedicated interface for artists to manage their uploaded music.
- **Stream Tracking**: Counts streams for songs and artists, influencing artist verification.

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Session Store**: `connect-pg-simple` (for PostgreSQL-backed sessions)
- **UI Libraries**: Shadcn UI, Radix UI Primitives
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Styling**: Tailwind CSS
- **Authentication Hashing**: bcrypt
- **Form Validation**: React Hook Form, Zod (for schema validation)