import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Play, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackList, type Track } from "@/components/track-list";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import type { Album, Artist, Song } from "@shared/schema";

export default function AlbumPage() {
  const [, params] = useRoute("/album/:id");
  const [, setLocation] = useLocation();
  const albumId = params?.id;
  const { playQueue, playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();

  const { data: album, isLoading: albumLoading } = useQuery<Album>({
    queryKey: ["/api/albums", albumId],
    enabled: !!albumId,
  });

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: artists = [] } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
  });

  const artist = artists.find((a) => a.id === album?.artistId);
  const albumSongs = songs.filter((song) => song.albumId === albumId);

  const artistMap = artists.reduce((acc, artist) => {
    acc[artist.id] = artist.name;
    return acc;
  }, {} as Record<string, string>);

  const tracks: Track[] = albumSongs.map((song) => ({
    id: song.id,
    title: song.title,
    artist: artistMap[song.artistId] || "Unknown Artist",
    album: album?.title || "Unknown Album",
    duration: song.duration,
    albumId: song.albumId,
    artistId: song.artistId,
  }));

  const totalDuration = albumSongs.reduce((sum, song) => sum + song.duration, 0);
  const totalMinutes = Math.floor(totalDuration / 60);

  const handlePlayAll = () => {
    const playerTracks = albumSongs.map((song) => ({
      id: song.id,
      title: song.title,
      artist: artistMap[song.artistId] || "Unknown Artist",
      albumCover: album?.coverUrl || undefined,
      duration: song.duration,
      audioUrl: song.audioUrl || undefined,
    }));
    playQueue(playerTracks);
  };

  const handleTrackClick = (track: Track) => {
    const song = albumSongs.find((s) => s.id === track.id);
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
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        handleTrackClick(track);
      }
    }
  };

  if (albumLoading) {
    return (
      <div className="pb-24">
        <div className="animate-pulse px-6 py-8">
          <div className="flex gap-8 mb-8">
            <div className="h-64 w-64 bg-muted rounded-md"></div>
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-muted rounded w-1/2"></div>
              <div className="h-6 bg-muted rounded w-1/4"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="pb-24 flex items-center justify-center h-96">
        <p className="text-muted-foreground">Album not found</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Back Button */}
      <div className="px-6 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          data-testid="button-back-home"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      {/* Album Header */}
      <div className="px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
          <img
            src={album.coverUrl || "/placeholder-album.png"}
            alt={album.title}
            className="h-64 w-64 rounded-md shadow-lg"
            data-testid="img-album-detail-cover"
          />
          
          <div className="flex-1 space-y-4">
            <div className="text-sm font-semibold uppercase tracking-wide">Album</div>
            <h1 className="font-display text-5xl md:text-6xl font-bold" data-testid="text-album-detail-title">
              {album.title}
            </h1>
            
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => artist && setLocation(`/artist/${artist.id}`)}
                className="font-semibold hover:underline cursor-pointer"
                data-testid="link-album-artist"
              >
                {artist?.name || "Unknown Artist"}
              </button>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{album.year || "Unknown"}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{albumSongs.length} songs</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{totalMinutes} min</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4 mt-8">
          <Button size="lg" className="h-14 px-8 rounded-full" onClick={handlePlayAll} data-testid="button-play-album">
            <Play className="h-5 w-5 mr-2 fill-current" />
            Play
          </Button>
        </div>
      </div>

      {/* Track List */}
      <div className="px-6 py-4">
        <div className="mb-4 flex items-center gap-2 px-4 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Duration</span>
        </div>
        <TrackList
          tracks={tracks}
          currentTrackId={currentTrack?.id}
          isPlaying={isPlaying}
          onTrackClick={handleTrackClick}
          onPlayPause={handlePlayPause}
          showAlbum={false}
          testIdPrefix="album-track"
        />
      </div>

      {/* Album Info */}
      {album.genre && (
        <div className="px-6 py-8">
          <h3 className="font-semibold mb-2">Genre</h3>
          <p className="text-muted-foreground">{album.genre}</p>
        </div>
      )}
    </div>
  );
}
