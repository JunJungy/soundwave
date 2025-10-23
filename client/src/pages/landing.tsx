import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-accent/5">
      <div className="max-w-2xl mx-auto px-6 text-center space-y-8">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-primary/10 p-6">
            <Music className="w-20 h-20 text-primary" />
          </div>
        </div>
        
        <h1 className="text-6xl font-bold tracking-tight text-foreground font-display">
          Soundwave
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Your music, your way. Stream millions of songs, create playlists, and discover new favorites.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Button 
            size="lg"
            className="min-w-[200px]"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Get Started
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Unlimited Music</h3>
            <p className="text-sm text-muted-foreground">
              Access a vast library of songs across all genres
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Custom Playlists</h3>
            <p className="text-sm text-muted-foreground">
              Create and share your perfect soundtrack
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Discover New</h3>
            <p className="text-sm text-muted-foreground">
              Find your next favorite artist or album
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
