import { Play, Star, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface AlbumCardProps {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  onClick?: () => void;
  onPlay?: () => void;
  testId?: string;
  globalPromotion?: number;
  otherPlatforms?: number;
}

export function AlbumCard({ id, title, subtitle, coverUrl, onClick, onPlay, testId, globalPromotion, otherPlatforms }: AlbumCardProps) {
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
        <div className="flex gap-1 flex-wrap mt-2">
          {globalPromotion === 1 && (
            <Badge variant="default" className="flex items-center gap-1 text-xs" data-testid={`badge-featured-${id}`}>
              <Star className="h-3 w-3" />
              Featured
            </Badge>
          )}
          {otherPlatforms === 1 && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs" data-testid={`badge-platforms-${id}`}>
              <Globe className="h-3 w-3" />
              Multi-Platform
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
