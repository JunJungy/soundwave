import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface MusicPlayerProps {
  currentTrack?: {
    id: string;
    title: string;
    artist: string;
    albumCover?: string;
    duration: number;
  };
  isPlaying: boolean;
  currentTime: number;
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
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function MusicPlayer({
  currentTrack,
  isPlaying,
  currentTime,
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
}: MusicPlayerProps) {
  const handleSeek = (value: number[]) => {
    onSeek(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    onVolumeChange(value[0]);
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-card border-t border-card-border z-50">
      <div className="h-full px-4 flex items-center gap-4">
        {/* Left: Current track info */}
        <div className="flex items-center gap-3 w-80 min-w-0">
          {currentTrack.albumCover && (
            <img
              src={currentTrack.albumCover}
              alt={currentTrack.title}
              className="h-14 w-14 rounded-md"
              data-testid="img-player-album-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate" data-testid="text-player-title">
              {currentTrack.title}
            </div>
            <div className="text-xs text-muted-foreground truncate" data-testid="text-player-artist">
              {currentTrack.artist}
            </div>
          </div>
        </div>

        {/* Center: Player controls */}
        <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${shuffle ? 'text-primary' : ''}`}
              onClick={onToggleShuffle}
              data-testid="button-shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onPrevious}
              data-testid="button-previous"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </Button>
            
            <Button
              size="icon"
              className="h-9 w-9"
              onClick={onPlayPause}
              data-testid="button-play-pause"
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
              className="h-8 w-8"
              onClick={onNext}
              data-testid="button-next"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </Button>
            
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 ${repeat ? 'text-primary' : ''}`}
              onClick={onToggleRepeat}
              data-testid="button-repeat"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <div className="w-full flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right" data-testid="text-current-time">
              {formatDuration(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={currentTrack.duration}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
              data-testid="slider-progress"
            />
            <span className="text-xs text-muted-foreground w-10" data-testid="text-duration">
              {formatDuration(currentTrack.duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Queue */}
        <div className="flex items-center gap-2 w-80 justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onShowQueue}
            data-testid="button-queue"
          >
            <ListMusic className="h-4 w-4" />
          </Button>
          
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="w-24"
            data-testid="slider-volume"
          />
          <span className="text-xs text-muted-foreground w-8 text-right" data-testid="text-volume">
            {volume}%
          </span>
        </div>
      </div>
    </div>
  );
}
