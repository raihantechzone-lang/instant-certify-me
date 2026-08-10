import { useEffect, useRef, useState } from "react";
import { Plyr } from "plyr-react";
import "plyr-react/plyr.css";

export interface VideoPlayerProps {
  youtubeId?: string;
  videoUrl?: string;
  title?: string;
  startSeconds?: number;
  subtitlesUrl?: string;
  watermark?: string;
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
  poster?: string;
}

/**
 * Professional Video Player using Plyr.
 * Hides standard YouTube UI and provides custom controls with up to 3x speed.
 */
export function VideoPlayer({
  youtubeId,
  videoUrl,
  title,
  startSeconds = 0,
  subtitlesUrl,
  watermark,
  onProgress,
  onEnded,
  poster,
}: VideoPlayerProps) {
  const plyrRef = useRef<any>(null);
  const [uiVisible, setUiVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showUi = () => {
    setUiVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setUiVisible(false);
    }, 3000);
  };

  useEffect(() => {
    showUi();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [youtubeId, videoUrl]);

  // Handle progress reporting
  useEffect(() => {
    const player = plyrRef.current?.plyr;
    if (!player) return;

    const handleTimeUpdate = () => {
      onProgress?.(player.currentTime, player.duration);
    };

    const handleEnded = () => {
      onEnded?.();
    };

    player.on("timeupdate", handleTimeUpdate);
    player.on("ended", handleEnded);

    return () => {
      player.off("timeupdate", handleTimeUpdate);
      player.off("ended", handleEnded);
    };
  }, [onProgress, onEnded]);

  const plyrOptions: any = {
    controls: [
      "play-large",
      "play",
      "progress",
      "current-time",
      "mute",
      "volume",
      "settings",
      "fullscreen",
    ],
    settings: ["quality", "speed"],
    speed: {
      selected: 1,
      options: [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3],
    },
    youtube: {
      noCookie: true,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      controls: 0, // This hides native YT controls
    },
  };

  const videoSource: any = youtubeId
    ? {
        type: "video",
        sources: [
          {
            src: youtubeId,
            provider: "youtube",
          },
        ],
        poster: poster,
      }
    : videoUrl
    ? {
        type: "video",
        sources: [
          {
            src: videoUrl,
            type: "video/mp4",
          },
        ],
        poster: poster,
      }
    : null;

  if (!videoSource) {
    return (
      <div className="w-full aspect-video flex items-center justify-center bg-[#0F172A] rounded-2xl text-white/50 text-sm">
        No video source provided
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-video overflow-hidden rounded-2xl bg-[#0F172A] group"
      onClick={showUi}
      onMouseMove={showUi}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        .plyr--full-ui.plyr--video .plyr__control--overlaid {
          background: rgba(255, 255, 255, 0.2) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .plyr--video .plyr__controls {
          background: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .plyr--full-ui input[type=range] {
          color: #10b981 !important;
        }
        .plyr__control--overlaid:hover {
          background: #10b981 !important;
        }
      `}</style>
      <Plyr ref={plyrRef} source={videoSource} options={plyrOptions} />

      {/* Title Overlay */}
      {title && (
        <div
          className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-[#0F172A]/80 to-transparent transition-opacity duration-300 pointer-events-none z-10 ${
            uiVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-white text-sm font-semibold truncate font-bengali">
            {title}
          </p>
        </div>
      )}

      {/* Watermark */}
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="text-white/10 text-sm sm:text-lg font-bold rotate-[-20deg] select-none uppercase tracking-widest">
            {watermark}
          </span>
        </div>
      )}
    </div>
  );
}
