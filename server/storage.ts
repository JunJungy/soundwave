import {
  artists,
  albums,
  songs,
  playlists,
  users,
  type Artist,
  type Album,
  type Song,
  type Playlist,
  type User,
  type InsertArtist,
  type InsertAlbum,
  type InsertSong,
  type InsertPlaylist,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Artists
  getArtists(): Promise<Artist[]>;
  getArtist(id: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;

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

  // Playlists
  getPlaylists(userId: string): Promise<Playlist[]>;
  getPlaylist(id: string, userId: string): Promise<Playlist | undefined>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: string, userId: string, updates: Partial<Playlist>): Promise<Playlist | undefined>;
  deletePlaylist(id: string, userId: string): Promise<boolean>;
  addSongToPlaylist(playlistId: string, userId: string, songId: string): Promise<Playlist | undefined>;
  removeSongFromPlaylist(playlistId: string, userId: string, songId: string): Promise<Playlist | undefined>;

  // Seeding
  seedDatabase(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Artists
  async getArtists(): Promise<Artist[]> {
    return await db.select().from(artists);
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }

  async createArtist(insertArtist: InsertArtist): Promise<Artist> {
    const [artist] = await db.insert(artists).values(insertArtist).returning();
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

  // Seed database with initial data
  async seedDatabase(): Promise<void> {
    // Check if we already have data
    const existingArtists = await this.getArtists();
    if (existingArtists.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database with initial music data...");

    const artistsData: InsertArtist[] = [
      { name: "Neon Dreams", genre: "Electronic" },
      { name: "The Wanderers", genre: "Rock" },
      { name: "Urban Poets", genre: "Hip Hop" },
      { name: "Midnight Jazz Collective", genre: "Jazz" },
      { name: "Luna Rose", genre: "Pop" },
      { name: "Echo Chamber", genre: "Alternative Rock" },
      { name: "Velvet Soul", genre: "R&B" },
      { name: "Prairie Winds", genre: "Country" },
      { name: "Symphony Orchestra", genre: "Classical" },
      { name: "Island Vibes", genre: "Reggae" },
    ];

    const createdArtists = await Promise.all(
      artistsData.map((artist) => this.createArtist(artist))
    );

    const coverUrls: Record<string, string> = {
      electronic: "/attached_assets/generated_images/Electronic_album_cover_art_5a6aa869.png",
      indieRock: "/attached_assets/generated_images/Indie_rock_album_cover_8144a74c.png",
      hipHop: "/attached_assets/generated_images/Hip_hop_album_cover_4b951cea.png",
      jazz: "/attached_assets/generated_images/Jazz_album_cover_art_d194f119.png",
      pop: "/attached_assets/generated_images/Pop_album_cover_art_4332f331.png",
      altRock: "/attached_assets/generated_images/Alternative_rock_album_cover_ddccad3c.png",
      rnb: "/attached_assets/generated_images/R&B_soul_album_cover_8ef1f586.png",
      country: "/attached_assets/generated_images/Country_album_cover_art_a518cb2e.png",
      classical: "/attached_assets/generated_images/Classical_album_cover_art_d4207782.png",
      reggae: "/attached_assets/generated_images/Reggae_album_cover_art_fdfe4fb7.png",
    };

    const albumsData: Array<{ artistIndex: number; title: string; year: number; genre: string; coverKey: string }> = [
      { title: "Electric Dreams", artistIndex: 0, year: 2024, genre: "Electronic", coverKey: "electronic" },
      { title: "Sunset Boulevard", artistIndex: 1, year: 2023, genre: "Rock", coverKey: "indieRock" },
      { title: "Street Poetry", artistIndex: 2, year: 2024, genre: "Hip Hop", coverKey: "hipHop" },
      { title: "Blue Notes After Dark", artistIndex: 3, year: 2022, genre: "Jazz", coverKey: "jazz" },
      { title: "Stardust", artistIndex: 4, year: 2024, genre: "Pop", coverKey: "pop" },
      { title: "Reverb", artistIndex: 5, year: 2023, genre: "Alternative Rock", coverKey: "altRock" },
      { title: "Silk & Soul", artistIndex: 6, year: 2023, genre: "R&B", coverKey: "rnb" },
      { title: "Open Roads", artistIndex: 7, year: 2022, genre: "Country", coverKey: "country" },
      { title: "Symphony No. 9", artistIndex: 8, year: 2021, genre: "Classical", coverKey: "classical" },
      { title: "Summer Waves", artistIndex: 9, year: 2024, genre: "Reggae", coverKey: "reggae" },
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

    const songsData: Array<{ albumIndex: number; title: string; duration: number }> = [
      // Electric Dreams (index 0)
      { title: "Neon Lights", albumIndex: 0, duration: 245 },
      { title: "Digital Horizon", albumIndex: 0, duration: 198 },
      { title: "Pulse", albumIndex: 0, duration: 312 },
      // Sunset Boulevard (index 1)
      { title: "Midnight Drive", albumIndex: 1, duration: 223 },
      { title: "California Coast", albumIndex: 1, duration: 267 },
      { title: "Echoes", albumIndex: 1, duration: 189 },
      // Street Poetry (index 2)
      { title: "Concrete Jungle", albumIndex: 2, duration: 201 },
      { title: "City Lights", albumIndex: 2, duration: 234 },
      { title: "Flow State", albumIndex: 2, duration: 176 },
      // Blue Notes After Dark (index 3)
      { title: "Smooth Sax", albumIndex: 3, duration: 289 },
      { title: "Jazz Club", albumIndex: 3, duration: 312 },
      { title: "After Hours", albumIndex: 3, duration: 256 },
      // Stardust (index 4)
      { title: "Starlight", albumIndex: 4, duration: 212 },
      { title: "Dancing Queen", albumIndex: 4, duration: 198 },
      { title: "Summer Love", albumIndex: 4, duration: 223 },
      // Reverb (index 5)
      { title: "Feedback Loop", albumIndex: 5, duration: 245 },
      { title: "White Noise", albumIndex: 5, duration: 267 },
      { title: "Distortion", albumIndex: 5, duration: 234 },
      // Silk & Soul (index 6)
      { title: "Velvet Touch", albumIndex: 6, duration: 201 },
      { title: "Smooth Operator", albumIndex: 6, duration: 223 },
      { title: "Midnight Groove", albumIndex: 6, duration: 189 },
      // Open Roads (index 7)
      { title: "Highway Song", albumIndex: 7, duration: 256 },
      { title: "Country Heart", albumIndex: 7, duration: 234 },
      { title: "Prairie Moon", albumIndex: 7, duration: 212 },
      // Symphony No. 9 (index 8)
      { title: "Allegro", albumIndex: 8, duration: 423 },
      { title: "Adagio", albumIndex: 8, duration: 387 },
      { title: "Finale", albumIndex: 8, duration: 456 },
      // Summer Waves (index 9)
      { title: "Island Breeze", albumIndex: 9, duration: 198 },
      { title: "Sunset Reggae", albumIndex: 9, duration: 234 },
      { title: "Good Vibes", albumIndex: 9, duration: 212 },
    ];

    await Promise.all(
      songsData.map(({ albumIndex, ...song }) => {
        const album = createdAlbums[albumIndex];
        return this.createSong({
          ...song,
          albumId: album.id,
          artistId: album.artistId,
          audioUrl: "",
        });
      })
    );

    console.log("Database seeded successfully!");
  }
}

export const storage = new DatabaseStorage();
