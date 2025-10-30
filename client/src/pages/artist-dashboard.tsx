import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { insertAlbumSchema, insertSongSchema, type InsertAlbum, type InsertSong, type Album, type Song, type Artist } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Music, Disc, ArrowLeft, Plus, Upload, Image as ImageIcon, BadgeCheck } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { UploadSongDialog } from "@/components/upload-song-dialog";
import type { UploadResult } from "@uppy/core";

export default function ArtistDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [uploadSongDialogOpen, setUploadSongDialogOpen] = useState(false);
  const [albumCoverUrl, setAlbumCoverUrl] = useState("");
  const [songAudioUrl, setSongAudioUrl] = useState("");

  const { data: albums = [] } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
    enabled: user?.isArtist === 1,
  });

  const { data: songs = [] } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    enabled: user?.isArtist === 1,
  });

  const { data: artist, isLoading: isLoadingArtist } = useQuery<Artist>({
    queryKey: ["/api/artists/me"],
    enabled: user?.isArtist === 1,
  });

  // Refresh artist data on mount (server handles auto-verification)
  useEffect(() => {
    if (!artist) return;
    
    // Refresh artist data to get latest verification status
    queryClient.invalidateQueries({ queryKey: ["/api/artists/me"] });
  }, [artist?.id]);

  const albumForm = useForm<Omit<InsertAlbum, "artistId">>({
    resolver: zodResolver(insertAlbumSchema.omit({ artistId: true })),
    defaultValues: {
      title: "",
      coverUrl: "",
      year: new Date().getFullYear(),
      genre: "",
    },
  });

  const songForm = useForm<Omit<InsertSong, "artistId">>({
    resolver: zodResolver(insertSongSchema.omit({ artistId: true })),
    defaultValues: {
      title: "",
      albumId: "",
      duration: 180,
      audioUrl: "",
    },
  });

  const createAlbumMutation = useMutation({
    mutationFn: async (data: Omit<InsertAlbum, "artistId">) => {
      const res = await apiRequest("POST", "/api/albums", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      toast({
        title: "Album created",
        description: "Your album has been created successfully.",
      });
      setAlbumDialogOpen(false);
      albumForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create album",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createSongMutation = useMutation({
    mutationFn: async (data: Omit<InsertSong, "artistId">) => {
      const res = await apiRequest("POST", "/api/songs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({
        title: "Song created",
        description: "Your song has been uploaded successfully.",
      });
      setSongDialogOpen(false);
      songForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create song",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/artists/me"] })} data-testid="button-refresh-status">
            Check Status
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Music className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Artist Dashboard</h1>
            <p className="text-muted-foreground">Manage your music</p>
          </div>
        </div>
        <Button onClick={() => setUploadSongDialogOpen(true)} data-testid="button-upload-song">
          <Upload className="w-4 h-4 mr-2" />
          Upload a Song
        </Button>
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
                <Button onClick={() => setAlbumDialogOpen(true)} data-testid="button-create-first-album">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Album
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base" data-testid="text-song-title">{song.title}</CardTitle>
                        <CardDescription data-testid="text-song-duration">
                          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, "0")}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" data-testid="badge-streams">{song.streams} streams</Badge>
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
    </div>
  );
}
