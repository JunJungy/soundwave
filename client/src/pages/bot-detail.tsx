import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Bot, ThumbsUp, ExternalLink, ArrowLeft, Calendar, User } from "lucide-react";
import { Link } from "wouter";
import type { DiscordBot } from "@shared/schema";

export default function BotDetail() {
  const [, params] = useRoute("/bots/:id");
  const botId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: bot, isLoading: botLoading } = useQuery<DiscordBot>({
    queryKey: ["/api/bots", botId],
    enabled: !!botId,
  });

  const { data: voteData } = useQuery<{ hasVoted: boolean }>({
    queryKey: ["/api/bots", botId, "has-voted"],
    enabled: !!botId && !!user,
  });

  const voteMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/bots/${botId}/vote`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "has-voted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({
        title: "Voted!",
        description: "Your vote has been counted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Vote Failed",
        description: error.message || "Failed to vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const unvoteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/bots/${botId}/vote`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots", botId, "has-voted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({
        title: "Vote Removed",
        description: "Your vote has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unvote Failed",
        description: error.message || "Failed to remove vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    if (voteData?.hasVoted) {
      unvoteMutation.mutate();
    } else {
      voteMutation.mutate();
    }
  };

  if (botLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="w-32 h-10 mb-8" />
        <Card>
          <CardHeader>
            <div className="flex items-start gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="w-64 h-8" />
                <Skeleton className="w-48 h-6" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Bot not found</p>
            <Link href="/bots">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/bots">
        <Button variant="ghost" className="mb-6" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-6">
            {bot.botAvatar ? (
              <img 
                src={bot.botAvatar} 
                alt={bot.botName}
                className="w-24 h-24 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border border-border shrink-0">
                <Bot className="w-12 h-12" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <CardTitle className="text-3xl mb-2" data-testid="text-bot-name">
                    {bot.botName}
                  </CardTitle>
                  {bot.botUsername && (
                    <p className="text-lg text-muted-foreground" data-testid="text-bot-username">
                      {bot.botUsername}
                    </p>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={handleVote}
                  disabled={voteMutation.isPending || unvoteMutation.isPending || !user}
                  variant={voteData?.hasVoted ? "default" : "outline"}
                  data-testid="button-vote"
                >
                  <ThumbsUp className={`w-5 h-5 mr-2 ${voteData?.hasVoted ? "fill-current" : ""}`} />
                  {voteData?.hasVoted ? "Voted" : "Vote"}
                </Button>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4" />
                  <span data-testid="text-vote-count">{bot.votes} votes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Added {new Date(bot.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {bot.description && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-3">About</h3>
                <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-description">
                  {bot.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4">Bot Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Application ID</span>
                <code className="px-3 py-1 bg-muted rounded text-sm" data-testid="text-application-id">
                  {bot.applicationId}
                </code>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-green-600 text-white">Verified</Badge>
              </div>
              {bot.verifiedAt && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">Verified Date</span>
                  <span className="text-sm">
                    {new Date(bot.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {bot.inviteUrl && (
            <>
              <Separator />
              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={() => window.open(bot.inviteUrl!, "_blank")}
                  data-testid="button-invite-bot"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Add to Discord
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
