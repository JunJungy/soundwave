import { X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  albumCover?: string;
  duration: number;
}

interface QueueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: QueueItem[];
  currentTrackId?: string;
  onRemoveFromQueue?: (trackId: string) => void;
  onClearQueue?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function QueueSheet({
  open,
  onOpenChange,
  queue,
  currentTrackId,
  onRemoveFromQueue,
  onClearQueue,
}: QueueSheetProps) {
  const currentIndex = queue.findIndex((t) => t.id === currentTrackId);
  const upNext = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]" data-testid="sheet-queue">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-2xl">Queue</SheetTitle>
            {queue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearQueue}
                data-testid="button-clear-queue"
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="text-sm">No tracks in queue</p>
            </div>
          ) : (
            <div className="space-y-1">
              {currentIndex >= 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                    NOW PLAYING
                  </div>
                  <QueueItemRow
                    item={queue[currentIndex]}
                    isCurrent
                    onRemove={onRemoveFromQueue}
                  />
                  {upNext.length > 0 && (
                    <div className="text-xs font-semibold text-muted-foreground mt-6 mb-2 px-2">
                      UP NEXT
                    </div>
                  )}
                </>
              )}
              
              {upNext.map((item) => (
                <QueueItemRow
                  key={item.id}
                  item={item}
                  onRemove={onRemoveFromQueue}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface QueueItemRowProps {
  item: QueueItem;
  isCurrent?: boolean;
  onRemove?: (trackId: string) => void;
}

function QueueItemRow({ item, isCurrent, onRemove }: QueueItemRowProps) {
  return (
    <div
      className={`group flex items-center gap-3 p-2 rounded-md hover-elevate ${
        isCurrent ? 'bg-muted' : ''
      }`}
      data-testid={`queue-item-${item.id}`}
    >
      {item.albumCover && (
        <img
          src={item.albumCover}
          alt={item.title}
          className="h-10 w-10 rounded"
          data-testid={`img-queue-cover-${item.id}`}
        />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : ''}`}>
          {item.title}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {item.artist}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {formatDuration(item.duration)}
      </div>

      {!isCurrent && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onRemove?.(item.id)}
          data-testid={`button-remove-queue-${item.id}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
