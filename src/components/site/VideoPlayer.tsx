import { useEffect, useRef, useState } from "react";

/**
 * Custom video player: the YouTube chrome is never visible, only our own UI.
 * The overlay UI fades out after 3 seconds and reappears when the video is tapped.
 */
export function VideoPlayer({ youtubeId, title }: { youtubeId: string; title?: string }) {
  const [uiVisible, setUiVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [youtubeId]);

  const src =
    `https://www.youtube-nocookie.com/embed/${youtubeId}` +
    `?autoplay=${playing ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1&fs=0`;

  return (
    <div
      className="relative w-full aspect-video overflow-hidden rounded-2xl bg-ink"
      onClick={showUi}
      onMouseMove={showUi}
    >
      <iframe
        src={src}
        title={title ?? "Course video"}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        className="absolute inset-0 h-full w-full border-0 pointer-events-none"
      />
      {/* Blocks YouTube's own click targets so its UI can never take over. */}
      <div className="absolute inset-0" aria-hidden />

      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          uiVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-gradient-to-b from-ink/80 to-transparent p-4">
          <p className="text-background text-sm font-semibold truncate">{title}</p>
        </div>
        <div className="bg-gradient-to-t from-ink/90 to-transparent p-4 flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPlaying((v) => !v);
              showUi();
            }}
            aria-label={playing ? "Pause" : "Play"}
            className="h-12 w-12 rounded-full bg-brand text-brand-foreground text-lg font-bold flex items-center justify-center shadow-lg"
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <span className="text-background/80 text-xs font-medium">Gators Learning Player</span>
        </div>
      </div>
    </div>
  );
}
