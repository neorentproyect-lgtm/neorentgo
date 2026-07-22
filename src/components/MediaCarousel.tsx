"use client";

import { useState, type MouseEvent } from "react";
import { PropMedia } from "@/lib/store";

export function MediaCarousel({ media, image, className, arrows = "hover" }: { media?: PropMedia[]; image?: string; className?: string; arrows?: "hover" | "always" }) {
  const items: PropMedia[] = media && media.length ? media : image ? [{ url: image, kind: "image", position: 0 }] : [];
  const [idx, setIdx] = useState(0);
  const cur = items[Math.min(idx, items.length - 1)];
  const go = (d: number) => (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); setIdx((i) => (i + d + items.length) % items.length); };
  const arrowVis = arrows === "always" ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div className={`relative ${className ?? ""}`}>
      {cur ? (
        cur.kind === "video"
          ? <video src={cur.url} className="h-full w-full object-cover" controls muted playsInline />
          : <img src={cur.url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-emerald-200 to-teal-300" />
      )}
      {items.length > 1 && (
        <>
          <button onClick={go(-1)} className={`absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-stone-700 shadow-sm transition hover:bg-white ${arrowVis}`}>‹</button>
          <button onClick={go(1)} className={`absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-stone-700 shadow-sm transition hover:bg-white ${arrowVis}`}>›</button>
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1">{items.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />)}</div>
        </>
      )}
    </div>
  );
}
