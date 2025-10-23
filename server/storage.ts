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
  getSong(id: string): Promise<Song | undefined>;
  getSongsByAlbum(albumId: string): Promise<Song[]>;
  getSongsByArtist(artistId: string): Promise<Song[]>;
  createSong(song: InsertSong): Promise<Song>;
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

    console.log("Seeding database with real Spotify data...");

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
    
    console.log("Fetching real album data from Spotify...");

    const coverUrls: Record<string, string> = {
      btsButter: "/attached_assets/generated_images/BTS_Butter_album_cover_51efb718.png",
      btsProof: "/attached_assets/generated_images/BTS_Proof_album_cover_38e6f728.png",
      enhypenDarkBlood: "/attached_assets/generated_images/ENHYPEN_DARK_BLOOD_cover_a004dffa.png",
      enhypenOrangeBlood: "/attached_assets/generated_images/ENHYPEN_ORANGE_BLOOD_cover_c46c79e3.png",
      taylorMidnights: "/attached_assets/generated_images/Taylor_Swift_Midnights_cover_8111b781.png",
      weekndAfterHours: "/attached_assets/generated_images/The_Weeknd_After_Hours_2f3410d4.png",
      drakeCLB: "/attached_assets/generated_images/Drake_album_cover_5548b6ec.png",
      billieHappier: "/attached_assets/generated_images/Billie_Eilish_album_cover_e15dc115.png",
      edDivide: "/attached_assets/generated_images/Ed_Sheeran_Divide_cover_96439eb4.png",
      arianaPositions: "/attached_assets/generated_images/Ariana_Grande_Positions_cover_c9714991.png",
      postTwelve: "/attached_assets/generated_images/Post_Malone_album_cover_86a89a12.png",
      duaFuture: "/attached_assets/generated_images/Dua_Lipa_album_cover_2ac0045e.png",
      blackpinkBornPink: "/attached_assets/generated_images/BLACKPINK_BORN_PINK_cover_c2cdacf1.png",
      newjeansGetUp: "/attached_assets/generated_images/NewJeans_Get_Up_cover_729fc4fc.png",
    };

    const albumsData: Array<{ artistIndex: number; title: string; year: number; genre: string; coverKey: string }> = [
      { title: "Butter (Single)", artistIndex: 0, year: 2021, genre: "K-Pop", coverKey: "btsButter" },
      { title: "Proof", artistIndex: 0, year: 2022, genre: "K-Pop", coverKey: "btsProof" },
      { title: "DARK BLOOD", artistIndex: 1, year: 2023, genre: "K-Pop", coverKey: "enhypenDarkBlood" },
      { title: "ORANGE BLOOD", artistIndex: 1, year: 2023, genre: "K-Pop", coverKey: "enhypenOrangeBlood" },
      { title: "Midnights", artistIndex: 2, year: 2022, genre: "Pop", coverKey: "taylorMidnights" },
      { title: "After Hours", artistIndex: 3, year: 2020, genre: "R&B", coverKey: "weekndAfterHours" },
      { title: "Certified Lover Boy", artistIndex: 4, year: 2021, genre: "Hip Hop", coverKey: "drakeCLB" },
      { title: "Happier Than Ever", artistIndex: 5, year: 2021, genre: "Pop", coverKey: "billieHappier" },
      { title: "Divide", artistIndex: 6, year: 2017, genre: "Pop", coverKey: "edDivide" },
      { title: "Positions", artistIndex: 7, year: 2020, genre: "Pop", coverKey: "arianaPositions" },
      { title: "Twelve Carat Toothache", artistIndex: 8, year: 2022, genre: "Hip Hop", coverKey: "postTwelve" },
      { title: "Future Nostalgia", artistIndex: 9, year: 2020, genre: "Pop", coverKey: "duaFuture" },
      { title: "BORN PINK", artistIndex: 10, year: 2022, genre: "K-Pop", coverKey: "blackpinkBornPink" },
      { title: "Get Up", artistIndex: 11, year: 2023, genre: "K-Pop", coverKey: "newjeansGetUp" },
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

    // Define tracks to fetch from Spotify
    const tracksToFetch: Array<{ albumIndex: number; trackName: string; artistName: string }> = [
      // BTS - Butter (Single)
      { albumIndex: 0, trackName: "Butter", artistName: "BTS" },
      // BTS - Proof
      { albumIndex: 1, trackName: "Yet To Come", artistName: "BTS" },
      { albumIndex: 1, trackName: "Run BTS", artistName: "BTS" },
      { albumIndex: 1, trackName: "Born Singer", artistName: "BTS" },
      // ENHYPEN - DARK BLOOD
      { albumIndex: 2, trackName: "Bite Me", artistName: "ENHYPEN" },
      { albumIndex: 2, trackName: "Sacrifice (Eat Me Up)", artistName: "ENHYPEN" },
      { albumIndex: 2, trackName: "Chaconne", artistName: "ENHYPEN" },
      // ENHYPEN - ORANGE BLOOD
      { albumIndex: 3, trackName: "Sweet Venom", artistName: "ENHYPEN" },
      { albumIndex: 3, trackName: "Still Monster", artistName: "ENHYPEN" },
      { albumIndex: 3, trackName: "Orange Flower (You Complete Me)", artistName: "ENHYPEN" },
      // Taylor Swift - Midnights
      { albumIndex: 4, trackName: "Anti-Hero", artistName: "Taylor Swift" },
      { albumIndex: 4, trackName: "Lavender Haze", artistName: "Taylor Swift" },
      { albumIndex: 4, trackName: "Karma", artistName: "Taylor Swift" },
      // The Weeknd - After Hours
      { albumIndex: 5, trackName: "Blinding Lights", artistName: "The Weeknd" },
      { albumIndex: 5, trackName: "Save Your Tears", artistName: "The Weeknd" },
      { albumIndex: 5, trackName: "In Your Eyes", artistName: "The Weeknd" },
      // Drake - Certified Lover Boy
      { albumIndex: 6, trackName: "Champagne Poetry", artistName: "Drake" },
      { albumIndex: 6, trackName: "Girls Want Girls", artistName: "Drake" },
      { albumIndex: 6, trackName: "Way 2 Sexy", artistName: "Drake" },
      // Billie Eilish - Happier Than Ever
      { albumIndex: 7, trackName: "Happier Than Ever", artistName: "Billie Eilish" },
      { albumIndex: 7, trackName: "my future", artistName: "Billie Eilish" },
      { albumIndex: 7, trackName: "Therefore I Am", artistName: "Billie Eilish" },
      // Ed Sheeran - Divide
      { albumIndex: 8, trackName: "Shape of You", artistName: "Ed Sheeran" },
      { albumIndex: 8, trackName: "Perfect", artistName: "Ed Sheeran" },
      { albumIndex: 8, trackName: "Castle on the Hill", artistName: "Ed Sheeran" },
      // Ariana Grande - Positions
      { albumIndex: 9, trackName: "positions", artistName: "Ariana Grande" },
      { albumIndex: 9, trackName: "34+35", artistName: "Ariana Grande" },
      { albumIndex: 9, trackName: "motive", artistName: "Ariana Grande" },
      // Post Malone - Twelve Carat Toothache
      { albumIndex: 10, trackName: "Cooped Up", artistName: "Post Malone" },
      { albumIndex: 10, trackName: "I Like You", artistName: "Post Malone" },
      { albumIndex: 10, trackName: "Wrapped Around Your Finger", artistName: "Post Malone" },
      // Dua Lipa - Future Nostalgia
      { albumIndex: 11, trackName: "Don't Start Now", artistName: "Dua Lipa" },
      { albumIndex: 11, trackName: "Levitating", artistName: "Dua Lipa" },
      { albumIndex: 11, trackName: "Physical", artistName: "Dua Lipa" },
      // BLACKPINK - BORN PINK
      { albumIndex: 12, trackName: "Pink Venom", artistName: "BLACKPINK" },
      { albumIndex: 12, trackName: "Shut Down", artistName: "BLACKPINK" },
      { albumIndex: 12, trackName: "Typa Girl", artistName: "BLACKPINK" },
      // NewJeans - Get Up
      { albumIndex: 13, trackName: "Super Shy", artistName: "NewJeans" },
      { albumIndex: 13, trackName: "ETA", artistName: "NewJeans" },
      { albumIndex: 13, trackName: "Cool With You", artistName: "NewJeans" },
    ];

    console.log(`Fetching ${tracksToFetch.length} tracks from YouTube...`);
    
    // Import YouTube helper
    const { searchYouTubeVideo } = await import("./youtube");
    
    // Fetch YouTube video IDs for each track
    for (let i = 0; i < tracksToFetch.length; i++) {
      const { albumIndex, trackName, artistName } = tracksToFetch[i];
      const album = createdAlbums[albumIndex];
      let youtubeId: string | null = null;
      const duration = 180 + Math.floor(Math.random() * 60); // 3-4 minutes
      
      try {
        youtubeId = await searchYouTubeVideo(trackName, artistName);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`⚠ YouTube search failed for ${trackName}`);
      }
      
      await this.createSong({
        title: trackName,
        albumId: album.id,
        artistId: album.artistId,
        duration,
        audioUrl: null,
        youtubeId,
      });
      
      if (youtubeId) {
        console.log(`✓ Added: ${trackName} (YouTube: ${youtubeId})`);
      } else {
        console.log(`⚠ Added: ${trackName} (no YouTube video found)`);
      }
    }

    console.log("Database seeded successfully!");
  }
}

export const storage = new DatabaseStorage();
