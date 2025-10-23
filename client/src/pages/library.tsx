import { useQuery } from "@tanstack/react-query";
import { AlbumCard } from "@/components/album-card";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Playlist } from "@shared/schema";

export default function Library() {
  const [, setLocation] = useLocation();

  const { data: playlists = [], isLoading } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  return (
    <div className="pb-24 px-6 py-8">
      <h1 className="font-display text-4xl font-bold mb-8" data-testid="heading-library">
        Your Library
      </h1>

      <Tabs defaultValue="playlists" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="playlists" data-testid="tab-library-playlists">
            Playlists
          </TabsTrigger>
          <TabsTrigger value="albums" data-testid="tab-library-albums">
            Albums
          </TabsTrigger>
          <TabsTrigger value="artists" data-testid="tab-library-artists">
            Artists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playlists">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted rounded-md mb-4"></div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h3 className="font-display text-2xl font-bold mb-2">
                No playlists yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                Create your first playlist to start organizing your music
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {playlists.map((playlist) => (
                <AlbumCard
                  key={playlist.id}
                  id={playlist.id}
                  title={playlist.name}
                  subtitle={`${playlist.songIds.length} songs`}
                  coverUrl={playlist.coverUrl || "/placeholder-album.png"}
                  onClick={() => setLocation(`/playlist/${playlist.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="albums">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">Album library coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="artists">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">Artist library coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
