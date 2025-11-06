import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { type Album, type Song, type Artist } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Music, Disc, ArrowLeft, Upload, BadgeCheck, Settings, Trash2, Star, Globe } from "lucide-react";
import { UploadSongDialog } from "@/components/upload-song-dialog";

export default function ArtistDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [uploadSongDialogOpen, setUploadSongDialogOpen] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  const { data: albums = [] } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
    enabled: user?.isArtist === 1,
  });

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    enabled: user?.isArtist === 1,
  });

  const { data: artist, isLoading: isLoadingArtist, refetch: refetchArtist } = useQuery<Artist>({
    queryKey: ["/api/artists/me"],
    enabled: user?.isArtist === 1,
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      return await apiRequest("DELETE", `/api/songs/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({
        title: "Song Deleted",
        description: "Your song has been permanently removed.",
      });
      setSongToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete song. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSong = (song: Song) => {
    setSongToDelete(song);
  };

  const confirmDeleteSong = () => {
    if (songToDelete) {
      deleteSongMutation.mutate(songToDelete.id);
    }
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const result = await refetchArtist();
      if (result.data?.verificationStatus === 'verified') {
        toast({
          title: "Verification Complete!",
          description: "Your artist account is now verified. You can start uploading music!",
        });
      } else {
        toast({
          title: "Still Pending",
          description: "Your account is still being verified. Please check back soon.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Refresh artist data on mount (server handles auto-verification)
  useEffect(() => {
    if (!artist) return;
    
    // Refresh artist data to get latest verification status
    queryClient.invalidateQueries({ queryKey: ["/api/artists/me"] });
  }, [artist?.id]);

  if (user?.isArtist !== 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Music className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Artist Access Required</h2>
        <p className="text-muted-foreground mb-6">
          You need to be an approved artist to access this page.
        </p>
        <Button onClick={() => navigate("/")} data-testid="button-go-home">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    );
  }

  if (isLoadingArtist) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  if (artist?.verificationStatus === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-2xl mx-auto">
        <div className="mb-6 p-6 rounded-full bg-yellow-500/10">
          <Music className="h-16 w-16 text-yellow-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Account Verification in Progress</h2>
        <p className="text-muted-foreground mb-4">
          Your artist application has been approved! We're now performing a final verification of your account.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          This process typically takes up to <strong className="text-foreground">1 hour</strong> and happens automatically. 
          You'll be able to upload music as soon as verification is complete.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/")} variant="outline" data-testid="button-go-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
          <Button 
            onClick={handleCheckStatus} 
            disabled={isCheckingStatus}
            data-testid="button-refresh-status"
          >
            {isCheckingStatus ? "Checking..." : "Check Status"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Music className="h-8 w-8 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Artist Dashboard</h1>
              {artist?.verified === 1 && (
                <BadgeCheck 
                  className="h-7 w-7 text-primary" 
                  data-testid="badge-verified-dashboard"
                />
              )}
            </div>
            <p className="text-muted-foreground">Manage your music</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate("/edit-artist-profile")} 
            variant="outline"
            data-testid="button-edit-profile"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button onClick={() => setUploadSongDialogOpen(true)} data-testid="button-upload-song">
            <Upload className="w-4 h-4 mr-2" />
            Upload a Song
          </Button>
        </div>
      </div>

      <Tabs defaultValue="albums" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="albums" data-testid="tab-albums">
            <Disc className="w-4 h-4 mr-2" />
            Albums
          </TabsTrigger>
          <TabsTrigger value="songs" data-testid="tab-songs">
            <Music className="w-4 h-4 mr-2" />
            Songs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="albums" className="mt-6">
          {albums.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Disc className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Albums Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first album to get started.
                </p>
                <Button onClick={() => setUploadSongDialogOpen(true)} data-testid="button-create-first-album">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Song
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((album) => {
                const totalStreams = artist?.streams || 0;
                const verificationThreshold = 1000000;
                const firstVerificationThreshold = 100000;
                const showProgress = totalStreams >= firstVerificationThreshold && artist?.verified !== 1;
                const progress = Math.min((totalStreams / verificationThreshold) * 100, 100);

                return (
                  <Card key={album.id} data-testid={`card-album-${album.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg" data-testid="text-album-title">{album.title}</CardTitle>
                        {artist?.verified === 1 && (
                          <BadgeCheck className="h-5 w-5 text-primary" data-testid="badge-verified" />
                        )}
                      </div>
                      <CardDescription data-testid="text-album-year">{album.year}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {album.genre && (
                        <Badge variant="secondary" data-testid="badge-genre">{album.genre}</Badge>
                      )}
                      
                      {showProgress && (
                        <div className="space-y-2" data-testid="verification-progress">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Verification Progress</span>
                            <span className="font-medium">{totalStreams.toLocaleString()} / 1M streams</span>
                          </div>
                          <Progress value={progress} className="h-2" data-testid="progress-bar" />
                          <p className="text-xs text-muted-foreground">
                            {progress >= 100 
                              ? "Auto-verifying within an hour..." 
                              : `${(verificationThreshold - totalStreams).toLocaleString()} streams to verification`}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="songs" className="mt-6">
          {songs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Music className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Songs Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your first song to get started.
                </p>
                <Button onClick={() => setUploadSongDialogOpen(true)} data-testid="button-create-first-song">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Song
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {songs.map((song) => (
                <Card key={song.id} data-testid={`card-song-${song.id}`}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2" data-testid="text-song-title">
                          {song.title}
                          {song.globalPromotion === 1 && (
                            <Badge variant="default" className="flex items-center gap-1 text-xs">
                              <Star className="h-3 w-3" />
                              Featured
                            </Badge>
                          )}
                          {song.otherPlatforms === 1 && (
                            <Badge variant="outline" className="flex items-center gap-1 text-xs">
                              <Globe className="h-3 w-3" />
                              Multi-Platform
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription data-testid="text-song-duration">
                          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                          {song.globalPromotion === 1 && " • Promoted globally"}
                          {song.otherPlatforms === 1 && " • Distributed to Spotify, Apple Music, etc."}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" data-testid="badge-streams">{song.streams} streams</Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteSong(song)}
                          data-testid={`button-delete-song-${song.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Song Dialog */}
      {artist && (
        <UploadSongDialog
          open={uploadSongDialogOpen}
          onOpenChange={setUploadSongDialogOpen}
          artistId={artist.id}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!songToDelete} onOpenChange={(open) => !open && setSongToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-song-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Song?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{songToDelete?.title}"? This will permanently remove the song,
              its files, and remove it from all playlists. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSong}
              disabled={deleteSongMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteSongMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
