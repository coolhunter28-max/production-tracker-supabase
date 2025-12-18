"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;
const DOUBLE_CLICK_ZOOM = 2;

type Photo = {
  id: string;
  photo_url: string;
};

export function DefectImageLightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: Photo[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });

  // refs miniaturas para hacer scroll a la activa
  const thumbsWrapRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useMemo(
    () => photos.map(() => ({ current: null as HTMLButtonElement | null })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos.length]
  );

  const current = photos[index];

  /* ---------- Reset al cambiar imagen ---------- */
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });

    // Scroll miniatura activa a la vista
    const el = thumbRefs[index]?.current;
    if (el && thumbsWrapRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [index, thumbRefs]);

  /* ---------- Teclado ---------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const next = () => {
    setIndex((i) => (i + 1) % photos.length);
  };

  const prev = () => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  };

  /* ---------- Zoom con rueda ---------- */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;

    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  /* ---------- Doble click = zoom rápido ---------- */
  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(DOUBLE_CLICK_ZOOM);
    } else {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  };

  /* ---------- Drag (pan) ---------- */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    startRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    });
  };

  const stopDragging = () => setDragging(false);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-[92vw] h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Área principal */}
        <div
          className="relative flex-1 flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          style={{
            cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default",
          }}
        >
          <div
            className="transition-transform duration-75"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          >
            <Image
              src={current.photo_url}
              alt="Defect full view"
              width={1800}
              height={1800}
              unoptimized
              draggable={false}
              className="object-contain max-h-[78vh] max-w-[92vw] rounded select-none"
            />
          </div>

          {/* Flechas laterales */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-3xl bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center"
                title="Previous"
              >
                ‹
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-3xl bg-black/40 hover:bg-black/60 rounded-full w-10 h-10 flex items-center justify-center"
                title="Next"
              >
                ›
              </button>
            </>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white rounded-full w-9 h-9 flex items-center justify-center shadow text-lg"
            title="Close"
          >
            ✕
          </button>

          {/* Controls (zoom + counter) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 rounded px-2 py-1 text-white text-xs">
            <button
              onClick={() =>
                setZoom((z) => {
                  const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
                  if (next === 1) setOffset({ x: 0, y: 0 });
                  return next;
                })
              }
              className="px-2 py-1 hover:bg-white/10 rounded"
            >
              −
            </button>

            <span className="px-2">
              {index + 1} / {photos.length}
            </span>

            <button
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              className="px-2 py-1 hover:bg-white/10 rounded"
            >
              +
            </button>
          </div>
        </div>

        {/* Tira de miniaturas (A9) */}
        {photos.length > 1 && (
          <div className="mt-3">
            <div
              ref={thumbsWrapRef}
              className="flex gap-2 overflow-x-auto pb-2 px-2"
            >
              {photos.map((p, i) => {
                const active = i === index;

                return (
                  <button
                    key={p.id}
                    ref={(el) => {
                      thumbRefs[i].current = el;
                    }}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`relative shrink-0 w-16 h-16 rounded overflow-hidden border ${
                      active ? "border-white" : "border-white/30"
                    }`}
                    title={`Go to ${i + 1}`}
                  >
                    <Image
                      src={p.photo_url}
                      alt={`Thumbnail ${i + 1}`}
                      fill
                      unoptimized
                      className={`object-cover ${
                        active ? "opacity-100" : "opacity-80 hover:opacity-100"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-center text-white/70 text-xs">
              Tip: ← → to navigate, double-click to zoom, drag to pan
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
