import { randomUUID } from "crypto";
import type {
  Artist,
  Album,
  Song,
  Playlist,
  InsertArtist,
  InsertAlbum,
  InsertSong,
  InsertPlaylist,
} from "@shared/schema";

export interface IStorage {
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
  getPlaylists(): Promise<Playlist[]>;
  getPlaylist(id: string): Promise<Playlist | undefined>;
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  updatePlaylist(id: string, updates: Partial<Playlist>): Promise<Playlist | undefined>;
  deletePlaylist(id: string): Promise<boolean>;
  addSongToPlaylist(playlistId: string, songId: string): Promise<Playlist | undefined>;
  removeSongFromPlaylist(playlistId: string, songId: string): Promise<Playlist | undefined>;
}

export class MemStorage implements IStorage {
  private artists: Map<string, Artist>;
  private albums: Map<string, Album>;
  private songs: Map<string, Song>;
  private playlists: Map<string, Playlist>;

  constructor() {
    this.artists = new Map();
    this.albums = new Map();
    this.songs = new Map();
    this.playlists = new Map();
    this.seedData();
  }

  private seedData() {
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

    artistsData.forEach((artist) => this.createArtist(artist));

    const artists = Array.from(this.artists.values());

    const albumsData: Array<Omit<InsertAlbum, "artistId"> & { artistName: string; coverKey: string }> = [
      { title: "Electric Dreams", artistName: "Neon Dreams", year: 2024, genre: "Electronic", coverKey: "electronic" },
      { title: "Sunset Boulevard", artistName: "The Wanderers", year: 2023, genre: "Rock", coverKey: "indieRock" },
      { title: "Street Poetry", artistName: "Urban Poets", year: 2024, genre: "Hip Hop", coverKey: "hipHop" },
      { title: "Blue Notes After Dark", artistName: "Midnight Jazz Collective", year: 2022, genre: "Jazz", coverKey: "jazz" },
      { title: "Stardust", artistName: "Luna Rose", year: 2024, genre: "Pop", coverKey: "pop" },
      { title: "Reverb", artistName: "Echo Chamber", year: 2023, genre: "Alternative Rock", coverKey: "altRock" },
      { title: "Silk & Soul", artistName: "Velvet Soul", year: 2023, genre: "R&B", coverKey: "rnb" },
      { title: "Open Roads", artistName: "Prairie Winds", year: 2022, genre: "Country", coverKey: "country" },
      { title: "Symphony No. 9", artistName: "Symphony Orchestra", year: 2021, genre: "Classical", coverKey: "classical" },
      { title: "Summer Waves", artistName: "Island Vibes", year: 2024, genre: "Reggae", coverKey: "reggae" },
    ];

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

    albumsData.forEach(({ artistName, coverKey, ...album }) => {
      const artist = artists.find((a) => a.name === artistName);
      if (artist) {
        this.createAlbum({
          ...album,
          artistId: artist.id,
          coverUrl: coverUrls[coverKey],
        });
      }
    });

    const albums = Array.from(this.albums.values());

    const songsData: Array<{ title: string; albumTitle: string; duration: number }> = [
      { title: "Neon Lights", albumTitle: "Electric Dreams", duration: 245 },
      { title: "Digital Horizon", albumTitle: "Electric Dreams", duration: 198 },
      { title: "Pulse", albumTitle: "Electric Dreams", duration: 312 },
      { title: "Midnight Drive", albumTitle: "Sunset Boulevard", duration: 223 },
      { title: "California Coast", albumTitle: "Sunset Boulevard", duration: 267 },
      { title: "Echoes", albumTitle: "Sunset Boulevard", duration: 189 },
      { title: "Concrete Jungle", albumTitle: "Street Poetry", duration: 201 },
      { title: "City Lights", albumTitle: "Street Poetry", duration: 234 },
      { title: "Flow State", albumTitle: "Street Poetry", duration: 176 },
      { title: "Smooth Sax", albumTitle: "Blue Notes After Dark", duration: 289 },
      { title: "Jazz Club", albumTitle: "Blue Notes After Dark", duration: 312 },
      { title: "After Hours", albumTitle: "Blue Notes After Dark", duration: 256 },
      { title: "Starlight", albumTitle: "Stardust", duration: 212 },
      { title: "Dancing Queen", albumTitle: "Stardust", duration: 198 },
      { title: "Summer Love", albumTitle: "Stardust", duration: 223 },
      { title: "Feedback Loop", albumTitle: "Reverb", duration: 245 },
      { title: "White Noise", albumTitle: "Reverb", duration: 267 },
      { title: "Distortion", albumTitle: "Reverb", duration: 234 },
      { title: "Velvet Touch", albumTitle: "Silk & Soul", duration: 201 },
      { title: "Smooth Operator", albumTitle: "Silk & Soul", duration: 223 },
      { title: "Midnight Groove", albumTitle: "Silk & Soul", duration: 189 },
      { title: "Highway Song", albumTitle: "Open Roads", duration: 256 },
      { title: "Country Heart", albumTitle: "Open Roads", duration: 234 },
      { title: "Prairie Moon", albumTitle: "Open Roads", duration: 212 },
      { title: "Allegro", albumTitle: "Symphony No. 9", duration: 423 },
      { title: "Adagio", albumTitle: "Symphony No. 9", duration: 387 },
      { title: "Finale", albumTitle: "Symphony No. 9", duration: 456 },
      { title: "Island Breeze", albumTitle: "Summer Waves", duration: 198 },
      { title: "Sunset Reggae", albumTitle: "Summer Waves", duration: 234 },
      { title: "Good Vibes", albumTitle: "Summer Waves", duration: 212 },
    ];

    songsData.forEach(({ albumTitle, ...song }) => {
      const album = albums.find((a) => a.title === albumTitle);
      if (album) {
        this.createSong({
          ...song,
          albumId: album.id,
          artistId: album.artistId,
          audioUrl: "",
        });
      }
    });

    const playlistsData: InsertPlaylist[] = [
      {
        name: "Chill Vibes",
        description: "Relax and unwind with these smooth tracks",
        coverUrl: "/attached_assets/generated_images/Chill_beats_playlist_cover_2f3823dc.png",
        songIds: [],
      },
      {
        name: "Workout Mix",
        description: "High-energy tracks to power your workout",
        coverUrl: "/attached_assets/generated_images/Workout_playlist_cover_art_32157e86.png",
        songIds: [],
      },
      {
        name: "Focus Flow",
        description: "Stay productive with this focused playlist",
        coverUrl: "/attached_assets/generated_images/Electronic_album_cover_art_5a6aa869.png",
        songIds: [],
      },
    ];

    playlistsData.forEach((playlist) => this.createPlaylist(playlist));

    const allSongs = Array.from(this.songs.values());
    const playlists = Array.from(this.playlists.values());

    if (playlists[0] && allSongs.length >= 5) {
      playlists[0].songIds = [allSongs[9].id, allSongs[18].id, allSongs[20].id, allSongs[27].id];
    }
    if (playlists[1] && allSongs.length >= 5) {
      playlists[1].songIds = [allSongs[0].id, allSongs[6].id, allSongs[15].id, allSongs[16].id];
    }
    if (playlists[2] && allSongs.length >= 5) {
      playlists[2].songIds = [allSongs[1].id, allSongs[10].id, allSongs[24].id];
    }
  }

  async getArtists(): Promise<Artist[]> {
    return Array.from(this.artists.values());
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    return this.artists.get(id);
  }

  async createArtist(insertArtist: InsertArtist): Promise<Artist> {
    const id = randomUUID();
    const artist: Artist = { ...insertArtist, id };
    this.artists.set(id, artist);
    return artist;
  }

  async getAlbums(): Promise<Album[]> {
    return Array.from(this.albums.values());
  }

  async getAlbum(id: string): Promise<Album | undefined> {
    return this.albums.get(id);
  }

  async getAlbumsByArtist(artistId: string): Promise<Album[]> {
    return Array.from(this.albums.values()).filter((album) => album.artistId === artistId);
  }

  async createAlbum(insertAlbum: InsertAlbum): Promise<Album> {
    const id = randomUUID();
    const album: Album = { ...insertAlbum, id };
    this.albums.set(id, album);
    return album;
  }

  async getSongs(): Promise<Song[]> {
    return Array.from(this.songs.values());
  }

  async getSong(id: string): Promise<Song | undefined> {
    return this.songs.get(id);
  }

  async getSongsByAlbum(albumId: string): Promise<Song[]> {
    return Array.from(this.songs.values()).filter((song) => song.albumId === albumId);
  }

  async getSongsByArtist(artistId: string): Promise<Song[]> {
    return Array.from(this.songs.values()).filter((song) => song.artistId === artistId);
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const id = randomUUID();
    const song: Song = { ...insertSong, id };
    this.songs.set(id, song);
    return song;
  }

  async getPlaylists(): Promise<Playlist[]> {
    return Array.from(this.playlists.values());
  }

  async getPlaylist(id: string): Promise<Playlist | undefined> {
    return this.playlists.get(id);
  }

  async createPlaylist(insertPlaylist: InsertPlaylist): Promise<Playlist> {
    const id = randomUUID();
    const playlist: Playlist = { 
      ...insertPlaylist, 
      id,
      songIds: insertPlaylist.songIds || [],
    };
    this.playlists.set(id, playlist);
    return playlist;
  }

  async updatePlaylist(id: string, updates: Partial<Playlist>): Promise<Playlist | undefined> {
    const playlist = this.playlists.get(id);
    if (!playlist) return undefined;

    const updated: Playlist = { ...playlist, ...updates, id };
    this.playlists.set(id, updated);
    return updated;
  }

  async deletePlaylist(id: string): Promise<boolean> {
    return this.playlists.delete(id);
  }

  async addSongToPlaylist(playlistId: string, songId: string): Promise<Playlist | undefined> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return undefined;

    if (!playlist.songIds.includes(songId)) {
      playlist.songIds.push(songId);
      this.playlists.set(playlistId, playlist);
    }

    return playlist;
  }

  async removeSongFromPlaylist(playlistId: string, songId: string): Promise<Playlist | undefined> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return undefined;

    playlist.songIds = playlist.songIds.filter((id) => id !== songId);
    this.playlists.set(playlistId, playlist);
    return playlist;
  }
}

export const storage = new MemStorage();
