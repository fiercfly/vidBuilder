// ThumbStrip.js — generates a full-source sprite once; CSS-pans to the trim window.
// Zero re-generation when the clip is moved, trimmed, or resized.
import React, { useRef } from 'react';
import { useVideoThumbs } from './useVideoThumbs';

// ─── Placeholder while sprite is generating ───────────────────────────────────
function Placeholder({ height }) {
  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        // Subtle cell grid so the strip isn't an empty black box while decoding
        background: 'repeating-linear-gradient(90deg, #1e1e1e 0px, #1e1e1e 79px, #2a2a2a 79px, #2a2a2a 80px)',
      }}
    />
  );
}

// ─── CSS-only viewport into the full sprite ───────────────────────────────────
//
// The sprite is (thumbCount × THUMB_W) px wide and covers [0…fullDuration].
// We position it as a CSS background so only [offset … offset+visible] is shown.
// No JS width read, no re-render on trim or drag.
//
// background-size:     S% 100%  — makes the full sprite as wide as needed so
//                                 visiblePx maps to exactly 100% of the div
// background-position: P% 0%   — shifts the left edge to the trim point
//
function SpriteViewport({ spriteUrl, totalSpritePx, offsetPx, visiblePx, height }) {
  if (!spriteUrl || visiblePx <= 0) return <Placeholder height={height} />;

  // How many times wider the full sprite is than the visible window
  const sizePercent = (totalSpritePx / visiblePx) * 100;

  // How far along the remaining (non-visible) sprite the offset sits
  const remainingPx = totalSpritePx - visiblePx;
  const posPercent = remainingPx > 0 ? (offsetPx / remainingPx) * 100 : 0;

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundImage: `url(${spriteUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${sizePercent.toFixed(2)}% 100%`,
        backgroundPosition: `${posPercent.toFixed(4)}% 0%`,
      }}
    />
  );
}

// ─── ThumbStrip ───────────────────────────────────────────────────────────────
/**
 * Props
 * ─────
 * src             – video URL (blob or remote)
 * fullDuration    – total source file duration in seconds  →  item.sourceDuration
 * offset          – trim-start inside the source in seconds  →  item.offset  (default 0)
 * visibleDuration – how many seconds of the clip are shown on the timeline  →  item.duration
 *                   (pass getAdjustedDuration(item) to account for transition overlap)
 * height          – strip height in px (default 46)
 *
 * Key insight
 * ───────────
 * useVideoThumbs is keyed on `src` + `fullDuration` only.
 * Trimming or moving a clip only changes `offset` / `visibleDuration`,
 * which are pure CSS arithmetic — no video re-decode, no re-render.
 */
export function ThumbStrip({
  src,
  fullDuration,
  offset = 0,
  visibleDuration,
  height = 46,
}) {
  const containerRef = useRef(null);

  const { spriteUrl, thumbWidth, thumbCount } = useVideoThumbs({
    src,
    fullDuration,          // ← full source duration, never the trimmed clip length
    thumbHeight: height,
    maxThumbs: 30,
  });

  // ── Pixel math — no container width needed ────────────────────────────────
  const safeFull = Math.max(fullDuration || 1, 0.001);
  const safeVisible = Math.max(visibleDuration || safeFull, 0.001);
  const totalSpritePx = thumbCount * thumbWidth;   // e.g. 30 frames × 80px = 2400px
  const pxPerSec = totalSpritePx / safeFull;
  const offsetPx = offset * pxPerSec;         // left edge of the visible window
  const visiblePx = safeVisible * pxPerSec;    // width of the visible window in sprite-px

  return (
    <div
      ref={containerRef}
      className="thumb-strip"
      style={{
        height: `${height}px`,
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
        pointerEvents: 'none',
        borderRadius: '4px',
        background: '#1a1a1a',
      }}
    >
      <SpriteViewport
        spriteUrl={spriteUrl}
        totalSpritePx={totalSpritePx}
        offsetPx={offsetPx}
        visiblePx={visiblePx}
        height={height}
      />
    </div>
  );
}