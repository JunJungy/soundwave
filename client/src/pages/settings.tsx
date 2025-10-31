import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Trash2, Settings as SettingsIcon, Link2, Unlink, Mail } from "lucide-react";
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

type LinkCodeResponse = {
  code: string;
  expiresAt: string;
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const { data: linkCodeData, refetch: refetchLinkCode } = useQuery<LinkCodeResponse>({
    queryKey: ["/api/discord/link-code"],
    enabled: false, // Only fetch when user clicks "Generate Code"
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/discord/generate-link-code");
    },
    onSuccess: () => {
      refetchLinkCode();
      toast({
        title: "Link code generated",
        description: "Your 6-digit code is ready. It expires in 5 minutes.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate link code",
        variant: "destructive",
      });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/discord/unlink");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Discord unlinked",
        description: "Your Discord account has been disconnected.",
      });
      setShowUnlinkDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unlink Discord account",
        variant: "destructive",
      });
    },
  });

  const addEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/user/add-email", { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Email added",
        description: "Your email has been permanently bound to your account.",
      });
      setEmailInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add email address",
        variant: "destructive",
      });
    },
  });

  const handleAddEmail = () => {
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    addEmailMutation.mutate(emailInput);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link code copied to clipboard",
    });
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMs <= 0) return "Expired";
    return `${diffMins}m ${diffSecs}s`;
  };

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <Card data-testid="card-account-info">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your Soundwave account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium" data-testid="text-username">{user?.username}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="text-email">{user?.email || "Not set"}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Account Type</p>
                <div className="flex gap-2 mt-1">
                  {user?.isArtist === 1 && (
                    <Badge variant="default" data-testid="badge-artist-type">Artist</Badge>
                  )}
                  {user?.isAdmin === 1 && (
                    <Badge variant="default" data-testid="badge-admin-type">Admin</Badge>
                  )}
                  {user?.isArtist !== 1 && user?.isAdmin !== 1 && (
                    <Badge variant="secondary" data-testid="badge-user-type">User</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Management */}
        <Card data-testid="card-email-management">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Address
            </CardTitle>
            <CardDescription>
              Add an email to your account for recovery and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.boundEmail ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400" data-testid="text-email-status">
                      Email Bound
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <Badge variant="secondary">Permanent</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your email is permanently bound to this account and cannot be changed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">Add Email to Your Account</p>
                  <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Account recovery option</li>
                    <li>Future email notifications</li>
                    <li>Enhanced account security</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                    disabled={addEmailMutation.isPending}
                    data-testid="input-email"
                  />
                  <Button
                    onClick={handleAddEmail}
                    disabled={addEmailMutation.isPending || !emailInput}
                    data-testid="button-add-email"
                  >
                    {addEmailMutation.isPending ? "Adding..." : "Add Email"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Once added, your email cannot be changed or removed
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discord Integration */}
        <Card data-testid="card-discord-integration">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Discord Integration
            </CardTitle>
            <CardDescription>
              Link your Discord account to use bot commands
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.discordId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400" data-testid="text-discord-status">
                      Discord Linked
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your Discord account is connected
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowUnlinkDialog(true)}
                    data-testid="button-unlink-discord"
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Unlink
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use <code className="px-2 py-1 bg-muted rounded">/account</code> on Discord to view your stats!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium mb-2">How to link Discord:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Click "Generate Link Code" below</li>
                    <li>Copy your 6-digit code</li>
                    <li>
                      Open Discord and type:{" "}
                      <code className="px-2 py-1 bg-background rounded">/link &lt;your-code&gt;</code>
                    </li>
                    <li>Your accounts will be linked!</li>
                  </ol>
                </div>

                {linkCodeData?.code && (
                  <div className="p-4 border-2 border-primary rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Your Link Code</p>
                        <p className="text-3xl font-bold tracking-wider" data-testid="text-link-code">
                          {linkCodeData.code}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(linkCodeData.code)}
                        data-testid="button-copy-code"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Expires in: <span className="font-medium">{formatExpiryTime(linkCodeData.expiresAt)}</span>
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => generateCodeMutation.mutate()}
                  disabled={generateCodeMutation.isPending}
                  data-testid="button-generate-code"
                >
                  {generateCodeMutation.isPending ? "Generating..." : "Generate Link Code"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Discord Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your Discord account from Soundwave. You won't be able to use Discord bot commands until you link again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unlink">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
              data-testid="button-confirm-unlink"
            >
              {unlinkMutation.isPending ? "Unlinking..." : "Unlink"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
