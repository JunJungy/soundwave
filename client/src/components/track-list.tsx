import { Play, Pause, Star, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share-button";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  albumId?: string;
  artistId?: string;
  globalPromotion?: number;
  otherPlatforms?: number;
  lyrics?: {
    lines: Array<{
      startTime: number;
      endTime: number;
      text: string;
    }>;
  } | null;
}

interface TrackListProps {
  tracks: Track[];
  currentTrackId?: string;
  isPlaying?: boolean;
  onTrackClick?: (track: Track) => void;
  onPlayPause?: (trackId: string) => void;
  showAlbum?: boolean;
  testIdPrefix?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  onTrackClick,
  onPlayPause,
  showAlbum = true,
  testIdPrefix = "track",
}: TrackListProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-[auto_2fr_1fr_1fr_auto_auto] gap-4 px-4 py-2 text-sm text-muted-foreground border-b">
        <div className="w-8">#</div>
        <div>Title</div>
        <div>Artist</div>
        {showAlbum && <div>Album</div>}
        {!showAlbum && <div></div>}
        <div className="text-right">Duration</div>
        <div className="w-10"></div>
      </div>
      
      <div className="divide-y divide-border">
        {tracks.map((track, index) => {
          const isCurrentTrack = track.id === currentTrackId;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;

          return (
            <div
              key={track.id}
              className="grid grid-cols-[auto_2fr_1fr_1fr_auto_auto] gap-4 px-4 py-3 hover-elevate transition-all duration-150 cursor-pointer group"
              onClick={() => onTrackClick?.(track)}
              data-testid={`${testIdPrefix}-${track.id}`}
            >
              <div className="w-8 flex items-center justify-center">
                {isCurrentlyPlaying ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayPause?.(track.id);
                    }}
                    data-testid={`button-pause-${track.id}`}
                  >
                    <Pause className="h-4 w-4 fill-primary text-primary" />
                  </Button>
                ) : (
                  <div className="relative h-6 w-6 flex items-center justify-center">
                    <span className={`text-sm ${isCurrentTrack ? 'text-primary font-semibold' : 'group-hover:hidden'}`}>
                      {index + 1}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 absolute hidden group-hover:flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayPause?.(track.id);
                      }}
                      data-testid={`button-play-${track.id}`}
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`} data-testid={`text-track-title-${track.id}`}>
                    {track.title}
                  </div>
                  {track.globalPromotion === 1 && (
                    <Badge variant="default" className="flex items-center gap-1 text-xs" data-testid={`badge-featured-${track.id}`}>
                      <Star className="h-3 w-3" />
                      Featured
                    </Badge>
                  )}
                  {track.otherPlatforms === 1 && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs" data-testid={`badge-platforms-${track.id}`}>
                      <Globe className="h-3 w-3" />
                      Multi-Platform
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center min-w-0">
                <span className="text-sm text-muted-foreground truncate" data-testid={`text-track-artist-${track.id}`}>
                  {track.artist}
                </span>
              </div>
              
              <div className="flex items-center min-w-0">
                {showAlbum && (
                  <span className="text-sm text-muted-foreground truncate" data-testid={`text-track-album-${track.id}`}>
                    {track.album}
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-end">
                <span className="text-sm text-muted-foreground" data-testid={`text-track-duration-${track.id}`}>
                  {formatDuration(track.duration)}
                </span>
              </div>
              
              <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ShareButton
                  url={track.artistId ? `/artist/${track.artistId}` : `/`}
                  title={`${track.title} by ${track.artist}`}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
