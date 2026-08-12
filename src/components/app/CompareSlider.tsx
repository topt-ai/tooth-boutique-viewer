import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

type ImgStatus = "loading" | "loaded" | "error";

export function CompareSlider({ beforeUrl, afterUrl, beforeLabel = "Antes", afterLabel = "Después" }: Props) {
  const [pos, setPos] = useState(50);
  const [beforeStatus, setBeforeStatus] = useState<ImgStatus>("loading");
  const [afterStatus, setAfterStatus] = useState<ImgStatus>("loading");

  useEffect(() => {
    setBeforeStatus("loading");
    setAfterStatus("loading");
  }, [beforeUrl, afterUrl]);

  const loading = beforeStatus === "loading" || afterStatus === "loading";
  const failed = beforeStatus === "error" || afterStatus === "error";
  const visible = !loading && !failed;

  return (
    <div className="w-full">
      <div className="relative min-h-56 select-none overflow-hidden rounded-2xl border border-border bg-black">
        <img
          src={afterUrl}
          alt={afterLabel}
          onLoad={() => setAfterStatus("loaded")}
          onError={() => setAfterStatus("error")}
          className={`block max-h-[70vh] w-full object-contain transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        />
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img
            src={beforeUrl}
            alt={beforeLabel}
            onLoad={() => setBeforeStatus("loaded")}
            onError={() => setBeforeStatus("error")}
            className={`block h-full w-full object-contain transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
          />
        </div>
        {loading && !failed ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/70" />
          </div>
        ) : null}
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-white/70" />
            <p className="text-xs text-white/70">No se pudieron cargar las imágenes.</p>
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
