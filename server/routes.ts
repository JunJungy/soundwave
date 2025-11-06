// Soundwave routes with custom authentication
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaylistSchema, insertUserSchema, loginSchema, insertArtistApplicationSchema, insertSongSchema, insertAlbumSchema, updateArtistProfileSchema, type Artist } from "@shared/schema";
import { setupSession, isAuthenticated, checkIpBan, checkUserBan, getClientIp } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import Stripe from "stripe";
import { sendBanNotification } from "./discord-bot";

// Initialize Stripe - Reference: blueprint:javascript_stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-10-29.clover",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);

  // Global middleware: Check if IP is banned
  app.use(checkIpBan);

  // Global middleware: Check if authenticated user is banned
  app.use(checkUserBan);

  // Object Storage routes - Reference: blueprint:javascript_object_storage
  // Serve private objects (audio files, images) with ACL check
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.session.userId;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for file uploads
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // Set ACL policy after file upload
  app.put("/api/objects/acl", isAuthenticated, async (req: any, res) => {
    if (!req.body.objectURL) {
      return res.status(400).json({ error: "objectURL is required" });
    }

    const userId = req.session.userId;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.objectURL,
        {
          owner: userId,
          visibility: "public", // Music files are public
        },
      );

      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Email is required for website registrations
      if (!validatedData.email) {
        return res.status(400).json({ error: "Email is required for registration" });
      }
      
      // Normalize email to lowercase
      const normalizedEmail = validatedData.email.trim().toLowerCase();
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      // Check if email is already bound to another account
      const existingBoundEmail = await storage.getUserByBoundEmail(normalizedEmail);
      if (existingBoundEmail) {
        return res.status(400).json({ error: "This email is already registered to another account" });
      }

      // Capture user's IP address
      const clientIp = getClientIp(req);

      // Create user with normalized email
      const user = await storage.createUser({
        ...validatedData,
        email: normalizedEmail,
      });

      // Set boundEmail and IP address permanently
      await storage.updateUser(user.id, {
        boundEmail: normalizedEmail,
        lastIpAddress: clientIp,
      });
      
      // Set session
      req.session.userId = user.id;
      
      // Return user without password hash
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { usernameOrEmail, password } = validatedData;
      
      // Robustly detect if input is an email (proper email format check)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailRegex.test(usernameOrEmail);
      
      let user = null;
      if (isEmail) {
        // Login with email - normalize and look up
        const normalizedEmail = usernameOrEmail.trim().toLowerCase();
        const foundUser = await storage.getUserByEmail(normalizedEmail);
        if (foundUser) {
          user = await storage.validatePassword(foundUser.username, password);
        }
      } else {
        // Login with username (exact match)
        user = await storage.validatePassword(usernameOrEmail, password);
      }
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Capture and store user's IP address
      const clientIp = getClientIp(req);
      await storage.updateUser(user.id, { lastIpAddress: clientIp });

      // Set session
      req.session.userId = user.id;
      
      // Return user without password hash
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ error: error.message || "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Get current user - NOT protected to allow landing page to function
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.session?.userId) {
        return res.json(null);
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.json(null);
      }
      
      // Return user without password hash
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Discord integration routes
  // Generate 6-digit link code for Discord account linking
  app.post("/api/discord/generate-link-code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiry to 5 minutes from now
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      // Update user with link code
      await storage.updateUser(userId, {
        discordLinkCode: code,
        discordLinkCodeExpiry: expiresAt,
      });

      res.json({ code, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      console.error("Error generating link code:", error);
      res.status(500).json({ error: "Failed to generate link code" });
    }
  });

  // Unlink Discord account (clears current link but preserves permanent binding)
  app.post("/api/discord/unlink", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      // Clear current Discord link but keep boundDiscordId (prevents creating new accounts)
      await storage.updateUser(userId, {
        discordId: null,
        discordLinkCode: null,
        discordLinkCodeExpiry: null,
        // boundDiscordId is NOT cleared - ensures one Discord = one account permanently
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error unlinking Discord:", error);
      res.status(500).json({ error: "Failed to unlink Discord account" });
    }
  });

  // Email management routes
  // Add or update email address (permanent binding)
  app.post("/api/user/add-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const rawEmail = req.body.email;

      // Validate email format
      if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Normalize email: trim whitespace and convert to lowercase
      const email = rawEmail.trim().toLowerCase();

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user already has boundEmail set
      if (user.boundEmail) {
        return res.status(400).json({ 
          error: "You already have an email permanently bound to this account. Email cannot be changed once set." 
        });
      }

      // Check if this email is already bound to another account
      const existingBoundUser = await storage.getUserByBoundEmail(email);
      if (existingBoundUser) {
        return res.status(400).json({ 
          error: "This email is already bound to another account. Each email can only be used once." 
        });
      }

      // Check if this email is currently in use by another account
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser && existingEmailUser.id !== userId) {
        return res.status(400).json({ 
          error: "This email is already in use by another account." 
        });
      }

      // Update email and boundEmail (permanent binding)
      // Wrap in try/catch to handle unique constraint violations
      try {
        const updatedUser = await storage.updateUserEmail(userId, email);
        
        if (!updatedUser) {
          return res.status(500).json({ error: "Failed to update email" });
        }

        // Return user without password hash
        const { passwordHash: _, ...safeUser } = updatedUser;
        res.json(safeUser);
      } catch (dbError: any) {
        // Handle unique constraint violations
        if (dbError.code === '23505' || dbError.message?.includes('unique')) {
          return res.status(409).json({ 
            error: "This email is already bound to another account. Each email can only be used once." 
          });
        }
        throw dbError;
      }
    } catch (error) {
      console.error("Error adding email:", error);
      res.status(500).json({ error: "Failed to add email address" });
    }
  });

  // Search endpoint - authenticated to scope playlist results
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const query = req.query.q as string;
      if (!query) {
        return res.json({ songs: [], albums: [], artists: [], playlists: [] });
      }

      const q = query.toLowerCase();
      const [songs, albums, artists, userPlaylists] = await Promise.all([
        storage.getSongs(),
        storage.getAlbums(),
        storage.getArtists(),
        storage.getPlaylists(userId), // Only fetch user's own playlists
      ]);

      const filteredSongs = songs.filter((song) =>
        song.title.toLowerCase().includes(q)
      );

      const filteredAlbums = albums.filter((album) =>
        album.title.toLowerCase().includes(q) ||
        album.genre?.toLowerCase().includes(q)
      );

      const filteredArtists = artists.filter((artist) =>
        artist.name.toLowerCase().includes(q) ||
        artist.genre?.toLowerCase().includes(q)
      );

      const filteredPlaylists = userPlaylists.filter((playlist) =>
        playlist.name.toLowerCase().includes(q) ||
        playlist.description?.toLowerCase().includes(q)
      );

      res.json({
        songs: filteredSongs,
        albums: filteredAlbums,
        artists: filteredArtists,
        playlists: filteredPlaylists,
      });
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Artists - public access
  app.get("/api/artists", async (_req, res) => {
    try {
      const artists = await storage.getArtists();
      res.json(artists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artists" });
    }
  });

  app.get("/api/artists/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist profile" });
    }
  });

  app.put("/api/artists/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (user?.isArtist !== 1) {
        return res.status(403).json({ error: "User is not an artist" });
      }
      
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(404).json({ error: "Artist profile not found" });
      }

      const validatedData = updateArtistProfileSchema.parse(req.body);
      const updates: Partial<Artist> = {};
      
      if (validatedData.imageUrl !== undefined) {
        updates.imageUrl = validatedData.imageUrl || null;
      }
      if (validatedData.bio !== undefined) {
        updates.bio = validatedData.bio || null;
      }

      const updatedArtist = await storage.updateArtist(artist.id, updates);
      res.json(updatedArtist);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update artist profile" });
    }
  });

  app.get("/api/artists/:id", async (req, res) => {
    try {
      const artist = await storage.getArtist(req.params.id);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist" });
    }
  });

  app.post("/api/artists/check-verification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const artist = await storage.getArtistByUserId(userId);
      
      if (!artist) {
        return res.status(404).json({ error: "Artist profile not found" });
      }

      if (artist.verified === 1) {
        return res.json({ verified: true, message: "Already verified" });
      }

      const songs = await storage.getSongsByArtist(artist.id);
      const totalStreams = songs.reduce((sum, song) => sum + (song.streams || 0), 0);

      if (totalStreams >= 1000000) {
        await storage.updateArtist(artist.id, {
          verified: 1,
          streams: totalStreams
        });
        return res.json({ verified: true, message: "Verification granted!", streams: totalStreams });
      }

      await storage.updateArtist(artist.id, { streams: totalStreams });
      return res.json({ verified: false, message: "Not yet eligible", streams: totalStreams });
    } catch (error) {
      res.status(500).json({ error: "Failed to check verification" });
    }
  });

  // Follow routes
  app.post("/api/artists/:id/follow", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const artistId = req.params.id;

      const artist = await storage.getArtist(artistId);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }

      const follow = await storage.followArtist(userId, artistId);
      res.json(follow);
    } catch (error) {
      console.error("Error following artist:", error);
      res.status(500).json({ error: "Failed to follow artist" });
    }
  });

  app.delete("/api/artists/:id/follow", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const artistId = req.params.id;

      await storage.unfollowArtist(userId, artistId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unfollowing artist:", error);
      res.status(500).json({ error: "Failed to unfollow artist" });
    }
  });

  app.get("/api/artists/:id/is-following", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const artistId = req.params.id;

      const isFollowing = await storage.isFollowing(userId, artistId);
      res.json({ isFollowing });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ error: "Failed to check follow status" });
    }
  });

  app.get("/api/artists/:id/followers", async (req, res) => {
    try {
      const artistId = req.params.id;
      const count = await storage.getFollowerCount(artistId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting follower count:", error);
      res.status(500).json({ error: "Failed to get follower count" });
    }
  });

  app.get("/api/following", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const followedArtists = await storage.getFollowedArtists(userId);
      res.json(followedArtists);
    } catch (error) {
      console.error("Error getting followed artists:", error);
      res.status(500).json({ error: "Failed to get followed artists" });
    }
  });

  // Albums - public access
  app.get("/api/albums", async (_req, res) => {
    try {
      const albums = await storage.getAlbums();
      res.json(albums);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch albums" });
    }
  });

  app.get("/api/albums/:id", async (req, res) => {
    try {
      const album = await storage.getAlbum(req.params.id);
      if (!album) {
        return res.status(404).json({ error: "Album not found" });
      }
      res.json(album);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch album" });
    }
  });

  // Songs - public access
  app.get("/api/songs", async (_req, res) => {
    try {
      const songs = await storage.getSongs();
      res.json(songs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch songs" });
    }
  });

  app.get("/api/songs/:id", async (req, res) => {
    try {
      const song = await storage.getSong(req.params.id);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }
      res.json(song);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch song" });
    }
  });

  // Update songs with real Spotify preview URLs - admin only
  app.post("/api/admin/update-spotify-urls", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { searchTrack } = await import("./spotify");
      const songs = await storage.getSongs();
      const results = {
        updated: 0,
        failed: 0,
        skipped: 0,
        details: [] as any[]
      };

      for (const song of songs) {
        try {
          // Skip if already has a non-SoundHelix URL
          if (song.audioUrl && !song.audioUrl.includes('soundhelix.com')) {
            results.skipped++;
            results.details.push({ song: song.title, status: 'skipped', reason: 'already has spotify url' });
            continue;
          }

          const artist = await storage.getArtist(song.artistId);
          if (!artist) {
            results.failed++;
            results.details.push({ song: song.title, status: 'failed', reason: 'artist not found' });
            continue;
          }

          const spotifyTrack = await searchTrack(song.title, artist.name);
          if (spotifyTrack?.previewUrl) {
            await storage.updateSongAudioUrl(song.id, spotifyTrack.previewUrl);
            results.updated++;
            results.details.push({ song: song.title, status: 'updated', url: spotifyTrack.previewUrl });
          } else {
            results.failed++;
            results.details.push({ song: song.title, status: 'failed', reason: 'no preview url found' });
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: any) {
          results.failed++;
          results.details.push({ song: song.title, status: 'error', error: error.message });
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error updating Spotify URLs:", error);
      res.status(500).json({ error: "Failed to update Spotify URLs", details: error.message });
    }
  });

  // Playlists - authenticated access for user-specific playlists
  app.get("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const playlists = await storage.getPlaylists(userId);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch playlists" });
    }
  });

  app.get("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const playlist = await storage.getPlaylist(req.params.id, userId);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found or access denied" });
      }
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  });

  app.post("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const result = insertPlaylistSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid playlist data", details: result.error });
      }

      const playlist = await storage.createPlaylist({
        ...result.data,
        userId,
      });
      res.status(201).json(playlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to create playlist" });
    }
  });

  app.patch("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const updated = await storage.updatePlaylist(req.params.id, userId, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Playlist not found or access denied" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update playlist" });
    }
  });

  app.delete("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const deleted = await storage.deletePlaylist(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Playlist not found or access denied" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete playlist" });
    }
  });

  app.post("/api/playlists/:id/songs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { songId } = req.body;
      if (!songId) {
        return res.status(400).json({ error: "songId is required" });
      }

      const updated = await storage.addSongToPlaylist(req.params.id, userId, songId);
      if (!updated) {
        return res.status(404).json({ error: "Playlist not found or access denied" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to add song to playlist" });
    }
  });

  app.delete("/api/playlists/:id/songs/:songId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const updated = await storage.removeSongFromPlaylist(req.params.id, userId, req.params.songId);
      if (!updated) {
        return res.status(404).json({ error: "Playlist not found or access denied" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to remove song from playlist" });
    }
  });

  // Artist Application endpoints
  app.post("/api/artist-applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isArtist === 1) {
        return res.status(400).json({ error: "You are already an artist" });
      }

      const existing = await storage.getArtistApplicationByUserId(userId);
      if (existing) {
        return res.status(400).json({ error: "You already have a pending or processed application" });
      }

      const validatedData = insertArtistApplicationSchema.omit({ userId: true }).parse(req.body);
      const application = await storage.createArtistApplication({
        ...validatedData,
        userId,
      });

      res.json(application);
    } catch (error: any) {
      console.error("Artist application error:", error);
      res.status(400).json({ error: error.message || "Failed to create artist application" });
    }
  });

  app.get("/api/artist-applications/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const application = await storage.getArtistApplicationByUserId(userId);
      res.json(application || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  app.get("/api/artist-applications/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const applications = await storage.getPendingArtistApplications();
      res.json(applications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.post("/api/artist-applications/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const approved = await storage.approveArtistApplication(req.params.id, userId);
      if (!approved) {
        return res.status(404).json({ error: "Application not found" });
      }

      res.json(approved);
    } catch (error) {
      console.error("Approval error:", error);
      res.status(500).json({ error: "Failed to approve application" });
    }
  });

  app.post("/api/artist-applications/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const rejected = await storage.rejectArtistApplication(req.params.id, userId);
      if (!rejected) {
        return res.status(404).json({ error: "Application not found" });
      }

      res.json(rejected);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject application" });
    }
  });

  // Stripe payment intent for song upload monetization - Reference: blueprint:javascript_stripe
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { globalPromotion, otherPlatforms } = req.body;
      
      // Calculate amount based on selected features
      let amount = 0;
      if (globalPromotion) amount += 4;
      if (otherPlatforms) amount += 5;
      
      if (amount === 0) {
        return res.json({ clientSecret: null, amount: 0 });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        payment_method_types: ['card'], // Explicitly specify card payments
        metadata: {
          userId: req.session.userId,
          globalPromotion: globalPromotion ? 'true' : 'false',
          otherPlatforms: otherPlatforms ? 'true' : 'false',
        },
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount 
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe payment intent for premium features - Reference: blueprint:javascript_stripe
  app.post("/api/premium/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const { featureId } = req.body;
      
      if (!featureId) {
        return res.status(400).json({ message: "Feature ID is required" });
      }

      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Define premium features and pricing
      const features: Record<string, { price: number; name: string; column: 'premiumNoWatermark' | 'premiumNoAds' }> = {
        remove_watermark: { price: 5, name: "Remove Watermark", column: 'premiumNoWatermark' },
        remove_ads: { price: 10, name: "Ad-Free Music", column: 'premiumNoAds' },
      };

      const feature = features[featureId];
      if (!feature) {
        return res.status(400).json({ message: "Invalid feature ID" });
      }

      // Check if user already has this feature
      if (user[feature.column] === 1) {
        return res.status(400).json({ message: "You already have this feature" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(feature.price * 100), // Convert to cents
        currency: "usd",
        payment_method_types: ['card'],
        metadata: {
          userId: req.session.userId,
          featureId: featureId,
          featureName: feature.name,
        },
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: feature.price
      });
    } catch (error: any) {
      console.error("Error creating premium payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Activate premium feature after successful payment
  app.post("/api/premium/activate", isAuthenticated, async (req: any, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }

      const userId = req.session.userId;

      // Retrieve and verify the payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      if (paymentIntent.metadata.userId !== userId) {
        return res.status(403).json({ message: "Payment belongs to different user" });
      }

      const featureId = paymentIntent.metadata.featureId;
      const features: Record<string, { column: 'premiumNoWatermark' | 'premiumNoAds' }> = {
        remove_watermark: { column: 'premiumNoWatermark' },
        remove_ads: { column: 'premiumNoAds' },
      };

      const feature = features[featureId];
      if (!feature) {
        return res.status(400).json({ message: "Invalid feature ID" });
      }

      // Activate the premium feature
      const updatedUser = await storage.updateUser(userId, {
        [feature.column]: 1,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { passwordHash: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Error activating premium feature:", error);
      res.status(500).json({ message: "Error activating feature: " + error.message });
    }
  });

  // Admin user management endpoints
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ passwordHash: _, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users/:id/promote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updatedUser = await storage.updateUserAdminStatus(req.params.id, 1);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { passwordHash: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error promoting user:", error);
      res.status(500).json({ error: "Failed to promote user" });
    }
  });

  app.post("/api/admin/users/:id/demote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (req.params.id === userId) {
        return res.status(400).json({ error: "Cannot demote yourself" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (targetUser?.username === "Jinsoo") {
        return res.status(400).json({ error: "Cannot demote the owner account" });
      }

      const updatedUser = await storage.updateUserAdminStatus(req.params.id, 0);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const { passwordHash: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error demoting user:", error);
      res.status(500).json({ error: "Failed to demote user" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (req.params.id === userId) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }

      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.username === "Jinsoo") {
        return res.status(400).json({ error: "Cannot delete the owner account" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Ban user
  app.post("/api/admin/users/:id/ban", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { reason } = req.body;
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (targetUser.username === "Jinsoo") {
        return res.status(400).json({ error: "Cannot ban the owner account" });
      }

      const bannedUser = await storage.banUser(req.params.id, userId, reason);
      
      // Send Discord notification
      sendBanNotification({
        type: 'user_ban',
        username: targetUser.username,
        userId: req.params.id,
        reason: reason,
        adminUsername: user.username
      }).catch(err => console.error('Failed to send ban notification:', err));
      
      res.json(bannedUser);
    } catch (error) {
      console.error("Error banning user:", error);
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  // Unban user
  app.post("/api/admin/users/:id/unban", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const unbannedUser = await storage.unbanUser(req.params.id);
      res.json(unbannedUser);
    } catch (error) {
      console.error("Error unbanning user:", error);
      res.status(500).json({ error: "Failed to unban user" });
    }
  });

  // IP ban
  app.post("/api/admin/ip-bans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { ipAddress, reason } = req.body;
      if (!ipAddress) {
        return res.status(400).json({ error: "IP address is required" });
      }

      const ipBan = await storage.createIpBan(ipAddress, userId, reason);
      
      // Send Discord notification
      sendBanNotification({
        type: 'ip_ban',
        ipAddress: ipAddress,
        reason: reason,
        adminUsername: user.username
      }).catch(err => console.error('Failed to send IP ban notification:', err));
      
      res.json(ipBan);
    } catch (error) {
      console.error("Error creating IP ban:", error);
      res.status(500).json({ error: "Failed to create IP ban" });
    }
  });

  // Remove IP ban
  app.delete("/api/admin/ip-bans/:ipAddress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.removeIpBan(req.params.ipAddress);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing IP ban:", error);
      res.status(500).json({ error: "Failed to remove IP ban" });
    }
  });

  // Get all IP bans
  app.get("/api/admin/ip-bans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const ipBans = await storage.getIpBans();
      res.json(ipBans);
    } catch (error) {
      console.error("Error fetching IP bans:", error);
      res.status(500).json({ error: "Failed to fetch IP bans" });
    }
  });

  // Ban Appeals - Public route (no auth required)
  app.post("/api/ban-appeals", async (req: any, res) => {
    try {
      const { username, email, reason } = req.body;
      
      if (!username || !email || !reason) {
        return res.status(400).json({ error: "Username, email, and reason are required" });
      }

      // Capture IP address
      const ipAddress = getClientIp(req);

      const appeal = await storage.createBanAppeal({
        username,
        email,
        reason,
        ipAddress,
      });

      // Send email notification (fire-and-forget)
      import("./email").then(({ sendBanAppealNotification }) => {
        sendBanAppealNotification({
          ...appeal,
          ipAddress: appeal.ipAddress || undefined,
        }).catch((err) => {
          console.error("Failed to send ban appeal email notification:", err);
        });
      });

      res.json(appeal);
    } catch (error) {
      console.error("Error creating ban appeal:", error);
      res.status(500).json({ error: "Failed to submit appeal" });
    }
  });

  // Get all ban appeals (admin only)
  app.get("/api/admin/ban-appeals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const status = req.query.status as string | undefined;
      const appeals = await storage.getBanAppeals(status);
      res.json(appeals);
    } catch (error) {
      console.error("Error fetching ban appeals:", error);
      res.status(500).json({ error: "Failed to fetch appeals" });
    }
  });

  // Approve ban appeal (admin only)
  app.post("/api/admin/ban-appeals/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { response } = req.body;
      const appeal = await storage.approveBanAppeal(req.params.id, userId, response);
      res.json(appeal);
    } catch (error) {
      console.error("Error approving appeal:", error);
      res.status(500).json({ error: "Failed to approve appeal" });
    }
  });

  // Deny ban appeal (admin only)
  app.post("/api/admin/ban-appeals/:id/deny", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { response } = req.body;
      const appeal = await storage.denyBanAppeal(req.params.id, userId, response);
      res.json(appeal);
    } catch (error) {
      console.error("Error denying appeal:", error);
      res.status(500).json({ error: "Failed to deny appeal" });
    }
  });

  // Song stream tracking
  app.post("/api/songs/:id/play", isAuthenticated, async (req: any, res) => {
    try {
      const song = await storage.incrementSongStreams(req.params.id);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }

      const artist = await storage.getArtist(song.artistId);
      if (artist) {
        const totalStreams = (await storage.getSongsByArtist(artist.id))
          .reduce((sum, s) => sum + (s.streams || 0), 0);

        const shouldVerify = totalStreams >= 1000000 && artist.verified === 0;
        if (shouldVerify) {
          await storage.updateArtist(artist.id, { 
            verified: 1,
            streams: totalStreams 
          });
        } else {
          await storage.updateArtist(artist.id, { streams: totalStreams });
        }
      }

      res.json({ success: true, streams: song.streams });
    } catch (error) {
      console.error("Stream tracking error:", error);
      res.status(500).json({ error: "Failed to track stream" });
    }
  });

  // Artist music upload endpoints
  app.post("/api/albums", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isArtist !== 1) {
        return res.status(403).json({ error: "Artist access required" });
      }

      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(404).json({ error: "Artist profile not found" });
      }

      if (artist.verificationStatus !== 'verified') {
        return res.status(403).json({ error: "Your artist account is pending verification. This usually takes up to 1 hour after approval." });
      }

      const validatedData = insertAlbumSchema.parse(req.body);
      const album = await storage.createAlbum({
        ...validatedData,
        artistId: artist.id,
      });

      res.json(album);
    } catch (error: any) {
      console.error("Album creation error:", error);
      res.status(400).json({ error: error.message || "Failed to create album" });
    }
  });

  app.post("/api/songs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isArtist !== 1) {
        return res.status(403).json({ error: "Artist access required" });
      }

      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(404).json({ error: "Artist profile not found" });
      }

      if (artist.verificationStatus !== 'verified') {
        return res.status(403).json({ error: "Your artist account is pending verification. This usually takes up to 1 hour after approval." });
      }

      // Transform frontend data to match schema expectations
      const transformedData = {
        ...req.body,
        // Convert booleans to integers (0 or 1) for PostgreSQL
        globalPromotion: req.body.globalPromotion ? 1 : 0,
        otherPlatforms: req.body.otherPlatforms ? 1 : 0,
        // Ensure releaseDate is a Date object
        releaseDate: req.body.releaseDate ? new Date(req.body.releaseDate) : new Date(),
      };

      const validatedData = insertSongSchema.parse(transformedData);
      
      // Determine release status based on release date
      const releaseDate = validatedData.releaseDate ? new Date(validatedData.releaseDate) : new Date();
      const now = new Date();
      
      // Compare dates at start of day (ignore time component)
      // This way, selecting "today" publishes immediately
      const releaseDateOnly = new Date(releaseDate.getFullYear(), releaseDate.getMonth(), releaseDate.getDate());
      const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let releaseStatus = 'published';
      if (releaseDateOnly > todayOnly) {
        // Scheduled for future release (date is in the future)
        releaseStatus = 'scheduled';
      }

      const song = await storage.createSong({
        ...validatedData,
        artistId: artist.id,
        releaseDate,
      } as any); // Type cast needed because we set status fields in the database default
      
      // Update song with status fields (which are set by system, not user input)
      const updatedSong = await storage.updateSong(song.id, {
        releaseStatus,
        artworkCheckStatus: 'approved', // Client-side validation passed
        audioCheckStatus: 'approved', // Client-side validation passed
      });

      res.json(updatedSong || song);
    } catch (error: any) {
      console.error("Song creation error:", error);
      res.status(400).json({ error: error.message || "Failed to create song" });
    }
  });

  app.delete("/api/songs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.isArtist !== 1) {
        return res.status(403).json({ error: "Artist access required" });
      }

      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(404).json({ error: "Artist profile not found" });
      }

      const song = await storage.getSong(req.params.id);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }

      if (song.artistId !== artist.id) {
        return res.status(403).json({ error: "You can only delete your own songs" });
      }

      const objectStorageService = new ObjectStorageService();

      if (song.audioUrl) {
        try {
          await objectStorageService.deleteObjectEntity(song.audioUrl);
        } catch (error) {
          console.error("Failed to delete audio file:", error);
        }
      }

      if (song.artworkUrl) {
        try {
          await objectStorageService.deleteObjectEntity(song.artworkUrl);
        } catch (error) {
          console.error("Failed to delete artwork file:", error);
        }
      }

      const deleted = await storage.deleteSong(req.params.id, artist.id);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete song" });
      }
    } catch (error: any) {
      console.error("Song deletion error:", error);
      res.status(500).json({ error: error.message || "Failed to delete song" });
    }
  });

  // Games API Routes
  // Get all active games
  app.get("/api/games", async (req, res) => {
    try {
      const allGames = await storage.getGames();
      res.json(allGames);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ error: "Failed to fetch games" });
    }
  });

  // Get specific game
  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ error: "Failed to fetch game" });
    }
  });

  // Get leaderboard for a game
  app.get("/api/games/:id/leaderboard", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await storage.getGameLeaderboard(req.params.id, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Simple in-memory rate limiting for score submissions
  const scoreSubmissionTracker = new Map<string, number[]>();
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  const MAX_SUBMISSIONS_PER_MINUTE = 10;

  // Submit score for a game (requires authentication)
  app.post("/api/games/:id/score", isAuthenticated, async (req: any, res) => {
    try {
      const { score, metadata } = req.body;
      const userId = req.session.userId;
      const gameId = req.params.id;

      // Rate limiting: prevent spam submissions
      const userGameKey = `${userId}:${gameId}`;
      const now = Date.now();
      const submissions = scoreSubmissionTracker.get(userGameKey) || [];
      
      // Clean old submissions outside the window
      const recentSubmissions = submissions.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
      
      if (recentSubmissions.length >= MAX_SUBMISSIONS_PER_MINUTE) {
        return res.status(429).json({ 
          error: "Too many score submissions. Please wait before submitting again." 
        });
      }
      
      // Track this submission
      recentSubmissions.push(now);
      scoreSubmissionTracker.set(userGameKey, recentSubmissions);

      // Validation: score must be a positive number
      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ error: "Score must be a positive number" });
      }

      // Validation: score must be finite (not Infinity or NaN)
      if (!Number.isFinite(score)) {
        return res.status(400).json({ error: "Score must be a valid finite number" });
      }

      // Verify game exists and is active
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      if (game.isActive !== 1) {
        return res.status(403).json({ error: "Game is not active" });
      }

      const gameScore = await storage.submitScore({
        gameId,
        userId,
        score,
        metadata: metadata || null,
      });

      res.json(gameScore);
    } catch (error) {
      console.error("Error submitting score:", error);
      res.status(500).json({ error: "Failed to submit score" });
    }
  });

  // Get user's best score for a game
  app.get("/api/games/:id/user-best", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const bestScore = await storage.getUserBestScore(req.params.id, userId);
      res.json(bestScore || null);
    } catch (error) {
      console.error("Error fetching user best score:", error);
      res.status(500).json({ error: "Failed to fetch user best score" });
    }
  });

  // Get all user's scores (requires authentication)
  app.get("/api/games/user/scores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const scores = await storage.getUserScores(userId);
      res.json(scores);
    } catch (error) {
      console.error("Error fetching user scores:", error);
      res.status(500).json({ error: "Failed to fetch user scores" });
    }
  });

  // Admin: Create new game
  app.post("/api/admin/games", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, thumbnailUrl, gameUrl, gameType, category } = req.body;

      if (!name || !gameUrl) {
        return res.status(400).json({ error: "Name and game URL are required" });
      }

      const game = await storage.createGame({
        name,
        description: description || null,
        thumbnailUrl: thumbnailUrl || null,
        gameUrl,
        gameType: gameType || 'iframe',
        category: category || null,
        createdBy: userId,
      });

      res.json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  // Admin: Update game
  app.put("/api/admin/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updates = req.body;
      const game = await storage.updateGame(req.params.id, updates);

      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }

      res.json(game);
    } catch (error) {
      console.error("Error updating game:", error);
      res.status(500).json({ error: "Failed to update game" });
    }
  });

  // Admin: Delete game
  app.delete("/api/admin/games/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);

      if (!user || user.isAdmin !== 1) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const deleted = await storage.deleteGame(req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: "Game not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ error: "Failed to delete game" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
