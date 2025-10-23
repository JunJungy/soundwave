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
  getSong(id: string): Promise<Song | undefined>;
  getSongsByAlbum(albumId: string): Promise<Song[]>;
  getSongsByArtist(artistId: string): Promise<Song[]>;
  createSong(song: InsertSong): Promise<Song>;
  incrementSongStreams(songId: string): Promise<Song | undefined>;

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

  async incrementSongStreams(songId: string): Promise<Song | undefined> {
    const [song] = await db
      .update(songs)
      .set({ streams: sql`${songs.streams} + 1` })
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

  // Seed database with initial data
  async seedDatabase(): Promise<void> {
    // Check if we already have data
    const existingArtists = await this.getArtists();
    if (existingArtists.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database with initial music data...");

    const artistsData = [
      { name: "BTS", genre: "K-Pop", verified: 1, streams: 45000000 },
      { name: "ENHYPEN", genre: "K-Pop", verified: 1, streams: 28500000 },
      { name: "Taylor Swift", genre: "Pop", verified: 1, streams: 52000000 },
      { name: "The Weeknd", genre: "R&B", verified: 1, streams: 38000000 },
      { name: "Drake", genre: "Hip Hop", verified: 1, streams: 41000000 },
      { name: "Billie Eilish", genre: "Pop", verified: 1, streams: 35000000 },
      { name: "Ed Sheeran", genre: "Pop", verified: 1, streams: 39000000 },
      { name: "Ariana Grande", genre: "Pop", verified: 1, streams: 37000000 },
      { name: "Post Malone", genre: "Hip Hop", verified: 1, streams: 33000000 },
      { name: "Dua Lipa", genre: "Pop", verified: 1, streams: 29000000 },
      { name: "BLACKPINK", genre: "K-Pop", verified: 1, streams: 31000000 },
      { name: "NewJeans", genre: "K-Pop", verified: 1, streams: 24000000 },
    ];

    const createdArtists = await db.insert(artists).values(artistsData).returning();

    const coverUrls: Record<string, string> = {
      kpop: "/attached_assets/generated_images/Pop_album_cover_art_4332f331.png",
      pop: "/attached_assets/generated_images/Pop_album_cover_art_4332f331.png",
      rnb: "/attached_assets/generated_images/R&B_soul_album_cover_8ef1f586.png",
      hipHop: "/attached_assets/generated_images/Hip_hop_album_cover_4b951cea.png",
    };

    const albumsData: Array<{ artistIndex: number; title: string; year: number; genre: string; coverKey: string }> = [
      { title: "Butter (Single)", artistIndex: 0, year: 2021, genre: "K-Pop", coverKey: "kpop" },
      { title: "Proof", artistIndex: 0, year: 2022, genre: "K-Pop", coverKey: "kpop" },
      { title: "DARK BLOOD", artistIndex: 1, year: 2023, genre: "K-Pop", coverKey: "kpop" },
      { title: "ORANGE BLOOD", artistIndex: 1, year: 2023, genre: "K-Pop", coverKey: "kpop" },
      { title: "Midnights", artistIndex: 2, year: 2022, genre: "Pop", coverKey: "pop" },
      { title: "After Hours", artistIndex: 3, year: 2020, genre: "R&B", coverKey: "rnb" },
      { title: "Certified Lover Boy", artistIndex: 4, year: 2021, genre: "Hip Hop", coverKey: "hipHop" },
      { title: "Happier Than Ever", artistIndex: 5, year: 2021, genre: "Pop", coverKey: "pop" },
      { title: "Divide", artistIndex: 6, year: 2017, genre: "Pop", coverKey: "pop" },
      { title: "Positions", artistIndex: 7, year: 2020, genre: "Pop", coverKey: "pop" },
      { title: "Twelve Carat Toothache", artistIndex: 8, year: 2022, genre: "Hip Hop", coverKey: "hipHop" },
      { title: "Future Nostalgia", artistIndex: 9, year: 2020, genre: "Pop", coverKey: "pop" },
      { title: "BORN PINK", artistIndex: 10, year: 2022, genre: "K-Pop", coverKey: "kpop" },
      { title: "Get Up", artistIndex: 11, year: 2023, genre: "K-Pop", coverKey: "kpop" },
    ];

    const createdAlbums = await Promise.all(
      albumsData.map(({ artistIndex, coverKey, ...album }) =>
        this.createAlbum({
          ...album,
          artistId: createdArtists[artistIndex].id,
          coverUrl: coverUrls[coverKey],
        })
      )
    );

    const songsData: Array<{ albumIndex: number; title: string; duration: number; audioIndex: number }> = [
      // BTS - Butter (Single) (index 0)
      { title: "Butter", albumIndex: 0, duration: 164, audioIndex: 1 },
      // BTS - Proof (index 1)
      { title: "Yet To Come", albumIndex: 1, duration: 213, audioIndex: 2 },
      { title: "Run BTS", albumIndex: 1, duration: 223, audioIndex: 3 },
      { title: "Born Singer", albumIndex: 1, duration: 249, audioIndex: 4 },
      // ENHYPEN - DARK BLOOD (index 2)
      { title: "Bite Me", albumIndex: 2, duration: 206, audioIndex: 5 },
      { title: "Sacrifice (Eat Me Up)", albumIndex: 2, duration: 198, audioIndex: 6 },
      { title: "Chaconne", albumIndex: 2, duration: 234, audioIndex: 7 },
      // ENHYPEN - ORANGE BLOOD (index 3)
      { title: "Sweet Venom", albumIndex: 3, duration: 213, audioIndex: 8 },
      { title: "Still Monster", albumIndex: 3, duration: 189, audioIndex: 9 },
      { title: "Orange Flower (You Complete Me)", albumIndex: 3, duration: 245, audioIndex: 10 },
      // Taylor Swift - Midnights (index 4)
      { title: "Anti-Hero", albumIndex: 4, duration: 201, audioIndex: 11 },
      { title: "Lavender Haze", albumIndex: 4, duration: 202, audioIndex: 12 },
      { title: "Karma", albumIndex: 4, duration: 205, audioIndex: 13 },
      // The Weeknd - After Hours (index 5)
      { title: "Blinding Lights", albumIndex: 5, duration: 200, audioIndex: 14 },
      { title: "Save Your Tears", albumIndex: 5, duration: 215, audioIndex: 15 },
      { title: "In Your Eyes", albumIndex: 5, duration: 237, audioIndex: 16 },
      // Drake - Certified Lover Boy (index 6)
      { title: "Champagne Poetry", albumIndex: 6, duration: 296, audioIndex: 1 },
      { title: "Girls Want Girls", albumIndex: 6, duration: 244, audioIndex: 2 },
      { title: "Way 2 Sexy", albumIndex: 6, duration: 262, audioIndex: 3 },
      // Billie Eilish - Happier Than Ever (index 7)
      { title: "Happier Than Ever", albumIndex: 7, duration: 298, audioIndex: 4 },
      { title: "my future", albumIndex: 7, duration: 210, audioIndex: 5 },
      { title: "Therefore I Am", albumIndex: 7, duration: 174, audioIndex: 6 },
      // Ed Sheeran - Divide (index 8)
      { title: "Shape of You", albumIndex: 8, duration: 234, audioIndex: 7 },
      { title: "Perfect", albumIndex: 8, duration: 263, audioIndex: 8 },
      { title: "Castle on the Hill", albumIndex: 8, duration: 261, audioIndex: 9 },
      // Ariana Grande - Positions (index 9)
      { title: "positions", albumIndex: 9, duration: 172, audioIndex: 10 },
      { title: "34+35", albumIndex: 9, duration: 174, audioIndex: 11 },
      { title: "motive", albumIndex: 9, duration: 175, audioIndex: 12 },
      // Post Malone - Twelve Carat Toothache (index 10)
      { title: "Cooped Up", albumIndex: 10, duration: 216, audioIndex: 13 },
      { title: "I Like You", albumIndex: 10, duration: 195, audioIndex: 14 },
      { title: "Wrapped Around Your Finger", albumIndex: 10, duration: 199, audioIndex: 15 },
      // Dua Lipa - Future Nostalgia (index 11)
      { title: "Don't Start Now", albumIndex: 11, duration: 183, audioIndex: 16 },
      { title: "Levitating", albumIndex: 11, duration: 203, audioIndex: 1 },
      { title: "Physical", albumIndex: 11, duration: 194, audioIndex: 2 },
      // BLACKPINK - BORN PINK (index 12)
      { title: "Pink Venom", albumIndex: 12, duration: 187, audioIndex: 3 },
      { title: "Shut Down", albumIndex: 12, duration: 175, audioIndex: 4 },
      { title: "Typa Girl", albumIndex: 12, duration: 180, audioIndex: 5 },
      // NewJeans - Get Up (index 13)
      { title: "Super Shy", albumIndex: 13, duration: 156, audioIndex: 6 },
      { title: "ETA", albumIndex: 13, duration: 150, audioIndex: 7 },
      { title: "Cool With You", albumIndex: 13, duration: 238, audioIndex: 8 },
    ];

    await Promise.all(
      songsData.map(({ albumIndex, audioIndex, ...song }) => {
        const album = createdAlbums[albumIndex];
        // Using different SoundHelix demo tracks for variety (1-16)
        return this.createSong({
          ...song,
          albumId: album.id,
          artistId: album.artistId,
          audioUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${audioIndex}.mp3`,
        });
      })
    );

    console.log("Database seeded successfully!");
  }
}

export const storage = new DatabaseStorage();
