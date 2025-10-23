import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPlaylistSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Search endpoint
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json({ songs: [], albums: [], artists: [], playlists: [] });
      }

      const q = query.toLowerCase();
      const [songs, albums, artists, playlists] = await Promise.all([
        storage.getSongs(),
        storage.getAlbums(),
        storage.getArtists(),
        storage.getPlaylists(),
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

      const filteredPlaylists = playlists.filter((playlist) =>
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

  // Artists
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

  // Albums
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

  // Songs
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

  // Playlists
  app.get("/api/playlists", async (_req, res) => {
    try {
      const playlists = await storage.getPlaylists();
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch playlists" });
    }
  });

  app.get("/api/playlists/:id", async (req, res) => {
    try {
      const playlist = await storage.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  });

  app.post("/api/playlists", async (req, res) => {
    try {
      const result = insertPlaylistSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid playlist data", details: result.error });
      }

      const playlist = await storage.createPlaylist(result.data);
      res.status(201).json(playlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to create playlist" });
    }
  });

  app.patch("/api/playlists/:id", async (req, res) => {
    try {
      const playlist = await storage.updatePlaylist(req.params.id, req.body);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to update playlist" });
    }
  });

  app.delete("/api/playlists/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePlaylist(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Playlist not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete playlist" });
    }
  });

  app.post("/api/playlists/:id/songs", async (req, res) => {
    try {
      const { songId } = req.body;
      if (!songId) {
        return res.status(400).json({ error: "songId is required" });
      }

      const playlist = await storage.addSongToPlaylist(req.params.id, songId);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to add song to playlist" });
    }
  });

  app.delete("/api/playlists/:id/songs/:songId", async (req, res) => {
    try {
      const playlist = await storage.removeSongFromPlaylist(req.params.id, req.params.songId);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to remove song from playlist" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
