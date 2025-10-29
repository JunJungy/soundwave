import { useEffect, useRef } from "react";

interface YouTubePlayerProps {
  videoId: string | null;
  isPlaying: boolean;
  volume: number;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onTimeUpdate?: (time: number) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({
  videoId,
  isPlaying,
  volume,
  onReady,
  onStateChange,
  onTimeUpdate,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize player when video ID changes
  useEffect(() => {
    if (!videoId || !containerRef.current) {
      return;
    }

    // Don't recreate player if same video
    if (currentVideoIdRef.current === videoId && playerRef.current) {
      return;
    }

    currentVideoIdRef.current = videoId;

    const initializePlayer = () => {
      // Clean up existing player
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error("Error destroying player:", e);
        }
      }

      // Clear the container
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // Create a div for the player
      const playerDiv = document.createElement("div");
      playerDiv.id = `youtube-player-${Date.now()}`;
      containerRef.current?.appendChild(playerDiv);

      try {
        playerRef.current = new window.YT.Player(playerDiv, {
          videoId,
          height: "1",
          width: "1",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event: any) => {
              console.log(`YouTube player ready for: ${videoId}`);
              event.target.setVolume(volume);
              onReady?.();
              
              // Start playing if needed
              if (isPlaying) {
                event.target.playVideo();
              }
            },
            onStateChange: (event: any) => {
              console.log(`YouTube player state changed: ${event.data}`);
              onStateChange?.(event.data);
              
              // Start time updates when playing
              if (event.data === window.YT.PlayerState.PLAYING) {
                startTimeUpdates();
              } else {
                stopTimeUpdates();
              }
            },
            onError: (event: any) => {
              console.error(`YouTube player error: ${event.data}`);
            },
          },
        });
      } catch (error) {
        console.error("Error creating YouTube player:", error);
      }
    };

    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    return () => {
      stopTimeUpdates();
    };
  }, [videoId]);

  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.playVideo) return;

    const player = playerRef.current;
    
    // Wait a bit to ensure player is ready
    setTimeout(() => {
      try {
        if (isPlaying) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      } catch (error) {
        console.error("Error controlling playback:", error);
      }
    }, 100);
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (!playerRef.current || !playerRef.current.setVolume) return;
    
    try {
      playerRef.current.setVolume(volume);
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  }, [volume]);

  const startTimeUpdates = () => {
    stopTimeUpdates();
    
    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          onTimeUpdate?.(currentTime);
        } catch (error) {
          console.error("Error getting current time:", error);
        }
      }
    }, 1000);
  };

  const stopTimeUpdates = () => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  };

  // Expose player methods
  useEffect(() => {
    (window as any).youtubePlayer = {
      seekTo: (seconds: number) => {
        if (playerRef.current && playerRef.current.seekTo) {
          try {
            playerRef.current.seekTo(seconds, true);
          } catch (error) {
            console.error("Error seeking:", error);
          }
        }
      },
      getDuration: () => {
        if (playerRef.current && playerRef.current.getDuration) {
          try {
            return playerRef.current.getDuration();
          } catch (error) {
            console.error("Error getting duration:", error);
            return 0;
          }
        }
        return 0;
      },
      getCurrentTime: () => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          try {
            return playerRef.current.getCurrentTime();
          } catch (error) {
            console.error("Error getting current time:", error);
            return 0;
          }
        }
        return 0;
      },
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed -left-[9999px] top-0 w-0 h-0 pointer-events-none" 
      style={{ visibility: "hidden" }}
    />
  );
}
