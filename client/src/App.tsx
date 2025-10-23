import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MusicPlayer } from "@/components/music-player";
import { QueueSheet } from "@/components/queue-sheet";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";
import { ArtistApplicationDialog } from "@/components/artist-application-dialog";
import { MusicPlayerProvider, useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Music, Shield } from "lucide-react";
import type { Playlist } from "@shared/schema";

import Home from "@/pages/home";
import Search from "@/pages/search";
import Library from "@/pages/library";
import AlbumPage from "@/pages/album";
import ArtistPage from "@/pages/artist";
import PlaylistPage from "@/pages/playlist";
import AdminPanel from "@/pages/admin-panel";
import ArtistDashboard from "@/pages/artist-dashboard";
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/library" component={Library} />
      <Route path="/album/:id" component={AlbumPage} />
      <Route path="/artist/:id" component={ArtistPage} />
      <Route path="/playlist/:id" component={PlaylistPage} />
      <Route path="/admin-panel" component={AdminPanel} />
      <Route path="/artist-dashboard" component={ArtistDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [queueOpen, setQueueOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [artistApplicationOpen, setArtistApplicationOpen] = useState(false);

  const { data: playlists = [] } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
    enabled: isAuthenticated,
  });

  const {
    currentTrack,
    isPlaying,
    queue,
    shuffle,
    repeat,
    currentTime,
    volume,
    togglePlayPause,
    nextTrack,
    previousTrack,
    removeFromQueue,
    clearQueue,
    toggleShuffle,
    toggleRepeat,
    seekTo,
    setVolume,
  } = useMusicPlayer();

  const handleCreatePlaylist = async (name: string, description: string) => {
    try {
      await apiRequest("POST", "/api/playlists", { name, description, songIds: [] });
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Playlist created",
        description: `"${name}" has been added to your library`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out",
        description: "You've been successfully logged out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar
          playlists={playlists.map((p) => ({ id: p.id, name: p.name }))}
          onCreatePlaylist={() => setCreatePlaylistOpen(true)}
        />
        
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between p-4 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              {user?.isAdmin === 1 && (
                <Badge className="bg-primary text-primary-foreground" data-testid="badge-admin">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
              {user?.isArtist === 1 && (
                <Badge className="bg-green-600 text-white" data-testid="badge-artist">
                  <Music className="w-3 h-3 mr-1" />
                  Artist
                </Badge>
              )}
              {user?.isArtist !== 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setArtistApplicationOpen(true)}
                  data-testid="button-apply-artist"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Become an Artist
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </div>
      </div>

      <MusicPlayer
        currentTrack={currentTrack || undefined}
        isPlaying={isPlaying}
        currentTime={currentTime}
        volume={volume}
        onPlayPause={togglePlayPause}
        onNext={nextTrack}
        onPrevious={previousTrack}
        onSeek={seekTo}
        onVolumeChange={setVolume}
        onShowQueue={() => setQueueOpen(true)}
        shuffle={shuffle}
        repeat={repeat}
        onToggleShuffle={toggleShuffle}
        onToggleRepeat={toggleRepeat}
      />

      <QueueSheet
        open={queueOpen}
        onOpenChange={setQueueOpen}
        queue={queue.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          albumCover: t.albumCover,
          duration: t.duration,
        }))}
        currentTrackId={currentTrack?.id}
        onRemoveFromQueue={removeFromQueue}
        onClearQueue={clearQueue}
      />

      <CreatePlaylistDialog
        open={createPlaylistOpen}
        onOpenChange={setCreatePlaylistOpen}
        onCreatePlaylist={handleCreatePlaylist}
      />

      <ArtistApplicationDialog
        open={artistApplicationOpen}
        onOpenChange={setArtistApplicationOpen}
      />

      <Toaster />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MusicPlayerProvider>
          <AppContent />
        </MusicPlayerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
