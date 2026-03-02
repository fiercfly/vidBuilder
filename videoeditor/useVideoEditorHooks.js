import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cleanImageData } from './standalone/useAiStudioCacheManager';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { COMMON_TRANSITIONS } from './transitions';
import { exportTimelineForRemotion } from './exportForRemotion';
import * as dbind from './indexDbStore';

/* ===========================
   Constants & Helpers
=========================== */
export const DURATION_LIMIT = 300;
export const FPS = 30;
export const MIN_CLIP_SEC = 0.5;
export const clampMinSec = (s) => Math.max(MIN_CLIP_SEC, Number.isFinite(+s) ? +s : 0);

const FONT_BASE_URL = "https://raw.githubusercontent.com/fiercfly/Roboto/main/Roboto/static";

//
const LUMA_MASKS = {
  circle: "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/luma-mattes/static/circle-sd.jpg",
  oval: "https://shotstack-assets.s3-ap-southeast-2.amazonaws.com/luma-mattes/static/circle-sd.jpg"
};

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function computeVideoAspectRatio(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const cleanup = () => {
      video.removeAttribute('src');
      try { video.load?.(); } catch { }
      // @ts-ignore
      video.srcObject = null;
    };
    video.preload = 'metadata';
    video.src = videoUrl;
    video.onloadedmetadata = () => {
      const { videoWidth: w, videoHeight: h } = video;
      cleanup();
      if (w > h) return resolve('16:9');
      if (h > w) return resolve('9:16');
      resolve('1:1');
    };
    video.onerror = () => { cleanup(); resolve('16:9'); };
  });
}


// export const useMediaAssets = () => {
//   // Two separate states = isolated rendering
//   const [rawFiles, setRawFiles] = useState([]);
//   const [generatedFiles, setGeneratedFiles] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const fetchAssets = useCallback(async () => {
//     setLoading(true);
//     try {
//       // Fetch both simultaneously for speed
//       const [raw, generated] = await Promise.all([
//         dbind.getRawMedia(),
//         dbind.getGeneratedMedia()
//       ]);

//       // Create URLs and tag them for the UI
//       setRawFiles(raw.map(file => ({
//         ...file,
//         url: URL.createObjectURL(file.file || file),
//         source: 'upload'
//       })));

//       setGeneratedFiles(generated.map(file => ({
//         ...file,
//         url: URL.createObjectURL(file.file || file),
//         source: 'generated'
//       })));

//     } catch (error) {
//       console.error("Failed to load assets:", error);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   // Crucial Edge Case: Memory Leak Prevention
//   useEffect(() => {
//     fetchAssets();

//     // When component unmounts, destroy the blobs to free up RAM!
//     return () => {
//       rawFiles.forEach(f => URL.revokeObjectURL(f.url));
//       generatedFiles.forEach(f => URL.revokeObjectURL(f.url));
//     };
//   }, []); 

//   return { 
//     rawFiles, 
//     generatedFiles, 
//     refreshAssets: fetchAssets, 
//     loading 
//   };
// };

export const getDurationFromUrl = (url) =>
  new Promise((resolve) => {
    let done = false;
    const finalize = (val) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(clampMinSec(Number.isFinite(val) && val > 0 ? val : 5));
    };
    const v = document.createElement('video');
    const a = document.createElement('audio');
    let tid = null;
    const cleanup = () => {
      if (tid) clearTimeout(tid);
      [v, a].forEach((el) => {
        el?.removeAttribute?.('src');
        try { el?.load?.(); } catch { }
        // @ts-ignore
        el.srcObject = null;
      });
    };
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () => finalize(v.duration);
    v.onerror = () => finalize(5);
    tid = setTimeout(() => {
      a.preload = 'metadata';
      a.src = url;
      a.onloadedmetadata = () => finalize(a.duration);
      a.onerror = () => finalize(5);
    }, 2500);
  });

export function useToast() {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((text) => {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);
  const Toast = msg ? (
    <div
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(20,20,20,0.95)', color: '#fff', padding: '10px 16px',
        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: 14,
        zIndex: 9999, pointerEvents: 'none',
      }}
    >
      {msg}
    </div>
  ) : null;
  return { showToast, Toast, toastMsg: msg };
}

export const getMediaInfoFromFile = (file) =>
  new Promise((resolve) => {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');

    if (isVideo || isAudio) {
      const el = document.createElement(isVideo ? 'video' : 'audio');
      const objUrl = URL.createObjectURL(file);

      // FIX: Increased from 2000ms to 10000ms. Audio files can take time to
      // report metadata, especially large files or slow connections. 2s was
      // too aggressive and caused real audio durations to be replaced with 5s.
      const timeout = setTimeout(() => {
        cleanup();
        console.warn("Metadata timeout after 10s, defaulting to 5s");
        resolve({ duration: 5, width: 0, height: 0 });
      }, 10000);

      const cleanup = () => {
        clearTimeout(timeout);
        try { URL.revokeObjectURL(objUrl); } catch { }
        el.removeAttribute('src');
        try { el.load?.(); } catch { }
        el.remove();
      };

      el.preload = 'metadata';
      el.muted = true;

      el.onloadedmetadata = () => {
        let dur = el.duration;
        if (dur === Infinity || isNaN(dur)) {
          el.currentTime = 1e101;
          el.ondurationchange = () => {
            el.ondurationchange = null;
            dur = el.duration;
            cleanup();
            resolve({ duration: clampMinSec(dur), width: el.videoWidth || 0, height: el.videoHeight || 0 });
          };
          return;
        }
        const w = el.videoWidth || 0;
        const h = el.videoHeight || 0;
        cleanup();
        resolve({ duration: clampMinSec(dur), width: w, height: h });
      };

      el.onerror = () => { cleanup(); resolve({ duration: 5, width: 0, height: 0 }); };
      el.src = objUrl;
    }
    else if (isImage) {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.src = objUrl;
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        try { URL.revokeObjectURL(objUrl); } catch { }
        resolve({ duration: 5, width: w, height: h });
      };
      img.onerror = () => {
        try { URL.revokeObjectURL(objUrl); } catch { }
        resolve({ duration: 5, width: 0, height: 0 });
      };
    }
    else {
      resolve({ duration: 5, width: 0, height: 0 });
    }
  });

// export const getMediaMetadata = (url) =>
//   new Promise((resolve) => {
//     const v = document.createElement('video');
//     // ✅ FIX: Do NOT set crossOrigin for metadata reading.
//     // crossOrigin="anonymous" triggers a CORS preflight. If the host blocks it,
//     // onerror fires AND the browser caches the URL as "CORS-failed" — causing
//     // every subsequent load of that URL (ThumbStrip, InteractiveComposition) to
//     // also fail with "loading failed", even if CORS isn't needed for plain playback.
//     v.preload = 'metadata';
//     v.src = url;
//     v.onloadedmetadata = () => {
//       const duration = (v.duration && isFinite(v.duration) && v.duration > 0) ? v.duration : 5;
//       resolve({
//         duration,
//         naturalWidth: v.videoWidth || 1920,
//         naturalHeight: v.videoHeight || 1080,
//       });
//       v.src = '';
//     };
//     v.onerror = () => { v.src = ''; resolve({ duration: 5, naturalWidth: 1280, naturalHeight: 720 }); };
//   });



export const getMediaMetadata = (url) =>
  new Promise((resolve) => {
    const v = document.createElement('video');
    v.crossOrigin = "anonymous"; // Needed for Firebase -> generic domain
    v.preload = 'metadata';
    v.src = url;
    v.onloadedmetadata = () => {
      resolve({
        duration: v.duration,
        naturalWidth: v.videoWidth,
        naturalHeight: v.videoHeight,
      });
      // PERMANENT FIX: Clear the source to free up browser memory
      v.src = '';
      v.load();
    };
    v.onerror = () => {
      resolve({ duration: 5, naturalWidth: 1280, naturalHeight: 720 });
    };
  });

/* ===========================
   HELPER: parseSRT
=========================== */
const parseSRT = (data) => {
  if (!data) return [];
  const normalize = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalize.split('\n\n').map(b => b.trim()).filter(Boolean);

  return blocks.map((block, i) => {
    const lines = block.split('\n');
    if (lines.length < 2) return null;
    const timeLineIndex = lines.findIndex(l => l.includes('-->'));
    if (timeLineIndex === -1) return null;

    const [startStr, endStr] = lines[timeLineIndex].split('-->').map(s => s.trim());
    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines.join('\n').replace(/<[^>]*>/g, '');

    const parseTime = (t) => {
      if (!t) return 0;
      const [main, ms] = t.split(/[,.]/);
      const parts = main.split(':').map(Number);
      let h = 0, m = 0, s = 0;
      if (parts.length === 3) { [h, m, s] = parts; }
      else if (parts.length === 2) { [m, s] = parts; }
      return (h * 3600) + (m * 60) + s + (parseInt(ms || '0', 10) / 1000);
    };

    const start = parseTime(startStr);
    const end = parseTime(endStr);

    return {
      id: i,
      startTime: start,
      duration: Math.max(0.2, end - start),
      text
    };
  }).filter(Boolean);
};

/* ===========================
   Hook: useMediaLibrary
=========================== */
export function useMediaLibrary(opts = {}) {
  const { userId, uploaders, persistKey = null, fileCdnUrlBuilder, swapTimelineOnUpload = false, onUploaded, onSrtUpload, showToast } = opts;
  const [mediaFiles, _setMediaFiles] = React.useState([]);

  const save = React.useCallback((updater) => {
    _setMediaFiles(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  const addFiles = React.useCallback(async (fileList) => {
    const rawFiles = Array.from(fileList || []);
    if (!rawFiles.length) return;

    const files = rawFiles.filter((file) => {
      const type = file.type;
      const name = file.name.toLowerCase();
      return (
        type.startsWith('video/') ||
        type.startsWith('image/') ||
        type.startsWith('audio/') ||
        name.endsWith('.srt')
      );
    });

    if (!files.length) return;

    // ✅ COMPRESSION LOGIC INTERCEPTOR
    const processedFiles = [];

    for (const file of files) {
      let fileToProcess = file;

      // Check if Video is large (> 30MB)
      if (file.type.startsWith('video/') && file.size > COMPRESSION_THRESHOLD) {
        if (showToast) showToast(`Optimizing video (${(file.size / 1024 / 1024).toFixed(1)}MB)...`);
        try {
          const compressedBlob = await compressVideo(file, (msg) => console.log(msg));
          fileToProcess = compressedBlob;
          if (showToast) showToast(`Done! New size: ${(fileToProcess.size / 1024 / 1024).toFixed(1)}MB`);
        } catch (err) {
          console.error("Compression Failed, falling back to original", err);
          if (showToast) showToast("Optimization failed. Using original.");
        }
      }
      processedFiles.push(fileToProcess);
    }

    const optimistic = [];

    for (const file of processedFiles) {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const blobUrl = URL.createObjectURL(file);
      const name = file.name.toLowerCase();

      let type = 'image';
      if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      } else if (name.endsWith('.srt')) {
        type = 'caption';
      }

      const { duration, width, height } = (type === 'caption')
        ? { duration: 0, width: 0, height: 0 }
        : await getMediaInfoFromFile(file);

      optimistic.push({
        id,
        type,
        file,
        originalFile: file,
        name: file.name,
        url: blobUrl,
        remoteUrl: null,
        actualDuration: duration,
        naturalWidth: width,
        naturalHeight: height,
        _uploaded: false
      });
    }

    save(prev => [...prev, ...optimistic]);

    if (userId && uploaders) {
      const folder = `${userId}/MyUploads/videoeditorFile`;
      optimistic.forEach(async (it) => {
        try {
          let out;
          if (it.type === 'video') out = await uploaders.uploadFileVideo(it.file, folder);
          else if (it.type === 'audio') out = await uploaders.uploadFileAudio(it.file, folder);
          else out = await uploaders.uploadFile(it.file, folder);

          let remoteUrl = typeof out === 'string' ? out : out?.url || null;
          if (fileCdnUrlBuilder) {
            const mapped = fileCdnUrlBuilder({ userId, file: it.file, folder, firebaseUrl: remoteUrl });
            if (mapped) remoteUrl = mapped;
          }
          if (remoteUrl) {
            save(prev => prev.map(m => m.id === it.id ? { ...m, remoteUrl, _uploaded: true } : m));
            if (swapTimelineOnUpload && onUploaded) { onUploaded({ ...it, url: remoteUrl }); }
          }
        } catch (e) { console.error('Upload failed for', it.name, e); }
      });
    }
  }, [userId, uploaders, save, fileCdnUrlBuilder, swapTimelineOnUpload, onUploaded, showToast]);

  const removeFile = React.useCallback((id) => {
    save(prev => {
      const found = prev.find(f => f.id === id);
      try { if (found?.url?.startsWith?.('blob:')) URL.revokeObjectURL(found.url); } catch { }
      return prev.filter(f => f.id !== id);
    });
  }, [save]);

  const renameFile = useCallback((id, newName) => {
    save(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
  }, [save]);

  const handleMediaItemDrag = React.useCallback((e, item) => {
    const src = item.url || item.remoteUrl;
    const itemType = item.type || 'image';
    if (!item || !item.id || !src) { e.preventDefault(); return; }

    const transferData = {
      id: String(item.id),
      type: itemType,
      url: src,
      // FIX: For audio, don't force a 5s fallback here. If actualDuration is
      // 0/falsy (not yet loaded), pass null so the drop handler fetches real metadata.
      // The || 5 was masking unloaded durations as permanent 5-second clips.
      actualDuration: (item.actualDuration && item.actualDuration > 0.5) ? item.actualDuration : null,
      naturalWidth: item.naturalWidth,
      naturalHeight: item.naturalHeight,
      name: item.name,
      audioTrack: itemType === 'audio' ? 'music' : undefined
    };

    const jsonStr = JSON.stringify(transferData);
    e.dataTransfer.setData('application/json', jsonStr);
    e.dataTransfer.setData('text/plain', jsonStr);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return { mediaFiles, setMediaFiles: _setMediaFiles, addFiles, removeFile, handleMediaItemDrag, renameFile };
}

export function useHistory(initialState) {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);

  const setState = useCallback((action) => {
    const currentState = history[index];
    const newState = typeof action === 'function' ? action(currentState) : action;
    if (JSON.stringify(currentState) === JSON.stringify(newState)) return;
    const copy = history.slice(0, index + 1);
    copy.push(newState);
    setHistory(copy);
    setIndex(copy.length - 1);
  }, [history, index]);

  const undo = useCallback(() => {
    if (index > 0) setIndex(prev => prev - 1);
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) setIndex(prev => prev + 1);
  }, [index, history.length]);

  return [history[index], setState, undo, redo, index > 0, index < history.length - 1];
}


// Hook to manage media caching and blob creation
export const useMediaCache = () => {
  const [processingFiles, setProcessingFiles] = useState({}); // Track loading state by ID

  // 1. Convert any Input (File object or Remote URL) -> Local Blob URL
  const cacheAndGetBlobUrl = useCallback(async (fileOrUrl, uniqueId) => {
    if (!fileOrUrl || !uniqueId) return null;

    setProcessingFiles(prev => ({ ...prev, [uniqueId]: true }));

    try {
      // Step A: Check if we already have it in IndexedDB
      const cachedBlob = await getFileFromDB(uniqueId);

      if (cachedBlob) {
        console.log(`[Cache Hit] Restoring ${uniqueId} from DB`);
        setProcessingFiles(prev => { const n = { ...prev }; delete n[uniqueId]; return n; });
        return URL.createObjectURL(cachedBlob);
      }

      // Step B: It's new. Is it a File object (Upload) or a String (Remote URL)?
      let finalBlob = null;

      if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
        // It's a direct upload
        finalBlob = fileOrUrl;
      } else if (typeof fileOrUrl === 'string') {
        // It's a remote URL -> Fetch it as Blob
        console.log(`[Cache Miss] Downloading ${uniqueId}...`);
        const response = await fetch(fileOrUrl);
        if (!response.ok) throw new Error(`Failed to fetch ${fileOrUrl}`);
        finalBlob = await response.blob();
      }

      if (finalBlob) {
        // Step C: Save to IDB for next time
        await saveFileToDB(uniqueId, finalBlob);

        // Step D: Return the local Blob URL
        const localUrl = URL.createObjectURL(finalBlob);

        setProcessingFiles(prev => { const n = { ...prev }; delete n[uniqueId]; return n; });
        return localUrl;
      }

    } catch (error) {
      console.error("Error caching file:", error);
      setProcessingFiles(prev => { const n = { ...prev }; delete n[uniqueId]; return n; });
      // Fallback: If fetch fails, just return the original string (if it was a string)
      return typeof fileOrUrl === 'string' ? fileOrUrl : null;
    }
  }, []);

  // 2. Bulk Restore (e.g., on app load)
  // Takes a list of media items with 'originalUrl' or 'id' and hydrates them with blob URLs
  const restoreMediaSessions = useCallback(async (mediaList) => {
    const updatedList = [...mediaList];
    let hasChanges = false;

    for (let i = 0; i < updatedList.length; i++) {
      const item = updatedList[i];
      // If it looks like a remote URL, try to swap it for a cached blob
      if (item.id && !item.url.startsWith('blob:')) {
        const blob = await getFileFromDB(item.id);
        if (blob) {
          updatedList[i] = { ...item, url: URL.createObjectURL(blob) };
          hasChanges = true;
        }
      }
    }
    return hasChanges ? updatedList : mediaList;
  }, []);

  return {
    cacheAndGetBlobUrl,
    restoreMediaSessions,
    processingFiles
  };
};

/* =========================================================================
   HOOK: useTimeline
   ========================================================================= */
export function useTimeline(initialItems = [], canvasWidth = 1080, canvasHeight = 1920) {
  const [items, setItems, undo, redo, canUndo, canRedo] = useHistory(initialItems);
  const [selectedIds, setSelectedIds] = useState([]);
  const internalDragRef = useRef(false);
  const [tracks, setTracks] = useState([]);

  // --- 1. HELPER UTILS ---
  const isVisual = (t) => ['video', 'image', 'gif'].includes(t);

  const timelineItemStyle = useCallback((item, viewportStart = 0, viewportEnd = 300) => {
    const windowDur = Math.max(0.5, viewportEnd - viewportStart);
    return {
      left: `${((item.startTime - viewportStart) / windowDur) * 100}%`,
      width: `${(item.duration / windowDur) * 100}%`,
      position: 'absolute', height: '100%', cursor: 'grab'
    };
  }, []);

  const getLastClipEndTime = useCallback(() => {
    if (!items.length) return 0;
    const last = items.reduce((latest, cur) => (cur.startTime + cur.duration) > (latest.startTime + latest.duration) ? cur : latest);
    return Math.min(last.startTime + last.duration, 300);
  }, [items]);

  const deleteItemByIndex = useCallback((index) => setItems((prev) => prev.filter((_, i) => i !== index)), [setItems]);

  const visibleTracks = useMemo(() => {
    const used = new Set(items.map(i => i.trackId).filter(Boolean));
    return tracks.filter(t => used.has(t.id));
  }, [tracks, items]);

  const createTrack = useCallback((type, placement = 'top') => {
    if (type === 'gif') type = 'video';
    const idxOfType = tracks.filter(t => t.type === type).length;
    let label = `${type.charAt(0).toUpperCase() + type.slice(1)} ${idxOfType + 1}`;
    const id = `${type}-${Date.now()}-${idxOfType + 1}`;
    const track = { id, type, label, locked: false };
    setTracks(prev => {
      const newTracks = placement === 'top' ? [track, ...prev] : [...prev, track];
      return newTracks.sort((a, b) => {
        const getPriority = (t) => t === 'text' ? 0 : isVisual(t) ? 1 : t === 'audio' ? 2 : 3;
        return getPriority(a.type) - getPriority(b.type);
      });
    });
    return track;
  }, [tracks]);

  // --- FIND OR CREATE TRACK (Respects Locking) ---
  const findOrCreateTrack = useCallback((drop) => {
    const { mediaType, targetTrackId } = drop || {};
    let byId = targetTrackId ? tracks.find(t => t.id === targetTrackId) : null;
    if (byId && byId.locked) {
      byId = null;
    }
    if (byId && mediaType === 'gif' && byId.type === 'video') {
      /* ok */
    }
    else if (byId && byId.type !== mediaType) {
      byId = null;
    }

    if (drop?.mediaType === 'text') {
      let track = tracks.find(t => t.type === 'text' && !t.locked);
      if (!track) return createTrack('text');
      return track;
    }

    if (byId) return byId;

    const searchType = mediaType === 'gif' ? 'video' : mediaType;
    const existing = tracks.find(t => t.type === searchType && !t.locked);
    if (existing) return existing;
    return createTrack(searchType || 'video');

  }, [tracks, createTrack]);

  // --- 3. GAP REMOVAL ---
  const removeGap = useCallback((trackId, gapStart, gapDuration) => {
    setItems(prevItems => {
      const lockedOnTrack = prevItems.filter(i => i.trackId === trackId && i.locked);
      return prevItems.map(item => {
        if (item.trackId === trackId && !item.locked && item.startTime > gapStart + 0.001) {
          let targetStart = Math.max(0, item.startTime - gapDuration);
          const blockingWall = lockedOnTrack.find(L =>
            L.startTime < item.startTime && (L.startTime + L.duration) > targetStart + 0.001
          );
          if (blockingWall) {
            targetStart = blockingWall.startTime + blockingWall.duration;
          }
          return { ...item, startTime: targetStart };
        }
        return item;
      });
    });
  }, [setItems]);

  // --- 4. COLLISION LOGIC ---
  const calculateCollision = useCallback((allItems, candidateItem, targetTrackId) => {
    const trackItems = allItems.filter(i => i.trackId === targetTrackId && i.id !== candidateItem.id)
      .sort((a, b) => a.startTime - b.startTime);
    const lockedItems = trackItems.filter(i => i.locked);

    let newStart = candidateItem.startTime;
    const duration = candidateItem.duration;
    const SNAP_THRESHOLD = 0.2;

    // A. Check Locked Intersection
    const isOverlappingLocked = (start, dur) => {
      return lockedItems.some(L =>
        start < (L.startTime + L.duration) - 0.01 && (start + dur) > L.startTime + 0.01
      );
    };

    if (isOverlappingLocked(newStart, duration)) {
      let candidates = [0];
      lockedItems.forEach(L => {
        candidates.push(Math.max(0, L.startTime - duration));
        candidates.push(L.startTime + L.duration);
      });
      const validCandidates = candidates.filter(cand => !isOverlappingLocked(cand, duration));
      if (validCandidates.length > 0) {
        newStart = validCandidates.reduce((prev, curr) => Math.abs(curr - newStart) < Math.abs(prev - newStart) ? curr : prev);
      } else {
        const lastLocked = lockedItems[lockedItems.length - 1];
        newStart = lastLocked ? lastLocked.startTime + lastLocked.duration : newStart;
      }
    }

    // B. Snap to Back
    const overlappingUnlocked = trackItems.find(i =>
      !i.locked &&
      newStart < (i.startTime + i.duration) - 0.05 &&
      (newStart + duration) > i.startTime + 0.05
    );

    if (overlappingUnlocked) {
      const targetCenter = overlappingUnlocked.startTime + (overlappingUnlocked.duration / 2);
      const candidateCenter = newStart + (duration / 2);
      if (candidateCenter > targetCenter) {
        const proposedSnap = overlappingUnlocked.startTime + overlappingUnlocked.duration;
        if (!isOverlappingLocked(proposedSnap, duration)) newStart = proposedSnap;
      }
    }

    // C. Gap Snap
    const prevClip = trackItems.findLast(i => i.startTime + i.duration <= newStart + SNAP_THRESHOLD);
    if (prevClip && Math.abs(newStart - (prevClip.startTime + prevClip.duration)) < SNAP_THRESHOLD) {
      newStart = prevClip.startTime + prevClip.duration;
    }

    // D. Ripple
    let boundary = newStart + duration;
    const finalItems = [];
    const overlapsSpecificLocked = (start, dur, lockedItem) => {
      return start < (lockedItem.startTime + lockedItem.duration) - 0.001 && (start + dur) > lockedItem.startTime + 0.001;
    };

    for (let item of trackItems) {
      if (item.locked) { finalItems.push(item); continue; }
      let placeStart = item.startTime;

      if (placeStart + item.duration <= newStart + 0.001) { finalItems.push(item); continue; }
      if (placeStart < boundary) { placeStart = boundary; }

      let isCollision = true;
      while (isCollision) {
        const wall = lockedItems.find(L => overlapsSpecificLocked(placeStart, item.duration, L));
        if (wall) { placeStart = wall.startTime + wall.duration; }
        else { isCollision = false; }
      }
      finalItems.push({ ...item, startTime: placeStart });
      boundary = placeStart + item.duration;
    }

    return { finalStartTime: newStart, adjustedOtherItems: finalItems };
  }, []);

  // --- 5. PASTE LOGIC (Respects Locking) ---
  const addPastedItem = useCallback((clipboardItem, playheadTime) => {
    let destTrackId = clipboardItem.trackId;
    let targetTrack = tracks.find(t => t.id === destTrackId);

    if (!targetTrack) {
      targetTrack = tracks.find(t => t.type === clipboardItem.type);
      if (targetTrack) {
        destTrackId = targetTrack.id;
      } else {
        console.warn("No suitable track found for paste");
        return null;
      }
    }

    if (targetTrack.locked) return null;

    let candidateStart = playheadTime;
    const duration = clipboardItem.duration;

    const itemsOnTrack = items
      .filter(i => i.trackId === destTrackId)
      .sort((a, b) => a.startTime - b.startTime);

    let isOverlapping = true;
    let attempts = 0;

    while (isOverlapping && attempts < 50) {
      isOverlapping = false;
      const candidateEnd = candidateStart + duration;

      for (const item of itemsOnTrack) {
        const itemEnd = item.startTime + item.duration;
        if (candidateStart < itemEnd && candidateEnd > item.startTime) {
          candidateStart = itemEnd;
          isOverlapping = true;
          break;
        }
      }
      attempts++;
    }

    const newId = `${clipboardItem.type}_${Date.now()}_copy`;
    const newItem = {
      ...clipboardItem,
      id: newId,
      mediaId: clipboardItem.mediaId,
      trackId: destTrackId,
      startTime: candidateStart,
      isShadow: false,
      isColliding: false,
      locked: false
    };

    setItems(prev => [...prev, newItem]);
    return newItem;
  }, [items, tracks, setItems]);

  const removeSelectedItems = useCallback(() => {
    if (selectedIds.length === 0) return;

    setItems((prevItems) => {
      const remainingItems = prevItems.filter((item) => {
        if (!selectedIds.includes(item.id)) return true;
        const parentTrack = tracks.find(t => t.id === item.trackId);
        const isLocked = item.locked || (parentTrack && parentTrack.locked);
        return isLocked;
      });
      return remainingItems;
    });

    setSelectedIds([]);
  }, [selectedIds, tracks, setItems, setSelectedIds]);


  const toggleTrackLock = useCallback((trackId) => {
    setTracks((prev) => prev.map((t) =>
      t.id === trackId ? { ...t, locked: !t.locked } : t
    ));
  }, []);

  const addVideo = (url) => {
    if (!canvas) return;
    const videoE = document.createElement('video');
    videoE.width = 1080;
    videoE.height = 1080;
    videoE.crossOrigin = "anonymous";
    videoE.src = url;
    videoE.muted = true;
    videoE.loop = true;
    videoE.playsInline = true;

    videoE.addEventListener('loadedmetadata', function () {
      videoE.play();
      const videoObj = new fabric.Image(videoE, {
        left: 100,
        top: 100,
        objectCaching: false,
      });
      if (videoE.videoWidth > 500) {
        videoObj.scaleToWidth(500);
      }
      canvas.add(videoObj);
      canvas.setActiveObject(videoObj);
      canvas.renderAll();
      fabric.util.requestAnimFrame(function render() {
        canvas.renderAll();
        fabric.util.requestAnimFrame(render);
      });
    });
    videoE.load();
  };

  /* ===========================
     FINAL FIXED: handleDragFactory
  =========================== */
  const handleDragFactory = useCallback((item, visibleStart, visibleWindowSec, onSelect) => (e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.delete-button')) return;

    e.preventDefault();
    e.stopPropagation();

    const parentTrack = tracks.find(t => t.id === item.trackId);
    if (item.type === 'gap' || item.locked || (parentTrack && parentTrack.locked)) {
      if (onSelect) onSelect();
      return;
    }

    const isMultiDrag = selectedIds.includes(item.id);
    const rawIds = isMultiDrag ? selectedIds : [item.id];
    const movingIds = rawIds.filter(id => {
      const it = items.find(i => i.id === id);
      if (!it) return false;
      const tr = tracks.find(t => t.id === it.trackId);
      return !(it.locked || (tr && tr.locked));
    });

    const originalLeaderStart = item.startTime;
    const startX = e.clientX;
    const startY = e.clientY;

    const itemEl = e.currentTarget;
    const timelineEl = itemEl.closest('.timeline');
    const markersEl = timelineEl?.querySelector('.timeline-markers');

    if (!timelineEl) return;

    const containerRect = (markersEl || timelineEl).getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerLeft = containerRect.left;
    const containerTop = containerRect.top;
    const containerHeight = timelineEl.clientHeight;

    const grabOffsetSec = (visibleStart + ((startX - containerLeft) / containerWidth * visibleWindowSec)) - item.startTime;

    const pxPerSec = containerWidth / visibleWindowSec;
    const movingItems = items.filter(i => movingIds.includes(i.id));

    const minStartTime = movingItems.length > 0
      ? movingItems.reduce((min, i) => Math.min(min, i.startTime), Infinity)
      : item.startTime;
    const maxLeftDx = -(minStartTime * pxPerSec);

    let maxRightDx = Infinity;
    movingItems.forEach(mi => {
      const timeRoom = DURATION_LIMIT - (mi.startTime + mi.duration);
      const pixelRoom = timeRoom * pxPerSec;
      if (pixelRoom < maxRightDx) maxRightDx = pixelRoom;
    });

    internalDragRef.current = true;
    let hasMoved = false;
    let ghostAttached = false;

    let groupMinX = Infinity, groupMinY = Infinity;
    let groupMaxX = -Infinity, groupMaxY = -Infinity;
    const ghostChildren = [];

    movingIds.forEach(id => {
      const el = document.querySelector(`.timeline-item[data-item-id="${id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.left < groupMinX) groupMinX = r.left;
        if (r.top < groupMinY) groupMinY = r.top;
        if (r.right > groupMaxX) groupMaxX = r.right;
        if (r.bottom > groupMaxY) groupMaxY = r.bottom;
        ghostChildren.push({ el, rect: r });
      }
    });

    const ghost = document.createElement('div');
    ghost.className = 'timeline-ghost-group';
    Object.assign(ghost.style, {
      position: 'fixed', left: `${groupMinX}px`, top: `${groupMinY}px`,
      width: `${groupMaxX - groupMinX}px`, height: `${groupMaxY - groupMinY}px`,
      zIndex: '999999', pointerEvents: 'none',
    });

    ghostChildren.forEach(({ rect }) => {
      const itemGhost = document.createElement('div');
      Object.assign(itemGhost.style, {
        position: 'absolute',
        left: `${rect.left - groupMinX}px`, top: `${rect.top - groupMinY}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
        borderRadius: '6px', opacity: '0.9',
        border: '2px solid #D1FE17', background: 'rgba(209, 254, 23, 0.2)',
        boxSizing: 'border-box', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      });
      ghost.appendChild(itemGhost);
    });

    const guideEl = document.createElement('div');
    guideEl.className = 'timeline-guide-line';
    Object.assign(guideEl.style, {
      position: 'fixed',
      top: `${containerTop}px`,
      height: `${containerHeight}px`,
      width: '0px',
      borderLeft: '2px dotted #D1FE17',
      zIndex: '2147483647',
      pointerEvents: 'none',
      display: 'none',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)'
    });
    const guideLabel = document.createElement('div');
    Object.assign(guideLabel.style, {
      position: 'absolute', top: '50px', left: '6px',
      background: '#D1FE17', color: '#000', padding: '2px 6px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    });
    guideEl.appendChild(guideLabel);
    document.body.appendChild(guideEl);

    const staticItems = items.filter(i => !movingIds.includes(i.id));
    const trackNodes = Array.from(timelineEl.querySelectorAll('.timeline-track'));
    const trackRects = trackNodes.map(n => ({
      node: n, id: n.getAttribute('data-track-id'),
      top: n.getBoundingClientRect().top, bottom: n.getBoundingClientRect().bottom,
      locked: tracks.find(t => t.id === n.getAttribute('data-track-id'))?.locked,
      type: (n.className.match(/\b(video|audio|image|text|caption|gif)-track\b/)?.[1]) || null
    })).sort((a, b) => a.top - b.top);

    const isCompatible = (trackType, itemType) => {
      if (!trackType) return false;
      if (trackType === itemType) return true;
      if (['video', 'image'].includes(trackType) && ['video', 'image'].includes(itemType)) return true;
      return false;
    };

    const preview = { mode: 'same', trackId: item.trackId, placement: 'end', insertAfterId: null, lastMouseX: startX, snappedStart: null };

    const onMove = (me) => {
      const rawDx = me.clientX - startX;
      const dy = me.clientY - startY;
      const rawDist = Math.sqrt(rawDx * rawDx + dy * dy);

      if (!hasMoved && rawDist > 5) {
        hasMoved = true;
        if (!ghostAttached) {
          document.body.appendChild(ghost);
          ghostChildren.forEach(({ el }) => el.style.opacity = '0.3');
          itemEl.classList.add('dragging');
          ghostAttached = true;
        }
      }

      if (!hasMoved) return;

      let dx = rawDx;
      if (dx < maxLeftDx) dx = maxLeftDx;
      if (dx > maxRightDx) dx = maxRightDx;

      ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      const clampedMouseX = startX + dx;
      preview.lastMouseX = clampedMouseX;

      const currentPct = (clampedMouseX - containerLeft) / containerWidth;
      const currentCursorT = visibleStart + (currentPct * visibleWindowSec);
      const proposedStart = Math.max(0, currentCursorT - grabOffsetSec);
      const proposedEnd = proposedStart + item.duration;

      const SNAP_PX = 15;
      const SNAP_SEC = (SNAP_PX / containerWidth) * visibleWindowSec;

      let snapVisTime = null;
      let snapAbsStart = null;

      for (const other of staticItems) {
        const os = other.startTime;
        const oe = other.startTime + other.duration;

        if (Math.abs(proposedStart - os) < SNAP_SEC) { snapVisTime = os; snapAbsStart = os; }
        else if (Math.abs(proposedStart - oe) < SNAP_SEC) { snapVisTime = oe; snapAbsStart = oe; }
        else if (Math.abs(proposedEnd - os) < SNAP_SEC) { snapVisTime = os; snapAbsStart = os - item.duration; }
        else if (Math.abs(proposedEnd - oe) < SNAP_SEC) { snapVisTime = oe; snapAbsStart = oe - item.duration; }
        if (snapVisTime !== null) break;
      }

      if (snapVisTime === null && Math.abs(proposedStart - 0) < SNAP_SEC) {
        snapVisTime = 0; snapAbsStart = 0;
      }
      if (snapVisTime === null && Math.abs(proposedEnd - DURATION_LIMIT) < SNAP_SEC) {
        snapVisTime = DURATION_LIMIT; snapAbsStart = DURATION_LIMIT - item.duration;
      }

      if (snapVisTime !== null && snapAbsStart !== null) {
        preview.snappedStart = Math.max(0, snapAbsStart);
        const snapLeftPct = (snapVisTime - visibleStart) / visibleWindowSec;
        const snapX = containerLeft + (snapLeftPct * containerWidth);

        if (snapX >= containerLeft && snapX <= containerLeft + containerWidth) {
          guideEl.style.display = 'block';
          guideEl.style.left = `${snapX}px`;
          guideLabel.textContent = formatTime(snapVisTime);
        } else {
          guideEl.style.display = 'none';
        }
      } else {
        preview.snappedStart = null;
        guideEl.style.display = 'none';
      }

      document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
      const compatibleRects = trackRects.filter(t => isCompatible(t.type, item.type));

      const directHover = compatibleRects.find(t => me.clientY >= t.top && me.clientY <= t.bottom);

      if (directHover && !directHover.locked) {
        preview.mode = 'dropOnTrack';
        preview.trackId = directHover.id;
        directHover.node.classList.add('drop-target');
      } else {
        preview.mode = 'createNewTrack';
        preview.trackId = null;
        preview.insertAfterId = null;

        if (compatibleRects.length === 0) {
          preview.placement = 'end';
        } else {
          if (me.clientY < compatibleRects[0].top) {
            preview.placement = 'start';
          }
          else if (me.clientY > compatibleRects[compatibleRects.length - 1].bottom) {
            preview.placement = 'end';
          }
          else {
            let foundGap = false;
            for (let i = 0; i < compatibleRects.length; i++) {
              const current = compatibleRects[i];
              const next = compatibleRects[i + 1];

              if (me.clientY >= current.top && me.clientY <= current.bottom) {
                preview.placement = 'after';
                preview.insertAfterId = current.id;
                foundGap = true;
                break;
              }
              if (next && me.clientY > current.bottom && me.clientY < next.top) {
                preview.placement = 'after';
                preview.insertAfterId = current.id;
                foundGap = true;
                break;
              }
            }
            if (!foundGap) preview.placement = 'end';
          }
        }
      }
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      try { if (ghostAttached) ghost.remove(); } catch { }
      try { guideEl.remove(); } catch { }

      ghostChildren.forEach(({ el }) => el.style.opacity = '');
      itemEl.classList.remove('dragging');
      document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
      internalDragRef.current = false;

      if (!hasMoved) { if (onSelect) onSelect(); return; }

      let rawNewStart;
      if (preview.snappedStart !== null) {
        rawNewStart = preview.snappedStart;
      } else {
        const finalPct = (preview.lastMouseX - containerLeft) / containerWidth;
        const finalCursorT = visibleStart + (finalPct * visibleWindowSec);
        rawNewStart = Math.max(0, finalCursorT - grabOffsetSec);
      }

      if (rawNewStart + item.duration > DURATION_LIMIT) {
        rawNewStart = DURATION_LIMIT - item.duration;
      }

      let destTrackId = item.trackId;
      if (preview.mode === 'dropOnTrack' && preview.trackId) destTrackId = preview.trackId;

      let newTrackToCreate = null;

      if (preview.mode === 'createNewTrack') {
        const type = item.type;
        const newTrackId = `${type}-${Date.now()}-auto`;
        newTrackToCreate = { id: newTrackId, type: type, label: `${type.charAt(0).toUpperCase() + type.slice(1)}` };
        destTrackId = newTrackId;

        setTracks(prev => {
          const newArr = [...prev];

          if (preview.placement === 'start') {
            const firstCompatible = newArr.findIndex(t => isCompatible(t.type, type));
            if (firstCompatible !== -1) newArr.splice(firstCompatible, 0, newTrackToCreate);
            else newArr.unshift(newTrackToCreate);
          }
          else if (preview.placement === 'after' && preview.insertAfterId) {
            const idx = newArr.findIndex(t => t.id === preview.insertAfterId);
            if (idx !== -1) newArr.splice(idx + 1, 0, newTrackToCreate);
            else newArr.push(newTrackToCreate);
          }
          else {
            const indices = newArr.map((t, i) => ({ t, i })).filter(({ t }) => isCompatible(t.type, type)).map(({ i }) => i);
            if (indices.length > 0) newArr.splice(Math.max(...indices) + 1, 0, newTrackToCreate);
            else newArr.push(newTrackToCreate);
          }
          return newArr;
        });
      }

      setItems((prev) => {
        const cleanItems = prev.filter(i => !i.isShadow);
        const staticItems = cleanItems.filter(i => !movingIds.includes(i.id));
        const timeDelta = rawNewStart - originalLeaderStart;

        const finalStateMap = new Map(cleanItems.map(i => [i.id, i]));
        const accumulatedAdjustments = new Map();

        movingIds.forEach(moverId => {
          const mover = finalStateMap.get(moverId);
          if (!mover) return;

          const targetTrack = (moverId === item.id) ? destTrackId : mover.trackId;
          let proposedTime = Math.max(0, mover.startTime + timeDelta);

          if (proposedTime + mover.duration > DURATION_LIMIT) {
            proposedTime = DURATION_LIMIT - mover.duration;
          }

          const { finalStartTime, adjustedOtherItems } = calculateCollision(
            staticItems,
            { ...mover, startTime: proposedTime, trackId: targetTrack },
            targetTrack
          );

          finalStateMap.set(moverId, { ...mover, trackId: targetTrack, startTime: finalStartTime });

          if (adjustedOtherItems) {
            adjustedOtherItems.forEach(adj => {
              const existing = accumulatedAdjustments.get(adj.id);
              if (!existing || adj.startTime > existing.startTime) {
                accumulatedAdjustments.set(adj.id, adj);
              }
            });
          }
        });

        accumulatedAdjustments.forEach((adjItem, id) => {
          if (!movingIds.includes(id)) {
            finalStateMap.set(id, adjItem);
          }
        });

        return Array.from(finalStateMap.values());
      });
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);

  }, [items, tracks, selectedIds, setItems, setTracks, calculateCollision]);

  // --- 7. RESIZE FACTORY ---

  /* ===========================
  UPDATED: onDropFactory
  =========================== */
  const onDropFactory = useCallback(({ mediaFiles, currentTimeRef } = {}) => async (e) => {
    if (internalDragRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
    const MAX_SIZE = 100 * 1024 * 1024; // 30 MB

    if (droppedFiles.length > 0) {
      console.log("Checking Desktop Drop:", droppedFiles);
      for (const file of droppedFiles) {
        if (file.size > MAX_SIZE) {
          alert(`File "${file.name}" is too large! Limit is 100MB.`);
          return;
        }
      }
    }

    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch { return; }

    if (!data) return;

    if (data.size && data.size > MAX_SIZE) {
      alert(`File "${data.name || 'Media'}" is too large! Limit is 20MB.`);
      return;
    }

    if ((!data.size || data.size === 0) && data.url && data.url.startsWith('http')) {
      try {
        const res = await fetch(data.url, { method: 'HEAD' });
        const contentLength = res.headers.get('Content-Length');

        if (contentLength && Number(contentLength) > MAX_SIZE) {
          alert(`File "${data.name || 'Media'}" is too large! Limit is 20MB.`);
          return;
        }
      } catch (err) {
        console.warn("Could not verify remote file size:", err);
      }
    }

    if (data.type === 'caption' || (data.name && data.name.toLowerCase().endsWith('.srt'))) {
      try {
        const response = await fetch(data.url);
        const srtText = await response.text();
        const cues = parseSRT(srtText);
        if (cues.length === 0) return;
        const newTrackId = `text-subtitles-${Date.now()}`;
        const subtitleTrack = { id: newTrackId, type: 'text', label: 'Subtitles', locked: false };
        setTracks(prev => [subtitleTrack, ...prev]);
        const groupId = `srt_group_${Date.now()}`;
        const newItems = cues.map((cue, i) => ({
          id: `sub_${Date.now()}_${i}`,
          type: 'text',
          text: cue.text,
          startTime: cue.startTime,
          duration: Math.max(0.5, cue.duration),
          trackId: newTrackId,
          subtitleGroupId: groupId,
          width: 800, height: 120,
          x: (canvasWidth - 800) / 2, y: canvasHeight - 200,
          style: { fontSize: 40, fontFamily: 'Roboto', fill: '#ffffff', fontWeight: 'bold', align: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 10 },
          rotation: 0, opacity: 1, _hydrated: true
        }));
        setItems(prev => [...prev, ...newItems]);
        return;
      } catch (err) { console.error("Failed to parse SRT", err); return; }
    }

    const domTarget = e.currentTarget;
    const targetTrackId = domTarget ? domTarget.getAttribute('data-track-id') : null;

    const safeNatW = Number(data.naturalWidth);
    const safeNatH = Number(data.naturalHeight);
    const safeDur = Number(data.actualDuration);

    const isDefaultDim = (!safeNatW || !safeNatH || (safeNatW === 500 && safeNatH === 281));
    const isMissingDuration = ((data.type === 'video') && (!safeDur || safeDur < 1));

    // [UPDATED] Check if we need async load
    // If data.isBlob is true, we treat it as "loaded" because it's already in memory
    const needsAsyncLoad = !data.isBlob && (data.url && (data.type === 'video' || data.type === 'image') && (isDefaultDim || isMissingDuration));


    const mf = data.id ? mediaFiles?.find((f) => String(f.id) === String(data.id)) : null;
    let rawDuration = data.actualDuration || mf?.actualDuration;
    // FIX: Don't silently default audio to 5s — fetch real duration asynchronously
    const needsAudioDurationFetch = data.type === 'audio' && (!rawDuration || rawDuration < 0.5);
    if (!rawDuration) rawDuration = needsAudioDurationFetch ? 30 : 5; // Temp placeholder for audio

    let duration = (data.type === 'image' || data.type === 'text') ? 5 : Math.min(rawDuration, DURATION_LIMIT);

    let finalTrackId = null;
    let newTrackToCreate = null;
    const targetTrackObj = tracks.find(t => t.id === targetTrackId);
    const isCompatible = (track, dataType) => {
      if (!track) return false;
      if (track.type === dataType) return true;
      if (['video', 'image', 'gif'].includes(track.type) && ['video', 'image', 'gif'].includes(dataType)) return true;
      return false;
    };

    if (targetTrackObj && !targetTrackObj.locked && isCompatible(targetTrackObj, data.type)) {
      finalTrackId = targetTrackObj.id;
    } else {
      const type = data.type;
      const newId = `${type}-${Date.now()}-drop`;
      newTrackToCreate = {
        id: newId, type: type,
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracks.filter(t => t.type === type).length + 1}`,
        locked: false
      };
      finalTrackId = newId;
    }

    let finalStart = currentTimeRef?.current || 0;
    if (!newTrackToCreate && finalTrackId) {
      const trackItems = items.filter(i => i.trackId === finalTrackId);
      if (trackItems.length > 0) {
        const lastEndTime = trackItems.reduce((max, i) => Math.max(max, i.startTime + i.duration), 0);
        finalStart = lastEndTime;
      } else { finalStart = 0; }
    }

    if (finalStart + duration > DURATION_LIMIT) finalStart = DURATION_LIMIT - duration;
    if (finalStart < 0) finalStart = 0;

    const rawW = Number(data.naturalWidth || mf?.naturalWidth);
    const rawH = Number(data.naturalHeight || mf?.naturalHeight);
    const natW = (Number.isFinite(rawW) && rawW > 0) ? rawW : 500;
    const natH = (Number.isFinite(rawH) && rawH > 0) ? rawH : (data.type === 'video' ? 281 : 500);

    let finalW = natW, finalH = natH;
    const safeCanvasW = canvasWidth || 1080;
    const safeCanvasH = canvasHeight || 1920;
    const scale = Math.min(safeCanvasW / natW, safeCanvasH / natH);
    if (scale < 1) { finalW = Math.round(natW * scale); finalH = Math.round(natH * scale); }

    const itemId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newItem = {
      id: itemId,
      type: data.type,
      url: data.url || null,
      mediaId: data.id ? String(data.id) : `dropped_${Date.now()}`,
      startTime: finalStart,
      duration,
      sourceDuration: rawDuration,
      offset: 0,
      trackId: finalTrackId,
      volume: 1,
      width: finalW, height: finalH, naturalWidth: natW, naturalHeight: natH,
      x: (canvasWidth - finalW) / 2, y: (canvasHeight - finalH) / 2,
      text: data.text || "Add Your Text",
      // style: { fontSize: 80, fill: '#ffffff', fontWeight: 'bold', fontStyle: 'normal', align: 'center', ...data.style },
      style: {
        fontSize: 80,
        fill: '#ffffff',
        fontWeight: 'bold',
        fontStyle: 'normal',
        align: 'center',
        ...data.style // <--- This ensures shadows/strokes from preset override defaults
      },
      rotation: 0, _hydrated: true, speed: 1, opacity: 1,
      isLoading: needsAsyncLoad // Set loading true if we need to fetch metadata
    };

    if (newTrackToCreate) {
      setTracks(prev => [newTrackToCreate, ...prev]);
    }

    setItems((prev) => {
      const { finalStartTime, adjustedOtherItems } = calculateCollision(prev, newItem, finalTrackId);
      let safeStart = finalStartTime;
      if (safeStart + duration > DURATION_LIMIT) safeStart = DURATION_LIMIT - duration;
      const finalizedItem = { ...newItem, startTime: safeStart };

      const updatedExisting = prev.map(existing => {
        if (adjustedOtherItems) {
          const adj = adjustedOtherItems.find(a => a.id === existing.id);
          if (adj) return adj;
        }
        return existing;
      });
      return [...updatedExisting, finalizedItem];
    });

    if (needsAsyncLoad) {
      (async () => {
        try {
          let meta;
          if (data.type === 'video') {
            meta = await getMediaMetadata(data.url);
          } else {
            if (data.type === 'image') {
              meta = { duration: 5 };
            }
          }

          setItems(prev => {
            const idx = prev.findIndex(i => i.id === itemId);
            if (idx === -1) return prev;
            const existing = prev[idx];

            const realW = meta?.naturalWidth || existing.naturalWidth || 500;
            const realH = meta?.naturalHeight || existing.naturalHeight || 500;
            const realDur = meta?.duration || existing.duration;

            const wRatio = safeCanvasW / realW;
            const hRatio = safeCanvasH / realH;
            const scale = Math.min(wRatio, hRatio);
            const updatedW = Math.round(realW * scale);
            const updatedH = Math.round(realH * scale);

            const updatedItem = {
              ...existing,
              width: updatedW,
              height: updatedH,
              naturalWidth: realW,
              naturalHeight: realH,
              sourceDuration: realDur,
              duration: (['video'].includes(data.type) && realDur > 0) ? Math.min(realDur, DURATION_LIMIT) : existing.duration,
              x: (safeCanvasW - updatedW) / 2,
              y: (safeCanvasH - updatedH) / 2,
              isLoading: false
            };

            const next = [...prev];
            next[idx] = updatedItem;
            return next;
          });
        } catch (err) {
          console.warn("Background metadata fetch failed", err);
          setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLoading: false } : i));
        }
      })();
    }

    // FIX: For audio clips with unknown duration, fetch real duration asynchronously
    // and update the timeline item once we have it.
    if (needsAudioDurationFetch && data.url) {
      (async () => {
        try {
          const realDuration = await new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'metadata';
            // Do NOT set crossOrigin — Firebase/CDN audio blocks CORS preflight
            const tid = setTimeout(() => {
              audio.src = '';
              resolve(null); // Give up gracefully, don't cache a bad value
            }, 15000);
            audio.addEventListener('loadedmetadata', () => {
              clearTimeout(tid);
              const dur = audio.duration;
              audio.src = '';
              resolve(isFinite(dur) && dur > 0.5 ? dur : null);
            });
            audio.addEventListener('error', () => {
              clearTimeout(tid);
              // CORS retry without crossOrigin (already no crossOrigin set, so this
              // means the URL itself failed — don't cache 5s, just resolve null)
              resolve(null);
            });
            audio.src = data.url;
          });

          if (realDuration && realDuration > 0.5) {
            setItems(prev => prev.map(i => {
              if (i.id !== itemId) return i;
              return {
                ...i,
                duration: Math.min(realDuration, DURATION_LIMIT),
                sourceDuration: realDuration,
                isLoading: false
              };
            }));
          } else {
            setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLoading: false } : i));
          }
        } catch (err) {
          console.warn("Audio duration fetch failed", err);
          setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLoading: false } : i));
        }
      })();
    }

  }, [items, tracks, selectedIds, setItems, setTracks, calculateCollision, internalDragRef]);


  // --- 7. RESIZE FACTORY ---
  // const handleResizeFactory = useCallback((item, side, mediaFiles, visibleStart, visibleWindowSec) => (e) => {
  //   const parentTrack = tracks.find(t => t.id === item.trackId);
  //   if (parentTrack && parentTrack.locked) { e.preventDefault(); e.stopPropagation(); return; }

  //   e.stopPropagation(); e.preventDefault();
  //   const timelineEl = e.currentTarget.closest('.timeline');
  //   const tlRect = timelineEl?.querySelector('.timeline-markers')?.getBoundingClientRect();
  //   if (!tlRect) return;

  //   const mf = mediaFiles.find((f) => String(f.id) === String(item.mediaId));
  //   const speed = item.speed || 1;
  //   let baseMaxDuration = (item.sourceDuration || mf?.actualDuration || 300);
  //   if (item.type === 'image' || item.type === 'text') { baseMaxDuration = 300; }

  //   const move = (me) => {
  //       const pct = (me.clientX - tlRect.left) / tlRect.width;
  //       const newTime = Math.round((visibleStart + (pct * visibleWindowSec)) * 100) / 100;
  //       setItems((prev) => prev.map((ti) => {
  //         if (ti.id !== item.id) return ti;
  //         if (side === 'left') {
  //           let newStart = Math.min(ti.startTime + ti.duration - 0.5, Math.max(0, newTime));
  //           const delta = newStart - ti.startTime;
  //           let newOffset = (ti.offset || 0) + (delta * speed);
  //           if (newOffset < 0) { newOffset = 0; newStart = ti.startTime - ((ti.offset || 0) / speed); }
  //           return { ...ti, startTime: newStart, duration: Math.max(0.5, (ti.startTime + ti.duration) - newStart), offset: newOffset };
  //         } else {
  //           let newDur = Math.max(0.5, newTime - ti.startTime);
  //           const availableContentDuration = (baseMaxDuration - (ti.offset || 0)) / speed;
  //           const allowed = (item.type === 'image' || item.type === 'text') ? 300 : availableContentDuration;
  //           return { ...ti, duration: Math.min(newDur, allowed, 300 - ti.startTime) };
  //         }
  //       }));
  //   };
  //   const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  //   document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  // }, [setItems, tracks]);


  // --- 7. RESIZE FACTORY (UPDATED WITH SNAPPING) ---
  const handleResizeFactory = useCallback((item, side, mediaFiles, visibleStart, visibleWindowSec) => (e) => {
    const parentTrack = tracks.find(t => t.id === item.trackId);
    if (parentTrack && parentTrack.locked) { e.preventDefault(); e.stopPropagation(); return; }

    e.stopPropagation(); e.preventDefault();
    const timelineEl = e.currentTarget.closest('.timeline');
    const tlRect = timelineEl?.querySelector('.timeline-markers')?.getBoundingClientRect();
    if (!tlRect) return;

    // --- 1. SETUP GUIDE ELEMENT (Yellow Line) ---
    const containerTop = tlRect.top;
    const timelineContainer = timelineEl.closest('.timeline-container') || timelineEl;
    const containerHeight = timelineContainer.clientHeight;

    const guideEl = document.createElement('div');
    guideEl.className = 'timeline-guide-line';
    Object.assign(guideEl.style, {
      position: 'fixed',
      top: `${containerTop}px`,
      height: `${containerHeight}px`,
      width: '0px',
      borderLeft: '2px dotted #D1FE17',
      zIndex: '2147483647',
      pointerEvents: 'none',
      display: 'none',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)'
    });
    const guideLabel = document.createElement('div');
    Object.assign(guideLabel.style, {
      position: 'absolute', top: '50px', left: '6px',
      background: '#D1FE17', color: '#000', padding: '2px 6px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    });
    guideEl.appendChild(guideLabel);
    document.body.appendChild(guideEl);

    // --- 2. PREPARE SNAPPING DATA ---
    // We snap to all items EXCEPT the one being resized
    const staticItems = items.filter(i => i.id !== item.id);
    const SNAP_PX = 15; // Pixel threshold for magnetic snap
    const SNAP_SEC = (SNAP_PX / tlRect.width) * visibleWindowSec;

    const mf = mediaFiles.find((f) => String(f.id) === String(item.mediaId));
    const speed = item.speed || 1;
    let baseMaxDuration = (item.sourceDuration || mf?.actualDuration || 300);
    if (item.type === 'image' || item.type === 'text') { baseMaxDuration = 300; }

    const move = (me) => {
      const pct = (me.clientX - tlRect.left) / tlRect.width;

      // Calculate the raw time under the mouse cursor
      let rawTime = visibleStart + (pct * visibleWindowSec);

      // --- 3. CALCULATE SNAPPING ---
      let snappedTime = null;

      // Check against other clips' Start and End times
      for (const other of staticItems) {
        const os = other.startTime;
        const oe = other.startTime + other.duration;

        // Is our cursor close to another clip's start?
        if (Math.abs(rawTime - os) < SNAP_SEC) { snappedTime = os; }
        // Is our cursor close to another clip's end?
        else if (Math.abs(rawTime - oe) < SNAP_SEC) { snappedTime = oe; }

        if (snappedTime !== null) break;
      }

      // Check Global Snaps (0:00 and Timeline End)
      if (snappedTime === null) {
        if (Math.abs(rawTime - 0) < SNAP_SEC) snappedTime = 0;
        if (Math.abs(rawTime - DURATION_LIMIT) < SNAP_SEC) snappedTime = DURATION_LIMIT;
      }

      // Apply Snap if found
      if (snappedTime !== null) {
        rawTime = snappedTime;

        // Show the visual guide
        const snapLeftPct = (snappedTime - visibleStart) / visibleWindowSec;
        const snapX = tlRect.left + (snapLeftPct * tlRect.width);

        // Only show if visible on screen
        if (snapX >= tlRect.left && snapX <= tlRect.right) {
          guideEl.style.display = 'block';
          guideEl.style.left = `${snapX}px`;
          guideLabel.textContent = formatTime(snappedTime);
        } else {
          guideEl.style.display = 'none';
        }
      } else {
        guideEl.style.display = 'none';
      }

      // Use the (potentially snapped) time for the logic
      const newTime = Math.round(rawTime * 100) / 100;

      setItems((prev) => prev.map((ti) => {
        if (ti.id !== item.id) return ti;

        if (side === 'left') {
          // Trimming the Start (Left Handle)
          let newStart = Math.min(ti.startTime + ti.duration - 0.5, Math.max(0, newTime));
          const delta = newStart - ti.startTime;
          let newOffset = (ti.offset || 0) + (delta * speed);

          // Prevent scrolling content past 0
          if (newOffset < 0) {
            newOffset = 0;
            newStart = ti.startTime - ((ti.offset || 0) / speed);
          }
          return { ...ti, startTime: newStart, duration: Math.max(0.5, (ti.startTime + ti.duration) - newStart), offset: newOffset };

        } else {
          // Trimming the End (Right Handle)
          let newDur = Math.max(0.5, newTime - ti.startTime);
          const availableContentDuration = (baseMaxDuration - (ti.offset || 0)) / speed;
          const allowed = (item.type === 'image' || item.type === 'text') ? 300 : availableContentDuration;

          return { ...ti, duration: Math.min(newDur, allowed, 300 - ti.startTime) };
        }
      }));
    };

    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      // CLEANUP: Remove the yellow line from DOM
      try { guideEl.remove(); } catch { }
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, [setItems, tracks, items]); // <--- IMPORTANT: Added 'items' dependency so it knows about other clipsz


  const addItem = useCallback((payload) => {
    setItems((prev) => {
      let targetTrackId = payload.trackId;
      if (!targetTrackId) {
        const suitableTrack = tracks.find(t => t.type === payload.type && !t.locked);
        targetTrackId = suitableTrack ? suitableTrack.id : createTrack(payload.type).id;
      }

      const id = `${payload.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newItem = {
        ...payload,
        id: id,
        type: payload.type || 'image',
        startTime: typeof payload.startTime === 'number' ? payload.startTime : 0,
        duration: payload.actualDuration || payload.duration || 5,
        trackId: targetTrackId,
        x: payload.x ?? 0,
        y: payload.y ?? 0,
        width: payload.width || payload.naturalWidth || 500,
        height: payload.height || payload.naturalHeight || 281,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        locked: false,
        name: payload.name || 'New Item',
        style: payload.style || {},
        animation: payload.animation || { in: { type: 'none' }, out: { type: 'none' } }
      };

      return [...prev, newItem];
    });
  }, [setItems, tracks, createTrack]);


  return {
    items, setItems, undo, redo, canUndo, canRedo,
    tracks: visibleTracks, setTracks,
    toggleTrackLock, removeGap,
    findOrCreateTrack, getLastClipEndTime, timelineItemStyle, deleteItemByIndex,
    handleResizeFactory, handleDragFactory, onDropFactory, addPastedItem, selectedIds, setSelectedIds, removeSelectedItems,
    addVideo, addItem
  };
}


/* ===========================
   FFMPEG Logic
=========================== */
// ✅ LOWERED THRESHOLD TO 30MB to catch your 35-40mb files
const COMPRESSION_THRESHOLD = 30 * 1024 * 1024;
let ffmpegInstance = null;

const compressVideo = async (file, onProgress) => {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }
  const ffmpeg = ffmpegInstance;

  if (!ffmpeg.loaded) {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }

  const inputName = 'input.mp4';
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  ffmpeg.on('log', ({ message }) => {
    if (onProgress) onProgress(`FFmpeg: ${message}`);
  });

  // ✅ ADDED DOWNSCALING: 'scale='min(1920,iw)':-2'
  // This forces any video wider than 1920px (4K) to downscale to 1080p.
  // This fixes "Loading Failed" on Canvas for large textures.
  await ffmpeg.exec([
    '-i', inputName,
    '-vf', "scale='min(1920,iw)':-2",
    '-vcodec', 'libx264',
    '-crf', '28',
    '-preset', 'ultrafast',
    outputName
  ]);

  const data = await ffmpeg.readFile(outputName);

  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return new File([data.buffer], file.name, { type: 'video/mp4' });
};




export function usePlaybackControls({ isPlaying, setIsPlaying, currentTime, setCurrentTime, getLastClipEndTime, playerRef }) {
  const startRef = useRef(0);
  const animRef = useRef(null);
  const getLastClipEndTimeRef = useRef(getLastClipEndTime);
  useEffect(() => { getLastClipEndTimeRef.current = getLastClipEndTime; }, [getLastClipEndTime]);
  const stop = useCallback(() => {
    setIsPlaying(false);
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
    try { playerRef.current?.pause?.(); } catch { }
  }, [setIsPlaying, playerRef]);
  const tick = useCallback(() => {
    const loop = () => {
      const elapsedMs = performance.now() - startRef.current;
      const newTime = Math.min(DURATION_LIMIT, elapsedMs / 1000);
      const end = getLastClipEndTimeRef.current();
      if (end <= 0) { stop(); setCurrentTime(0); return; }
      if (newTime < end && newTime < DURATION_LIMIT) { setCurrentTime(newTime); animRef.current = requestAnimationFrame(loop); }
      else { stop(); setCurrentTime(end); try { playerRef.current?.seekTo?.(Math.floor(end * FPS)); } catch { } }
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(loop);
  }, [setCurrentTime, stop, playerRef]);
  const playPause = useCallback(() => {
    const next = !isPlaying;
    if (next) {
      if (currentTime >= getLastClipEndTimeRef.current() || currentTime >= DURATION_LIMIT) {
        setCurrentTime(0); startRef.current = performance.now();
        try { playerRef.current?.seekTo?.(0); playerRef.current?.play?.(); } catch { }
        setIsPlaying(true); tick(); return;
      }
      startRef.current = performance.now() - currentTime * 1000;
      try { playerRef.current?.seekTo?.(Math.floor(currentTime * FPS)); playerRef.current?.play?.(); } catch { }
      setIsPlaying(true); tick(); return;
    }
    stop();
  }, [isPlaying, currentTime, stop, tick, playerRef]);
  // const seek = useCallback((time) => {
  //     const t = Math.max(0, Math.min(DURATION_LIMIT, time));
  //     setCurrentTime(t);
  //     startRef.current = performance.now() - t * 1000;
  //     try { playerRef.current?.seekTo?.(Math.floor(t * FPS)); } catch {}
  // }, [setCurrentTime, playerRef]);


  const seek = useCallback((time) => {
    const t = Math.max(0, Math.min(DURATION_LIMIT, time));
    setCurrentTime(t);
    startRef.current = performance.now() - t * 1000;

    if (playerRef.current) {
      try { playerRef.current.seekTo(Math.floor(t * FPS)); } catch { }
    }

    // If playing, pause the RAF loop for one frame to let Remotion catch up,
    // then restart it anchored to the new position.
    // Without this, the timer races ahead while Remotion buffers the new position.
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
      // Re-anchor startRef after a short yield so the loop restarts in sync
      setTimeout(() => {
        startRef.current = performance.now() - t * 1000;
        tick();
      }, 50); // 50ms — enough for Remotion to complete a seek on a local/CDN asset
    }
  }, [setCurrentTime, playerRef, tick]);

  useEffect(() => () => animRef.current && cancelAnimationFrame(animRef.current), []);
  return { playPause, seek };
}

const DB_NAME = 've-local-db';
const DB_VERSION = 1;
const STORE = 'projects';
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, val) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(val, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
export function useProjectPersistence({ projectKey, items, setItems, mediaFiles, setMediaFiles, tracks, setTracks, transitions, setTransitions, aspectRatio, setAspectRatio }) {
  const loadedRef = useRef(false);
  const [loaded, setLoaded] = useState(false); // ✅ FIX: useState so React re-renders when load completes
  const serialize = useCallback(async () => {
    const media = mediaFiles.map(m => ({
      id: m.id, type: m.type, name: m.name, actualDuration: m.actualDuration || 5, naturalWidth: m.naturalWidth, naturalHeight: m.naturalHeight,
      kind: m.file instanceof File ? 'blob' : 'remote', blob: m.file instanceof File ? m.file : null, remoteUrl: m.remoteUrl || m.url
    }));
    const timeline = items.map(t => ({ ...t, filters: Array.isArray(t.filters) ? t.filters : [], maskType: t.maskType, _hydrated: true }));
    return { media, timeline, trackList: tracks.map(t => ({ id: t.id, type: t.type, label: t.label })), transitions: transitions || [], meta: { aspectRatio }, savedAt: Date.now() };
  }, [mediaFiles, items, tracks, transitions, aspectRatio]);
  const deserialize = useCallback((saved) => {
    if (!saved) return { mediaFiles: [], items: [], tracks: [], transitions: [], meta: {} };
    const media = (saved.media || []).map(m => {
      let url = m.url;
      if (m.kind === 'blob' && m.blob instanceof Blob) url = URL.createObjectURL(m.blob);
      else if (m.remoteUrl) url = m.remoteUrl;
      return { ...m, file: m.blob, url, remoteUrl: m.remoteUrl || null };
    });
    const urlMap = new Map(media.map(m => [String(m.id), m.url]));
    const timeline = (saved.timeline || []).map(t => {
      const restoredUrl = urlMap.get(String(t.mediaId));
      return { ...t, url: restoredUrl || t.url, _hydrated: (t._hydrated || (t.width && t.height)) ? true : false };
    }).filter(t => t.type === 'text' || t.url);
    return { mediaFiles: media, items: timeline, tracks: saved.trackList || [], transitions: saved.transitions || [], meta: saved.meta || {} };
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const saved = (await idbGet(projectKey)) || JSON.parse(sessionStorage.getItem(`ve_project_${projectKey}`));
        if (saved) {
          const { mediaFiles: mf, items: tl, tracks: tr, transitions: trans, meta } = deserialize(saved);
          if (mf) setMediaFiles(mf); if (tl) setItems(tl); if (tr) setTracks(tr);
          if (trans && setTransitions) setTransitions(trans); if (meta?.aspectRatio && setAspectRatio) setAspectRatio(meta.aspectRatio);
        }
      } catch (e) { console.error("Load failed", e); }
      loadedRef.current = true;
      setLoaded(true); // ✅ FIX: triggers re-render so dependents (e.g. VideoUrldata useEffect) fire
    })();
  }, [projectKey]);
  useEffect(() => {
    if (!loadedRef.current) return;
    let t = setTimeout(async () => {
      const snap = await serialize();
      try { await idbSet(projectKey, cleanImageData(snap)); } catch { }
      sessionStorage.setItem(`ve_project_${projectKey}`, JSON.stringify(cleanImageData(snap)));
    }, 250);
    return () => clearTimeout(t);
  }, [projectKey, items, mediaFiles, tracks, transitions, aspectRatio, serialize]);
  return { loaded }; // ✅ FIX: returns reactive state, not a snapshot of a ref
}

/* ===========================
   Font Helpers
=========================== */
function getFontDetails(family, weight, style) {
  const safeFamily = (family || 'Roboto').replace(/['"]/g, "").trim();
  const defaults = { url: `${FONT_BASE_URL}/Roboto-Regular.ttf`, family: 'Roboto', weight: 'normal', style: 'normal' };
  if (!safeFamily.toLowerCase().includes('roboto')) return defaults;
  let w = String(weight).toLowerCase();
  let s = String(style).toLowerCase();
  let numW = parseInt(w);
  if (isNaN(numW)) {
    if (w.includes('bold')) numW = 700;
    else if (w.includes('light')) numW = 300;
    else if (w.includes('medium')) numW = 500;
    else numW = 400;
  }
  let weightFilePart = 'Regular';
  let shotstackWeight = 'normal';
  if (numW <= 100) { weightFilePart = 'Thin'; shotstackWeight = 'thin'; }
  else if (numW <= 300) { weightFilePart = 'Light'; shotstackWeight = 'light'; }
  else if (numW <= 400) { weightFilePart = 'Regular'; shotstackWeight = 'normal'; }
  else if (numW < 700) { weightFilePart = 'Medium'; shotstackWeight = 'medium'; } // Supports 500/600
  else if (numW < 900) { weightFilePart = 'Bold'; shotstackWeight = 'bold'; }    // Supports 700/800
  else { weightFilePart = 'Black'; shotstackWeight = 'black'; }                  // Supports 900
  const isItalic = (s.includes('italic'));
  const shotstackStyle = isItalic ? 'italic' : 'normal';
  let suffix = weightFilePart;
  if (isItalic) {
    if (weightFilePart === 'Regular') suffix = 'Italic';
    else suffix = weightFilePart + 'Italic';
  }
  return {
    url: `${FONT_BASE_URL}/Roboto-${suffix}.ttf`,
    family: 'Roboto',
    weight: shotstackWeight,
    style: shotstackStyle
  };
}

// // ✅ FIXED: Helper now accepts 'isEntrance' to flip directions correctly
// const getShotstackTransition = (type, durationSec, isEntrance = false) => {
//   if (!type || type === 'none') return undefined;

//   // 1. Map UI IDs to Shotstack Base Types
//   // NOTE: 'zoom' is NOT a valid Shotstack transition. We map it to 'fade' or remove it.
//   const typeMap = {
//       'fade': 'fade',
//       'crossfade': 'fade',
//       'reveal': 'reveal',
//       // 'zoom': 'zoom', // REMOVE THIS - Zoom is not a transition
//       // 'scale': 'zoom', // REMOVE THIS
//       'wipeLeft': 'wipeLeft',
//       'wipeRight': 'wipeRight',
//       'typewriter': 'wipeRight',
//       'slideUp': 'slideUp',
//       'slideDown': 'slideDown',
//       'slideLeft': 'slideLeft',
//       'slideRight': 'slideRight',
//       'carouselLeft': 'carouselLeft', 'carouselRight': 'carouselRight',
//       'carouselUp': 'carouselUp', 'carouselDown': 'carouselDown',
//       'zoom': 'fade'
//   };

//   let shotstackType = typeMap[type];

//   // If no direct map found (e.g. 'zoom' or custom), fallback to 'fade'
//   // This prevents the "Invalid option" error in Shotstack
//   if (!shotstackType) shotstackType = 'fade';

//   // 2. DIRECTION FIX:
//   // If User selected "Slide In Left" (enter from left), we must move Right.
//   if (isEntrance) {
//       if (type === 'slideLeft') shotstackType = 'slideRight';
//       else if (type === 'slideRight') shotstackType = 'slideLeft';
//   }

//   const dur = Number(durationSec) || 1.0;

//   // 3. Speed Suffix
//   let suffix = '';
//   if (dur <= 0.5) suffix = 'Fast';
//   else if (dur >= 2.0) suffix = 'Slow';

//   return `${shotstackType}${suffix}`;
// };


// ✅ FIXED: Helper now strictly returns the transition type string (no suffixes)
// Accepts 'isEntrance' to flip directions correctly (e.g. Slide Left vs Slide Right)
const getShotstackTransition = (type, isEntrance = false) => {
  if (!type || type === 'none') return undefined;

  // 1. Map UI IDs to Shotstack Base Types
  const typeMap = {
    'fade': 'fade',
    'crossfade': 'fade',
    'reveal': 'reveal',
    'wipeLeft': 'wipeLeft',
    'wipeRight': 'wipeRight',
    'typewriter': 'wipeRight',
    'slideUp': 'slideUp',
    'slideDown': 'slideDown',
    'slideLeft': 'slideLeft',
    'slideRight': 'slideRight',
    'carouselLeft': 'carouselLeft', 'carouselRight': 'carouselRight',
    'carouselUp': 'carouselUp', 'carouselDown': 'carouselDown',
    'zoom': 'fade'
  };

  let shotstackType = typeMap[type];

  // Fallback to 'fade' if not found
  if (!shotstackType) shotstackType = 'fade';

  // 2. DIRECTION FIX:
  // If User selected "Slide In Left" (enter from left), we must move Right.
  if (isEntrance) {
    if (type === 'slideLeft') shotstackType = 'slideRight';
    else if (type === 'slideRight') shotstackType = 'slideLeft';
  }

  return shotstackType;
};


// Helper to map weight/style to your specific GitHub file names
function getRobotoFileUrl(weight, isItalic) {
  const base = "https://raw.githubusercontent.com/fiercfly/Roboto/main/Roboto/static";
  let suffix = 'Regular';
  if (weight >= 900) suffix = 'Black';
  else if (weight >= 700) suffix = 'Bold';
  else if (weight >= 500) suffix = 'Medium';
  else if (weight >= 300 && weight < 400) suffix = 'Light';
  else if (weight <= 100) suffix = 'Thin';
  else suffix = 'Regular';

  if (isItalic) {
    if (suffix === 'Regular') suffix = 'Italic';
    else suffix = suffix + 'Italic';
  }
  return `${base}/Roboto-${suffix}.ttf`;
}

// ... inside useVideoEditorHooks.js ...

// export function useExport({
//   items, mediaFiles, userId, uploaders, onStart, onDone, onError,
//   onProgress, transitions = [], tracks = [], canvasWidth = 1080, canvasHeight = 1920, exportRange,
//   canvasBackgroundColor = "#000000", projectId,
//   exportUserId, uniqueId // ✅ FIXED: Accept and forward background color
// }) {
//   const [isExporting, setIsExporting] = useState(false);
//   const pollInterval = useRef(null);

//   // Helper to update the Header UI
//   const updateProgressUI = (percent) => {
//     window.dispatchEvent(new CustomEvent('video-export-progress', {
//       detail: { percent }
//     }));
//   };



//   // const exportVideo = useCallback(async () => {
//   const exportVideo = useCallback(async (exportOptions = {}) => {
//     if (isExporting) return;
//     setIsExporting(true);

//     onStart?.();
//     updateProgressUI(0);

//     try {
//       // --- STEP 1: PREPARE ASSETS (Uploads) ---
//       onProgress?.('uploading');

//       // const preparedItems = await Promise.all(items.map(async (item) => {
//       //   if (item.type === 'text') return item;
//       //   const mediaFile = mediaFiles.find(m => String(m.id) === String(item.mediaId));
//       //   let validUrl = item.url;

//       //   // Logic to upload local blobs to cloud before export
//       //   if (mediaFile?.remoteUrl) {
//       //     validUrl = mediaFile.remoteUrl;
//       //   } else if (item.url?.startsWith('blob:')) {
//       //     try {
//       //       console.log(`[Export Pipeline] Fetching local blob: ${item.url}`);
//       //       const blobResponse = await fetch(item.url);
//       //       const blob = await blobResponse.blob();

//       //       const formData = new FormData();
//       //       // Preserve the original name if possible, or fallback
//       //       const filename = mediaFile?.file?.name || `upload_${Date.now()}.mp4`;
//       //       formData.append('file', blob, filename);

//       //       const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
//       //       const uploadRes = await fetch(`${backendUrl}/api/upload`, {
//       //         method: 'POST',
//       //         body: formData
//       //       });

//       //       if (uploadRes.ok) {
//       //         const uploadData = await uploadRes.json();
//       //         validUrl = uploadData.url;
//       //         console.log(`[Export Pipeline] Proxy Uploaded blob: ${item.url} -> ${validUrl}`);
//       //       } else {
//       //         console.error(`[Export Pipeline] Backend rejected proxy upload for ${item.id}`, await uploadRes.text());
//       //       }
//       //     } catch (err) {
//       //       console.error(`[Export Pipeline] Failed proxy upload for ${item.id}`, err);
//       //     }
//       //   }
//       //   return { ...item, url: validUrl };
//       // }));

//       // --- STEP 2: PREPARE DATA ---
//       // onProgress?.('processing');
//       // const exportData = exportTimelineForRemotion(preparedItems, tracks, transitions, canvasWidth, canvasHeight, exportRange, canvasBackgroundColor); // ✅ FIXED: Pass background color

//       // // ✅ CHANGE 1: Generate a unique ID if one wasn't provided in props
//       // const finalUniqueId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

//       // const finalPayload = {
//       //   ...exportData,
//       //   projectId: projectId,
//       //   userId: exportUserId,
//       //   uniqueId: finalUniqueId // ✅ CHANGE 2: Use the resolved ID here
//       // };


//       // 2. Pass exportOptions to the remotion formatter

//       // Locate this block inside the useExport hook in useVideoEditorHooks.js

//       const preparedItems = await Promise.all(items.map(async (item) => {
//         if (item.type === 'text') return item;
//         const mediaFile = mediaFiles.find(m => String(m.id) === String(item.mediaId));
//         let validUrl = item.url;

//         // Logic to upload local blobs to cloud before export
//         if (mediaFile?.remoteUrl) {
//           validUrl = mediaFile.remoteUrl;
//         } else if (item.url?.startsWith('blob:')) {
//           try {
//             console.log(`[Export Pipeline] Fetching local blob: ${item.url}`);
//             const blobResponse = await fetch(item.url);
//             const blob = await blobResponse.blob();

//             const filename = mediaFile?.file?.name || `upload_${Date.now()}.mp4`;
//             const fileToUpload = new File([blob], filename, { type: blob.type || 'video/mp4' });

//             // 1. USE FIREBASE UPLOADERS INSTEAD OF LOCALHOST ENDPOINT
//             const folder = `${userId || 'guest'}/MyUploads/videoeditorFile`;
//             let uploadResult;

//             if (item.type === 'video') {
//               uploadResult = await uploaders.uploadFileVideo(fileToUpload, folder);
//             } else if (item.type === 'audio') {
//               uploadResult = await uploaders.uploadFileAudio(fileToUpload, folder);
//             } else {
//               uploadResult = await uploaders.uploadFile(fileToUpload, folder);
//             }

//             validUrl = typeof uploadResult === 'string' ? uploadResult : uploadResult?.url;

//             if (!validUrl) throw new Error("Upload SDK returned an empty URL");

//             console.log(`[Export Pipeline] Blob uploaded successfully: ${item.url} -> ${validUrl}`);
//           } catch (err) {
//             console.error(`[Export Pipeline] Failed proxy upload for ${item.id}`, err);

//             // 2. CRITICAL FIX: THROW ERROR TO ABORT EXPORT
//             // Do NOT let the export continue with a blob: URL. 
//             throw new Error(`Media file hasn't finished uploading to the cloud. Please wait or try again.`);
//           }
//         }
//         return { ...item, url: validUrl };
//       }));


//       onProgress?.('processing');
//       const exportData = exportTimelineForRemotion(
//         preparedItems, tracks, transitions, canvasWidth, canvasHeight,
//         exportRange, canvasBackgroundColor, exportOptions
//       );

//       const finalUniqueId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

//       const finalPayload = {
//         ...exportData,
//         projectId: projectId,
//         userId: exportUserId,
//         uniqueId: finalUniqueId
//       };

//       // const finalPayload = {
//       //   ...exportData,
//       //   projectId: projectId,
//       //   userId: exportUserId,
//       //   uniqueId: uniqueId // <--- 2. Add uniqueId to payload
//       // };
//       // --- STEP 3: START RENDER ---
//       onProgress?.('rendering');

//       const RENDER_API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
//       const renderResponse = await fetch(`${RENDER_API}/api/render`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         // body: JSON.stringify(exportData),
//         body: JSON.stringify(finalPayload),
//       });

//       if (!renderResponse.ok) {
//         const errText = await renderResponse.text();
//         throw new Error(`Server Error: ${errText}`);
//       }

//       const { renderId, bucketName } = await renderResponse.json();
//       console.log('🎬 Render started:', { renderId, bucketName });

//       if (!renderId || !bucketName) throw new Error('Missing renderId or bucketName from server');

//       // --- STEP 4: POLL /status UNTIL DONE ---
//       // Recursive setTimeout (not setInterval) so requests never overlap.
//       // visibilitychange handler defeats browser background-tab throttling.
//       const POLL_MS = 2000;
//       const MAX_MS = 30 * 60 * 1000; // 30 min ceiling

//       const cloudUrl = await new Promise((resolve, reject) => {
//         let settled = false;
//         let pollTimer = null;
//         const startTs = Date.now();

//         const finish = (err, url) => {
//           if (settled) return;
//           settled = true;
//           clearTimeout(pollTimer);
//           document.removeEventListener('visibilitychange', onVisible);
//           pollInterval.current = null;
//           if (err) reject(err); else resolve(url);
//         };

//         const doPoll = async () => {
//           if (settled) return;
//           if (Date.now() - startTs > MAX_MS) {
//             finish(new Error('Render timed out after 30 minutes')); return;
//           }
//           try {
//             const res = await fetch(
//               `${RENDER_API}/api/status`,
//               {
//                 method: 'POST', headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ renderId, bucketName })
//               }
//             );
//             if (res.ok) {
//               const data = await res.json();
//               console.log('📊 Poll:', data.status, data.progress);
//               if (typeof data.progress === 'number') {
//                 updateProgressUI(Math.min(95, Math.max(1, Math.round(data.progress * 100))));
//               }
//               if (data.status === 'done' && data.url) { finish(null, data.url); return; }
//               if (data.status === 'error') { finish(new Error(data.error || 'Render failed')); return; }
//             }
//           } catch (e) { console.warn('📊 Poll error (retrying):', e.message); }
//           if (!settled) pollTimer = setTimeout(doPoll, POLL_MS);
//         };

//         const onVisible = () => {
//           if (!settled && document.visibilityState === 'visible') {
//             clearTimeout(pollTimer); doPoll();
//           }
//         };
//         document.addEventListener('visibilitychange', onVisible);
//         pollInterval.current = { cancel: () => finish(new Error('cancelled')) };
//         doPoll();
//       });

//       // --- STEP 5: DOWNLOAD THE RENDERED MP4 ---
//       // The problem: GCS/Firebase signed URLs serve video/mp4 — clicking them
//       // makes the browser PLAY the video in-page, not download it.
//       // fetch().blob() buffers the whole file in RAM — fails for large videos.
//       //
//       // THE SOLUTION: fetch the video through our own /download endpoint
//       // (same origin → no CORS), read the response body as a ReadableStream,
//       // pipe it through a TransformStream into a Blob built from chunks,
//       // then save via File System Access API (showSaveFilePicker) on Chrome
//       // or fall back to a chunked-blob download on other browsers.
//       // This approach: (a) never opens the video in-page, (b) streams to disk
//       // so RAM usage is only the current chunk (~1 MB), not the whole file.
//       updateProgressUI(100);
//       onProgress?.('downloading');

//       // const fileName = `video_${projectId || Date.now()}.mp4`;
//       // const RENDER_BASE = 'https://us-central1-appydesigne-24e6c.cloudfunctions.net/renderServer';
//       const fileExt = exportOptions.format === 'mp3' ? 'mp3' : 'mp4';
//       const fileName = `video_${projectId || Date.now()}.${fileExt}`;
//       // --- FALLBACK: Standard Download ---
//       // ─── Core helper: pipe an already-open Response to disk ─────────────────
//       // Accepts any fetch Response whose body is the raw MP4 binary.
//       // Validates content-type first so we never save JSON/HTML as an .mp4.
//       const consumeResponseStream = async (res) => {
//         if (!res.ok) throw new Error(`Fetch ${res.status}: ${res.statusText}`);

//         // ✅ FIX: Guard against receiving JSON/HTML instead of video binary.
//         // This is the root cause of "mp4 can't be played" — the CDN or proxy
//         // returned a non-binary response (e.g. a JSON error or redirect page)
//         // and we were blindly wrapping it in new Blob(..., { type:'video/mp4' }).
//         // const resCt = res.headers.get('content-type') || '';
//         // if (resCt && !resCt.includes('video/') && !resCt.includes('application/octet-stream') && !resCt.includes('binary/')) {
//         //   // Read the body so we can log it for debugging
//         //   const preview = await res.text();
//         //   throw new Error(
//         //     `Expected video binary but got "${resCt}". ` +
//         //     `Server said: ${preview.slice(0, 300)}`
//         //   );
//         // }

//         const resCt = res.headers.get('content-type') || '';
//         // ✅ Relax the strict video/mp4 check to allow audio/mpeg for mp3
//         if (resCt && !resCt.includes('video/') && !resCt.includes('audio/') && !resCt.includes('application/octet-stream') && !resCt.includes('binary/')) {
//           const preview = await res.text();
//           throw new Error(`Expected media binary but got "${resCt}". Server said: ${preview.slice(0, 300)}`);
//         }

//         // Path A: File System Access API (Chrome 86+, Edge 86+)
//         // Shows native Save dialog, streams directly to disk, zero heap usage
//         if (typeof window.showSaveFilePicker === 'function') {
//           try {
//             const handle = await window.showSaveFilePicker({
//               suggestedName: fileName,
//               types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
//             });
//             const writable = await handle.createWritable();
//             await res.body.pipeTo(writable);
//             // pipeTo() closes the writable when done — file is saved
//             return;
//           } catch (e) {
//             if (e.name === 'AbortError') return; // user cancelled — that's fine
//             // showSaveFilePicker failed for another reason — fall through to Path B
//             console.warn('showSaveFilePicker failed, falling back:', e.message);
//           }
//         }

//         // Path B: Chunked streaming into a Blob, then blob: URL click
//         // RAM usage = only one chunk at a time until reassembly at the end.
//         // For very large files this still uses RAM — but it's the best we can
//         // do without a service worker on browsers that lack showSaveFilePicker.
//         const reader = res.body.getReader();
//         const chunks = [];
//         let received = 0;
//         const total = parseInt(res.headers.get('Content-Length') || '0', 10);

//         while (true) {
//           const { done, value } = await reader.read();
//           if (done) break;
//           chunks.push(value);
//           received += value.length;
//           if (total > 0) {
//             // Show download progress 95→99% range
//             const dlPct = 95 + Math.round((received / total) * 4);
//             updateProgressUI(dlPct);
//           }
//         }

//         // const blob    = new Blob(chunks, { type: 'video/mp4' });
//         // const blobUrl = URL.createObjectURL(blob);
//         const mimeType = exportOptions.format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
//         const blob = new Blob(chunks, { type: mimeType });
//         const blobUrl = URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = blobUrl;
//         a.download = fileName;       // .download forces save dialog, not navigation
//         a.style.display = 'none';
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//         // Revoke after 10 min — plenty of time for any disk / OS dialog
//         setTimeout(() => URL.revokeObjectURL(blobUrl), 10 * 60 * 1000);
//       };

//       // ✅ FIX: streamingDownload now validates the response before piping.
//       // Previously it would blindly wrap any response (even JSON) as video/mp4.
//       const streamingDownload = async (fetchUrl, fetchInit = {}) => {
//         const res = await fetch(fetchUrl, fetchInit);
//         await consumeResponseStream(res);
//       };

//       try {
//         // Step 5a: Ask /download for the file.
//         // If it returns JSON { url }, we fetch THAT url through our endpoint
//         // to avoid CORS. If it streams binary directly, we consume that stream.
//         const dlRes = await fetch(`${RENDER_API}/download`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             userId: exportUserId, projectId, uniqueId: finalUniqueId, url: cloudUrl,
//           }),
//         });

//         if (!dlRes.ok) throw new Error(`/download ${dlRes.status}`);

//         const ct = dlRes.headers.get('content-type') || '';

//         if (ct.includes('application/json')) {
//           // Server returned { url } — we need to fetch that URL.
//           // We fetch it server-side (via /download?proxy=1) to avoid CORS,
//           // OR directly if the server has CORS headers (try direct first).
//           const { url: signedUrl } = await dlRes.json();
//           const targetUrl = signedUrl || cloudUrl;

//           // Try direct fetch first (works if GCS has CORS headers for this bucket)
//           try {
//             await streamingDownload(targetUrl);
//           } catch (corsErr) {
//             // Direct fetch failed (CORS or non-binary response).
//             // Re-fetch via our own endpoint as a proxy — it will pipe raw binary.
//             console.warn('Direct fetch failed, proxying via /download:', corsErr.message);
//             await streamingDownload(`${RENDER_API}/download`, {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 userId: exportUserId, projectId,
//                 uniqueId: finalUniqueId, url: targetUrl,
//                 proxy: true,  // tell server to stream the binary, not return JSON
//               }),
//             });
//           }
//         } else {
//           // ✅ FIX: Server streamed binary directly — consume the ALREADY-OPEN
//           // dlRes stream instead of making a second identical fetch() call.
//           // The old code was re-fetching /download which caused it to return
//           // JSON again (another redirect loop) instead of binary data.
//           await consumeResponseStream(dlRes);
//         }

//         onDone?.(cloudUrl, finalUniqueId);
//       } catch (dlErr) {
//         console.error('[Export] Download failed:', dlErr);
//         onError?.(new Error(`Download failed: ${dlErr.message}`));
//       }

//       setTimeout(() => updateProgressUI(0), 3000);

//     } catch (err) {
//       console.error("Export failed:", err);
//       onError?.(err);
//       updateProgressUI(0);
//     } finally {
//       setIsExporting(false);
//       try { if (pollInterval.current?.cancel) pollInterval.current.cancel(); } catch { }
//       pollInterval.current = null;
//     }
//   }, [projectId, uniqueId, exportUserId, isExporting, items, mediaFiles, userId, uploaders, tracks, transitions, canvasWidth, canvasHeight, canvasBackgroundColor]);

//   return { isExporting, exportVideo };
// }


export function useExport({
  items, mediaFiles, userId, uploaders, onStart, onDone, onError,
  onProgress, transitions = [], tracks = [], canvasWidth = 1080, canvasHeight = 1920, exportRange,
  canvasBackgroundColor = "#000000", projectId,
  exportUserId, uniqueId
}) {
  const [isExporting, setIsExporting] = useState(false);
  const pollInterval = useRef(null);

  // Helper to update the Header UI
  const updateProgressUI = (percent) => {
    window.dispatchEvent(new CustomEvent('video-export-progress', {
      detail: { percent }
    }));
  };

  const exportVideo = useCallback(async (exportOptions = {}) => {
    if (isExporting) return;
    setIsExporting(true);

    onStart?.();
    updateProgressUI(0);

    try {
      // --- STEP 1: PREPARE ASSETS (Uploads) ---
      onProgress?.('uploading');

      const preparedItems = await Promise.all(items.map(async (item) => {
        if (item.type === 'text') return item;
        const mediaFile = mediaFiles.find(m => String(m.id) === String(item.mediaId));
        let validUrl = item.url;

        // Logic to upload local blobs to cloud before export
        if (mediaFile?.remoteUrl) {
          validUrl = mediaFile.remoteUrl;
        } else if (item.url?.startsWith('blob:')) {
          try {
            console.log(`[Export Pipeline] Fetching local blob: ${item.url}`);
            const blobResponse = await fetch(item.url);
            const blob = await blobResponse.blob();

            const formData = new FormData();

            // Reconstruct the file with the proper type
            const filename = mediaFile?.file?.name || `upload_${Date.now()}.mp4`;
            const fileToUpload = new File([blob], filename, { type: blob.type || 'video/mp4' });
            formData.append('file', fileToUpload);

            // Use the standard backend API (so the renderer has local access to the file!)
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            const uploadRes = await fetch(`${backendUrl}/api/upload`, {
              method: 'POST',
              body: formData
            });

            if (!uploadRes.ok) {
              const errText = await uploadRes.text();
              throw new Error(`Local backend upload failed: ${errText}`);
            }

            const uploadData = await uploadRes.json();

            // The backend returns a URL that it can easily access during Remotion render
            validUrl = uploadData.url;
            console.log(`[Export Pipeline] Proxy Uploaded blob: ${item.url} -> ${validUrl}`);

          } catch (err) {
            console.error(`[Export Pipeline] Failed upload for ${item.id}`, err);

            // 🚨 Throwing the error stops the export so Remotion doesn't crash on a blob: URL
            throw new Error(`Media file hasn't finished uploading to the cloud. Please check your connection and try again.`);
          }
        }
        return { ...item, url: validUrl };
      }));

      // --- STEP 2: PREPARE DATA ---
      onProgress?.('processing');
      const exportData = exportTimelineForRemotion(
        preparedItems, tracks, transitions, canvasWidth, canvasHeight,
        exportRange, canvasBackgroundColor, exportOptions
      );

      const finalUniqueId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const finalPayload = {
        ...exportData,
        projectId: projectId,
        userId: exportUserId,
        uniqueId: finalUniqueId
      };

      // --- STEP 3: START RENDER ---
      onProgress?.('rendering');

      const RENDER_API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const renderResponse = await fetch(`${RENDER_API}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!renderResponse.ok) {
        const errText = await renderResponse.text();
        throw new Error(`Server Error: ${errText}`);
      }

      const { renderId, bucketName } = await renderResponse.json();
      console.log('🎬 Render started:', { renderId, bucketName });

      if (!renderId || !bucketName) throw new Error('Missing renderId or bucketName from server');

      // --- STEP 4: POLL /status UNTIL DONE ---
      const POLL_MS = 2000;
      const MAX_MS = 30 * 60 * 1000; // 30 min ceiling

      const cloudUrl = await new Promise((resolve, reject) => {
        let settled = false;
        let pollTimer = null;
        const startTs = Date.now();

        const finish = (err, url) => {
          if (settled) return;
          settled = true;
          clearTimeout(pollTimer);
          document.removeEventListener('visibilitychange', onVisible);
          pollInterval.current = null;
          if (err) reject(err); else resolve(url);
        };

        const doPoll = async () => {
          if (settled) return;
          if (Date.now() - startTs > MAX_MS) {
            finish(new Error('Render timed out after 30 minutes')); return;
          }
          try {
            const res = await fetch(
              `${RENDER_API}/api/status`,
              {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ renderId, bucketName })
              }
            );
            if (res.ok) {
              const data = await res.json();
              console.log('📊 Poll:', data.status, data.progress);
              if (typeof data.progress === 'number') {
                updateProgressUI(Math.min(95, Math.max(1, Math.round(data.progress * 100))));
              }
              if (data.status === 'done' && data.url) { finish(null, data.url); return; }
              if (data.status === 'error') { finish(new Error(data.error || 'Render failed')); return; }
            }
          } catch (e) { console.warn('📊 Poll error (retrying):', e.message); }
          if (!settled) pollTimer = setTimeout(doPoll, POLL_MS);
        };

        const onVisible = () => {
          if (!settled && document.visibilityState === 'visible') {
            clearTimeout(pollTimer); doPoll();
          }
        };
        document.addEventListener('visibilitychange', onVisible);
        pollInterval.current = { cancel: () => finish(new Error('cancelled')) };
        doPoll();
      });

      // --- STEP 5: DOWNLOAD THE RENDERED MP4 ---
      updateProgressUI(100);
      onProgress?.('downloading');

      const fileExt = exportOptions.format === 'mp3' ? 'mp3' : 'mp4';
      const fileName = `video_${projectId || Date.now()}.${fileExt}`;

      const consumeResponseStream = async (res) => {
        if (!res.ok) throw new Error(`Fetch ${res.status}: ${res.statusText}`);

        const resCt = res.headers.get('content-type') || '';
        if (resCt && !resCt.includes('video/') && !resCt.includes('audio/') && !resCt.includes('application/octet-stream') && !resCt.includes('binary/')) {
          const preview = await res.text();
          throw new Error(`Expected media binary but got "${resCt}". Server said: ${preview.slice(0, 300)}`);
        }

        if (typeof window.showSaveFilePicker === 'function') {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
            });
            const writable = await handle.createWritable();
            await res.body.pipeTo(writable);
            return;
          } catch (e) {
            if (e.name === 'AbortError') return;
            console.warn('showSaveFilePicker failed, falling back:', e.message);
          }
        }

        const reader = res.body.getReader();
        const chunks = [];
        let received = 0;
        const total = parseInt(res.headers.get('Content-Length') || '0', 10);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total > 0) {
            const dlPct = 95 + Math.round((received / total) * 4);
            updateProgressUI(dlPct);
          }
        }

        const mimeType = exportOptions.format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
        const blob = new Blob(chunks, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10 * 60 * 1000);
      };

      const streamingDownload = async (fetchUrl, fetchInit = {}) => {
        const res = await fetch(fetchUrl, fetchInit);
        await consumeResponseStream(res);
      };

      try {
        const dlRes = await fetch(`${RENDER_API}/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: exportUserId, projectId, uniqueId: finalUniqueId, url: cloudUrl,
          }),
        });

        if (!dlRes.ok) throw new Error(`/download ${dlRes.status}`);

        const ct = dlRes.headers.get('content-type') || '';

        if (ct.includes('application/json')) {
          const { url: signedUrl } = await dlRes.json();
          const targetUrl = signedUrl || cloudUrl;

          try {
            await streamingDownload(targetUrl);
          } catch (corsErr) {
            console.warn('Direct fetch failed, proxying via /download:', corsErr.message);
            await streamingDownload(`${RENDER_API}/download`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: exportUserId, projectId,
                uniqueId: finalUniqueId, url: targetUrl,
                proxy: true,
              }),
            });
          }
        } else {
          await consumeResponseStream(dlRes);
        }

        onDone?.(cloudUrl, finalUniqueId);
      } catch (dlErr) {
        console.error('[Export] Download failed:', dlErr);
        onError?.(new Error(`Download failed: ${dlErr.message}`));
      }

      setTimeout(() => updateProgressUI(0), 3000);

    } catch (err) {
      console.error("Export failed:", err);
      onError?.(err);
      updateProgressUI(0);
    } finally {
      setIsExporting(false);
      try { if (pollInterval.current?.cancel) pollInterval.current.cancel(); } catch { }
      pollInterval.current = null;
    }
  }, [projectId, uniqueId, exportUserId, isExporting, items, mediaFiles, userId, uploaders, tracks, transitions, canvasWidth, canvasHeight, canvasBackgroundColor]);

  return { isExporting, exportVideo };
}


export function useUniqueIdVideo() {
  const [uniqueIdVideoUrl, setUniqueIdVideoUrl] = React.useState(null);
  const [uniqueIdLoading, setUniqueIdLoading] = React.useState(false);
  const [uniqueIdError, setUniqueIdError] = React.useState(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uniqueid = params.get('uniqueid');
    if (!uniqueid) return;

    let cancelled = false;
    setUniqueIdLoading(true);
    setUniqueIdError(null);

    (async () => {
      try {
        // ⚠️ REPLACE "YOUR_COLLECTION" with your actual Firestore collection name
        // const docRef = doc(db, "YOUR_COLLECTION", uniqueid);
        const docRef = doc(db, "Aiprompt_Temp", uniqueid);
        const snap = await getDoc(docRef);

        if (cancelled) return;

        if (!snap.exists()) {
          console.warn(`[useUniqueIdVideo] No doc for uniqueid: ${uniqueid}`);
          setUniqueIdLoading(false);
          return;
        }

        const data = snap.data();

        // ⚠️ REPLACE "video_url" with the actual field name in your Firestore doc
        const videoUrl = data?.video_url || data?.VideoUrl || data?.videoUrl || null;

        if (!videoUrl) {
          console.warn('[useUniqueIdVideo] Doc found but no video_url field:', data);
          setUniqueIdLoading(false);
          return;
        }

        setUniqueIdVideoUrl(videoUrl);
      } catch (err) {
        if (!cancelled) {
          console.error('[useUniqueIdVideo] Fetch failed:', err);
          setUniqueIdError(err);
        }
      } finally {
        if (!cancelled) setUniqueIdLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { uniqueIdVideoUrl, uniqueIdLoading, uniqueIdError };
}




// ─────────────────────────────────────────────────────────────
//  Paste this export into useVideoEditorHooks.js
//  Place it near the other hooks, e.g. after useToast
// ─────────────────────────────────────────────────────────────

export function useMicRecorder({ onRecordingComplete }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [hasPermission, setHasPermission] = React.useState(null); // null|true|false

  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const streamRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const timeRef = React.useRef(0); // shadow for onstop closure

  React.useEffect(() => { timeRef.current = recordingTime; }, [recordingTime]);

  React.useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      setHasPermission(true);

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const ext = (recorder.mimeType || '').includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: blob.type });
        stopStream();
        onRecordingComplete?.(file, timeRef.current);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

    } catch (err) {
      console.error('[useMicRecorder]', err);
      setHasPermission(false);
    }
  }, [onRecordingComplete]);

  const stopRecording = React.useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  // NEW: Cancel recording without saving
  const cancelRecording = React.useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Clear the onstop callback to prevent saving
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.ondataavailable = null;

      // Stop the recorder
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Clean up timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop stream
      stopStream();

      // Clear chunks and reset state
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingTime(0);
    }
  }, [isRecording]);

  return { isRecording, recordingTime, hasPermission, startRecording, stopRecording, cancelRecording };
}