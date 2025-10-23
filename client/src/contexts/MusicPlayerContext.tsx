import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import { YouTubePlayer } from "@/components/youtube-player";

interface Track {
  id: string;
  title: string;
  artist: string;
  albumCover?: string;
  duration: number;
  audioUrl?: string;
  youtubeId?: string | null;
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
  const [playerReady, setPlayerReady] = useState(false);

  const trackedSongRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentTrack?.id && currentTrack.id !== trackedSongRef.current && isPlaying) {
      trackedSongRef.current = currentTrack.id;
      apiRequest("POST", `/api/songs/${currentTrack.id}/play`).catch((error) => {
        console.error("Failed to track stream:", error);
      });
    }
  }, [currentTrack?.id, isPlaying]);

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

  const handleYouTubeStateChange = (state: number) => {
    // YouTube player states:
    // -1 (unstarted)
    // 0 (ended)
    // 1 (playing)
    // 2 (paused)
    // 3 (buffering)
    // 5 (video cued)
    
    if (state === 0) {
      // Video ended
      handleNextTrack();
    } else if (state === 1) {
      // Playing
      setIsPlaying(true);
    } else if (state === 2) {
      // Paused
      setIsPlaying(false);
    }
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
    setPlayerReady(false);
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
    setPlayerReady(false);
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
    setCurrentTime(time);
    if ((window as any).youtubePlayer) {
      (window as any).youtubePlayer.seekTo(time);
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
      {currentTrack?.youtubeId && (
        <YouTubePlayer
          videoId={currentTrack.youtubeId}
          isPlaying={isPlaying}
          volume={volume}
          onReady={() => setPlayerReady(true)}
          onStateChange={handleYouTubeStateChange}
          onTimeUpdate={setCurrentTime}
        />
      )}
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
