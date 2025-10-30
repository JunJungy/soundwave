import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

// Trust proxy - required for secure cookies to work behind Replit's proxy
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Serve attached_assets folder for album covers and audio files
app.use('/attached_assets', express.static(path.resolve(import.meta.dirname, '..', 'attached_assets')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Second verification - auto-verifies pending artists after up to 1 hour
const checkPendingArtistVerification = async () => {
  try {
    const artists = await storage.getArtists();
    const pendingArtists = artists.filter(a => a.verificationStatus === 'pending' && a.approvedAt);

    for (const artist of pendingArtists) {
      const approvedAt = new Date(artist.approvedAt!);
      const now = new Date();
      const hoursSinceApproval = (now.getTime() - approvedAt.getTime()) / (1000 * 60 * 60);

      // Auto-verify after 1 hour
      if (hoursSinceApproval >= 1) {
        await storage.updateArtist(artist.id, {
          verificationStatus: 'verified'
        });
        log(`Artist ${artist.name} (${artist.id}) auto-verified after second verification period`);
      }
    }
  } catch (error) {
    console.error('Pending artist verification check failed:', error);
  }
};

// Auto-verification checker - runs every hour
const checkArtistVerification = async () => {
  try {
    const artists = await storage.getArtists();
    const unverifiedArtists = artists.filter(a => a.verified === 0);

    for (const artist of unverifiedArtists) {
      const songs = await storage.getSongsByArtist(artist.id);
      const totalStreams = songs.reduce((sum, song) => sum + (song.streams || 0), 0);

      if (totalStreams >= 1000000) {
        await storage.updateArtist(artist.id, {
          verified: 1,
          streams: totalStreams
        });
        log(`Artist ${artist.name} (${artist.id}) auto-verified with ${totalStreams} streams`);
      } else if (artist.streams !== totalStreams) {
        await storage.updateArtist(artist.id, { streams: totalStreams });
      }
    }
  } catch (error) {
    console.error('Auto-verification check failed:', error);
  }
};

// Scheduled release checker - publishes songs when their release date arrives
const checkScheduledReleases = async () => {
  try {
    const songs = await storage.getAllSongs();
    const scheduledSongs = songs.filter(s => s.releaseStatus === 'scheduled');
    const now = new Date();

    for (const song of scheduledSongs) {
      if (song.releaseDate && new Date(song.releaseDate) <= now) {
        await storage.updateSong(song.id, {
          releaseStatus: 'published'
        });
        log(`Song "${song.title}" (${song.id}) published on scheduled release date`);
      }
    }
  } catch (error) {
    console.error('Scheduled release check failed:', error);
  }
};

(async () => {
  // Seed the database with initial music data
  await storage.seedDatabase();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Run second verification check every 10 minutes (more frequent for 1-hour verification)
    setInterval(checkPendingArtistVerification, 10 * 60 * 1000);
    // Also run once on startup
    checkPendingArtistVerification();
    
    // Run stream-based verification check every hour
    setInterval(checkArtistVerification, 60 * 60 * 1000);
    // Also run once on startup
    checkArtistVerification();
    
    // Run scheduled release check every 10 minutes
    setInterval(checkScheduledReleases, 10 * 60 * 1000);
    // Also run once on startup
    checkScheduledReleases();
  });
})();
