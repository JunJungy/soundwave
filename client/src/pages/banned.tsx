import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Ban, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/generated_images/Purple_circular_waveform_logo_0c42b1be.png";

export default function Banned() {
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

              <div className="bg-accent/20 rounded-lg p-4 mt-4 border border-accent/30">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Need help?
                </p>
                <p className="text-sm text-muted-foreground">
                  If you believe this is a mistake, please contact our support team 
                  to appeal this decision.
                </p>
              </div>
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
