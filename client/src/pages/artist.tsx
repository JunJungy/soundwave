import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Play, ArrowLeft, BadgeCheck, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlbumCard } from "@/components/album-card";
import { TrackList, type Track } from "@/components/track-list";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Artist, Album, Song } from "@shared/schema";

export default function ArtistPage() {
  const [, params] = useRoute("/artist/:id");
  const [, setLocation] = useLocation();
  const artistId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const { playQueue, playTrack, currentTrack, isPlaying, togglePlayPause } = useMusicPlayer();

  const { data: artist, isLoading: artistLoading } = useQuery<Artist>({
    queryKey: ["/api/artists", artistId],
    enabled: !!artistId,
  });

  const { data: albums = [] } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
  });

  const { data: followData } = useQuery<{ isFollowing: boolean }>({
    queryKey: ["/api/artists", artistId, "is-following"],
    enabled: !!artistId && !!user,
  });

  const { data: followerData } = useQuery<{ count: number }>({
    queryKey: ["/api/artists", artistId, "followers"],
    enabled: !!artistId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/artists/${artistId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/following"] });
      toast({
        title: "Followed!",
        description: `You're now following ${artist?.name}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to follow artist",
        variant: "destructive",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/artists/${artistId}/follow`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/following"] });
      toast({
        title: "Unfollowed",
        description: `You've unfollowed ${artist?.name}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unfollow artist",
        variant: "destructive",
      });
    },
  });

  const handleFollowToggle = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to follow artists",
        variant: "destructive",
      });
      return;
    }

    if (followData?.isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const artistAlbums = albums.filter((album) => album.artistId === artistId);
  const artistSongs = songs.filter((song) => song.artistId === artistId);

  const albumMap = albums.reduce((acc, album) => {
    acc[album.id] = album.title;
    return acc;
  }, {} as Record<string, string>);

  const topTracks: Track[] = artistSongs.slice(0, 5).map((song) => ({
    id: song.id,
    title: song.title,
    artist: artist?.name || "Unknown Artist",
    album: song.albumId ? (albumMap[song.albumId] || "Unknown Album") : "Single",
    duration: song.duration,
    albumId: song.albumId || undefined,
    artistId: song.artistId,
  }));

  const handlePlayTopTracks = () => {
    const playerTracks = artistSongs.slice(0, 5).map((song) => {
      const album = albums.find((a) => a.id === song.albumId);
      return {
        id: song.id,
        title: song.title,
        artist: artist?.name || "Unknown Artist",
        albumCover: album?.coverUrl || undefined,
        duration: song.duration,
        audioUrl: song.audioUrl || undefined,
        lyrics: (song.lyrics as any) || undefined,
        language: song.language || undefined,
        artistId: song.artistId,
      };
    });
    playQueue(playerTracks);
  };

  const handleTrackClick = (track: Track) => {
    const song = artistSongs.find((s) => s.id === track.id);
    const album = albums.find((a) => a.id === song?.albumId);
    playTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      albumCover: album?.coverUrl || undefined,
      duration: track.duration,
      audioUrl: song?.audioUrl || undefined,
      lyrics: (song?.lyrics as any) || undefined,
      language: song?.language || undefined,
      artistId: song?.artistId,
    });
  };

  const handlePlayPause = (trackId: string) => {
    if (currentTrack?.id === trackId) {
      togglePlayPause();
    } else {
      const track = topTracks.find((t) => t.id === trackId);
      if (track) {
        handleTrackClick(track);
      }
    }
  };

  const formatStreams = (streams: number): string => {
    if (streams >= 1000000) {
      return `${(streams / 1000000).toFixed(1)}M`;
    } else if (streams >= 1000) {
      return `${(streams / 1000).toFixed(0)}K`;
    }
    return streams.toString();
  };

  if (artistLoading) {
    return (
      <div className="pb-24">
        <div className="animate-pulse px-6 py-8">
          <div className="flex gap-8 mb-8">
            <div className="h-64 w-64 rounded-full bg-muted"></div>
            <div className="flex-1 space-y-4">
              <div className="h-12 bg-muted rounded w-1/2"></div>
              <div className="h-6 bg-muted rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="pb-24 flex items-center justify-center h-96">
        <p className="text-muted-foreground">Artist not found</p>
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

      {/* Artist Header */}
      <div className="px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
          <div className="h-64 w-64 rounded-full shadow-lg bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center overflow-hidden">
            {artist.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="w-full h-full object-cover"
                data-testid="img-artist-detail-image"
              />
            ) : (
              <span className="text-6xl font-bold text-primary-foreground">
                {artist.name.charAt(0)}
              </span>
            )}
          </div>
          
          <div className="flex-1 space-y-4">
            <div className="text-sm font-semibold uppercase tracking-wide">Artist</div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-5xl md:text-7xl font-bold" data-testid="text-artist-detail-name">
                {artist.name}
              </h1>
              {artist.verified === 1 && (
                <BadgeCheck 
                  className="h-10 w-10 md:h-12 md:w-12 text-primary" 
                  data-testid="badge-artist-verified"
                />
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground" data-testid="text-artist-streams">
                {formatStreams(artist.streams)} monthly listeners
              </span>
              {followerData && followerData.count > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground" data-testid="text-artist-followers">
                    {formatStreams(followerData.count)} followers
                  </span>
                </>
              )}
              {artist.genre && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground capitalize" data-testid="text-artist-genre">
                    {artist.genre}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4 mt-8">
          <Button 
            size="lg" 
            className="h-14 px-8 rounded-full" 
            onClick={handlePlayTopTracks}
            data-testid="button-play-artist"
          >
            <Play className="h-5 w-5 mr-2 fill-current" />
            Play
          </Button>
          {user && (
            <Button 
              variant={followData?.isFollowing ? "outline" : "default"}
              size="lg" 
              className="h-14 px-8 rounded-full" 
              onClick={handleFollowToggle}
              disabled={followMutation.isPending || unfollowMutation.isPending}
              data-testid="button-follow-artist"
            >
              {followData?.isFollowing ? (
                <>
                  <UserMinus className="h-5 w-5 mr-2" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Follow
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Popular Tracks */}
      {topTracks.length > 0 && (
        <div className="px-6 py-4">
          <h2 className="font-display text-2xl font-bold mb-6" data-testid="heading-popular-tracks">
            Popular Tracks
          </h2>
          <TrackList
            tracks={topTracks}
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onTrackClick={handleTrackClick}
            onPlayPause={handlePlayPause}
            showAlbum={true}
            testIdPrefix="artist-track"
          />
        </div>
      )}

      {/* Albums */}
      {artistAlbums.length > 0 && (
        <div className="px-6 py-8">
          <h2 className="font-display text-2xl font-bold mb-6" data-testid="heading-artist-albums">
            Albums
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {artistAlbums.map((album) => (
              <AlbumCard
                key={album.id}
                id={album.id}
                title={album.title}
                subtitle={album.year?.toString() || ""}
                coverUrl={album.coverUrl || "/placeholder-album.png"}
                onClick={() => setLocation(`/album/${album.id}`)}
                testId={`card-artist-album-${album.id}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
