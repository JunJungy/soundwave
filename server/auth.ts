import type { Express, RequestHandler } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

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

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};
