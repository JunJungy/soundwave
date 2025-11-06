import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Play, Trophy } from "lucide-react";
import type { Game } from "@shared/schema";
import { Button } from "@/components/ui/button";

export default function Games() {
  const [, setLocation] = useLocation();

  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  return (
    <div className="pb-24">
      <section className="px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2" data-testid="heading-games">
            Games
          </h1>
          <p className="text-muted-foreground text-lg">
            Challenge yourself and compete on the leaderboards
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-games">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">No Games Yet</h3>
            <p className="text-muted-foreground">
              Check back soon for exciting games to play!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {games.map((game) => (
              <Card
                key={game.id}
                className="group cursor-pointer hover-elevate active-elevate-2 overflow-hidden transition-all"
                onClick={() => setLocation(`/game/${game.id}`)}
                data-testid={`card-game-${game.id}`}
              >
                <div className="relative aspect-square bg-muted">
                  {game.thumbnailUrl ? (
                    <img
                      src={game.thumbnailUrl}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Trophy className="w-16 h-16 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Button
                      size="icon"
                      variant="default"
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary hover:bg-primary/90 w-12 h-12 rounded-full"
                      data-testid={`button-play-game-${game.id}`}
                    >
                      <Play className="w-6 h-6 fill-current" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-base truncate mb-1" data-testid={`text-game-name-${game.id}`}>
                    {game.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {game.category || "Casual Game"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
