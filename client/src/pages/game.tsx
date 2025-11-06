import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Medal, ArrowLeft, Crown, Award } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Game, GameScore } from "@shared/schema";

interface LeaderboardEntry extends GameScore {
  username: string;
}

export default function GamePage() {
  const [, params] = useRoute("/game/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const gameId = params?.id;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: game, isLoading: gameLoading } = useQuery<Game>({
    queryKey: ["/api/games", gameId],
    enabled: !!gameId,
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/games", gameId, "leaderboard"],
    queryFn: () => fetch(`/api/games/${gameId}/leaderboard?limit=10`).then((res) => res.json()),
    enabled: !!gameId,
  });

  const { data: userBestScore } = useQuery<GameScore | null>({
    queryKey: ["/api/games", gameId, "user-best"],
    enabled: !!gameId,
  });

  const submitScoreMutation = useMutation({
    mutationFn: async ({ score, metadata }: { score: number; metadata?: any }) => {
      return await apiRequest(`/api/games/${gameId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, metadata }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId, "user-best"] });
      toast({
        title: "Score Submitted!",
        description: "Your score has been added to the leaderboard.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit Score",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Listen for score submissions from iframe games
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // SECURITY: Only accept messages from same origin
      const allowedOrigin = window.location.origin;
      
      if (event.origin !== allowedOrigin) {
        console.warn('Rejected score submission from untrusted origin:', event.origin);
        return;
      }

      // SECURITY: Verify message source is from the iframe (not arbitrary scripts)
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        console.warn('Rejected score submission from non-iframe source');
        return;
      }

      // Verify message is for score submission
      if (event.data?.type === "SUBMIT_SCORE" && event.data?.gameId === gameId) {
        const { score, metadata } = event.data;
        if (typeof score === 'number' && score >= 0) {
          submitScoreMutation.mutate({ score, metadata });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [gameId, submitScoreMutation]);

  if (!gameId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Game not found</div>
      </div>
    );
  }

  if (gameLoading) {
    return (
      <div className="pb-24">
        <div className="px-6 py-6">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-96" />
            <Skeleton className="w-full aspect-video" />
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Game not found</div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <Award className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="pb-24">
      <div className="px-6 py-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => setLocation("/games")}
          data-testid="button-back-to-games"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>

        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold mb-2" data-testid="heading-game-name">
            {game.name}
          </h1>
          {game.description && (
            <p className="text-muted-foreground text-lg" data-testid="text-game-description">
              {game.description}
            </p>
          )}
          {game.category && (
            <Badge variant="secondary" className="mt-2" data-testid="badge-game-category">
              {game.category}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card className="overflow-hidden bg-black">
              <div className="aspect-video w-full">
                {game.gameType === 'iframe' ? (
                  <iframe
                    ref={iframeRef}
                    src={game.gameUrl}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    data-testid="iframe-game"
                    title={game.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">External Game</p>
                      <Button
                        onClick={() => window.open(game.gameUrl, '_blank')}
                        data-testid="button-play-external"
                      >
                        Play Game
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {userBestScore && (
              <Card className="mt-4 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground">Your Best Score</h3>
                    <p className="font-display text-2xl font-bold" data-testid="text-user-best-score">
                      {userBestScore.score.toLocaleString()}
                    </p>
                  </div>
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
              </Card>
            )}
          </div>

          <div className="xl:col-span-1">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-primary" />
                <h2 className="font-display text-2xl font-bold" data-testid="heading-leaderboard">
                  Leaderboard
                </h2>
              </div>

              <Separator className="mb-4" />

              {leaderboardLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8" data-testid="empty-leaderboard">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No scores yet. Be the first to play!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        index < 3
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                      data-testid={`leaderboard-entry-${index + 1}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(index + 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm" data-testid={`text-rank-${index + 1}`}>
                              #{index + 1}
                            </span>
                            <span className="text-sm" data-testid={`text-username-${index + 1}`}>
                              {entry.username}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="font-display text-lg font-bold" data-testid={`text-score-${index + 1}`}>
                        {entry.score.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
