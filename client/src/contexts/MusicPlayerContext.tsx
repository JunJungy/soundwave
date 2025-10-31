import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

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
}

interface MusicPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
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
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackedSongRef = useRef<string | null>(null);

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
    if (currentTrack?.id && currentTrack.id !== trackedSongRef.current && isPlaying) {
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

  const handleNextTrack = () => {
    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((t) => t.id === currentTrack?.id);

    if (currentIndex === -1 || currentIndex === queue.length - 1) {
      if (repeat) {
        setCurrentTrack(queue[0]);
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    } else {
      setCurrentTrack(queue[currentIndex + 1]);
      setCurrentTime(0);
      setIsPlaying(true);
    }
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
