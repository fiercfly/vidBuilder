// import { useEffect, useMemo, useRef, useState } from 'react';

// // ==========================================
// // LRU Cache Implementation for Resource Management
// // ==========================================
// class LRUCache {
//   constructor(limit, onEvict) {
//     this.limit = limit;
//     this.onEvict = onEvict;
//     this.cache = new Map();
//   }

//   get(key) {
//     if (!this.cache.has(key)) return undefined;
//     const value = this.cache.get(key);
//     // Refresh item
//     this.cache.delete(key);
//     this.cache.set(key, value);
//     return value;
//   }

//   set(key, value) {
//     if (this.cache.has(key)) {
//       this.cache.delete(key);
//     } else if (this.cache.size >= this.limit) {
//       // Evict oldest
//       const oldestKey = this.cache.keys().next().value;
//       const oldestValue = this.cache.get(oldestKey);
//       this.cache.delete(oldestKey);
//       if (this.onEvict) this.onEvict(oldestValue);
//     }
//     this.cache.set(key, value);
//   }

//   has(key) {
//     return this.cache.has(key);
//   }
// }

// // 1. Frame Cache: Stores individual video frames (ImageBitmap)
// // Limit to ~20 video sources to prevent GPU memory exhaustion
// const globalFrameCache = new LRUCache(20, (frameMap) => {
//   // frameMap is a Map<timestamp, ImageBitmap>
//   frameMap.forEach((bitmap) => {
//     if (bitmap && typeof bitmap.close === 'function') {
//       bitmap.close(); // Release GPU memory
//     }
//   });
//   frameMap.clear();
// });

// // 2. Sprite Cache: Stores the final generated strip keys
// // Limit to ~50 strips to prevent Blob URL accumulation
// const globalSpriteCache = new LRUCache(50, (spriteUrl) => {
//   if (spriteUrl && spriteUrl.startsWith('blob:')) {
//     URL.revokeObjectURL(spriteUrl); // Release Blob memory
//   }
// });

// export function useVideoThumbs({
//   src,
//   startTime = 0,
//   duration,
//   canvasRef,
//   targetWidthPx,
//   thumbHeight = 50,
//   maxThumbs = 30,
// }) {
//   const [spriteUrl, setSpriteUrl] = useState(null);
//   const abortRef = useRef(false);

//   // Calculate required frame count
//   const count = useMemo(() => {
//     if (!targetWidthPx || !duration) return 0;
//     const calculated = Math.ceil(targetWidthPx / 80);
//     return Math.max(1, Math.min(maxThumbs, calculated));
//   }, [targetWidthPx, maxThumbs, duration]);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!src || !duration || count === 0 || !canvas) return;

//     // GENERATE CACHE KEY
//     const spriteKey = `${src}::${targetWidthPx}::${startTime}::${duration}`;

//     // HIT CHECK: If we already have a blob for this exact strip, use it!
//     if (globalSpriteCache.has(spriteKey)) {
//       setSpriteUrl(globalSpriteCache.get(spriteKey));
//       return;
//     }

//     abortRef.current = false;
//     let isActive = true;

//     // --- CRITICAL CHANGE: DO NOT setSpriteUrl(null) here ---
//     // Keeping the old sprite visible (if valid) prevents "flashing black".
//     // The component using this hook should prioritize the canvas if it needs to show progress.

//     // Setup Canvas
//     const ctx = canvas.getContext('2d', { alpha: false });
//     if (canvas.width !== targetWidthPx || canvas.height !== thumbHeight) {
//       canvas.width = targetWidthPx;
//       canvas.height = thumbHeight;

//       // Fill properly to avoid transparent black holes
//       ctx.fillStyle = '#111'; // Dark gray placeholder
//       ctx.fillRect(0, 0, canvas.width, canvas.height);
//     }

//     const generateSprite = async () => {
//       // Init Frame Cache
//       if (!globalFrameCache.has(src)) {
//         globalFrameCache.set(src, new Map());
//       }
//       const srcCache = globalFrameCache.get(src);

//       const singleThumbW = targetWidthPx / count;
//       const step = duration / count;
//       const missingPoints = [];

//       // --- PHASE 1: DRAW CACHED FRAMES ---
//       let hasMissing = false;
//       for (let i = 0; i < count; i++) {
//         const t = Math.floor((startTime + (i * step)) * 10) / 10;
//         const x = i * singleThumbW;

//         if (srcCache.has(t)) {
//           const img = srcCache.get(t);
//           // Draw cached bitmap
//           try {
//             ctx.drawImage(img, 0, 0, img.width, img.height, x, 0, singleThumbW, thumbHeight);
//           } catch (e) {
//             // If bitmap is closed/invalid, treat as missing
//             srcCache.delete(t);
//             missingPoints.push({ time: t, x, w: singleThumbW });
//             hasMissing = true;
//           }
//         } else {
//           // Draw a placeholder rect so it's not empty black
//           ctx.fillStyle = '#222';
//           ctx.fillRect(x, 0, singleThumbW, thumbHeight);

//           missingPoints.push({ time: t, x, w: singleThumbW });
//           hasMissing = true;
//         }
//       }

//       // Helper to finalize and cache the Blob
//       const tryCacheBlob = () => {
//         if (!isActive) return;
//         try {
//           canvas.toBlob((blob) => {
//             if (blob && isActive) {
//               const url = URL.createObjectURL(blob);
//               globalSpriteCache.set(spriteKey, url);
//               setSpriteUrl(url); // Now switch to the new one
//             }
//           }, 'image/jpeg', 0.8);
//         } catch (e) {
//           // Canvas is tainted (insecure video).
//           // We CANNOT cache it as a blob. We just stay on Canvas mode.
//         }
//       };

//       // If we had all frames cached, just generate the blob and exit
//       if (!hasMissing) {
//         tryCacheBlob();
//         return;
//       }

//       // --- PHASE 2: GENERATE MISSING FRAMES ---
//       try {
//         const video = document.createElement('video');
//         video.muted = true;
//         video.playsInline = true;
//         video.preload = 'metadata';

//         // Smart Load: Try Secure -> Fallback Insecure
//         await new Promise((resolve, reject) => {
//           const onLoaded = () => resolve();
//           const onError = () => {
//             if (video.crossOrigin === 'anonymous') {
//               video.removeAttribute('crossOrigin'); // Fallback
//               video.src = src;
//               video.load();
//             } else {
//               reject(new Error("Video Load Failed"));
//             }
//           };
//           video.onloadedmetadata = onLoaded;
//           video.onerror = onError;

//           if (!src.startsWith('blob:')) video.crossOrigin = 'anonymous';
//           video.src = src;
//         });

//         if (!isActive || abortRef.current) return;

//         for (const point of missingPoints) {
//           if (!isActive || abortRef.current) break;

//           video.currentTime = point.time;

//           await new Promise(r => {
//             const onSeek = () => { video.removeEventListener('seeked', onSeek); r(); };
//             video.addEventListener('seeked', onSeek);
//             // Timeout fallback: if seek doesn't fire, proceed anyway
//             setTimeout(r, 400);
//           });

//           // Draw directly to canvas (works for both secure & insecure)
//           try {
//             ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, point.x, 0, point.w, thumbHeight);
//           } catch (drawErr) {
//             // If drawing fails (e.g. video not ready), keep the placeholder
//             console.warn("Frame draw error", drawErr);
//           }

//           // Attempt to cache individual frame (Bitmaps are fast)
//           try {
//             const bitmap = await createImageBitmap(video);
//             srcCache.set(point.time, bitmap);
//           } catch (e) {
//             // Caching failed (likely due to taint), but we already drew it to the screen.
//           }

//           // Yield to main thread to keep UI responsive
//           await new Promise(r => setTimeout(r, 10));
//         }

//         // Finalize
//         tryCacheBlob();

//       } catch (e) {
//         console.warn("Thumb generation issue:", e);
//       }
//     };

//     generateSprite();

//     return () => {
//       isActive = false;
//       abortRef.current = true;
//     };
//   }, [src, startTime, duration, count, targetWidthPx, thumbHeight, canvasRef]);

//   return spriteUrl;
// }





import { useEffect, useMemo, useRef, useState } from 'react';

// ─── LRU Cache ────────────────────────────────────────────────────────────────
class LRUCache {
  constructor(limit, onEvict) {
    this.limit  = limit;
    this.onEvict = onEvict;
    this.cache  = new Map();
  }
  get(key) {
    if (!this.cache.has(key)) return undefined;
    const v = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, v);
    return v;
  }
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.limit) {
      const oldest = this.cache.keys().next().value;
      const oldVal = this.cache.get(oldest);
      this.cache.delete(oldest);
      if (this.onEvict) this.onEvict(oldVal);
    }
    this.cache.set(key, value);
  }
  has(key) { return this.cache.has(key); }
}

// Frame bitmaps per source (GPU memory, evict ≤ 20 sources)
const globalFrameCache = new LRUCache(20, (frameMap) => {
  frameMap.forEach(b => b?.close?.());
  frameMap.clear();
});

// Final sprite blob URLs (evict ≤ 50 entries)
const globalSpriteCache = new LRUCache(50, (url) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
});

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Generates a FULL-DURATION sprite for `src` exactly once.
 *
 * Props
 * ─────
 * src            – video URL (blob or remote)
 * fullDuration   – total length of the source file in seconds  ← NEW (was `duration`)
 * thumbHeight    – strip height in px (default 50)
 * maxThumbs      – upper frame count cap (default 30)
 *
 * Returns  { spriteUrl, thumbWidth, thumbCount }
 *   spriteUrl  – blob URL of the full sprite (null while generating)
 *   thumbWidth – width of each individual frame cell in px
 *   thumbCount – how many frames were baked into the sprite
 *
 * ThumbStrip uses thumbWidth + thumbCount to shift background-position
 * so it can "pan" to any offset inside the sprite without re-generating.
 */
export function useVideoThumbs({
  src,
  fullDuration,          // ← full source duration (not the trimmed clip length)
  thumbHeight = 50,
  maxThumbs   = 30,
}) {
  const THUMB_W = 80; // fixed cell width in px – consistent across all clips

  const [spriteUrl, setSpriteUrl] = useState(null);
  const abortRef = useRef(false);

  // How many frames we bake for this source
  const thumbCount = useMemo(() => {
    if (!fullDuration) return 0;
    return Math.max(1, Math.min(maxThumbs, Math.ceil((fullDuration * THUMB_W) / THUMB_W)));
    // Simplified: one thumb per THUMB_W seconds-worth, capped
  }, [fullDuration, maxThumbs]);

  // Sprite canvas width = thumbCount × THUMB_W
  const spriteWidth = thumbCount * THUMB_W;

  useEffect(() => {
    if (!src || !fullDuration || thumbCount === 0) return;

    // ── Cache key = source + full duration (never includes offset/trim) ────
    const spriteKey = `${src}::full::${fullDuration}::${thumbCount}`;

    if (globalSpriteCache.has(spriteKey)) {
      setSpriteUrl(globalSpriteCache.get(spriteKey));
      return;
    }

    abortRef.current = false;
    let isActive = true;

    // Off-screen canvas – we don't need it in the DOM
    const canvas = document.createElement('canvas');
    canvas.width  = spriteWidth;
    canvas.height = thumbHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, spriteWidth, thumbHeight);

    const generateSprite = async () => {
      if (!globalFrameCache.has(src)) {
        globalFrameCache.set(src, new Map());
      }
      const srcCache = globalFrameCache.get(src);

      const step = fullDuration / thumbCount;

      // ── Phase 1: draw cached frames immediately ───────────────────────
      const missingPoints = [];
      for (let i = 0; i < thumbCount; i++) {
        const t = Math.floor((i * step) * 10) / 10;
        const x = i * THUMB_W;
        if (srcCache.has(t)) {
          const img = srcCache.get(t);
          try {
            ctx.drawImage(img, 0, 0, img.width, img.height, x, 0, THUMB_W, thumbHeight);
          } catch {
            srcCache.delete(t);
            missingPoints.push({ time: t, x });
          }
        } else {
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(x, 0, THUMB_W, thumbHeight);
          missingPoints.push({ time: t, x });
        }
      }

      const tryCacheBlob = () => {
        if (!isActive) return;
        try {
          canvas.toBlob((blob) => {
            if (!blob || !isActive) return;
            const url = URL.createObjectURL(blob);
            globalSpriteCache.set(spriteKey, url);
            setSpriteUrl(url);
          }, 'image/jpeg', 0.8);
        } catch {
          // Tainted canvas – just leave on null; ThumbStrip shows placeholder
        }
      };

      if (missingPoints.length === 0) {
        tryCacheBlob();
        return;
      }

      // ── Phase 2: decode missing frames via a temp <video> ─────────────
      try {
        const video = document.createElement('video');
        video.muted      = true;
        video.playsInline = true;
        video.preload    = 'metadata';

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = () => {
            if (video.crossOrigin === 'anonymous') {
              video.removeAttribute('crossOrigin');
              video.src  = src;
              video.load();
            } else {
              reject(new Error('Video load failed'));
            }
          };
          if (!src.startsWith('blob:')) video.crossOrigin = 'anonymous';
          video.src = src;
        });

        if (!isActive || abortRef.current) return;

        for (const { time, x } of missingPoints) {
          if (!isActive || abortRef.current) break;

          video.currentTime = time;
          await new Promise(r => {
            const onSeeked = () => { video.removeEventListener('seeked', onSeeked); r(); };
            video.addEventListener('seeked', onSeeked);
            setTimeout(r, 400); // fallback
          });

          try {
            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, x, 0, THUMB_W, thumbHeight);
          } catch (e) {
            console.warn('[ThumbStrip] frame draw failed', e);
          }

          try {
            const bitmap = await createImageBitmap(video);
            srcCache.set(time, bitmap);
          } catch { /* tainted – skip caching bitmap */ }

          // Yield to keep UI snappy
          await new Promise(r => setTimeout(r, 10));
        }

        tryCacheBlob();
      } catch (e) {
        console.warn('[ThumbStrip] sprite generation failed', e);
      }
    };

    generateSprite();
    return () => { isActive = false; abortRef.current = true; };
  }, [src, fullDuration, thumbCount, spriteWidth, thumbHeight]);

  return { spriteUrl, thumbWidth: THUMB_W, thumbCount };
}