import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertArtistApplicationSchema, type InsertArtistApplication, type ArtistApplication } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Music, BadgeCheck, Clock, XCircle } from "lucide-react";

interface ArtistApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtistApplicationDialog({ open, onOpenChange }: ArtistApplicationDialogProps) {
  const { toast } = useToast();

  const { data: existingApplication } = useQuery<ArtistApplication | null>({
    queryKey: ["/api/artist-applications/me"],
    enabled: open,
  });

  const form = useForm<Omit<InsertArtistApplication, "userId">>({
    resolver: zodResolver(insertArtistApplicationSchema.omit({ userId: true })),
    defaultValues: {
      artistName: "",
      genre: "",
      bio: "",
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: Omit<InsertArtistApplication, "userId">) => {
      const res = await apiRequest("POST", "/api/artist-applications", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artist-applications/me"] });
      toast({
        title: "Application submitted!",
        description: "Your artist application has been submitted for review.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Application failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Omit<InsertArtistApplication, "userId">) => {
    createApplicationMutation.mutate(data);
  };

  if (existingApplication) {
    const statusConfig: Record<string, { icon: typeof Clock; color: string; title: string; description: string }> = {
      pending: {
        icon: Clock,
        color: "text-yellow-500",
        title: "Application Pending",
        description: "Your artist application is being reviewed by our team.",
      },
      approved: {
        icon: BadgeCheck,
        color: "text-green-500",
        title: "Application Approved!",
        description: "Congratulations! You can now upload music.",
      },
      rejected: {
        icon: XCircle,
        color: "text-red-500",
        title: "Application Not Approved",
        description: "Your application was not approved at this time.",
      },
    };

    const config = statusConfig[existingApplication.status];
    const StatusIcon = config.icon;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-testid="dialog-application-status">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <StatusIcon className={`h-6 w-6 ${config.color}`} data-testid="icon-application-status" />
              <DialogTitle>{config.title}</DialogTitle>
            </div>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm font-medium mb-1">Artist Name</p>
              <p className="text-sm text-muted-foreground" data-testid="text-artist-name">{existingApplication.artistName}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Genre</p>
              <p className="text-sm text-muted-foreground" data-testid="text-genre">{existingApplication.genre}</p>
            </div>
            {existingApplication.bio && (
              <div>
                <p className="text-sm font-medium mb-1">Bio</p>
                <p className="text-sm text-muted-foreground" data-testid="text-bio">{existingApplication.bio}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-1">Status</p>
              <p className={`text-sm font-semibold ${config.color}`} data-testid="text-status">
                {existingApplication.status.toUpperCase()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-artist-application">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Music className="h-6 w-6 text-primary" />
            <DialogTitle>Apply to Become an Artist</DialogTitle>
          </div>
          <DialogDescription>
            Submit your application to upload and share your music on Soundwave.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="artistName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Your artist or band name"
                      data-testid="input-artist-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Genre</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="e.g., Pop, Rock, Hip Hop"
                      data-testid="input-genre"
                    />
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
                      value={field.value || ""}
                      placeholder="Tell us about your music and background"
                      className="resize-none"
                      rows={5}
                      data-testid="textarea-bio"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createApplicationMutation.isPending}
                data-testid="button-submit-application"
              >
                {createApplicationMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
