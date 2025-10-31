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
  email: varchar("email"),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: integer("is_admin").default(0).notNull(),
  isArtist: integer("is_artist").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
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

export const insertArtistSchema = createInsertSchema(artists).omit({ id: true, verified: true, streams: true, verificationStatus: true, approvedAt: true });
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

export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type InsertArtistApplication = z.infer<typeof insertArtistApplicationSchema>;

export type Artist = typeof artists.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
export type ArtistApplication = typeof artistApplications.$inferSelect;
