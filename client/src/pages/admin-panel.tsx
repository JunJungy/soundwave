import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Shield, CheckCircle, XCircle, Clock, ArrowLeft, Users, UserPlus, UserMinus, Trash2, Crown, RefreshCw } from "lucide-react";
import type { ArtistApplication, User } from "@shared/schema";

export default function AdminPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: applications = [], isLoading } = useQuery<ArtistApplication[]>({
    queryKey: ["/api/artist-applications/pending"],
    enabled: user?.isAdmin === 1,
  });

  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: user?.isAdmin === 1,
  });

  const approveMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await apiRequest("POST", `/api/artist-applications/${applicationId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artist-applications/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Application approved",
        description: "The artist will be able to upload music after automatic verification (up to 1 hour).",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await apiRequest("POST", `/api/artist-applications/${applicationId}/reject`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artist-applications/pending"] });
      toast({
        title: "Application rejected",
        description: "The applicant has been notified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const promoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/promote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User promoted",
        description: "User now has admin privileges.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to promote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const demoteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/demote`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User demoted",
        description: "Admin privileges have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to demote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "User deleted",
        description: "The user account has been permanently removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSpotifyUrlsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/update-spotify-urls");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({
        title: "Spotify URLs updated!",
        description: `Updated ${data.updated} songs. Failed: ${data.failed}. Skipped: ${data.skipped}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update Spotify URLs",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (targetUser: User) => {
    setUserToDelete(targetUser);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  if (user?.isAdmin !== 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page.
        </p>
        <Button onClick={() => navigate("/")} data-testid="button-go-home">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    );
  }

  if (isLoading || isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage applications and users</p>
        </div>
      </div>

      <Tabs defaultValue="applications" className="space-y-6">
        <TabsList className="inline-flex h-auto w-full sm:grid sm:grid-cols-3 flex-nowrap overflow-x-auto">
          <TabsTrigger value="applications" data-testid="tab-applications" className="whitespace-nowrap">
            Artist Applications
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users" className="whitespace-nowrap">
            User Management
          </TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system" className="whitespace-nowrap">
            System Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Applications</h3>
                <p className="text-sm text-muted-foreground">
                  There are no artist applications waiting for review.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <Card key={application.id} data-testid={`card-application-${application.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl" data-testid="text-artist-name">
                          {application.artistName}
                        </CardTitle>
                        <CardDescription data-testid="text-genre">
                          {application.genre || "No genre specified"}
                        </CardDescription>
                      </div>
                      <Badge className="bg-yellow-500 text-white" data-testid="badge-status">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {application.bio && (
                      <div>
                        <p className="text-sm font-medium mb-1">Bio</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-bio">
                          {application.bio}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-1">Applied</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-created-at">
                        {application.createdAt
                          ? new Date(application.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => approveMutation.mutate(application.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="flex-1"
                        data-testid={`button-approve-${application.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {approveMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(application.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="flex-1"
                        data-testid={`button-reject-${application.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>All Users</CardTitle>
              </div>
              <CardDescription>
                Promote or demote users to grant or revoke admin privileges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allUsers.map((targetUser) => (
                  <div
                    key={targetUser.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border"
                    data-testid={`user-row-${targetUser.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium" data-testid={`text-username-${targetUser.id}`}>
                          {targetUser.username}
                        </p>
                        {targetUser.username === "Jinsoo" ? (
                          <Badge className="bg-amber-600 text-white" data-testid={`badge-owner-${targetUser.id}`}>
                            <Crown className="w-3 h-3 mr-1" />
                            Owner
                          </Badge>
                        ) : targetUser.isAdmin === 1 ? (
                          <Badge variant="default" data-testid={`badge-admin-${targetUser.id}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        ) : null}
                        {targetUser.isArtist === 1 && (
                          <Badge variant="secondary" data-testid={`badge-artist-${targetUser.id}`}>
                            Artist
                          </Badge>
                        )}
                      </div>
                      {targetUser.email && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-email-${targetUser.id}`}>
                          {targetUser.email}
                        </p>
                      )}
                    </div>
                    {targetUser.id !== user?.id && targetUser.username !== "Jinsoo" && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        {targetUser.isAdmin === 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => demoteMutation.mutate(targetUser.id)}
                            disabled={demoteMutation.isPending || promoteMutation.isPending}
                            data-testid={`button-demote-${targetUser.id}`}
                            className="flex-1 sm:flex-none"
                          >
                            <UserMinus className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">{demoteMutation.isPending ? "Removing..." : "Remove Admin"}</span>
                            <span className="sm:hidden ml-2">{demoteMutation.isPending ? "Remove..." : "Remove"}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => promoteMutation.mutate(targetUser.id)}
                            disabled={promoteMutation.isPending || demoteMutation.isPending}
                            data-testid={`button-promote-${targetUser.id}`}
                            className="flex-1 sm:flex-none"
                          >
                            <UserPlus className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">{promoteMutation.isPending ? "Promoting..." : "Make Admin"}</span>
                            <span className="sm:hidden ml-2">{promoteMutation.isPending ? "Making..." : "Make"}</span>
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(targetUser)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${targetUser.id}`}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      </div>
                    )}
                    {targetUser.id === user?.id && (
                      <p className="text-sm text-muted-foreground italic" data-testid="text-current-user">
                        You
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <CardTitle>Spotify Integration</CardTitle>
              </div>
              <CardDescription>
                Update all songs with real Spotify 30-second preview URLs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-4">
                  This will fetch real 30-second preview clips from Spotify for all songs in the database. 
                  Songs currently using placeholder audio will be updated with authentic Spotify previews.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                  <li>• Searches for each song on Spotify using title and artist name</li>
                  <li>• Updates database with preview URLs when found</li>
                  <li>• Skips songs that already have Spotify URLs</li>
                  <li>• May take 1-2 minutes for 40 songs</li>
                </ul>
              </div>
              <Button
                onClick={() => updateSpotifyUrlsMutation.mutate()}
                disabled={updateSpotifyUrlsMutation.isPending}
                className="w-full"
                data-testid="button-update-spotify-urls"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${updateSpotifyUrlsMutation.isPending ? 'animate-spin' : ''}`} />
                {updateSpotifyUrlsMutation.isPending ? "Updating..." : "Update Spotify Preview URLs"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{userToDelete?.username}</span>? 
              This action cannot be undone and will permanently remove the user and all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
