import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ban, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import logoUrl from "@assets/generated_images/Purple_circular_waveform_logo_0c42b1be.png";

export default function Banned() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/ban-appeals", formData);
      
      toast({
        title: "Appeal Submitted",
        description: "Your ban appeal has been submitted. We'll review it and contact you at the provided email.",
      });
      
      setSubmitted(true);
      setFormData({ username: "", email: "", reason: "" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to submit appeal. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-destructive/5 p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-4">
            <img src={logoUrl} alt="Soundwave Logo" className="w-20 h-20" />
            <h1 className="text-5xl font-bold tracking-tight text-foreground font-display">
              Soundwave
            </h1>
          </div>
        </div>

        <Card className="border-destructive" data-testid="card-banned">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10">
                <Ban className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-2xl" data-testid="text-banned-title">
                  Access Denied
                </CardTitle>
                <CardDescription data-testid="text-banned-subtitle">
                  Your account has been suspended
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground" data-testid="text-banned-message">
                Your account or IP address has been banned from accessing Soundwave. 
                This action was taken due to a violation of our terms of service.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <p className="text-sm font-medium mb-2">What this means:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>You cannot access your account</li>
                  <li>Your content is no longer visible</li>
                  <li>This ban may be permanent</li>
                </ul>
              </div>

              {!submitted ? (
                <div className="bg-accent/20 rounded-lg p-4 mt-4 border border-accent/30">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Submit a Ban Appeal
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you believe this is a mistake, you can submit an appeal below. 
                    We'll review it and contact you at {" "}
                    <span className="font-medium text-foreground">void@voidmain.xyz</span>.
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <Label htmlFor="username" className="text-sm">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Your banned username"
                        required
                        data-testid="input-appeal-username"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-sm">Contact Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                        required
                        data-testid="input-appeal-email"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="reason" className="text-sm">Why should we unban you?</Label>
                      <Textarea
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Explain why you think this ban is a mistake..."
                        required
                        rows={4}
                        data-testid="textarea-appeal-reason"
                        className="mt-1"
                      />
                    </div>
                    
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                      data-testid="button-submit-appeal"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Submitting..." : "Submit Appeal"}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="bg-green-500/10 rounded-lg p-4 mt-4 border border-green-500/30">
                  <p className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">
                    ✓ Appeal Submitted Successfully
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We've received your appeal and will review it shortly. You'll hear back 
                    from us at the email you provided.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/'}
                data-testid="button-return-home"
              >
                Return to Login
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          © 2025 Soundwave. All rights reserved.
        </p>
      </div>
    </div>
  );
}
