import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertSongSchema } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Upload, Music, Image as ImageIcon, CalendarIcon, CheckCircle2, Loader2 } from "lucide-react";
import type { UploadResult } from "@uppy/core";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe - Reference: blueprint:javascript_stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Genre options including K-pop
const GENRES = [
  "K-pop",
  "Pop",
  "Rock",
  "Hip Hop",
  "R&B",
  "Electronic",
  "Jazz",
  "Country",
  "Classical",
  "Indie",
  "Alternative",
  "Latin",
  "Reggae",
  "Blues",
  "Metal",
  "Folk",
  "Other"
];

// Song upload form schema
const uploadSongSchema = insertSongSchema.extend({
  title: z.string().min(1, "Song name is required"),
  duration: z.number().min(1, "Duration is required"),
  audioUrl: z.string().min(1, "Audio file is required"),
  artworkUrl: z.string().min(1, "Album artwork is required"),
  genre: z.string().min(1, "Genre is required"),
  releaseDate: z.date(),
  globalPromotion: z.boolean().default(false),
  otherPlatforms: z.boolean().default(false),
  termsAgreed: z.boolean().refine(val => val === true, "You must agree to the terms"),
});

type UploadSongForm = z.infer<typeof uploadSongSchema>;

// Validation stages
type ValidationStage = "idle" | "checking_artwork" | "checking_audio" | "payment" | "complete";

interface UploadSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
}

// Payment form component
function PaymentForm({ 
  clientSecret, 
  onSuccess, 
  onCancel 
}: { 
  clientSecret: string; 
  onSuccess: (paymentIntentId: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
      redirect: "if_required",
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
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
          disabled={!stripe || isProcessing}
          className="flex-1"
          data-testid="button-submit-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Payment"
          )}
        </Button>
      </div>
    </form>
  );
}

export function UploadSongDialog({ open, onOpenChange, artistId }: UploadSongDialogProps) {
  const { toast } = useToast();
  const [audioUrl, setAudioUrl] = useState("");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [validationStage, setValidationStage] = useState<ValidationStage>("idle");
  const [artworkProgress, setArtworkProgress] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const form = useForm<UploadSongForm>({
    resolver: zodResolver(uploadSongSchema),
    defaultValues: {
      title: "",
      artistId,
      albumId: null,
      duration: 180,
      audioUrl: "",
      artworkUrl: "",
      genre: "",
      releaseDate: new Date(),
      globalPromotion: false,
      otherPlatforms: false,
      termsAgreed: false,
      paymentIntentId: null,
    },
  });

  const globalPromotion = form.watch("globalPromotion");
  const otherPlatforms = form.watch("otherPlatforms");
  const needsPayment = globalPromotion || otherPlatforms;

  // Validate artwork (square dimensions, no logos)
  const validateArtwork = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const isSquare = img.width === img.height;
        if (!isSquare) {
          toast({
            title: "Invalid Artwork",
            description: "Album artwork must be square (same width and height)",
            variant: "destructive",
          });
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        toast({
          title: "Invalid Artwork",
          description: "Failed to load artwork image",
          variant: "destructive",
        });
        resolve(false);
      };
      img.src = url;
    });
  };

  // Validate audio file format
  const validateAudio = (url: string): boolean => {
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
    const isValid = validExtensions.some(ext => url.toLowerCase().endsWith(ext));
    
    if (!isValid) {
      toast({
        title: "Invalid Audio File",
        description: "Audio must be MP3, WAV, OGG, or M4A format",
        variant: "destructive",
      });
    }
    
    return isValid;
  };

  // Create payment intent if needed
  const createPaymentIntent = async () => {
    if (!needsPayment) return null;

    const res = await apiRequest("POST", "/api/create-payment-intent", {
      globalPromotion,
      otherPlatforms,
    });
    const data = await res.json();
    return data;
  };

  const uploadSongMutation = useMutation({
    mutationFn: async (data: Omit<UploadSongForm, "termsAgreed">) => {
      const res = await apiRequest("POST", "/api/songs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      toast({
        title: "Song uploaded successfully",
        description: "Your song will be published on the scheduled release date.",
      });
      onOpenChange(false);
      form.reset();
      setAudioUrl("");
      setArtworkUrl("");
      setValidationStage("idle");
      setArtworkProgress(0);
      setAudioProgress(0);
      setClientSecret(null);
      setPaymentIntentId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: UploadSongForm) => {
    // Step 1: Validate artwork
    setValidationStage("checking_artwork");
    setArtworkProgress(0);
    
    const artworkValid = await validateArtwork(data.artworkUrl);
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 20) {
      setArtworkProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!artworkValid) {
      setValidationStage("idle");
      return;
    }

    // Step 2: Validate audio
    setValidationStage("checking_audio");
    setAudioProgress(0);
    
    const audioValid = validateAudio(data.audioUrl);
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 20) {
      setAudioProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!audioValid) {
      setValidationStage("idle");
      return;
    }

    // Step 3: Handle payment if needed
    if (needsPayment && !paymentIntentId) {
      setValidationStage("payment");
      const paymentData = await createPaymentIntent();
      setClientSecret(paymentData.clientSecret);
      return;
    }

    // Step 4: Upload song
    setValidationStage("complete");
    const { termsAgreed: _, ...songData } = data;
    uploadSongMutation.mutate({
      ...songData,
      paymentIntentId,
    });
  };

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId);
    form.setValue("paymentIntentId", intentId);
    setValidationStage("complete");
    
    // Submit the form with payment intent
    const formData = form.getValues();
    const { termsAgreed: _, ...songData } = formData;
    uploadSongMutation.mutate({
      ...songData,
      paymentIntentId: intentId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload a Song</DialogTitle>
          <DialogDescription>
            Upload your song with all required information and monetization options
          </DialogDescription>
        </DialogHeader>

        {validationStage === "payment" && clientSecret ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Complete payment to enable your selected features:
              {globalPromotion && <div>• Global Promotion (+$4)</div>}
              {otherPlatforms && <div>• Other Platforms Upload (+$5)</div>}
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm 
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onCancel={() => {
                  setValidationStage("idle");
                  setClientSecret(null);
                }}
              />
            </Elements>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Song Name */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Song Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Enter song name"
                        data-testid="input-song-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Audio File Upload */}
              <FormField
                control={form.control}
                name="audioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audio File</FormLabel>
                    <FormDescription>
                      Upload your audio file (MP3, WAV, OGG, or M4A, max 20MB)
                    </FormDescription>
                    <FormControl>
                      <div>
                        <ObjectUploader
                          allowedFileTypes={["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", ".mp3", ".wav", ".ogg", ".m4a"]}
                          maxFileSize={20 * 1024 * 1024}
                          onGetUploadParameters={async () => {
                            const res = await apiRequest("POST", "/api/objects/upload");
                            const { uploadURL } = await res.json();
                            return { method: "PUT" as const, url: uploadURL };
                          }}
                          onComplete={async (result) => {
                            if (result.successful && result.successful.length > 0) {
                              const uploadURL = result.successful[0].uploadURL;
                              const aclRes = await apiRequest("PUT", "/api/objects/acl", { objectURL: uploadURL });
                              const { objectPath } = await aclRes.json();
                              field.onChange(objectPath);
                              setAudioUrl(objectPath);
                            }
                          }}
                          buttonVariant="outline"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {audioUrl ? "Change Audio" : "Upload Audio"}
                        </ObjectUploader>
                      </div>
                    </FormControl>
                    {audioUrl && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Music className="w-4 h-4" />
                        Audio file uploaded
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Album Artwork Upload */}
              <FormField
                control={form.control}
                name="artworkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Album Artwork</FormLabel>
                    <FormDescription>
                      Square image only. No Spotify, UTC logos or AI-generated images (max 5MB)
                    </FormDescription>
                    <FormControl>
                      <div>
                        <ObjectUploader
                          allowedFileTypes={["image/*"]}
                          maxFileSize={5 * 1024 * 1024}
                          onGetUploadParameters={async () => {
                            const res = await apiRequest("POST", "/api/objects/upload");
                            const { uploadURL } = await res.json();
                            return { method: "PUT" as const, url: uploadURL };
                          }}
                          onComplete={async (result) => {
                            if (result.successful && result.successful.length > 0) {
                              const uploadURL = result.successful[0].uploadURL;
                              const aclRes = await apiRequest("PUT", "/api/objects/acl", { objectURL: uploadURL });
                              const { objectPath } = await aclRes.json();
                              field.onChange(objectPath);
                              setArtworkUrl(objectPath);
                            }
                          }}
                          buttonVariant="outline"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          {artworkUrl ? "Change Artwork" : "Upload Artwork"}
                        </ObjectUploader>
                      </div>
                    </FormControl>
                    {artworkUrl && (
                      <div className="flex items-center gap-2">
                        <img src={artworkUrl} alt="Artwork preview" className="w-20 h-20 rounded object-cover" />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ImageIcon className="w-4 h-4" />
                          Artwork uploaded
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Release Date */}
              <FormField
                control={form.control}
                name="releaseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Release Date</FormLabel>
                    <FormDescription>
                      Select when you want your song to be published
                    </FormDescription>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-select-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Genre Selection */}
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-genre">
                          <SelectValue placeholder="Select a genre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENRES.map((genre) => (
                          <SelectItem key={genre} value={genre}>
                            {genre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Monetization Options */}
              <div className="space-y-4 p-4 border rounded-md">
                <h3 className="font-semibold">Monetization Options</h3>
                
                <FormField
                  control={form.control}
                  name="globalPromotion"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-global-promotion"
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="font-normal">
                          Promote globally (+$4)
                        </FormLabel>
                        <FormDescription>
                          Get your song promoted on global platforms
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="otherPlatforms"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-other-platforms"
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="font-normal">
                          Upload to other platforms (+$5)
                        </FormLabel>
                        <FormDescription>
                          Distribute your song to Spotify, Apple Music, etc.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Terms of Service */}
              <FormField
                control={form.control}
                name="termsAgreed"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-terms"
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="font-normal">
                        I agree that all rights are reserved and Soundwave can earn money from my uploaded song
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Validation Progress */}
              {validationStage !== "idle" && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                  <h3 className="font-semibold">Upload Processing</h3>
                  
                  {/* Artwork Validation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Validating artwork specifications...</span>
                      {validationStage === "checking_artwork" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : artworkProgress === 100 ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : null}
                    </div>
                    <Progress 
                      value={artworkProgress} 
                      className={artworkProgress === 100 ? "bg-primary/20" : ""}
                    />
                  </div>

                  {/* Audio Validation */}
                  {(validationStage === "checking_audio" || validationStage === "complete" || validationStage === "payment") && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Checking audio file format...</span>
                        {validationStage === "checking_audio" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : audioProgress === 100 ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : null}
                      </div>
                      <Progress 
                        value={audioProgress}
                        className={audioProgress === 100 ? "bg-primary/20" : ""}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
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
                  disabled={uploadSongMutation.isPending || validationStage !== "idle"}
                  className="flex-1"
                  data-testid="button-submit-song"
                >
                  {uploadSongMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
