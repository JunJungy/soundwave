import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  albumCover?: string;
  duration: number;
  audioUrl?: string | null;
  lyrics?: {
    lines: Array<{
      startTime: number;
      endTime: number;
      text: string;
    }>;
  } | null;
  language?: string | null;
}

interface MusicPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  isPlayingAd: boolean;
  queue: Track[];
  shuffle: boolean;
  repeat: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: Track) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackedSongRef = useRef<string | null>(null);
  const nextTrackPendingRef = useRef<Track | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume / 100;
      
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      });
      
      audioRef.current.addEventListener("loadedmetadata", () => {
        if (audioRef.current && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      });
      
      audioRef.current.addEventListener("durationchange", () => {
        if (audioRef.current && !isNaN(audioRef.current.duration)) {
          setDuration(audioRef.current.duration);
        }
      });
      
      audioRef.current.addEventListener("ended", () => {
        handleNextTrack();
      });
      
      audioRef.current.addEventListener("error", (e) => {
        console.error("Audio playback error:", e);
      });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Skip tracking for ad "songs"
    if (currentTrack?.id && currentTrack.id !== trackedSongRef.current && isPlaying && currentTrack.id !== "ad") {
      trackedSongRef.current = currentTrack.id;
      apiRequest("POST", `/api/songs/${currentTrack.id}/play`).catch((error) => {
        console.error("Failed to track stream:", error);
      });
    }
  }, [currentTrack?.id, isPlaying]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack?.audioUrl) return;
    
    audioRef.current.src = currentTrack.audioUrl;
    audioRef.current.load();
    setDuration(0);
    
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Playback error:", error);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Playback error:", error);
          setIsPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const playAd = (nextTrack: Track) => {
    setIsPlayingAd(true);
    nextTrackPendingRef.current = nextTrack;
    
    // Create a simple ad "track" (15 seconds of audio ad)
    const adTrack: Track = {
      id: "ad",
      title: "Advertisement",
      artist: "Soundwave",
      duration: 15,
      audioUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=", // Silent WAV
    };
    
    setCurrentTrack(adTrack);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleNextTrack = () => {
    if (queue.length === 0) return;
    
    // If we just finished an ad, play the pending track
    if (isPlayingAd && nextTrackPendingRef.current) {
      setIsPlayingAd(false);
      setCurrentTrack(nextTrackPendingRef.current);
      nextTrackPendingRef.current = null;
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }
    
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);
    let nextTrack: Track | null = null;

    if (currentIndex === -1 || currentIndex === queue.length - 1) {
      if (repeat) {
        nextTrack = queue[0];
      } else {
        setIsPlaying(false);
        return;
      }
    } else {
      nextTrack = queue[currentIndex + 1];
    }

    // Check if user has ad-free premium
    const hasAdFree = user?.premiumNoAds === 1;
    
    // Play ad for non-premium users (every 3 songs)
    if (!hasAdFree && !isPlayingAd && currentTrack?.id !== "ad") {
      // Simple logic: play ad occasionally
      const shouldPlayAd = Math.random() < 0.33; // 33% chance
      if (shouldPlayAd) {
        playAd(nextTrack);
        return;
      }
    }

    // Play the next track normally
    setCurrentTrack(nextTrack);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
    if (!queue.find((t) => t.id === track.id)) {
      setQueue((prev) => [...prev, track]);
    }
  };

  const playQueue = (tracks: Track[], startIndex = 0) => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    setCurrentTrack(tracks[startIndex]);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const nextTrack = () => {
    handleNextTrack();
  };

  const previousTrack = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);

    if (currentIndex <= 0) {
      setCurrentTrack(queue[0]);
      setCurrentTime(0);
    } else {
      setCurrentTrack(queue[currentIndex - 1]);
      setCurrentTime(0);
    }
    setIsPlaying(true);
  };

  const addToQueue = (track: Track) => {
    setQueue((prev) => [...prev, track]);
  };

  const removeFromQueue = (trackId: string) => {
    setQueue((prev) => prev.filter((t) => t.id !== trackId));
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentTrack(null);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const toggleShuffle = () => {
    setShuffle((prev) => !prev);
  };

  const toggleRepeat = () => {
    setRepeat((prev) => !prev);
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
  };

  return (
    <MusicPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isPlayingAd,
        queue,
        shuffle,
        repeat,
        currentTime,
        duration,
        volume,
        playTrack,
        playQueue,
        togglePlayPause,
        nextTrack,
        previousTrack,
        addToQueue,
        removeFromQueue,
        clearQueue,
        toggleShuffle,
        toggleRepeat,
        seekTo,
        setVolume,
      }}
    >
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error("useMusicPlayer must be used within MusicPlayerProvider");
  }
  return context;
}
