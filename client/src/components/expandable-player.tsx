import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, ListMusic, ChevronDown, X, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Artist } from "@shared/schema";

interface ExpandablePlayerProps {
  currentTrack?: {
    id: string;
    title: string;
    artist: string;
    artistId?: string;
    albumCover?: string;
  };
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onShowQueue?: () => void;
  shuffle?: boolean;
  repeat?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExpandablePlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onShowQueue,
  shuffle = false,
  repeat = false,
}: ExpandablePlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: artist } = useQuery<Artist>({
    queryKey: ["/api/artists", currentTrack?.artistId],
    enabled: !!currentTrack?.artistId && isExpanded,
  });

  const { data: followerData } = useQuery<{ count: number }>({
    queryKey: ["/api/artists", currentTrack?.artistId, "followers"],
    enabled: !!currentTrack?.artistId && isExpanded,
  });

  const handleSeek = (value: number[]) => {
    onSeek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <>
      {/* Mini Player Bar */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-20 bg-card border-t border-card-border z-50 hover-elevate active-elevate-2 cursor-pointer"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50 }}
        onClick={() => setIsExpanded(true)}
        data-testid="mini-player-bar"
      >
        <div className="h-full px-4 flex items-center gap-4">
          {/* Left: Current track info */}
          <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-80">
            {currentTrack.albumCover && (
              <img
                src={currentTrack.albumCover}
                alt={currentTrack.title}
                className="h-14 w-14 rounded-md flex-shrink-0"
                data-testid="img-mini-player-album-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate" data-testid="text-mini-player-title">
                {currentTrack.title}
              </div>
              <div className="text-xs text-muted-foreground truncate" data-testid="text-mini-player-artist">
                {currentTrack.artist}
              </div>
            </div>
          </div>

          {/* Center: Play button (mobile) / Full controls (desktop) */}
          <div className="flex items-center gap-2 sm:flex-1 sm:justify-center">
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              aria-label="Previous track"
              data-testid="button-mini-previous"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </Button>
            
            <Button
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
              data-testid="button-mini-play-pause"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 fill-current" />
              ) : (
                <Play className="h-5 w-5 fill-current" />
              )}
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label="Next track"
              data-testid="button-mini-next"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </Button>
          </div>

          {/* Right: Queue button (desktop only) */}
          <div className="hidden sm:flex items-center gap-2 w-80 justify-end">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onShowQueue?.();
              }}
              aria-label="Show queue"
              data-testid="button-mini-queue"
            >
              <ListMusic className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Full-Screen Player */}
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetContent 
          side="bottom" 
          className="h-full w-full p-0 border-0"
          data-testid="expanded-player-sheet"
        >
          <SheetTitle className="sr-only">Now Playing</SheetTitle>
          <div className="h-full bg-gradient-to-b from-primary/20 to-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-card-border">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                aria-label="Collapse player"
                data-testid="button-collapse-player"
              >
                <ChevronDown className="h-6 w-6" />
              </Button>
              <div className="text-sm font-medium">Now Playing</div>
              <Button
                size="icon"
                variant="ghost"
                onClick={onShowQueue}
                aria-label="Show queue"
                data-testid="button-expanded-queue"
              >
                <ListMusic className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
              {/* Album Artwork */}
              <div className="w-full max-w-md aspect-square mb-8">
                {currentTrack.albumCover ? (
                  <img
                    src={currentTrack.albumCover}
                    alt={currentTrack.title}
                    className="w-full h-full object-contain rounded-lg shadow-2xl"
                    data-testid="img-expanded-album-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                    <Music className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="w-full max-w-md mb-8 text-center">
                <h2 className="text-2xl font-bold mb-2" data-testid="text-expanded-title">
                  {currentTrack.title}
                </h2>
                <p className="text-lg text-muted-foreground" data-testid="text-expanded-artist">
                  {currentTrack.artist}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md mb-8">
                <Slider
                  value={[currentTime]}
                  max={duration || 1}
                  step={1}
                  onValueChange={handleSeek}
                  className="mb-2"
                  data-testid="slider-expanded-progress"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span data-testid="text-expanded-current-time">{formatDuration(currentTime)}</span>
                  <span data-testid="text-expanded-duration">{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="w-full max-w-md mb-6">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={shuffle ? 'text-primary' : ''}
                    onClick={onToggleShuffle}
                    aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
                    data-testid="button-expanded-shuffle"
                  >
                    <Shuffle className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onPrevious}
                    aria-label="Previous track"
                    data-testid="button-expanded-previous"
                  >
                    <SkipBack className="h-7 w-7 fill-current" />
                  </Button>
                  
                  <Button
                    size="icon"
                    className="scale-125"
                    onClick={onPlayPause}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    data-testid="button-expanded-play-pause"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 fill-current" />
                    ) : (
                      <Play className="h-8 w-8 fill-current" />
                    )}
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={onNext}
                    aria-label="Next track"
                    data-testid="button-expanded-next"
                  >
                    <SkipForward className="h-7 w-7 fill-current" />
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    className={repeat ? 'text-primary' : ''}
                    onClick={onToggleRepeat}
                    aria-label={repeat ? "Disable repeat" : "Enable repeat"}
                    data-testid="button-expanded-repeat"
                  >
                    <Repeat className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Volume Control */}
              <div className="w-full max-w-md mb-8">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <Slider
                    value={[volume]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="flex-1"
                    data-testid="slider-expanded-volume"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right" data-testid="text-expanded-volume">
                    {volume}%
                  </span>
                </div>
              </div>

              {/* About the artist */}
              {artist && (
                <div className="w-full max-w-md" data-testid="section-about-artist">
                  <h3 className="text-lg font-semibold mb-4">About the artist</h3>
                  <div className="bg-muted/30 rounded-lg p-4 flex gap-4">
                    {artist.imageUrl ? (
                      <img
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                        data-testid="img-artist-avatar"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Music className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base mb-1" data-testid="text-artist-name">
                        {artist.name}
                      </h4>
                      {followerData && followerData.count > 0 && (
                        <p className="text-sm text-muted-foreground mb-2" data-testid="text-artist-followers">
                          {formatFollowers(followerData.count)} followers
                        </p>
                      )}
                      {artist.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-3" data-testid="text-artist-bio">
                          {artist.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
