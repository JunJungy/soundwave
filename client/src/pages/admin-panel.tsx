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
import { Shield, CheckCircle, XCircle, Clock, ArrowLeft, Users, UserPlus, UserMinus } from "lucide-react";
import type { ArtistApplication, User } from "@shared/schema";

export default function AdminPanel() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

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
      toast({
        title: "Application approved",
        description: "The artist can now upload music.",
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications" data-testid="tab-applications">
            Artist Applications
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            User Management
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
                    className="flex items-center justify-between p-4 rounded-lg border"
                    data-testid={`user-row-${targetUser.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium" data-testid={`text-username-${targetUser.id}`}>
                          {targetUser.username}
                        </p>
                        {targetUser.isAdmin === 1 && (
                          <Badge variant="default" data-testid={`badge-admin-${targetUser.id}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
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
                    {targetUser.id !== user?.id && (
                      <div className="flex gap-2">
                        {targetUser.isAdmin === 1 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => demoteMutation.mutate(targetUser.id)}
                            disabled={demoteMutation.isPending || promoteMutation.isPending}
                            data-testid={`button-demote-${targetUser.id}`}
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            {demoteMutation.isPending ? "Removing..." : "Remove Admin"}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => promoteMutation.mutate(targetUser.id)}
                            disabled={promoteMutation.isPending || demoteMutation.isPending}
                            data-testid={`button-promote-${targetUser.id}`}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            {promoteMutation.isPending ? "Promoting..." : "Make Admin"}
                          </Button>
                        )}
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
      </Tabs>
    </div>
  );
}
