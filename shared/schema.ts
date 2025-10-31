import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (custom authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(), // Current email (can be updated)
  boundEmail: varchar("bound_email").unique(), // Permanent email association (prevents multi-account)
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  discordId: varchar("discord_id").unique(), // Current Discord link (null if unlinked)
  boundDiscordId: varchar("bound_discord_id").unique(), // Permanent Discord association (never cleared)
  discordLinkCode: varchar("discord_link_code"), // One-time code for linking Discord
  discordLinkCodeExpiry: timestamp("discord_link_code_expiry"), // Code expiration timestamp
  lastIpAddress: varchar("last_ip_address"), // Track user's last login IP
  isBanned: integer("is_banned").default(0).notNull(), // 1 = banned, 0 = active
  bannedAt: timestamp("banned_at"), // When user was banned
  bannedBy: varchar("banned_by"), // Admin user ID who banned them
  banReason: text("ban_reason"), // Reason for ban
  isAdmin: integer("is_admin").default(0).notNull(),
  isArtist: integer("is_artist").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  email: z.string().email("Invalid email address").optional(), // Optional for Discord registrations
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Username or email is required"), // Accept either
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;

export const artists = pgTable("artists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  genre: text("genre"),
  verified: integer("verified").default(0).notNull(),
  streams: integer("streams").default(0).notNull(),
  verificationStatus: text("verification_status").default("pending").notNull(),
  approvedAt: timestamp("approved_at"),
});

export const albums = pgTable("albums", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  artistId: varchar("artist_id").notNull(),
  coverUrl: text("cover_url"),
  year: integer("year"),
  genre: text("genre"),
});

export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  artistId: varchar("artist_id").notNull(),
  albumId: varchar("album_id"), // Now nullable - songs can exist without albums
  duration: integer("duration").notNull(),
  audioUrl: text("audio_url"),
  artworkUrl: text("artwork_url"), // Song-specific artwork
  genre: text("genre"), // Song genre (includes K-pop)
  language: text("language"), // Song language (English, Spanish, Japanese, Korean, etc.)
  lyrics: jsonb("lyrics"), // Timestamped lyrics data: { lines: [{ startTime, endTime, text }] }
  releaseDate: timestamp("release_date").defaultNow(), // Scheduled release date
  releaseStatus: text("release_status").default("draft").notNull(), // draft/pending_review/scheduled/published
  globalPromotion: integer("global_promotion").default(0).notNull(), // +$4 feature
  otherPlatforms: integer("other_platforms").default(0).notNull(), // +$5 feature
  paymentIntentId: varchar("payment_intent_id"), // Stripe payment tracking
  artworkCheckStatus: text("artwork_check_status").default("pending"), // pending/checking/approved/rejected
  audioCheckStatus: text("audio_check_status").default("pending"), // pending/checking/approved/rejected
  streams: integer("streams").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  songIds: text("song_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const artistApplications = pgTable("artist_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  artistName: text("artist_name").notNull(),
  genre: text("genre"),
  bio: text("bio"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
});

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  artistId: varchar("artist_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ipBans = pgTable("ip_bans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: varchar("ip_address").notNull().unique(),
  bannedBy: varchar("banned_by").notNull(), // Admin user ID who banned this IP
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
});

export const insertArtistSchema = createInsertSchema(artists).omit({ id: true, verified: true, streams: true, verificationStatus: true, approvedAt: true });
export const updateArtistProfileSchema = z.object({
  imageUrl: z.string().optional().or(z.literal("")),
  bio: z.string().max(1000, "Bio must be 1000 characters or less").optional().or(z.literal("")),
});
export const insertAlbumSchema = createInsertSchema(albums).omit({ id: true });
export const insertSongSchema = createInsertSchema(songs).omit({ 
  id: true, 
  streams: true, 
  createdAt: true,
  releaseStatus: true, // Set by system
  artworkCheckStatus: true, // Set by system
  audioCheckStatus: true, // Set by system
});
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, createdAt: true });
export const insertArtistApplicationSchema = createInsertSchema(artistApplications).omit({ 
  id: true, 
  status: true, 
  createdAt: true, 
  reviewedAt: true, 
  reviewedBy: true 
});
export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export const insertIpBanSchema = createInsertSchema(ipBans).omit({ id: true, bannedAt: true });

export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type UpdateArtistProfile = z.infer<typeof updateArtistProfileSchema>;
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type InsertArtistApplication = z.infer<typeof insertArtistApplicationSchema>;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type InsertIpBan = z.infer<typeof insertIpBanSchema>;

export type Artist = typeof artists.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type ArtistApplication = typeof artistApplications.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type IpBan = typeof ipBans.$inferSelect;
