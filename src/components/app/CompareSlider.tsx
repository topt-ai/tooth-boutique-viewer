import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function CompareSlider({ beforeUrl, afterUrl, beforeLabel = "Antes", afterLabel = "Después" }: Props) {
  const [pos, setPos] = useState(50);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);

  useEffect(() => {
    setBeforeLoaded(false);
    setAfterLoaded(false);
  }, [beforeUrl, afterUrl]);

  const loading = !beforeLoaded || !afterLoaded;

  return (
    <div className="w-full">
      <div className="relative min-h-56 select-none overflow-hidden rounded-2xl border border-border bg-black">
        <img
          src={afterUrl}
          alt={afterLabel}
          onLoad={() => setAfterLoaded(true)}
          className={`block max-h-[70vh] w-full object-contain transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}
        />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img
            src={beforeUrl}
            alt={beforeLabel}
            onLoad={() => setBeforeLoaded(true)}
            className={`block h-full w-full object-contain transition-opacity duration-200 ${loading ? "opacity-0" : "opacity-100"}`}
          />
        </div>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${pos}%` }} />
        <span className="absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium">
          {beforeLabel}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium">
          {afterLabel}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        aria-label="Comparar antes y después"
        onChange={(e) => setPos(Number(e.target.value))}
        className="mt-3 w-full accent-primary"
      />
    </div>
  );
}
