import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Music, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { Artist } from "@shared/schema";

export default function FollowingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: followedArtists = [], isLoading } = useQuery<Artist[]>({
    queryKey: ["/api/following"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Music className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Login Required</h2>
        <p className="text-muted-foreground mb-6">
          Please log in to see artists you follow.
        </p>
        <Button onClick={() => setLocation("/login")} data-testid="button-go-login">
          Log In
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 mb-8">
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-48 bg-muted rounded-full"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <div className="mb-8">
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

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="font-display text-4xl font-bold" data-testid="heading-following">
            Following
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="text-following-count">
          {followedArtists.length} {followedArtists.length === 1 ? 'artist' : 'artists'}
        </p>
      </div>

      {/* Following List */}
      {followedArtists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Artists Yet</h2>
          <p className="text-muted-foreground mb-6">
            Start following artists to see them here!
          </p>
          <Button onClick={() => setLocation("/")} data-testid="button-explore-artists">
            Explore Artists
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {followedArtists.map((artist) => (
            <div
              key={artist.id}
              onClick={() => setLocation(`/artist/${artist.id}`)}
              className="group cursor-pointer"
              data-testid={`card-artist-${artist.id}`}
            >
              <div className="relative mb-4 overflow-hidden rounded-full aspect-square hover-elevate active-elevate-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center">
                  {artist.imageUrl ? (
                    <img
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-artist-${artist.id}`}
                    />
                  ) : (
                    <span className="text-6xl font-bold text-primary-foreground">
                      {artist.name.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <h3 
                  className="font-semibold truncate group-hover:underline" 
                  data-testid={`text-artist-name-${artist.id}`}
                >
                  {artist.name}
                </h3>
                <p className="text-sm text-muted-foreground capitalize" data-testid={`text-artist-genre-${artist.id}`}>
                  {artist.genre || "Artist"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
