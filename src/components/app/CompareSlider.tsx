import { useState } from "react";

interface Props {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export function CompareSlider({ beforeUrl, afterUrl, beforeLabel = "Antes", afterLabel = "Después" }: Props) {
  const [pos, setPos] = useState(50);

  return (
    <div className="w-full">
      <div className="relative select-none overflow-hidden rounded-2xl border border-border bg-black">
        <img src={afterUrl} alt={afterLabel} className="block max-h-[70vh] w-full object-contain" />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={beforeUrl} alt={beforeLabel} className="block h-full w-full object-contain" />
        </div>
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
