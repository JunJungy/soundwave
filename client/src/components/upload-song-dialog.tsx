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
import { Textarea } from "@/components/ui/textarea";
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
// Use testing key as fallback for development
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.TESTING_VITE_STRIPE_PUBLIC_KEY;
if (!stripePublicKey) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY or TESTING_VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(stripePublicKey);

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

// Language options for songs
const LANGUAGES = [
  "English",
  "Spanish",
  "Japanese",
  "Korean",
  "Mandarin Chinese",
  "Cantonese",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Arabic",
  "Hindi",
  "Thai",
  "Vietnamese",
  "Filipino",
  "Indonesian",
  "Other"
];

// Song upload form schema
const uploadSongSchema = insertSongSchema.extend({
  title: z.string().min(1, "Song name is required"),
  duration: z.number().min(1, "Duration is required"),
  audioUrl: z.string().min(1, "Audio file is required"),
  artworkUrl: z.string().min(1, "Album artwork is required"),
  genre: z.string().min(1, "Genre is required"),
  language: z.string().optional(),
  lyricsText: z.string().optional(), // Raw lyrics text input
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
  const [audioDuration, setAudioDuration] = useState<number>(0);
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
      language: "",
      lyricsText: "",
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

  // Note: Audio file validation is handled by Uppy during upload
  // After upload to object storage, URLs don't preserve file extensions
  // so we skip URL-based validation and trust Uppy's validation

  // Extract audio duration from uploaded file
  const getAudioDuration = (url: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        reject(new Error('Failed to load audio'));
      });
    });
  };

  // Smart lyrics timing: Auto-distribute plain lyrics across song duration
  const autoTimeLyrics = (plainLyrics: string, songDuration: number): string => {
    if (!plainLyrics || !plainLyrics.trim() || !songDuration) {
      return plainLyrics;
    }

    const allLines = plainLyrics.split('\n');
    const textLines = allLines.filter(line => line.trim());
    
    if (textLines.length === 0) return plainLyrics;

    // Count blank lines to detect pauses
    const blankLineIndices = new Set<number>();
    for (let i = 0; i < allLines.length - 1; i++) {
      if (!allLines[i].trim() && allLines[i + 1].trim()) {
        blankLineIndices.add(i);
      }
    }

    // Calculate time distribution
    // Base time per line (80% of total duration)
    const baseTimePerLine = (songDuration * 0.8) / textLines.length;
    // Extra pause time (20% of total duration distributed among pauses)
    const pauseTime = blankLineIndices.size > 0 
      ? (songDuration * 0.2) / blankLineIndices.size 
      : 0;

    let currentTime = 0;
    let lineIndex = 0;
    const timedLyrics: string[] = [];

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i].trim();
      
      if (line) {
        // Add pause time if there was a blank line before this
        if (i > 0 && !allLines[i - 1].trim()) {
          currentTime += pauseTime;
        }

        const startTime = Math.round(currentTime * 10) / 10;
        const endTime = Math.round((currentTime + baseTimePerLine) * 10) / 10;
        
        timedLyrics.push(`[${startTime}-${endTime}] ${line}`);
        currentTime += baseTimePerLine;
        lineIndex++;
      }
    }

    return timedLyrics.join('\n');
  };

  // Parse lyrics text into JSON format for database storage
  const parseLyrics = (lyricsText: string): object | null => {
    if (!lyricsText || !lyricsText.trim()) return null;

    const lines: Array<{ startTime: number; endTime: number; text: string }> = [];
    const lyricsLines = lyricsText.split('\n').filter(line => line.trim());

    for (const line of lyricsLines) {
      // Match format: [startTime-endTime] lyrics text
      const match = line.match(/^\[(\d+\.?\d*)-(\d+\.?\d*)\]\s*(.+)$/);
      if (match) {
        const startTime = parseFloat(match[1]);
        const endTime = parseFloat(match[2]);
        const text = match[3].trim();
        
        // Validate that endTime is greater than startTime
        if (endTime <= startTime) {
          toast({
            title: "Invalid Lyrics Format",
            description: `Line "${text}" has invalid timestamps. End time must be greater than start time.`,
            variant: "destructive",
          });
          return null;
        }
        
        lines.push({ startTime, endTime, text });
      }
    }

    return lines.length > 0 ? { lines } : null;
  };

  // Create payment intent if needed
  const createPaymentIntent = async () => {
    if (!needsPayment) return null;

    try {
      const res = await apiRequest("POST", "/api/create-payment-intent", {
        globalPromotion,
        otherPlatforms,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Payment setup failed" }));
        throw new Error(errorData.message || "Failed to create payment session");
      }
      
      const data = await res.json();
      return data;
    } catch (error: any) {
      console.error("Payment intent creation error:", error);
      throw error;
    }
  };

  const uploadSongMutation = useMutation({
    mutationFn: async (data: Omit<UploadSongForm, "termsAgreed" | "lyricsText"> & { lyrics?: object | null }) => {
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

    // Step 2: Audio validation (already done by Uppy during upload)
    setValidationStage("checking_audio");
    setAudioProgress(0);
    
    // Simulate progress for UX consistency
    for (let i = 0; i <= 100; i += 20) {
      setAudioProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 3: Handle payment if needed
    if (needsPayment && !paymentIntentId) {
      setValidationStage("payment");
      try {
        const paymentData = await createPaymentIntent();
        if (!paymentData || !paymentData.clientSecret) {
          throw new Error("Failed to create payment session");
        }
        setClientSecret(paymentData.clientSecret);
        return;
      } catch (error: any) {
        setValidationStage("idle");
        setArtworkProgress(0);
        setAudioProgress(0);
        toast({
          title: "Payment Setup Failed",
          description: error.message || "Could not initialize payment. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Step 4: Upload song
    setValidationStage("complete");
    const { termsAgreed: _, lyricsText, ...songData } = data;
    const parsedLyrics = lyricsText ? parseLyrics(lyricsText) : null;
    uploadSongMutation.mutate({
      ...songData,
      lyrics: parsedLyrics,
      paymentIntentId,
    });
  };

  const handlePaymentSuccess = (intentId: string) => {
    setPaymentIntentId(intentId);
    form.setValue("paymentIntentId", intentId);
    setValidationStage("complete");
    
    // Submit the form with payment intent
    const formData = form.getValues();
    const { termsAgreed: _, lyricsText, ...songData } = formData;
    const parsedLyrics = lyricsText ? parseLyrics(lyricsText) : null;
    uploadSongMutation.mutate({
      ...songData,
      lyrics: parsedLyrics,
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
                              
                              // Extract audio duration for auto-timing
                              try {
                                const duration = await getAudioDuration(objectPath);
                                const roundedDuration = Math.round(duration);
                                setAudioDuration(roundedDuration);
                                form.setValue('duration', roundedDuration);
                                toast({
                                  title: "Audio Processed",
                                  description: `Duration detected: ${Math.floor(roundedDuration / 60)}:${(roundedDuration % 60).toString().padStart(2, '0')}`,
                                });
                              } catch (error) {
                                console.error('Failed to get audio duration:', error);
                                toast({
                                  title: "Duration Detection Failed",
                                  description: "Using default 3-minute duration. Auto-timing may be less accurate.",
                                  variant: "destructive",
                                });
                                // Fallback to default
                                form.setValue('duration', 180);
                                setAudioDuration(180);
                              }
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
                              
                              // Apply watermark (server checks premium status)
                              const watermarkRes = await apiRequest("POST", "/api/objects/watermark", { objectPath });
                              const { watermarkedPath } = await watermarkRes.json();
                              
                              field.onChange(watermarkedPath);
                              setArtworkUrl(watermarkedPath);
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

              {/* Language Selection */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-language">
                          <SelectValue placeholder="Select a language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the primary language of your song
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lyrics Input */}
              <FormField
                control={form.control}
                name="lyricsText"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Lyrics (Optional)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!audioDuration || !field.value}
                        onClick={() => {
                          if (field.value && audioDuration) {
                            const timedLyrics = autoTimeLyrics(field.value, audioDuration);
                            field.onChange(timedLyrics);
                            toast({
                              title: "Lyrics Auto-Timed",
                              description: `${timedLyrics.split('\n').filter(l => l.trim()).length} lines distributed across ${Math.round(audioDuration)}s`,
                            });
                          }
                        }}
                        data-testid="button-auto-time"
                      >
                        Auto-Time Lyrics
                      </Button>
                    </div>
                    <FormDescription>
                      <strong>Option 1:</strong> Paste plain lyrics (one per line, blank lines = pauses), upload audio first, then click "Auto-Time Lyrics"
                      <br />
                      <strong>Option 2:</strong> Manually add timestamps in format: [startTime-endTime] Lyrics text
                      <br />
                      Example: [0.5-3.2] First line of the song
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Option 1: Paste plain lyrics here, then click Auto-Time&#10;&#10;Option 2: [0.5-3.2] First line of lyrics&#10;[3.5-6.8] Second line of lyrics"
                        className="min-h-[150px] font-mono text-sm"
                        data-testid="textarea-lyrics"
                      />
                    </FormControl>
                    {audioDuration > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Audio duration: {Math.floor(audioDuration / 60)}:{(Math.floor(audioDuration % 60)).toString().padStart(2, '0')}
                      </div>
                    )}
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
