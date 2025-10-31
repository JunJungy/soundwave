import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateArtistProfileSchema, type UpdateArtistProfile, type Artist } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";

export default function EditArtistProfile() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: artist, isLoading: isArtistLoading } = useQuery<Artist>({
    queryKey: ["/api/artists/me"],
    enabled: user?.isArtist === 1,
  });

  const form = useForm<UpdateArtistProfile>({
    resolver: zodResolver(updateArtistProfileSchema),
    defaultValues: {
      imageUrl: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (!isAuthLoading && user?.isArtist !== 1) {
      navigate("/");
    }
  }, [user, isAuthLoading, navigate]);

  useEffect(() => {
    if (artist) {
      form.reset({
        imageUrl: artist.imageUrl || "",
        bio: artist.bio || "",
      });
    }
  }, [artist, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateArtistProfile) => {
      return await apiRequest("PUT", "/api/artists/me", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists"] });
      toast({
        title: "Profile Updated",
        description: "Your artist profile has been updated successfully!",
      });
      navigate("/artist-dashboard");
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: UpdateArtistProfile) => {
    updateProfileMutation.mutate(data);
  };

  if (isAuthLoading || isArtistLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || user.isArtist !== 1) {
    return null;
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Artist profile not found</div>
      </div>
    );
  }

  const currentImageUrl = form.watch("imageUrl");

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/artist-dashboard")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Edit Artist Profile</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="artist-name">Artist Name</Label>
                <Input
                  id="artist-name"
                  value={artist.name}
                  disabled
                  data-testid="input-artist-name"
                />
                <p className="text-sm text-muted-foreground">
                  Your artist name cannot be changed
                </p>
              </div>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Image</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        {currentImageUrl ? (
                          <div className="w-24 h-24 rounded-full overflow-hidden bg-muted">
                            <img
                              src={currentImageUrl}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
                            {artist.name.charAt(0)}
                          </div>
                        )}
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5 * 1024 * 1024}
                          allowedFileTypes={["image/*"]}
                          onGetUploadParameters={async () => {
                            const res = await fetch("/api/objects/upload", {
                              method: "POST",
                              credentials: "include",
                            });
                            const data = await res.json();
                            return { method: "PUT", url: data.uploadURL };
                          }}
                          onComplete={async (result) => {
                            if (result.successful && result.successful.length > 0) {
                              const uploadedFile = result.successful[0];
                              if (uploadedFile.uploadURL) {
                                const aclRes = await apiRequest("PUT", "/api/objects/acl", { objectURL: uploadedFile.uploadURL });
                                const { objectPath } = await aclRes.json();
                                field.onChange(objectPath);
                                toast({
                                  title: "Image Uploaded",
                                  description: "Profile image uploaded successfully!",
                                });
                              }
                            }
                          }}
                          buttonVariant="outline"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {currentImageUrl ? "Change Image" : "Upload Image"}
                        </ObjectUploader>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Tell your fans about yourself..."
                        rows={6}
                        data-testid="input-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      Share your story, influences, or what makes your music unique (max 1000 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/artist-dashboard")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
