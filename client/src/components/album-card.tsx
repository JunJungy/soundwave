import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface AlbumCardProps {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  onClick?: () => void;
  onPlay?: () => void;
  testId?: string;
}

export function AlbumCard({ id, title, subtitle, coverUrl, onClick, onPlay, testId }: AlbumCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className="group p-4 hover-elevate transition-all duration-200 cursor-pointer overflow-visible"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      data-testid={testId || `card-album-${id}`}
    >
      <div className="relative aspect-square mb-4 overflow-hidden rounded-md bg-muted">
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          data-testid={`img-album-cover-${id}`}
        />
        <div
          className={`absolute bottom-2 right-2 transition-all duration-200 ${
            isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.();
            }}
            data-testid={`button-play-album-${id}`}
          >
            <Play className="h-5 w-5 fill-current" />
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-base truncate" data-testid={`text-album-title-${id}`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground truncate" data-testid={`text-album-artist-${id}`}>
          {subtitle}
        </p>
      </div>
    </Card>
  );
}
