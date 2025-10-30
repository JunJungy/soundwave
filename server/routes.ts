// Soundwave routes with custom authentication
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaylistSchema, insertUserSchema, loginSchema, insertArtistApplicationSchema, insertSongSchema, insertAlbumSchema } from "@shared/schema";
import { setupSession, isAuthenticated } from "./auth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);

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
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }

      const user = await storage.createUser(validatedData);
      
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
      
      const user = await storage.validatePassword(validatedData.username, validatedData.password);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

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

      const validatedData = insertSongSchema.parse(req.body);
      const song = await storage.createSong({
        ...validatedData,
        artistId: artist.id,
      });

      res.json(song);
    } catch (error: any) {
      console.error("Song creation error:", error);
      res.status(400).json({ error: error.message || "Failed to create song" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
