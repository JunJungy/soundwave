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
import { MusicPlayerProvider, useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Playlist } from "@shared/schema";

import Home from "@/pages/home";
import Search from "@/pages/search";
import Library from "@/pages/library";
import AlbumPage from "@/pages/album";
import PlaylistPage from "@/pages/playlist";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/library" component={Library} />
      <Route path="/album/:id" component={AlbumPage} />
      <Route path="/playlist/:id" component={PlaylistPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { toast } = useToast();
  const [queueOpen, setQueueOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);

  const { data: playlists = [] } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
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

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

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
          </header>
          
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </div>
      </div>

      <MusicPlayer
        currentTrack={currentTrack}
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
