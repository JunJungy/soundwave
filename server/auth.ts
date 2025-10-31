import type { Express, RequestHandler } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";

const MemoryStore = createMemoryStore(session);
const PgSession = connectPgSimple(session);

export function setupSession(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "dev-secret-change-in-production";
  
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: false,
      }),
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );
}

// Helper to get client IP
function getClientIp(req: any): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

// Middleware to check if IP is banned
export const checkIpBan: RequestHandler = async (req: any, res, next) => {
  try {
    const clientIp = getClientIp(req);
    const isBanned = await storage.isIpBanned(clientIp);
    
    if (isBanned) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  } catch (error) {
    console.error("Error checking IP ban:", error);
    next(); // Allow request on error to prevent blocking legitimate users
  }
};

// Middleware to check if user is banned (use after isAuthenticated)
export const checkUserBan: RequestHandler = async (req: any, res, next) => {
  try {
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      
      if (user && user.isBanned === 1) {
        // Log out banned user
        req.session.destroy(() => {});
        return res.status(403).json({ error: "Your account has been banned" });
      }
    }
    next();
  } catch (error) {
    console.error("Error checking user ban:", error);
    next(); // Allow request on error
  }
};

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};
