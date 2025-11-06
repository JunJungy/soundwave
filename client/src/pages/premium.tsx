import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Check, Volume2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

export default function Premium() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const purchaseMutation = useMutation({
    mutationFn: async (featureId: string) => {
      const response = await fetch("/api/premium/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featureId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create checkout session");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Redirect to Stripe checkout
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

  const features = [
    {
      id: "remove_watermark",
      title: "Remove Watermark",
      price: 5,
      icon: EyeOff,
      description: "Remove the Soundwave logo watermark from your uploaded album artwork",
      benefits: [
        "Clean album artwork without watermarks",
        "Professional presentation",
        "No logo on your song covers",
        "Lifetime access",
      ],
    },
    {
      id: "remove_ads",
      title: "Ad-Free Music",
      price: 10,
      icon: Volume2,
      description: "Enjoy uninterrupted music without any advertisements",
      benefits: [
        "No ads between songs",
        "Uninterrupted listening experience",
        "Like Spotify Premium",
        "Lifetime access",
      ],
    },
  ];

  const handlePurchase = (featureId: string) => {
    setSelectedFeature(featureId);
    purchaseMutation.mutate(featureId);
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="px-6 py-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-10 w-10 text-primary" />
            <h1 className="font-display text-4xl font-bold" data-testid="heading-premium">
              Premium Features
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Unlock exclusive features and enhance your Soundwave experience
          </p>
        </div>

        {/* Premium Status */}
        {user && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Your Premium Status</CardTitle>
              <CardDescription>
                {user.premiumNoWatermark === 1 || user.premiumNoAds === 1
                  ? "You have active premium features"
                  : "No premium features yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.premiumNoWatermark === 1 && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    Watermark Removed
                  </Badge>
                )}
                {user.premiumNoAds === 1 && (
                  <Badge variant="default" className="flex items-center gap-1 bg-amber-600">
                    <Volume2 className="h-3 w-3" />
                    Ad-Free
                  </Badge>
                )}
                {user.premiumNoWatermark !== 1 && user.premiumNoAds !== 1 && (
                  <span className="text-sm text-muted-foreground">
                    No active premium features. Purchase below to get started!
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const hasFeature =
              (feature.id === "remove_watermark" && user?.premiumNoWatermark === 1) ||
              (feature.id === "remove_ads" && user?.premiumNoAds === 1);

            return (
              <Card
                key={feature.id}
                className={hasFeature ? "border-primary bg-primary/5" : ""}
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle data-testid={`text-feature-${feature.id}`}>
                          {feature.title}
                        </CardTitle>
                        {hasFeature && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-2xl font-bold text-foreground mt-1">
                        ${feature.price}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    disabled={
                      hasFeature ||
                      (purchaseMutation.isPending && selectedFeature === feature.id)
                    }
                    onClick={() => handlePurchase(feature.id)}
                    data-testid={`button-purchase-${feature.id}`}
                  >
                    {hasFeature
                      ? "Already Purchased"
                      : purchaseMutation.isPending && selectedFeature === feature.id
                      ? "Processing..."
                      : `Purchase for $${feature.price}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Info Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">How do premium features work?</h3>
              <p className="text-sm text-muted-foreground">
                Once you purchase a premium feature, it's instantly activated on your
                account and remains active for life. No subscriptions or renewals needed!
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Is payment secure?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! All payments are processed securely through Stripe, a trusted payment
                processor used by millions of businesses worldwide.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Can I get a refund?</h3>
              <p className="text-sm text-muted-foreground">
                Premium features are activated instantly and cannot be refunded. Please
                make sure you want the feature before purchasing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
