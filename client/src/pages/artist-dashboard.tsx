import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { insertAlbumSchema, insertSongSchema, type InsertAlbum, type InsertSong, type Album, type Song } from "@shared/schema";
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
import { Music, Disc, ArrowLeft, Plus, Upload, Image as ImageIcon } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function ArtistDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
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
        <div className="flex gap-3">
          <Button onClick={() => setAlbumDialogOpen(true)} data-testid="button-create-album">
            <Plus className="w-4 h-4 mr-2" />
            New Album
          </Button>
          <Button onClick={() => setSongDialogOpen(true)} data-testid="button-create-song">
            <Plus className="w-4 h-4 mr-2" />
            New Song
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
                <Button onClick={() => setAlbumDialogOpen(true)} data-testid="button-create-first-album">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Album
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((album) => (
                <Card key={album.id} data-testid={`card-album-${album.id}`}>
                  <CardHeader>
                    <CardTitle className="text-lg" data-testid="text-album-title">{album.title}</CardTitle>
                    <CardDescription data-testid="text-album-year">{album.year}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {album.genre && (
                      <Badge variant="secondary" data-testid="badge-genre">{album.genre}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
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
                <Button onClick={() => setSongDialogOpen(true)} data-testid="button-create-first-song">
                  <Plus className="w-4 h-4 mr-2" />
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

      <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
        <DialogContent data-testid="dialog-create-album">
          <DialogHeader>
            <DialogTitle>Create New Album</DialogTitle>
            <DialogDescription>Add a new album to your discography.</DialogDescription>
          </DialogHeader>
          <Form {...albumForm}>
            <form onSubmit={albumForm.handleSubmit((data) => createAlbumMutation.mutate(data))} className="space-y-4">
              <FormField
                control={albumForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Album Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Album name" data-testid="input-album-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={albumForm.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="e.g., Pop, Rock" data-testid="input-album-genre" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={albumForm.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="number" placeholder="2024" data-testid="input-album-year" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Album Cover (Square, No Logos) *</label>
                <div className="flex items-center gap-3">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={5242880}
                    allowedFileTypes={['image/*']}
                    onGetUploadParameters={async () => {
                      const res = await apiRequest("POST", "/api/objects/upload");
                      const { uploadURL } = await res.json();
                      return { method: "PUT" as const, url: uploadURL };
                    }}
                    onComplete={async (result) => {
                      if (result.successful && result.successful.length > 0) {
                        const uploadURL = result.successful[0].uploadURL;
                        const aclRes = await apiRequest("PUT", "/api/objects/acl", { objectURL: uploadURL });
                        const { objectPath } = await aclRes.json();
                        setAlbumCoverUrl(objectPath);
                        albumForm.setValue("coverUrl", objectPath);
                        toast({
                          title: "Image uploaded",
                          description: "Album cover uploaded successfully",
                        });
                      }
                    }}
                    buttonVariant="outline"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {albumCoverUrl ? "Change Cover" : "Upload Cover"}
                  </ObjectUploader>
                  {albumCoverUrl && (
                    <span className="text-sm text-muted-foreground">Cover uploaded ✓</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Square images only. No branded logos (Spotify, Snapchat, etc.)
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setAlbumDialogOpen(false)} className="flex-1" data-testid="button-cancel-album">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createAlbumMutation.isPending} data-testid="button-submit-album">
                  {createAlbumMutation.isPending ? "Creating..." : "Create Album"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={songDialogOpen} onOpenChange={setSongDialogOpen}>
        <DialogContent data-testid="dialog-create-song">
          <DialogHeader>
            <DialogTitle>Upload New Song</DialogTitle>
            <DialogDescription>Add a new song to your catalog.</DialogDescription>
          </DialogHeader>
          <Form {...songForm}>
            <form onSubmit={songForm.handleSubmit((data) => createSongMutation.mutate(data))} className="space-y-4">
              <FormField
                control={songForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Song Title *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Song name" data-testid="input-song-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={songForm.control}
                name="albumId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Album *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Album ID" data-testid="input-song-album" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={songForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (seconds) *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} type="number" placeholder="180" data-testid="input-song-duration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Audio File *</label>
                <div className="flex items-center gap-3">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={20971520}
                    allowedFileTypes={['audio/*', '.mp3', '.wav', '.ogg', '.m4a']}
                    onGetUploadParameters={async () => {
                      const res = await apiRequest("POST", "/api/objects/upload");
                      const { uploadURL } = await res.json();
                      return { method: "PUT" as const, url: uploadURL };
                    }}
                    onComplete={async (result) => {
                      if (result.successful && result.successful.length > 0) {
                        const uploadURL = result.successful[0].uploadURL;
                        const aclRes = await apiRequest("PUT", "/api/objects/acl", { objectURL: uploadURL });
                        const { objectPath } = await aclRes.json();
                        setSongAudioUrl(objectPath);
                        songForm.setValue("audioUrl", objectPath);
                        toast({
                          title: "Audio uploaded",
                          description: "Song audio uploaded successfully",
                        });
                      }
                    }}
                    buttonVariant="outline"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {songAudioUrl ? "Change Audio" : "Upload Audio"}
                  </ObjectUploader>
                  {songAudioUrl && (
                    <span className="text-sm text-muted-foreground">Audio uploaded ✓</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: MP3, WAV, OGG, M4A (Max 20MB)
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setSongDialogOpen(false)} className="flex-1" data-testid="button-cancel-song">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createSongMutation.isPending} data-testid="button-submit-song">
                  {createSongMutation.isPending ? "Uploading..." : "Upload Song"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
