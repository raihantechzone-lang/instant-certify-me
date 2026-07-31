import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.onerror = () => reject(new Error("Failed to load YouTube API"));
    document.head.appendChild(tag);
    // Safety timeout: fall back if it never fires.
    setTimeout(() => reject(new Error("YouTube API timeout")), 6000);
  });
  return ytApiPromise;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2];

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface VideoPlayerProps {
  youtubeId?: string;
  videoUrl?: string;
  title?: string;
  startSeconds?: number;
  subtitlesUrl?: string;
  watermark?: string;
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
}

/**
 * Custom video player: the YouTube chrome is never visible, only our own UI.
 * The overlay UI fades out after 3 seconds and reappears when the video is tapped.
 * Also supports a plain MP4 source via `videoUrl`.
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
}: VideoPlayerProps) {
  if (videoUrl) {
    return (
      <NativeVideoPlayer
        videoUrl={videoUrl}
        title={title}
        startSeconds={startSeconds}
        subtitlesUrl={subtitlesUrl}
        watermark={watermark}
        onProgress={onProgress}
        onEnded={onEnded}
      />
    );
  }
  return (
    <YouTubePlayer
      youtubeId={youtubeId}
      title={title}
      startSeconds={startSeconds}
      subtitlesUrl={subtitlesUrl}
      watermark={watermark}
      onProgress={onProgress}
      onEnded={onEnded}
    />
  );
}

function Watermark({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <span className="text-background/20 text-sm sm:text-lg font-bold rotate-[-20deg] select-none">
        {text}
      </span>
    </div>
  );
}

function SpeedMenu({ speed, onChange }: { speed: number; onChange: (s: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="px-2.5 py-1.5 rounded-lg bg-background/20 text-background text-xs font-bold"
      >
        {speed}x
      </button>
      {open && (
        <div
          className="absolute bottom-full mb-2 right-0 bg-background rounded-xl shadow-lg overflow-hidden border border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-xs font-semibold ${
                s === speed ? "bg-brand-soft text-brand" : "text-ink hover:bg-muted"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({
  current,
  duration,
  onSeek,
}: {
  current: number;
  duration: number;
  onSeek: (sec: number) => void;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  return (
    <div
      ref={barRef}
      className="w-full h-2 rounded-full bg-background/25 cursor-pointer relative"
      onClick={(e) => {
        e.stopPropagation();
        const rect = barRef.current?.getBoundingClientRect();
        if (!rect || duration <= 0) return;
        const ratio = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(duration, ratio * duration)));
      }}
    >
      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
    </div>
  );
}

function YouTubePlayer({
  youtubeId: videoId,
  title,
  startSeconds = 0,
  subtitlesUrl,
  watermark,
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  const [uiVisible, setUiVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [current, setCurrent] = useState(startSeconds);
  const [duration, setDuration] = useState(0);
  const [apiReady, setApiReady] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReported = useRef(0);
  const resumedRef = useRef(false);

  const showUi = () => {
    setUiVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUiVisible(false), 3000);
  };

  useEffect(() => {
    showUi();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Load YT API once and build a player.
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    resumedRef.current = false;
    loadYouTubeApi()
      .then(() => {
        if (cancelled || !mountRef.current || !window.YT) return;
        playerRef.current = new window.YT.Player(mountRef.current, {
          videoId,
          playerVars: {
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            disablekb: 1,
            playsinline: 1,
            fs: 0,
            cc_load_policy: subtitlesUrl ? 1 : 0,
          },
          events: {
            onReady: (e: any) => {
              if (cancelled) return;
              setApiReady(true);
              try {
                setDuration(e.target.getDuration() ?? 0);
                if (startSeconds > 0) {
                  e.target.seekTo(startSeconds, true);
                  setCurrent(startSeconds);
                }
              } catch {
                /* noop */
              }
            },
            onStateChange: (e: any) => {
              if (cancelled) return;
              const YTAny = window.YT;
              if (e.data === YTAny.PlayerState.PLAYING) setPlaying(true);
              if (e.data === YTAny.PlayerState.PAUSED) setPlaying(false);
              if (e.data === YTAny.PlayerState.ENDED) {
                setPlaying(false);
                onEnded?.();
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setApiFailed(true);
      });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      playerRef.current = null;
      setApiReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Poll current time for progress bar + throttled onProgress callback.
  useEffect(() => {
    if (!apiReady) return;
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime?.() ?? 0;
        const d = p.getDuration?.() ?? 0;
        setCurrent(t);
        if (d && duration !== d) setDuration(d);
        if (Math.floor(t) - lastReported.current >= 5) {
          lastReported.current = Math.floor(t);
          onProgress?.(t, d);
        }
      } catch {
        /* noop */
      }
    }, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (apiReady && p) {
      if (playing) p.pauseVideo();
      else p.playVideo();
    } else {
      setPlaying((v) => !v);
    }
    showUi();
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    try {
      playerRef.current?.setPlaybackRate?.(s);
    } catch {
      /* noop */
    }
  };

  const seek = (sec: number) => {
    setCurrent(sec);
    try {
      playerRef.current?.seekTo?.(sec, true);
    } catch {
      /* noop */
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  // Fallback: today's simple iframe behaviour when the API failed to load.
  const fallback = apiFailed || !videoId;
  const fallbackSrc = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}` +
      `?autoplay=${playing ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1&fs=0`
    : "";

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-2xl bg-ink"
      onClick={showUi}
      onMouseMove={showUi}
      onContextMenu={(e) => e.preventDefault()}
    >
      {fallback ? (
        <iframe
          src={fallbackSrc}
          title={title ?? "Course video"}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          className="absolute inset-0 h-full w-full border-0 pointer-events-none"
        />
      ) : (
        <div ref={mountRef} className="absolute inset-0 h-full w-full pointer-events-none" />
      )}
      {/* Blocks the underlying player's own click targets so its UI can never take over. */}
      <div className="absolute inset-0" aria-hidden />
      <Watermark text={watermark} />

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          uiVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-gradient-to-b from-ink/80 to-transparent p-4">
          <p className="text-background text-sm font-semibold truncate">{title}</p>
        </div>
        <div className="bg-gradient-to-t from-ink/90 to-transparent p-3 sm:p-4 flex flex-col gap-2">
          {!fallback && (
            <ProgressBar current={current} duration={duration} onSeek={seek} />
          )}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label={playing ? "Pause" : "Play"}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-brand text-brand-foreground text-lg font-bold flex items-center justify-center shadow-lg shrink-0"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            {!fallback && (
              <span className="text-background/80 text-xs font-medium shrink-0">
                {formatTime(current)} / {formatTime(duration)}
              </span>
            )}
            <span className="text-background/80 text-xs font-medium hidden sm:inline flex-1 truncate">
              Gators Learning Player
            </span>
            {!fallback && <SpeedMenu speed={speed} onChange={changeSpeed} />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-background/20 text-background text-xs font-bold"
              aria-label="Fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NativeVideoPlayer({
  videoUrl,
  title,
  startSeconds = 0,
  subtitlesUrl,
  watermark,
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [uiVisible, setUiVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [current, setCurrent] = useState(startSeconds);
  const [duration, setDuration] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReported = useRef(0);
  const resumedRef = useRef(false);

  const showUi = () => {
    setUiVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUiVisible(false), 3000);
  };

  useEffect(() => {
    showUi();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [videoUrl]);

  useEffect(() => {
    resumedRef.current = false;
  }, [videoUrl]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
    showUi();
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const seek = (sec: number) => {
    if (videoRef.current) videoRef.current.currentTime = sec;
    setCurrent(sec);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-2xl bg-ink"
      onClick={showUi}
      onMouseMove={showUi}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        title={title}
        className="absolute inset-0 h-full w-full object-contain bg-ink"
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration || 0);
          if (!resumedRef.current && startSeconds > 0) {
            v.currentTime = startSeconds;
            resumedRef.current = true;
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => onEnded?.()}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrent(t);
          if (Math.floor(t) - lastReported.current >= 5) {
            lastReported.current = Math.floor(t);
            onProgress?.(t, e.currentTarget.duration || 0);
          }
        }}
      >
        {subtitlesUrl && <track kind="captions" src={subtitlesUrl} default />}
      </video>
      <Watermark text={watermark} />

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none ${
          uiVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-gradient-to-b from-ink/80 to-transparent p-4">
          <p className="text-background text-sm font-semibold truncate">{title}</p>
        </div>
        <div className="bg-gradient-to-t from-ink/90 to-transparent p-3 sm:p-4 flex flex-col gap-2 pointer-events-auto">
          <ProgressBar current={current} duration={duration} onSeek={seek} />
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              aria-label={playing ? "Pause" : "Play"}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-brand text-brand-foreground text-lg font-bold flex items-center justify-center shadow-lg shrink-0"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <span className="text-background/80 text-xs font-medium shrink-0">
              {formatTime(current)} / {formatTime(duration)}
            </span>
            <span className="text-background/80 text-xs font-medium hidden sm:inline flex-1 truncate">
              Gators Learning Player
            </span>
            <SpeedMenu speed={speed} onChange={changeSpeed} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-background/20 text-background text-xs font-bold"
              aria-label="Fullscreen"
            >
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
