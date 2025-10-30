import {
  artists,
  albums,
  songs,
  playlists,
  users,
  artistApplications,
  type Artist,
  type Album,
  type Song,
  type Playlist,
  type User,
  type ArtistApplication,
  type InsertArtist,
  type InsertAlbum,
  type InsertSong,
  type InsertPlaylist,
  type InsertUser,
  type InsertArtistApplication,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { getAlbum, searchTrack } from "./spotify";

export interface IStorage {
  // User operations (custom authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validatePassword(username: string, password: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUserAdminStatus(userId: string, isAdmin: number): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;

  // Artists
  getArtists(): Promise<Artist[]>;
  getArtist(id: string): Promise<Artist | undefined>;
  getArtistByUserId(userId: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  updateArtist(id: string, updates: Partial<Artist>): Promise<Artist | undefined>;

  // Albums
  getAlbums(): Promise<Album[]>;
  getAlbum(id: string): Promise<Album | undefined>;
  getAlbumsByArtist(artistId: string): Promise<Album[]>;
  createAlbum(album: InsertAlbum): Promise<Album>;

  // Songs
  getSongs(): Promise<Song[]>;
  getAllSongs(): Promise<Song[]>;
  getSong(id: string): Promise<Song | undefined>;
  getSongsByAlbum(albumId: string): Promise<Song[]>;
  getSongsByArtist(artistId: string): Promise<Song[]>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined>;
  incrementSongStreams(songId: string): Promise<Song | undefined>;
  updateSongAudioUrl(songId: string, audioUrl: string): Promise<Song | undefined>;

  // Playlists
  getPlaylists(userId: string): Promise<Playlist[]>;
  getPlaylist(id: string, userId: string): Promise<Playlist | undefined>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: string, userId: string, updates: Partial<Playlist>): Promise<Playlist | undefined>;
  deletePlaylist(id: string, userId: string): Promise<boolean>;
  addSongToPlaylist(playlistId: string, userId: string, songId: string): Promise<Playlist | undefined>;
  removeSongFromPlaylist(playlistId: string, userId: string, songId: string): Promise<Playlist | undefined>;

  // Artist Applications
  createArtistApplication(application: InsertArtistApplication): Promise<ArtistApplication>;
  getArtistApplicationByUserId(userId: string): Promise<ArtistApplication | undefined>;
  getPendingArtistApplications(): Promise<ArtistApplication[]>;
  approveArtistApplication(id: string, adminId: string): Promise<ArtistApplication | undefined>;
  rejectArtistApplication(id: string, adminId: string): Promise<ArtistApplication | undefined>;

  // Seeding
  seedDatabase(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (custom authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const { password, passwordHash: _, ...userFields } = userData as any;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userFields,
        passwordHash,
      })
      .returning();
    return user;
  }

  async validatePassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserAdminStatus(userId: string, isAdmin: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, userId));
    return true;
  }

  // Artists
  async getArtists(): Promise<Artist[]> {
    return await db.select().from(artists);
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }

  async getArtistByUserId(userId: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.userId, userId));
    return artist;
  }

  async createArtist(insertArtist: InsertArtist): Promise<Artist> {
    const [artist] = await db.insert(artists).values(insertArtist).returning();
    return artist;
  }

  async updateArtist(id: string, updates: Partial<Artist>): Promise<Artist | undefined> {
    const [artist] = await db
      .update(artists)
      .set(updates)
      .where(eq(artists.id, id))
      .returning();
    return artist;
  }

  // Albums
  async getAlbums(): Promise<Album[]> {
    return await db.select().from(albums);
  }

  async getAlbum(id: string): Promise<Album | undefined> {
    const [album] = await db.select().from(albums).where(eq(albums.id, id));
    return album;
  }

  async getAlbumsByArtist(artistId: string): Promise<Album[]> {
    return await db.select().from(albums).where(eq(albums.artistId, artistId));
  }

  async createAlbum(insertAlbum: InsertAlbum): Promise<Album> {
    const [album] = await db.insert(albums).values(insertAlbum).returning();
    return album;
  }

  // Songs
  async getSongs(): Promise<Song[]> {
    return await db.select().from(songs);
  }

  async getAllSongs(): Promise<Song[]> {
    return await db.select().from(songs);
  }

  async getSong(id: string): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async getSongsByAlbum(albumId: string): Promise<Song[]> {
    return await db.select().from(songs).where(eq(songs.albumId, albumId));
  }

  async getSongsByArtist(artistId: string): Promise<Song[]> {
    return await db.select().from(songs).where(eq(songs.artistId, artistId));
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const [song] = await db.insert(songs).values(insertSong).returning();
    return song;
  }

  async updateSong(id: string, updates: Partial<Song>): Promise<Song | undefined> {
    // Filter out undefined values to prevent overwriting with nulls
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length === 0) {
      return undefined;
    }
    
    const [song] = await db
      .update(songs)
      .set(filteredUpdates)
      .where(eq(songs.id, id))
      .returning();
    return song;
  }

  async incrementSongStreams(songId: string): Promise<Song | undefined> {
    const [song] = await db
      .update(songs)
      .set({ streams: sql`${songs.streams} + 1` })
      .where(eq(songs.id, songId))
      .returning();
    return song;
  }

  async updateSongAudioUrl(songId: string, audioUrl: string): Promise<Song | undefined> {
    const [song] = await db
      .update(songs)
      .set({ audioUrl })
      .where(eq(songs.id, songId))
      .returning();
    return song;
  }

  // Playlists - all operations scoped by userId for security
  async getPlaylists(userId: string): Promise<Playlist[]> {
    return await db.select().from(playlists).where(eq(playlists.userId, userId));
  }

  async getPlaylist(id: string, userId: string): Promise<Playlist | undefined> {
    const [playlist] = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
    return playlist;
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const [playlist] = await db.insert(playlists).values(insertPlaylist).returning();
    return playlist;
  }

  async updatePlaylist(id: string, userId: string, updates: Partial<Playlist>): Promise<Playlist | undefined> {
    const [playlist] = await db
      .update(playlists)
      .set(updates)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)))
      .returning();
    return playlist;
  }

  async deletePlaylist(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(playlists)
      .where(and(eq(playlists.id, id), eq(playlists.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async addSongToPlaylist(playlistId: string, userId: string, songId: string): Promise<Playlist | undefined> {
    const playlist = await this.getPlaylist(playlistId, userId);
    if (!playlist) return undefined;

    if (!playlist.songIds.includes(songId)) {
      const updatedSongIds = [...playlist.songIds, songId];
      return await this.updatePlaylist(playlistId, userId, { songIds: updatedSongIds });
    }

    return playlist;
  }

  async removeSongFromPlaylist(playlistId: string, userId: string, songId: string): Promise<Playlist | undefined> {
    const playlist = await this.getPlaylist(playlistId, userId);
    if (!playlist) return undefined;

    const updatedSongIds = playlist.songIds.filter((id) => id !== songId);
    return await this.updatePlaylist(playlistId, userId, { songIds: updatedSongIds });
  }

  // Artist Applications
  async createArtistApplication(application: InsertArtistApplication): Promise<ArtistApplication> {
    const [app] = await db.insert(artistApplications).values(application).returning();
    return app;
  }

  async getArtistApplicationByUserId(userId: string): Promise<ArtistApplication | undefined> {
    const [app] = await db
      .select()
      .from(artistApplications)
      .where(eq(artistApplications.userId, userId));
    return app;
  }

  async getPendingArtistApplications(): Promise<ArtistApplication[]> {
    return await db
      .select()
      .from(artistApplications)
      .where(eq(artistApplications.status, "pending"));
  }

  async approveArtistApplication(id: string, adminId: string): Promise<ArtistApplication | undefined> {
    const [application] = await db
      .select()
      .from(artistApplications)
      .where(eq(artistApplications.id, id));

    if (!application) return undefined;

    await db
      .update(users)
      .set({ isArtist: 1 })
      .where(eq(users.id, application.userId));

    await db.insert(artists).values({
      userId: application.userId,
      name: application.artistName,
      genre: application.genre,
      verificationStatus: "pending",
      approvedAt: new Date(),
    });

    const [updated] = await db
      .update(artistApplications)
      .set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: adminId,
      })
      .where(eq(artistApplications.id, id))
      .returning();

    return updated;
  }

  async rejectArtistApplication(id: string, adminId: string): Promise<ArtistApplication | undefined> {
    const [updated] = await db
      .update(artistApplications)
      .set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: adminId,
      })
      .where(eq(artistApplications.id, id))
      .returning();

    return updated;
  }

  // Seed database with initial data (now empty - artists must upload their own songs)
  async seedDatabase(): Promise<void> {
    try {
      // Ensure owner account exists
      const ownerUsername = "Jinsoo";
      console.log("Checking for owner account:", ownerUsername);
      
      const existingOwner = await this.getUserByUsername(ownerUsername);
      
      if (!existingOwner) {
        console.log("Owner account not found, creating...");
        const passwordHash = await bcrypt.hash("Laughy@12", 10);
        await db.insert(users).values({
          username: ownerUsername,
          passwordHash,
          isAdmin: 1,
          isArtist: 0,
        });
        console.log("✓ Owner account created successfully: Jinsoo");
      } else {
        console.log("✓ Owner account already exists: Jinsoo");
      }
      
      console.log("Database ready - no pre-seeded content. Artists can now upload songs.");
    } catch (error) {
      console.error("ERROR in seedDatabase:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
