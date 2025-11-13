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
- **Security**: Comprehensive measures including secure password hashing, session management, authorization checks, cross-tenant protection, fail-secure design, a comprehensive ban system (user/IP bans with Discord notifications), and AI-powered content moderation using OpenAI to detect inappropriate usernames and images (nudity, violence, hate symbols).
- **Music Player**: Global state via React Context, HTML5 audio, full controls, queue management, now playing display, and timestamped lyrics with multi-language support and real-time highlighting. Lyrics can be auto-timed or manually entered. Includes ad insertion system that plays 15-second placeholder ads between songs for non-premium users.
- **File Storage**: Replit Object Storage with presigned URLs for secure uploads of audio files (MP3, WAV, OGG, M4A) and square album artwork, with custom ACL for protected access. Includes song deletion with full cleanup. Uses Sharp library to automatically watermark album artwork with Soundwave logo for non-premium users.
- **Artist System**: Two-step verification (admin approval, then 1-hour automatic verification), upload blocking, dedicated dashboard for profile editing and song uploads. Songs can have scheduled release dates and optional payment-gated promotion.
- **Admin Panel**: Manages artist applications, Discord bot applications, user roles, user accounts, ban appeals, and IP/user bans. Includes bot approval workflow with Discord API integration to fetch bot profiles.
- **Stream Tracking**: Counts streams for songs and artists.
- **Follow Artists**: Users can follow/unfollow artists and view follower counts.
- **Personal Playlists**: Users can create, manage, and edit private playlists.
- **Discord Integration**: Users can create accounts via Discord, link existing accounts, and manage Discord binding via a settings page. A ban appeals system is integrated, allowing users to submit appeals which are reviewed in the admin panel with email notifications. Discord bot dashboard allows users to submit bots for admin verification, and approved bots are displayed publicly with a 24-hour voting cooldown system (users can vote once every 24 hours, each vote counts).

### Feature Specifications
- **User Management**: Secure registration, login, session management, and admin-level user/ban control.
- **Music Browsing & Search**: Explore content and search across songs, artists, albums, and playlists. Search results prioritize promoted songs.
- **Artist Dashboard**: Interface for artists to manage music, profiles, and uploads with scheduled releases. Shows monetization status with visual badges.
- **Song Promotion/Billing**: Artists can purchase promotion features for their songs via Stripe. Offers Global Promotion ($4) and Multi-Platform Distribution ($5) with clear pricing and benefits. Promoted songs appear in dedicated homepage section and rank higher in search results.
- **User Premium Features**: Account-level upgrades accessible from sidebar Premium link. Two tiers: Remove Watermark ($5) removes Soundwave logo from uploaded album artwork, Ad-Free Music ($10) removes advertisements between songs. Uses Stripe payment intents with instant activation.
- **Monetization Features**: Payment-gated song promotion with visual indicators (Featured badge for global promotion, Multi-Platform badge for distribution). Premium user badges display active features.
- **Expandable Music Player**: Spotify-style mini and full-screen player views.
- **Discord Bot Dashboard**: Public-facing bot directory where users can submit their Discord bots for review. Admins approve/reject submissions in the admin panel. Approved bots appear on `/bots` page with voting system. Owner's VOID bot is pre-approved and featured.

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
- **Image Processing**: Sharp for watermarking album artwork
- **Payment Processing**: Stripe for premium feature purchases
- **Content Moderation**: OpenAI AI Integrations (via Replit AI) for detecting inappropriate images and usernames

## Version Control
- **GitHub Integration**: Project is connected to GitHub for version control. All code changes (frontend, backend, database schema, components, etc.) are tracked and can be pushed to the remote repository using Git commands or the Replit Git pane.

## Deployment Instructions
Simply click the **Publish** button in Replit! See `DEPLOYMENT.md` for details.