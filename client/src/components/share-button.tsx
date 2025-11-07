import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  url: string;
  title: string;
  variant?: "default" | "ghost" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ShareButton({ url, title, variant = "ghost", size = "icon", className }: ShareButtonProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    const fullUrl = `${window.location.origin}${url}`;
    
    try {
      // Try native share API first (mobile)
      if (navigator.share) {
        await navigator.share({
          title,
          url: fullUrl,
        });
        toast({
          title: "Shared successfully",
          description: `Shared "${title}"`,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(fullUrl);
        toast({
          title: "Link copied!",
          description: `Link to "${title}" copied to clipboard`,
        });
      }
    } catch (error: any) {
      // User cancelled share or clipboard failed
      if (error.name !== 'AbortError') {
        toast({
          variant: "destructive",
          title: "Failed to share",
          description: "Could not copy link to clipboard",
        });
      }
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className}
      data-testid="button-share"
    >
      <Share2 className="w-4 h-4" />
      {size !== "icon" && <span className="ml-2">Share</span>}
    </Button>
  );
}
