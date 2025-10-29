import { useQuery } from "@tanstack/react-query";
import { AlbumCard } from "@/components/album-card";
import { useLocation } from "wouter";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import type { Album, Playlist, Song } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const { playQueue } = useMusicPlayer();

  const { data: albums = [], isLoading: albumsLoading } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const { data: playlists = [], isLoading: playlistsLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  const { data: artists = [] } = useQuery<any[]>({
    queryKey: ["/api/artists"],
  });

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const artistMap = artists.reduce((acc, artist) => {
    acc[artist.id] = artist.name;
    return acc;
  }, {} as Record<string, string>);

  const albumMap = albums.reduce((acc, album) => {
    acc[album.id] = { title: album.title, coverUrl: album.coverUrl || undefined };
    return acc;
  }, {} as Record<string, { title: string; coverUrl?: string }>);

  const handlePlayAlbum = (albumId: string) => {
    const albumSongs = songs.filter((song) => song.albumId === albumId);
    const tracks = albumSongs.map((song) => ({
      id: song.id,
      title: song.title,
      artist: artistMap[song.artistId] || "Unknown Artist",
      albumCover: albumMap[song.albumId]?.coverUrl,
      duration: song.duration,
      audioUrl: song.audioUrl || undefined,
    }));
    if (tracks.length > 0) {
      playQueue(tracks);
    }
  };

  return (
    <div className="pb-24">
      {/* Featured Playlists */}
      <section className="px-6 py-8">
        <h2 className="font-display text-3xl font-bold mb-6" data-testid="heading-featured-playlists">
          Featured Playlists
        </h2>
        
        {playlistsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-md mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="empty-playlists">
            <p>No playlists yet. Create your first playlist to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {playlists.slice(0, 5).map((playlist) => (
              <AlbumCard
                key={playlist.id}
                id={playlist.id}
                title={playlist.name}
                subtitle={playlist.description || `${playlist.songIds.length} songs`}
                coverUrl={playlist.coverUrl || "/placeholder-album.png"}
                onClick={() => setLocation(`/playlist/${playlist.id}`)}
                testId={`card-playlist-${playlist.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* New Albums */}
      <section className="px-6 py-8">
        <h2 className="font-display text-3xl font-bold mb-6" data-testid="heading-new-albums">
          New Albums
        </h2>
        
        {albumsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-md mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="empty-albums">
            <p>No albums yet. Artists will upload music soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {albums.slice(0, 10).map((album) => (
              <AlbumCard
                key={album.id}
                id={album.id}
                title={album.title}
                subtitle={artistMap[album.artistId] || "Unknown Artist"}
                coverUrl={album.coverUrl || "/placeholder-album.png"}
                onClick={() => setLocation(`/album/${album.id}`)}
                onPlay={() => handlePlayAlbum(album.id)}
                testId={`card-album-${album.id}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Browse by Genre */}
      <section className="px-6 py-8">
        <h2 className="font-display text-3xl font-bold mb-6" data-testid="heading-browse-genre">
          Browse by Genre
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {["Electronic", "Rock", "Hip Hop", "Jazz", "Pop", "Classical", "R&B", "Country"].map((genre) => {
            const genreAlbums = albums.filter((album) => album.genre === genre);
            const coverUrl = genreAlbums[0]?.coverUrl;
            
            return (
              <div
                key={genre}
                className="relative h-32 rounded-md overflow-hidden group cursor-pointer hover-elevate transition-all"
                data-testid={`card-genre-${genre.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt={genre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/60"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <h3 className="font-display text-2xl font-bold text-white">{genre}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
