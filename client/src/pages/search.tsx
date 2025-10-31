import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlbumCard } from "@/components/album-card";
import { TrackList, type Track } from "@/components/track-list";
import { useLocation } from "wouter";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import type { Album, Artist, Song, Playlist } from "@shared/schema";

export default function Search() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();

  const { data: albums = [] } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const { data: artists = [] } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
  });

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: playlists = [] } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  const artistMap = artists.reduce((acc, artist) => {
    acc[artist.id] = artist.name;
    return acc;
  }, {} as Record<string, string>);

  const albumMap = albums.reduce((acc, album) => {
    acc[album.id] = album.title;
    return acc;
  }, {} as Record<string, string>);

  const query = searchQuery.toLowerCase().trim();

  const filteredSongs: Track[] = songs
    .filter((song) =>
      query === "" ||
      song.title.toLowerCase().includes(query) ||
      artistMap[song.artistId]?.toLowerCase().includes(query) ||
      albumMap[song.albumId]?.toLowerCase().includes(query)
    )
    .map((song) => ({
      id: song.id,
      title: song.title,
      artist: artistMap[song.artistId] || "Unknown Artist",
      album: albumMap[song.albumId] || "Unknown Album",
      duration: song.duration,
      albumId: song.albumId,
      artistId: song.artistId,
    }));

  const filteredAlbums = albums.filter(
    (album) =>
      query === "" ||
      album.title.toLowerCase().includes(query) ||
      artistMap[album.artistId]?.toLowerCase().includes(query) ||
      album.genre?.toLowerCase().includes(query)
  );

  const filteredArtists = artists.filter(
    (artist) =>
      query === "" ||
      artist.name.toLowerCase().includes(query) ||
      artist.genre?.toLowerCase().includes(query)
  );

  const filteredPlaylists = playlists.filter(
    (playlist) =>
      query === "" ||
      playlist.name.toLowerCase().includes(query) ||
      playlist.description?.toLowerCase().includes(query)
  );

  const totalResults =
    filteredSongs.length +
    filteredAlbums.length +
    filteredArtists.length +
    filteredPlaylists.length;

  const handleTrackClick = (track: Track) => {
    const song = songs.find((s) => s.id === track.id);
    const album = albums.find((a) => a.id === song?.albumId);
    playTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      albumCover: album?.coverUrl || undefined,
      duration: track.duration,
      audioUrl: song?.audioUrl || undefined,
    });
  };

  const handlePlayPause = (trackId: string) => {
    if (currentTrack?.id === trackId) {
      togglePlayPause();
    } else {
      const track = filteredSongs.find((t) => t.id === trackId);
      if (track) {
        handleTrackClick(track);
      }
    }
  };

  return (
    <div className="pb-24">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-10 border-b px-6 py-4">
        <div className="relative max-w-2xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for songs, artists, albums..."
            className="pl-10 h-12 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="px-6 py-6">
        {searchQuery === "" ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-2xl font-bold mb-2">
              Search for music
            </h3>
            <p className="text-muted-foreground max-w-md">
              Find your favorite songs, artists, albums, and playlists
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="font-display text-2xl font-bold mb-2">
              No results found
            </h3>
            <p className="text-muted-foreground max-w-md">
              Try searching with different keywords
            </p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all" data-testid="tab-all">
                All
              </TabsTrigger>
              <TabsTrigger value="songs" data-testid="tab-songs">
                Songs ({filteredSongs.length})
              </TabsTrigger>
              <TabsTrigger value="albums" data-testid="tab-albums">
                Albums ({filteredAlbums.length})
              </TabsTrigger>
              <TabsTrigger value="artists" data-testid="tab-artists">
                Artists ({filteredArtists.length})
              </TabsTrigger>
              <TabsTrigger value="playlists" data-testid="tab-playlists">
                Playlists ({filteredPlaylists.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8">
              {filteredSongs.length > 0 && (
                <div>
                  <h3 className="font-display text-2xl font-bold mb-4">Songs</h3>
                  <TrackList
                    tracks={filteredSongs.slice(0, 5)}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    onTrackClick={handleTrackClick}
                    onPlayPause={handlePlayPause}
                    testIdPrefix="search-song"
                  />
                </div>
              )}

              {filteredAlbums.length > 0 && (
                <div>
                  <h3 className="font-display text-2xl font-bold mb-4">Albums</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredAlbums.slice(0, 5).map((album) => (
                      <AlbumCard
                        key={album.id}
                        id={album.id}
                        title={album.title}
                        subtitle={artistMap[album.artistId] || "Unknown Artist"}
                        coverUrl={album.coverUrl || "/placeholder-album.png"}
                        onClick={() => setLocation(`/album/${album.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredPlaylists.length > 0 && (
                <div>
                  <h3 className="font-display text-2xl font-bold mb-4">Playlists</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredPlaylists.slice(0, 5).map((playlist) => (
                      <AlbumCard
                        key={playlist.id}
                        id={playlist.id}
                        title={playlist.name}
                        subtitle={`${playlist.songIds.length} songs`}
                        coverUrl={playlist.coverUrl || "/placeholder-album.png"}
                        onClick={() => setLocation(`/playlist/${playlist.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="songs">
              <TrackList
                tracks={filteredSongs}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onTrackClick={handleTrackClick}
                onPlayPause={handlePlayPause}
                testIdPrefix="search-song"
              />
            </TabsContent>

            <TabsContent value="albums">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredAlbums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    id={album.id}
                    title={album.title}
                    subtitle={artistMap[album.artistId] || "Unknown Artist"}
                    coverUrl={album.coverUrl || "/placeholder-album.png"}
                    onClick={() => setLocation(`/album/${album.id}`)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="artists">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredArtists.map((artist) => (
                  <div 
                    key={artist.id} 
                    className="text-center cursor-pointer group" 
                    onClick={() => setLocation(`/artist/${artist.id}`)}
                    data-testid={`card-artist-${artist.id}`}
                  >
                    <div className="aspect-square rounded-full bg-muted mb-4 overflow-hidden group-hover:shadow-lg transition-shadow">
                      {artist.imageUrl ? (
                        <img
                          src={artist.imageUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground">
                          {artist.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <h3 className="font-semibold group-hover:underline">{artist.name}</h3>
                      {artist.verified === 1 && (
                        <BadgeCheck 
                          className="h-4 w-4 text-primary fill-current" 
                          data-testid={`badge-verified-${artist.id}`}
                        />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Artist</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="playlists">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredPlaylists.map((playlist) => (
                  <AlbumCard
                    key={playlist.id}
                    id={playlist.id}
                    title={playlist.name}
                    subtitle={`${playlist.songIds.length} songs`}
                    coverUrl={playlist.coverUrl || "/placeholder-album.png"}
                    onClick={() => setLocation(`/playlist/${playlist.id}`)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
