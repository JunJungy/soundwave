import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const artists = pgTable("artists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  genre: text("genre"),
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
  albumId: varchar("album_id").notNull(),
  duration: integer("duration").notNull(),
  audioUrl: text("audio_url"),
});

export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  songIds: text("song_ids").array().notNull().default(sql`ARRAY[]::text[]`),
});

export const insertArtistSchema = createInsertSchema(artists).omit({ id: true });
export const insertAlbumSchema = createInsertSchema(albums).omit({ id: true });
export const insertSongSchema = createInsertSchema(songs).omit({ id: true });
export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true });

export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type InsertAlbum = z.infer<typeof insertAlbumSchema>;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;

export type Artist = typeof artists.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Playlist = typeof playlists.$inferSelect;
