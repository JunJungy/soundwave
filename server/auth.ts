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

// Helper to get client IP - prefers IPv4 addresses
export function getClientIp(req: any): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Split by comma to get all forwarded IPs
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
    
    // Prefer IPv4 addresses (format: xxx.xxx.xxx.xxx)
    const ipv4 = ips.find((ip: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip));
    if (ipv4) {
      return ipv4;
    }
    
    // Fallback to first IP if no IPv4 found
    return ips[0];
  }
  
  // Fallback to request IP
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  
  // If it's an IPv6-mapped IPv4 address (::ffff:192.168.1.1), extract the IPv4 part
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  return ip;
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
    console.error("CRITICAL: Error checking IP ban - failing secure:", error);
    // Fail-secure: block request on database errors to maintain ban enforcement
    return res.status(503).json({ error: "Service temporarily unavailable" });
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
    console.error("CRITICAL: Error checking user ban - failing secure:", error);
    // Fail-secure: block request on database errors to maintain ban enforcement
    return res.status(503).json({ error: "Service temporarily unavailable" });
  }
};

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};
