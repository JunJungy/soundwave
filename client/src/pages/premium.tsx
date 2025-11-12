import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Check, Volume2, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Use testing key as fallback for development
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.TESTING_VITE_STRIPE_PUBLIC_KEY;
if (!stripePublicKey) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY or TESTING_VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(stripePublicKey);

// Payment form component for premium features
function PremiumPaymentForm({ 
  clientSecret, 
  featureName,
  onSuccess, 
  onCancel 
}: { 
  clientSecret: string; 
  featureName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Payment Error",
        description: "Payment system is still loading. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    // Double-check that the payment element is mounted
    if (!isElementReady) {
      toast({
        title: "Please Wait",
        description: "Payment form is still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/premium`,
        },
        redirect: "if_required",
      });

      if (error) {
        setIsProcessing(false);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Call activation endpoint to verify and activate the feature
        try {
          const response = await fetch("/api/premium/activate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to activate feature");
          }

          toast({
            title: "Payment Successful!",
            description: `${featureName} has been activated on your account.`,
          });
          onSuccess();
        } catch (error: any) {
          toast({
            title: "Activation Error",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      } else {
        setIsProcessing(false);
      }
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Payment Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="min-h-[200px]">
        <PaymentElement 
          onReady={() => setIsElementReady(true)}
          onLoadError={(error) => {
            console.error('PaymentElement load error:', error);
            toast({
              title: "Payment Form Error",
              description: "Failed to load payment form. Please refresh and try again.",
              variant: "destructive",
            });
          }}
        />
        {!isElementReady && (
          <div className="flex items-center justify-center py-8" data-testid="payment-loading">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading payment form...</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-cancel-payment"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || !isElementReady || isProcessing}
          className="flex-1"
          data-testid="button-submit-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : !isElementReady ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Complete Payment"
          )}
        </Button>
      </div>
    </form>
  );
}

export default function Premium() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(false);

  // Handle Stripe redirect after 3D Secure or other payment authentication
  useEffect(() => {
    const handlePaymentRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentIntentClientSecret = urlParams.get('payment_intent_client_secret');
      const redirectStatus = urlParams.get('redirect_status');

      if (paymentIntentClientSecret && redirectStatus) {
        setIsProcessingRedirect(true);

        try {
          const stripe = await stripePromise;
          if (!stripe) {
            throw new Error("Stripe failed to load");
          }

          // Retrieve the payment intent to check status
          const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

          if (paymentIntent && paymentIntent.status === 'succeeded') {
            // Activate the premium feature
            const response = await fetch("/api/premium/activate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.message || "Failed to activate feature");
            }

            toast({
              title: "Payment Successful!",
              description: "Your premium feature has been activated.",
            });

            await refetchUser();
            queryClient.invalidateQueries({ queryKey: ["/api/me"] });
            
            // Clean up URL
            setLocation('/premium');
          } else if (paymentIntent && paymentIntent.status === 'processing') {
            toast({
              title: "Payment Processing",
              description: "Your payment is being processed. Please check back shortly.",
            });
            setLocation('/premium');
          } else {
            toast({
              title: "Payment Failed",
              description: "Your payment was not successful. Please try again.",
              variant: "destructive",
            });
            setLocation('/premium');
          }
        } catch (error: any) {
          toast({
            title: "Activation Error",
            description: error.message,
            variant: "destructive",
          });
          setLocation('/premium');
        } finally {
          setIsProcessingRedirect(false);
        }
      }
    };

    handlePaymentRedirect();
  }, [toast, refetchUser, setLocation]);

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

  const handlePurchase = async (featureId: string) => {
    setSelectedFeature(featureId);
    setIsCreatingPayment(true);

    try {
      const response = await fetch("/api/premium/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ featureId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment");
      }

      const data = await response.json();
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setSelectedFeature(null);
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setClientSecret(null);
    setSelectedFeature(null);
    await refetchUser();
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
  };

  const handleCancelPayment = () => {
    setClientSecret(null);
    setSelectedFeature(null);
  };

  // Show loading state when processing redirect
  if (isProcessingRedirect) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-semibold mb-2">Processing Payment...</h2>
          <p className="text-muted-foreground">Please wait while we activate your premium feature.</p>
        </div>
      </div>
    );
  }

  // If payment is in progress, show the payment form
  if (clientSecret && selectedFeature) {
    const feature = features.find(f => f.id === selectedFeature);
    if (!feature) return null;

    return (
      <div className="min-h-screen pb-24">
        <div className="px-6 py-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <feature.icon className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Complete Purchase</CardTitle>
                  <CardDescription>
                    {feature.title} - ${feature.price}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PremiumPaymentForm 
                  clientSecret={clientSecret}
                  featureName={feature.title}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handleCancelPayment}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                      (isCreatingPayment && selectedFeature === feature.id)
                    }
                    onClick={() => handlePurchase(feature.id)}
                    data-testid={`button-purchase-${feature.id}`}
                  >
                    {hasFeature
                      ? "Already Purchased"
                      : isCreatingPayment && selectedFeature === feature.id
                      ? "Preparing Payment..."
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
