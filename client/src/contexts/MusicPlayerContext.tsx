import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface Track {
  id: string;
  title: string;
  artist: string;
  albumCover?: string;
  duration: number;
  audioUrl?: string;
}

interface MusicPlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  queue: Track[];
  shuffle: boolean;
  repeat: boolean;
  currentTime: number;
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
  const [volume, setVolumeState] = useState(80);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackedSongRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume / 100;

      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current && audioRef.current.src) {
          setCurrentTime(Math.floor(audioRef.current.currentTime));
        }
      });

      audioRef.current.addEventListener("ended", () => {
        handleNextTrack();
      });

      audioRef.current.addEventListener("loadedmetadata", () => {
        if (audioRef.current && isPlaying) {
          audioRef.current.play().catch(console.error);
        }
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    stopSimulatedPlayback();

    if (currentTrack.audioUrl) {
      audioRef.current.src = currentTrack.audioUrl;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    } else {
      audioRef.current.src = "";
      if (isPlaying) {
        startSimulatedPlayback();
      }
    }

    if (currentTrack.id && currentTrack.id !== trackedSongRef.current && isPlaying) {
      trackedSongRef.current = currentTrack.id;
      apiRequest("POST", `/api/songs/${currentTrack.id}/play`).catch((error) => {
        console.error("Failed to track stream:", error);
      });
    }
  }, [currentTrack?.id, isPlaying]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;

    if (isPlaying) {
      if (currentTrack.audioUrl) {
        stopSimulatedPlayback();
        audioRef.current.play().catch(console.error);
      } else {
        startSimulatedPlayback();
      }
    } else {
      stopSimulatedPlayback();
      if (currentTrack.audioUrl) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const startSimulatedPlayback = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (currentTrack && prev >= currentTrack.duration) {
          handleNextTrack();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopSimulatedPlayback = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

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
        stopSimulatedPlayback();
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
    stopSimulatedPlayback();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  };

  const toggleShuffle = () => {
    setShuffle((prev) => !prev);
  };

  const toggleRepeat = () => {
    setRepeat((prev) => !prev);
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current && currentTrack?.audioUrl && audioRef.current.src) {
      audioRef.current.currentTime = time;
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
