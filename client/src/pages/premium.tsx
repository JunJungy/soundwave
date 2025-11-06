import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Globe, Music, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Song } from "@shared/schema";
import { useLocation } from "wouter";

export default function Premium() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<{
    globalPromotion: boolean;
    otherPlatforms: boolean;
  }>({
    globalPromotion: false,
    otherPlatforms: false,
  });

  const { 
    data: artist, 
    isLoading: artistLoading, 
    isError: artistError,
    refetch: refetchArtist 
  } = useQuery<any>({
    queryKey: ["/api/artists/me"],
    enabled: !!user,
  });

  const { 
    data: songs = [], 
    isLoading: songsLoading,
    isError: songsError,
    refetch: refetchSongs 
  } = useQuery<Song[]>({
    queryKey: ["/api/songs"],
    enabled: !!artist,
  });

  const artistSongs = songs.filter((song) => song.artistId === artist?.id);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSong || (!selectedFeatures.globalPromotion && !selectedFeatures.otherPlatforms)) {
        throw new Error("Please select a song and at least one feature");
      }

      const response = await fetch(`/api/songs/${selectedSong}/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          globalPromotion: selectedFeatures.globalPromotion,
          otherPlatforms: selectedFeatures.otherPlatforms,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create checkout session");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Invalidate queries so updated song data loads after payment
        queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalPrice =
    (selectedFeatures.globalPromotion ? 4 : 0) +
    (selectedFeatures.otherPlatforms ? 5 : 0);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please log in to access premium features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/login")} data-testid="button-login">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (artistLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground" data-testid="loading-artist">
          Loading...
        </div>
      </div>
    );
  }

  if (artistError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Artist Data</CardTitle>
            <CardDescription>
              There was a problem loading your artist information. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => refetchArtist()} data-testid="button-retry-artist">
              Retry
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Artist Account Required</CardTitle>
            <CardDescription>
              You need to be a verified artist to promote songs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2" data-testid="heading-premium">
            Premium Features
          </h1>
          <p className="text-muted-foreground text-lg">
            Boost your music's reach with our promotion services
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className={selectedFeatures.globalPromotion ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle data-testid="text-feature-global-promo">Global Promotion</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground mt-1">
                    $4
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Make your song stand out across the platform
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Featured badge on your song</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Top placement in search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Dedicated "Featured Songs" section on homepage</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Increased visibility across the platform</span>
                </li>
              </ul>
              <Button
                variant={selectedFeatures.globalPromotion ? "default" : "outline"}
                className="w-full"
                onClick={() =>
                  setSelectedFeatures((prev) => ({
                    ...prev,
                    globalPromotion: !prev.globalPromotion,
                  }))
                }
                data-testid="button-toggle-global-promo"
              >
                {selectedFeatures.globalPromotion ? "Selected" : "Select"}
              </Button>
            </CardContent>
          </Card>

          <Card className={selectedFeatures.otherPlatforms ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle data-testid="text-feature-multi-platform">Multi-Platform Distribution</CardTitle>
                  <CardDescription className="text-2xl font-bold text-foreground mt-1">
                    $5
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Distribute your music to major streaming platforms
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Multi-Platform badge on your song</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Distribution to Spotify</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Distribution to Apple Music</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>Distribution to YouTube Music & more</span>
                </li>
              </ul>
              <Button
                variant={selectedFeatures.otherPlatforms ? "default" : "outline"}
                className="w-full"
                onClick={() =>
                  setSelectedFeatures((prev) => ({
                    ...prev,
                    otherPlatforms: !prev.otherPlatforms,
                  }))
                }
                data-testid="button-toggle-multi-platform"
              >
                {selectedFeatures.otherPlatforms ? "Selected" : "Select"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Song Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Select a Song to Promote
            </CardTitle>
            <CardDescription>
              Choose which song you want to apply these features to
            </CardDescription>
          </CardHeader>
          <CardContent>
            {songsLoading ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground" data-testid="loading-songs">
                  Loading your songs...
                </div>
              </div>
            ) : songsError ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Error loading songs. Please try again.
                </p>
                <Button onClick={() => refetchSongs()} data-testid="button-retry-songs">
                  Retry
                </Button>
              </div>
            ) : artistSongs.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  You don't have any songs yet. Upload a song first!
                </p>
                <Button onClick={() => setLocation("/artist-dashboard")} data-testid="button-go-to-dashboard">
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {artistSongs.map((song) => (
                  <div
                    key={song.id}
                    className={`p-4 rounded-md border cursor-pointer transition-colors hover-elevate ${
                      selectedSong === song.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                    onClick={() => setSelectedSong(song.id)}
                    data-testid={`song-select-${song.id}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={selectedSong === song.id}
                          onCheckedChange={() => setSelectedSong(song.id)}
                          data-testid={`checkbox-song-${song.id}`}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold flex items-center gap-2">
                            {song.title}
                            {song.globalPromotion === 1 && (
                              <Badge variant="default" className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                            {song.otherPlatforms === 1 && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Multi-Platform
                              </Badge>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {Math.floor(song.duration / 60)}:
                            {(song.duration % 60).toString().padStart(2, "0")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checkout Section */}
        {artistSongs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Complete Your Purchase</CardTitle>
              <CardDescription>
                Review your selection and proceed to payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selected Song:</span>
                  <span className="font-medium">
                    {selectedSong
                      ? artistSongs.find((s) => s.id === selectedSong)?.title
                      : "None"}
                  </span>
                </div>
                {selectedFeatures.globalPromotion && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Global Promotion:</span>
                    <span className="font-medium">$4.00</span>
                  </div>
                )}
                {selectedFeatures.otherPlatforms && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Multi-Platform Distribution:</span>
                    <span className="font-medium">$5.00</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-primary" data-testid="text-total-price">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={
                  !selectedSong ||
                  (!selectedFeatures.globalPromotion && !selectedFeatures.otherPlatforms) ||
                  checkoutMutation.isPending
                }
                onClick={() => checkoutMutation.mutate()}
                data-testid="button-checkout"
              >
                {checkoutMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {!selectedSong && (
                <p className="text-sm text-muted-foreground text-center">
                  Please select a song to continue
                </p>
              )}
              {selectedSong &&
                !selectedFeatures.globalPromotion &&
                !selectedFeatures.otherPlatforms && (
                  <p className="text-sm text-muted-foreground text-center">
                    Please select at least one feature
                  </p>
                )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
