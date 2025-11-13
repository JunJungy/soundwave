import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Bot, Plus, ThumbsUp, ExternalLink, Check, X, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import type { DiscordBot } from "@shared/schema";

const botSubmissionSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  description: z.string().max(500, "Description must be 500 characters or less").optional().or(z.literal("")),
  inviteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type BotSubmission = z.infer<typeof botSubmissionSchema>;

export default function BotDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const { data: globalBots = [], isLoading: botsLoading } = useQuery<DiscordBot[]>({
    queryKey: ["/api/bots"],
  });

  const { data: myBots = [], isLoading: myBotsLoading } = useQuery<DiscordBot[]>({
    queryKey: ["/api/bots/me"],
    enabled: !!user,
  });

  const form = useForm<BotSubmission>({
    resolver: zodResolver(botSubmissionSchema),
    defaultValues: {
      applicationId: "",
      description: "",
      inviteUrl: "",
    },
  });

  const submitBotMutation = useMutation({
    mutationFn: (data: BotSubmission) => apiRequest("POST", "/api/bots", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots/me"] });
      toast({
        title: "Bot Submitted!",
        description: "Your bot has been submitted for review. You'll be notified once it's approved.",
      });
      setSubmitDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit bot. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: BotSubmission) => {
    submitBotMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-600 text-white" data-testid="badge-approved">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" data-testid="badge-rejected">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" data-testid="badge-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3" data-testid="heading-dashboard">
            <Bot className="w-10 h-10" />
            Bot Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover and submit Discord bots to the community
          </p>
        </div>
        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-submit-bot">
              <Plus className="w-5 h-5 mr-2" />
              Submit Bot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Submit Your Discord Bot</DialogTitle>
              <DialogDescription>
                Fill in your bot's details to submit it for verification. Once approved, it will be visible to all users.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="applicationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Application ID *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456789012345678" 
                          {...field}
                          data-testid="input-application-id"
                        />
                      </FormControl>
                      <FormDescription>
                        Find this in your Discord Developer Portal under "Application ID". We'll automatically fetch your bot's name and avatar from Discord.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your bot and what it does..."
                          className="resize-none min-h-[100px]"
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum 500 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inviteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Invite Link (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://discord.com/oauth2/authorize?client_id=..." 
                          {...field}
                          data-testid="input-invite-url"
                        />
                      </FormControl>
                      <FormDescription>
                        The OAuth2 URL users will use to add your bot to their server
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSubmitDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitBotMutation.isPending}
                    data-testid="button-submit-form"
                  >
                    {submitBotMutation.isPending ? "Submitting..." : "Submit Bot"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {myBots.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6" data-testid="heading-my-bots">My Bots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myBots.map((bot) => (
                <Card key={bot.id} className="hover-elevate" data-testid={`card-my-bot-${bot.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {bot.botAvatar ? (
                        <img 
                          src={`/api/proxy/bot-avatar/${bot.id}`}
                          alt={bot.botName}
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                          <Bot className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{bot.botName}</CardTitle>
                        {bot.botUsername && (
                          <p className="text-sm text-muted-foreground">{bot.botUsername}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(bot.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {bot.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {bot.description}
                    </p>
                  )}
                  {bot.status === "rejected" && bot.rejectedReason && (
                    <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                      <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                      <p className="text-sm text-muted-foreground mt-1">{bot.rejectedReason}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{bot.votes} votes</span>
                    </div>
                    <Link href={`/bots/${bot.id}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-${bot.id}`}>
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6" data-testid="heading-global-bots">Discover Bots</h2>
        {botsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="w-32 h-5" />
                      <Skeleton className="w-24 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="w-full h-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : globalBots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No bots available yet</p>
              <p className="text-muted-foreground">Be the first to submit a bot!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {globalBots.map((bot) => (
              <Card key={bot.id} className="hover-elevate h-full" data-testid={`card-bot-${bot.id}`}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {bot.botAvatar ? (
                      <img 
                        src={`/api/proxy/bot-avatar/${bot.id}`}
                        alt={bot.botName}
                        className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
                        <Bot className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{bot.botName}</CardTitle>
                      {bot.botUsername && (
                        <p className="text-sm text-muted-foreground truncate">{bot.botUsername}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {bot.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {bot.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{bot.votes} votes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/bots/${bot.id}`} className="flex-1">
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="w-full"
                        data-testid={`button-vote-${bot.id}`}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Vote
                      </Button>
                    </Link>
                    {bot.inviteUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(bot.inviteUrl!, "_blank")}
                        data-testid={`button-add-${bot.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Add Bot
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
