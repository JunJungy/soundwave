import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Play, MoreHorizontal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackList, type Track } from "@/components/track-list";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import type { Playlist, Song, Artist, Album } from "@shared/schema";

export default function PlaylistPage() {
  const [, params] = useRoute("/playlist/:id");
  const [, setLocation] = useLocation();
  const playlistId = params?.id;
  const { playQueue, playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();

  const { data: playlist, isLoading: playlistLoading } = useQuery<Playlist>({
    queryKey: ["/api/playlists", playlistId],
    enabled: !!playlistId,
  });

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: artists = [] } = useQuery<Artist[]>({
    queryKey: ["/api/artists"],
  });

  const { data: albums = [] } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const artistMap = artists.reduce((acc, artist) => {
    acc[artist.id] = artist.name;
    return acc;
  }, {} as Record<string, string>);

  const albumMap = albums.reduce((acc, album) => {
    acc[album.id] = album.title;
    return acc;
  }, {} as Record<string, string>);

  const playlistSongs = playlist?.songIds
    .map((songId) => songs.find((s) => s.id === songId))
    .filter((s): s is Song => !!s) || [];

  const tracks: Track[] = playlistSongs.map((song) => ({
    id: song.id,
    title: song.title,
    artist: artistMap[song.artistId] || "Unknown Artist",
    album: albumMap[song.albumId] || "Unknown Album",
    duration: song.duration,
    albumId: song.albumId,
    artistId: song.artistId,
  }));

  const totalDuration = playlistSongs.reduce((sum, song) => sum + song.duration, 0);
  const totalMinutes = Math.floor(totalDuration / 60);

  const handlePlayAll = () => {
    const playerTracks = playlistSongs.map((song) => {
      const album = albums.find((a) => a.id === song.albumId);
      return {
        id: song.id,
        title: song.title,
        artist: artistMap[song.artistId] || "Unknown Artist",
        albumCover: album?.coverUrl || undefined,
        duration: song.duration,
        audioUrl: song.audioUrl || undefined,
      };
    });
    playQueue(playerTracks);
  };

  const handleTrackClick = (track: Track) => {
    const song = playlistSongs.find((s) => s.id === track.id);
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
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        handleTrackClick(track);
      }
    }
  };

  if (playlistLoading) {
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

  if (!playlist) {
    return (
      <div className="pb-24 flex items-center justify-center h-96">
        <p className="text-muted-foreground">Playlist not found</p>
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

      {/* Playlist Header */}
      <div className="px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
          <div className="h-64 w-64 rounded-md shadow-lg bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center">
            {playlist.coverUrl ? (
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-md"
                data-testid="img-playlist-detail-cover"
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-24 w-24 text-primary-foreground">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            )}
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="text-sm font-semibold uppercase tracking-wide">Playlist</div>
            <h1 className="font-display text-5xl md:text-6xl font-bold" data-testid="text-playlist-detail-title">
              {playlist.name}
            </h1>
            
            {playlist.description && (
              <p className="text-muted-foreground" data-testid="text-playlist-detail-description">
                {playlist.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{playlist.songIds.length} songs</span>
              {totalDuration > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{totalMinutes} min</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4 mt-8">
          <Button size="lg" className="h-14 px-8 rounded-full" onClick={handlePlayAll} disabled={tracks.length === 0} data-testid="button-play-playlist">
            <Play className="h-5 w-5 mr-2 fill-current" />
            Play
          </Button>
          <Button size="icon" variant="ghost" className="h-12 w-12" data-testid="button-playlist-more">
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Track List */}
      {tracks.length > 0 ? (
        <div className="px-6 py-4">
          <TrackList
            tracks={tracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onTrackClick={handleTrackClick}
            onPlayPause={handlePlayPause}
            testIdPrefix="playlist-track"
          />
        </div>
      ) : (
        <div className="px-6 py-20 text-center">
          <p className="text-muted-foreground">No songs in this playlist yet</p>
        </div>
      )}
    </div>
  );
}
