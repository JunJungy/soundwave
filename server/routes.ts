// Soundwave routes with Replit Auth integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaylistSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware (Replit Auth)
  await setupAuth(app);

  // Auth routes - NOT protected to allow landing page to function
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Search endpoint - authenticated to scope playlist results
  app.get("/api/search", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Playlists - authenticated access for user-specific playlists
  app.get("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playlists = await storage.getPlaylists(userId);
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch playlists" });
    }
  });

  app.get("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const updated = await storage.removeSongFromPlaylist(req.params.id, userId, req.params.songId);
      if (!updated) {
        return res.status(404).json({ error: "Playlist not found or access denied" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to remove song from playlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
