
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// Removed Firebase imports
import GenerateMediaSlider from './GenerateMediaSlider';
import { useSelector } from "react-redux";
import { useLocation } from 'react-router-dom';
import { useLocalProjectCache } from './standalone/useLocalProjectCache';
import { v4 as uuidv4 } from 'uuid';
import { useMediaCache } from './useVideoEditorHooks';
import { useAudioDurationManager } from './useAudioDurationManager';

/*************************
 * Constants & UI helpers *
 *************************/
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'hevc', 'mpeg']);
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus']);

const FILTERS = [
  { id: 'all', label: 'All', icon: <span className="material-icons">dashboard</span> },
  { id: 'video', label: 'Video', icon: <span className="material-icons">movie</span> },
  { id: 'image', label: 'Image', icon: <span className="material-icons">image</span> },
  { id: 'audio', label: 'Audio', icon: <span className="material-icons">audiotrack</span> },
];


/****************
 * Base helpers *
 ****************/
const normalizeAiDocId = (p) => (!p ? null : p.startsWith('AiProjects_') ? p : `AiProjects_${p}`);
const blobRegistry = new Set();

const ts = (x) => {
  if (!x) return 0;
  if (typeof x === 'object' && typeof x.seconds === 'number') {
    return x.seconds * 1000 + (x.nanoseconds ? x.nanoseconds / 1e6 : 0);
  }
  if (typeof x === 'number') return x > 1e12 ? x : x * 1000;
  const t = new Date(x).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const keyOf = (it) =>
  it?.id || it?.docId || it?.mediaId ||
  it?.url || it?.ImageUrl || it?.VideoUrl ||
  it?.AudioUrl || it?.PreviewImage || it?.thumbnail;

function mergeDedup(prev = [], incoming = []) {
  const map = new Map();
  const normalize = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  const add = (arr) => {
    for (const it of normalize(arr)) {
      const k = keyOf(it);
      if (!k) { map.set(Symbol('nokey'), it); continue; }
      if (!map.has(k)) map.set(k, it);
      else {
        const a = map.get(k);
        map.set(k, ts(it.timestamp) >= ts(a.timestamp) ? it : a);
      }
    }
  };
  add(prev);
  add(incoming);
  return Array.from(map.values()).sort((a, b) => ts(b.timestamp) - ts(a.timestamp));
}

/******************************
 * Robust URL/type normalizers *
 ******************************/
const extOf = (u) => {
  if (!u || typeof u !== 'string') return '';
  return u.split(/[?#]/)[0].split('.').pop()?.toLowerCase() || '';
};
const isVideo = (u) => VIDEO_EXT.has(extOf(u));
const isImage = (u) => IMAGE_EXT.has(extOf(u));
const isAudio = (u) => AUDIO_EXT.has(extOf(u));

function isDeadBlobUrl(_url) {
  return false;
}

function resolveSrc(it) {
  const candidates = [
    it.VideoUrl, it.url, it.ImageUrl, it.PreviewImage,
    it.thumbnail, it.AudioUrl,
  ].filter(Boolean);
  for (const c of candidates) {
    if (!isDeadBlobUrl(c)) return c;
  }
  return '';
}

const AUDIO_ICON_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTEgNnY5LjI2Yy0uOTItLjYxLTIuMDctMS4wMS0zLjQtMS4wMS0zLjExIDAtNSAyLjQ2LTUgNS41UzQuODkgMjUgOCAyNXMyLjQ2LTEgNS0zLjl2LTExLjFIMjZWMTBoLTd2NGgtOHYtOHoiIGZpbGw9IiM2NjYiLz48L3N2Zz4=';

function extractUrls(it = {}) {
  const md = it.mydata || it.myData || {};
  const mdThumb = md.thumbnail || md.thumb || md.thumbnailUrl || '';
  const cands = [
    it.VideoUrl, it.AudioUrl, it.ImageUrl, it.imdageurl,
    it.downloadableData, it.url, it.PreviewImage, it.thumbnail,
    it.cover, it.InitialImage, mdThumb,
  ].filter(Boolean);

  let videoUrl = '', audioUrl = '', imageUrl = '', preview = '';
  if (isVideo(it.VideoUrl)) videoUrl = it.VideoUrl;
  if (isAudio(it.AudioUrl)) audioUrl = it.AudioUrl;
  if (isImage(it.ImageUrl)) imageUrl = it.ImageUrl;
  if (!videoUrl && isVideo(it.ImageUrl)) videoUrl = it.ImageUrl;
  if (!videoUrl && isVideo(it.imdageurl)) videoUrl = it.imdageurl;
  if (!audioUrl && isAudio(it.downloadableData)) audioUrl = it.downloadableData;
  if (!imageUrl && isImage(it.PreviewImage)) imageUrl = it.PreviewImage;
  for (const u of cands) {
    if (!videoUrl && isVideo(u)) { videoUrl = u; continue; }
    if (!audioUrl && isAudio(u)) { audioUrl = u; continue; }
    if (!imageUrl && isImage(u)) { imageUrl = u; continue; }
  }
  const imageUrlWasVideo = isVideo(it.ImageUrl) || isVideo(it.imdageurl);
  if (imageUrlWasVideo && isImage(mdThumb)) preview = mdThumb;
  if (!preview && isImage(it.PreviewImage)) preview = it.PreviewImage;
  if (!preview && isImage(it.thumbnail)) preview = it.thumbnail;
  if (!preview && isImage(imageUrl)) preview = imageUrl;
  if (!preview) { const img = cands.find(isImage); if (img) preview = img; }
  if (!preview && audioUrl) preview = AUDIO_ICON_URL;
  if (!preview) preview = (isImage(it.url) ? it.url : '') || '';
  return { videoUrl, audioUrl, imageUrl, preview };
}

function inferType(it = {}) {
  if (it.type) return it.type;
  const { videoUrl, audioUrl } = extractUrls(it);
  if (videoUrl) return 'video';
  if (audioUrl) return 'audio';
  const u = it.url || it.ImageUrl || it.PreviewImage || it.downloadableData || it.imdageurl || '';
  if (isVideo(String(u))) return 'video';
  if (isAudio(String(u))) return 'audio';
  return 'image';
}

function displaySrcFor(it = {}) {
  const t = inferType(it);
  const { preview, imageUrl, videoUrl } = extractUrls(it);
  if (t === 'audio') return preview || AUDIO_ICON_URL;
  if (preview && !isDeadBlobUrl(preview)) return preview;
  if (imageUrl && !isDeadBlobUrl(imageUrl)) return imageUrl;
  if (t === 'video' && videoUrl && !isDeadBlobUrl(videoUrl)) return videoUrl;
  return '';
}

function dragPayloadFor(it = {}, audioManager = null) {
  const t = inferType(it);
  const { videoUrl, audioUrl, imageUrl, preview } = extractUrls(it);
  const md = it.mydata || it.myData || {};
  let dragUrl = '';
  if (t === 'video') dragUrl = videoUrl || it.VideoUrl || it.imdageurl || it.url || preview || imageUrl || '';
  else if (t === 'audio') dragUrl = audioUrl || it.AudioUrl || it.downloadableData || it.url || '';
  else dragUrl = imageUrl || it.ImageUrl || it.url || preview || '';
  const rawW = it.naturalWidth || it.width || md.width || md.naturalWidth;
  const rawH = it.naturalHeight || it.height || md.height || md.naturalHeight;
  const naturalWidth = Number(rawW) > 0 ? Number(rawW) : 500;
  const naturalHeight = Number(rawH) > 0 ? Number(rawH) : (t === 'video' ? 281 : 500);

  let actualDuration = 5;
  if (t === 'video') {
    actualDuration = it.actualDuration || 0;
  } else if (t === 'audio' && audioManager) {
    const cachedDuration = audioManager.getDuration(dragUrl);
    actualDuration = cachedDuration || it.actualDuration || 5;
  }

  return {
    id: it.id, type: t, url: dragUrl, name: it.name || '',
    actualDuration: actualDuration,
    naturalWidth, naturalHeight,
    size: it.size || it.fileSize || 0,
  };
}

const pickUrl = (it) => {
  const { preview, imageUrl, videoUrl, audioUrl } = extractUrls(it);
  const candidates = [preview, imageUrl, videoUrl, audioUrl].filter(Boolean);
  for (const c of candidates) {
    if (!isDeadBlobUrl(c)) return c;
  }
  return '';
};

// ─── Hooks ─────────────────────────────────────────────────────────────────
function useQueryBits() {
  const location = useLocation();
  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const aiDocId = useMemo(() => normalizeAiDocId(qs.get('path')), [location.search]);
  const fallbackUrl = useMemo(() => qs.get('Videourl') || '', [location.search]);
  const projectKey = useMemo(() => aiDocId || 'assets:global', [aiDocId]);
  const fetchKey = useMemo(() => `${aiDocId || ''}|${fallbackUrl || ''}`, [aiDocId, fallbackUrl]);
  return { aiDocId, fallbackUrl, projectKey, fetchKey };
}

function useIntersectionLoader({ enabled, onLoadMore }) {
  const observerRef = useRef(null);
  const targetRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cleanup = useCallback(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = null; targetRef.current = null;
  }, []);
  const loaderRef = useCallback((node) => {
    cleanup();
    if (!enabled || !node || typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    targetRef.current = node;
    observerRef.current = new window.IntersectionObserver((entries) => {
      const isVisible = entries[0] && entries[0].isIntersecting;
      if (isVisible && !loadingMoreRef.current) {
        loadingMoreRef.current = true;
        try { observerRef.current?.unobserve(node); } catch { }
        requestAnimationFrame(() => {
          setLoadingMore(true);
          Promise.resolve(onLoadMore && onLoadMore()).catch(() => { }).finally(() => {
            loadingMoreRef.current = false;
            setLoadingMore(false);
            if (observerRef.current && targetRef.current && enabled) {
              try { observerRef.current.observe(targetRef.current); } catch { }
            }
          });
        });
      }
    });
    observerRef.current.observe(node);
  }, [enabled, onLoadMore, cleanup]);
  useEffect(() => cleanup, [cleanup]);
  return { loaderRef, loadingMore };
}

// ─── VideoCard ─────────────────────────────────────────────────────────────
// Updated to accept hideDuration prop
const VideoCard = React.memo(function VideoCard({ it, onDurationLoaded, hideDuration }) {
  const rawSrc = resolveSrc(it);
  const videoSrc = rawSrc || it.remoteUrl || '';

  const [src, setSrc] = useState(videoSrc);
  const [failed, setFailed] = useState(false);
  const [duration, setDuration] = useState(it.actualDuration || 0);
  const videoRef = useRef(null);

  useEffect(() => {
    const newSrc = resolveSrc(it) || it.remoteUrl || '';
    if (newSrc && newSrc !== src) {
      setSrc(newSrc);
      setFailed(false);
    }
  }, [it.VideoUrl, it.url, it.remoteUrl]);

  const handleDragStart = (e) => {
    if (it.isProcessing) return;
    const uid = userId;
    const payload = dragPayloadFor(it, null);

    const vid = e.currentTarget.querySelector('video');
    if (vid) {
      if (vid.videoWidth > 0) payload.naturalWidth = vid.videoWidth;
      if (vid.videoHeight > 0) payload.naturalHeight = vid.videoHeight;
      if (vid.duration > 0 && Number.isFinite(vid.duration)) payload.actualDuration = vid.duration;
    }
    if (!payload.actualDuration && duration) payload.actualDuration = duration;

    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (!src || failed) {
    return (
      <div
        draggable={!it.isProcessing}
        onDragStart={handleDragStart}
        style={{
          position: 'relative', width: '100%', aspectRatio: '16/9',
          background: 'linear-gradient(135deg,#1e1e2e,#2a2a3e)',
          borderRadius: 8, overflow: 'hidden', cursor: 'grab',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 4,
        }}
      >
        <span className="material-icons" style={{ fontSize: 28, color: '#444' }}>videocam</span>
        <span style={{ fontSize: 9, color: '#444', textAlign: 'center', padding: '0 6px' }}>
          {it.name || 'Video'}
        </span>
      </div>
    );
  }

  return (
    <div
      draggable={!it.isProcessing}
      onDragStart={handleDragStart}
      style={{
        position: 'relative', width: '100%', aspectRatio: '16/9',
        background: '#111', borderRadius: 8, overflow: 'hidden', cursor: 'grab',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const vid = e.currentTarget;
          const d = vid.duration;
          if (d > 0 && Number.isFinite(d)) {
            setDuration(d);
            onDurationLoaded?.(it.id || keyOf(it), d);
          }
        }}
        onMouseEnter={(e) => {
          if (e.currentTarget.preload !== 'auto') e.currentTarget.preload = 'auto';
        }}
        onError={() => {
          if (it.remoteUrl && src !== it.remoteUrl) {
            setSrc(it.remoteUrl);
          } else {
            setFailed(true);
          }
        }}
      />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 32, height: 32, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 2,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
      </div>

      {/* Conditionally hide duration if hovering */}
      {!hideDuration && duration > 0 && (
        <div style={{
          position: 'absolute', bottom: 4, right: 4,
          backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff',
          fontSize: 10, padding: '2px 5px', borderRadius: 4,
          pointerEvents: 'none', zIndex: 2,
        }}>
          {duration.toFixed(1)}s
        </div>
      )}
    </div>
  );
});

// ─── AudioCard ─────────────────────────────────────────────────────────────
// Updated to accept hideDuration prop
const AudioCard = React.memo(function AudioCard({ it, audioManager, onDurationLoaded, hideDuration }) {
  const [cachedDuration, setCachedDuration] = useState(null);
  const { audioUrl } = extractUrls(it);
  const dragUrl = audioUrl || it.AudioUrl || it.downloadableData || it.url || '';

  useEffect(() => {
    if (!dragUrl || !audioManager) return;
    const existing = audioManager.getDuration(dragUrl);
    if (existing) {
      setCachedDuration(existing);
      return;
    }
    const unsubscribe = audioManager.onDurationLoad?.(dragUrl, (duration) => {
      setCachedDuration(duration);
      onDurationLoaded?.(it.id || keyOf(it), duration);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [dragUrl, audioManager, onDurationLoaded, it.id]);

  const displaySrc = displaySrcFor(it);
  if (!displaySrc) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: 'fit-content' }}>
      <img
        src={displaySrc}
        alt={it.name || 'Audio'}
        style={{
          width: '100%', height: 'auto', borderRadius: 8,
          background: '#222', cursor: 'grab', display: 'block',
        }}
        loading="lazy" decoding="async"
        draggable={!it.isProcessing}
        onDragStart={(e) => {
          if (it.isProcessing) return;
          const payload = dragPayloadFor(it, audioManager);
          e.dataTransfer.setData('application/json', JSON.stringify(payload));
          e.dataTransfer.effectAllowed = 'copy';
        }}
      />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 32, height: 32, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 2, color: 'white',
      }}>
        <span className="material-icons" style={{ fontSize: 20 }}>audiotrack</span>
      </div>

      {/* Conditionally hide duration if hovering */}
      {!hideDuration && (
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.8)', color: 'white',
          padding: '4px 8px', borderRadius: 4,
          fontSize: '12px', fontWeight: '500'
        }}>
          {cachedDuration ? `${Math.round(cachedDuration)}s` : '...'}
        </div>
      )}
    </div>
  );
});

// ─── MediaGridItem (Wrapper Component) ─────────────────────────────────────
// NEW: Handles Hover State to synchronize Duration vs Name Overlay
const MediaGridItem = ({
  it,
  audioManager,
  onDurationLoaded,
  isEditing,
  startEditing,
  saveEditing,
  cancelEditing,
  editName,
  setEditName,
  t
}) => {
  // Track hover state locally for this specific item
  const [isHovered, setIsHovered] = useState(false);

  // Pass hideDuration=true when hovered or editing
  const shouldHideDuration = isHovered || isEditing;

  let content = null;
  if (t === 'video') {
    content = <VideoCard it={it} onDurationLoaded={onDurationLoaded} hideDuration={shouldHideDuration} />;
  } else if (t === 'audio') {
    content = <AudioCard it={it} audioManager={audioManager} onDurationLoaded={onDurationLoaded} hideDuration={shouldHideDuration} />;
  } else {
    const displaySrc = displaySrcFor(it);
    const isGif = displaySrc && displaySrc.match(/\.gif$/i);
    if (!displaySrc) return null;
    content = (
      <div style={{ position: 'relative', width: '100%', height: 'fit-content' }}>
        <img
          src={displaySrc}
          alt={it.name || 'Media'}
          style={{
            width: '100%', height: 'auto', borderRadius: 8,
            background: '#222', cursor: 'grab', display: 'block',
          }}
          loading="lazy" decoding="async"
          draggable={!it.isProcessing && !isEditing}
          onDragStart={(e) => {
            if (it.isProcessing || isEditing) return;
            const payload = dragPayloadFor(it, audioManager);
            if (e.target.naturalWidth > 0) payload.naturalWidth = e.target.naturalWidth;
            if (e.target.naturalHeight > 0) payload.naturalHeight = e.target.naturalHeight;
            e.dataTransfer.setData('application/json', JSON.stringify(payload));
            e.dataTransfer.effectAllowed = 'copy';
          }}
        />
        {isGif && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 32, height: 32, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: 2, color: 'white',
          }}>
            <span className="material-icons" style={{ fontSize: 20 }}>gif</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="supercool-hover"
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* EDIT BUTTON (Only show when not editing, but item is hovered) */}
      {!isEditing && isHovered && (
        <div
          onClick={(e) => startEditing(e, it)}
          title="Rename"
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: 22, height: 22,
            cursor: 'pointer', zIndex: 10,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#D1FE17'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        >
          <span className="material-icons" style={{ fontSize: 13, color: 'inherit', pointerEvents: 'none' }}>edit</span>
        </div>
      )}

      {content}

      {/* OVERLAY: Name or Edit Input */}
      {/* Visibility Logic: Show if editing OR hovered. Opacity handles transition. */}
      <div
        className="hover-overlay"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          width: '100%',
          background: isEditing ? 'rgba(0,0,0,0.9)' : 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          padding: isEditing ? '8px' : '24px 8px 8px',
          // Only show if editing or hovered
          opacity: (isEditing || isHovered) ? 1 : 0,
          transform: isEditing ? 'none' : undefined,
          zIndex: 20,
          pointerEvents: isEditing ? 'auto' : 'none',
          borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
          transition: 'opacity 0.2s ease-in-out'
        }}
      >
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') saveEditing(e); if (e.key === 'Escape') cancelEditing(e); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              autoFocus
              style={{
                flex: 1,
                background: '#333',
                border: '1px solid #555',
                color: '#fff',
                fontSize: '11px',
                borderRadius: '4px',
                padding: '4px 6px',
                outline: 'none',
                minWidth: 0
              }}
            />
            <button onClick={saveEditing} style={{
              background: 'rgba(209, 254, 23, 0.2)', border: '1px solid #D1FE17', borderRadius: '4px',
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#D1FE17', padding: 0
            }}>
              <span className="material-icons" style={{ fontSize: 14 }}>check</span>
            </button>
            <button onClick={cancelEditing} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#aaa', padding: 0
            }}>
              <span className="material-icons" style={{ fontSize: 14 }}>close</span>
            </button>
          </div>
        ) : (
          <span style={{
            display: 'block', fontSize: 11, color: '#fff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            textAlign: 'center', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)'
          }}>
            {it.name}
          </span>
        )}
      </div>
    </div>
  );
};


/****************
 * Main component *
 ****************/
const MediaSection = ({ userId, externalVideoUrl }) => {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [primaryTab, setPrimaryTab] = useState('assets'); // 'assets' | 'generated'


  // --- Renaming State ---
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const { isGenerating, originTab } = useSelector((s) => s.generation || {});
  const { aiDocId, fallbackUrl, projectKey, fetchKey } = useQueryBits();

  const { cacheAndGetBlobUrl } = useMediaCache();
  const audioManager = useAudioDurationManager();

  const { readyFromCache } = useLocalProjectCache(
    projectKey, mediaItems, setMediaItems,
    { ttlMs: 1000 * 60 * 60 * 24 * 7 }
  );
  const usingLocal = readyFromCache && mediaItems.length > 0;

  const handleDurationLoaded = useCallback((itemId, duration) => {
    setMediaItems(prev => prev.map(it =>
      (it.id === itemId || keyOf(it) === itemId)
        ? { ...it, actualDuration: duration }
        : it
    ));
  }, []);

  useEffect(() => {
    const audioItems = mediaItems.filter(it => inferType(it) === 'audio');
    const audioUrls = audioItems.map(it => {
      const { audioUrl } = extractUrls(it);
      return audioUrl || it.AudioUrl || it.downloadableData || it.url;
    }).filter(Boolean);

    if (audioUrls.length > 0) {
      audioManager.preloadDurations(audioUrls);
    }
  }, [mediaItems, audioManager]);

  useEffect(() => {
    setError(null); setLastDoc(null); setHasMore(true);
    if (!aiDocId && !fallbackUrl) {
      setMediaItems([]); setLoading(false); setHasMore(false); return;
    }

    setLoading(false);

    if (userId && aiDocId) {
      try {
        const raw = sessionStorage.getItem('storylineItemsData');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const sessionItems = Array.isArray(parsed) ? parsed : [parsed];
        const itemsToAdd = sessionItems.map((s) => {
          const url = s.VideoUrl || s.AudioUrl || s.ImageUrl || s.PreviewImage || s.thumbnail;
          if (!url) return null;
          return {
            id: s.docId || s.id || url, docId: s.docId,
            ImageUrl: s.ImageUrl, VideoUrl: s.VideoUrl,
            AudioUrl: s.AudioUrl, PreviewImage: s.PreviewImage,
            thumbnail: s.thumbnail,
            timestamp: s.timestamp || Date.now(),
            type: inferType(s),
          };
        }).filter(Boolean);
        if (itemsToAdd.length > 0) setMediaItems((prev) => mergeDedup(prev, itemsToAdd));
      } catch (e) { console.warn('[MediaSection] session merge failed', e); }
    } else if (fallbackUrl && !aiDocId) {
      setMediaItems(prev => mergeDedup(prev, [{ id: 'temp', VideoUrl: fallbackUrl }]));
      setHasMore(false); setLoading(false);
    }
  }, [fetchKey, userId, aiDocId, fallbackUrl, usingLocal]);

  // --- Renaming Logic ---
  const handleRename = async (id, newName) => {
    // 1. Optimistic Update
    setMediaItems(prev => prev.map(item =>
      (item.id === id || keyOf(item) === id) ? { ...item, name: newName } : item
    ));

    // 2. Local only - Firebase removed
  };

  const startEditing = (e, item) => {
    e.preventDefault(); e.stopPropagation();
    const itemId = item.id || keyOf(item);
    setEditingId(itemId);
    setEditName(item.name || '');
  };

  const saveEditing = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (editName.trim()) {
      handleRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    setEditingId(null);
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    const timestamp = Date.now() + 999999;
    const newPlaceholders = files.map(file => {
      const isVideoType = file.type.startsWith('video');
      return {
        id: uuidv4(), type: isVideoType ? 'video' : 'image',
        name: file.name, url: '',
        VideoUrl: isVideoType ? '' : undefined,
        ImageUrl: isVideoType ? undefined : '',
        timestamp, isProcessing: true, originalFile: file,
      };
    });
    setMediaItems(prev => mergeDedup(prev, newPlaceholders));

    const processedItems = await Promise.all(
      newPlaceholders.map(async (item) => {
        try {
          const blobUrl = await cacheAndGetBlobUrl(item.originalFile, item.id);
          blobRegistry.add(blobUrl);
          return {
            ...item, url: blobUrl,
            VideoUrl: item.type === 'video' ? blobUrl : undefined,
            ImageUrl: item.type === 'image' ? blobUrl : undefined,
            isProcessing: false, originalFile: undefined,
          };
        } catch (err) {
          console.error('Processing failed', err);
          return { ...item, isProcessing: false, error: true };
        }
      })
    );
    setMediaItems(prev => prev.map(p => {
      const finished = processedItems.find(i => i.id === p.id);
      return finished || p;
    }));
  };

  const onLoadMore = useCallback(() => { }, []);
  const { loaderRef, loadingMore } = useIntersectionLoader({
    enabled: false, onLoadMore,
  });

  const mediaItemsWithExternal = useMemo(() => {
    const baseItems = Array.isArray(mediaItems) ? mediaItems : [];
    if (!externalVideoUrl) return baseItems;
    const exists = baseItems.some(it => it.VideoUrl === externalVideoUrl || it.url === externalVideoUrl);
    if (exists) return baseItems;
    return [{
      id: 'external-video-import', VideoUrl: externalVideoUrl, url: externalVideoUrl,
      name: 'Imported Video', timestamp: Date.now() + 999999,
      source: 'external', type: 'video',
    }, ...baseItems];
  }, [mediaItems, externalVideoUrl]);

  // const filtered = useMemo(() => {
  //   return mediaItemsWithExternal.filter((it) => {
  //     if (it.isProcessing) return true;
  //     const t = inferType(it);
  //     if (!filter || filter === 'all') return (t === 'video' || t === 'audio' || t === 'image') && !!pickUrl(it);
  //     return t === filter && !!pickUrl(it);
  //   });
  // }, [mediaItemsWithExternal, filter]);


  // 👇 REPLACE your existing 'filtered' useMemo with this 👇
  //   const filtered = useMemo(() => {
  //     return mediaItemsWithExternal.filter((it) => {
  //       // 1. Split by Tab (Project Assets vs AI Generated)
  //       // const isGenerated = it.model && it.model.toLowerCase() === 'scene builder';
  //       // 👇 Replace the isGenerated line inside your useMemo with this: 👇
  // const modelName = it.ModelName || it.myData?.model || it.mydata?.model || '';
  // const isGenerated = modelName.toLowerCase() === 'scene builder';

  //       if (primaryTab === 'assets' && isGenerated) return false;
  //       if (primaryTab === 'generated' && !isGenerated) return false;

  //       // 2. Existing File Type Filter (All, Video, Image, Audio)
  //       if (it.isProcessing) return true;
  //       const t = inferType(it);
  //       if (!filter || filter === 'all') return (t === 'video' || t === 'audio' || t === 'image') && !!pickUrl(it);
  //       return t === filter && !!pickUrl(it);
  //     });
  //   }, [mediaItemsWithExternal, filter, primaryTab]); // <-- Ensure primaryTab is in dependencies

  const filtered = useMemo(() => {
    return mediaItemsWithExternal.filter((it) => {
      // 1. Check for the specific "ModelName" key, checking top-level and nested objects
      const rawModel =
        it.ModelName ||
        it.modelName ||
        it.model ||
        it.myData?.ModelName ||
        it.myData?.model ||
        it.mydata?.ModelName ||
        it.mydata?.model ||
        '';

      // Safely convert to lowercase so "Scene Builder" matches "scene builder"
      const modelString = String(rawModel).toLowerCase();

      // 2. Fallback URL Check (catches any missed items from your render server)
      const itemUrl = String(it.VideoUrl || it.url || it.downloadableData || '').toLowerCase();
      const hasRenderInUrl = itemUrl.includes('render');

      // 3. Determine if it's an AI video
      const isGenerated = modelString.includes('scene builder') || hasRenderInUrl;

      // 4. Tab Routing
      if (primaryTab === 'assets' && isGenerated) return false;
      if (primaryTab === 'generated' && !isGenerated) return false;

      // 5. Existing File Type Filter (All, Video, Image, Audio)
      if (it.isProcessing) return true;
      const t = inferType(it);
      if (!filter || filter === 'all') return (t === 'video' || t === 'audio' || t === 'image') && !!pickUrl(it);
      return t === filter && !!pickUrl(it);
    });
  }, [mediaItemsWithExternal, filter, primaryTab]); // <-- Ensure primaryTab is here




  return (
    <div className="media-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>


      {/* 👇 ADD THIS NEW TAB BAR 👇 */}
      {/* <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
        <button
          onClick={() => setPrimaryTab('assets')}
          style={{
            flex: 1, padding: '12px 0', background: 'none', border: 'none',
            color: primaryTab === 'assets' ? '#D1FE17' : '#888',
            borderBottom: primaryTab === 'assets' ? '2px solid #D1FE17' : '2px solid transparent',
            cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            transition: 'all 0.2s ease'
          }}
        >
          Project Assets
        </button>
        <button
          onClick={() => setPrimaryTab('generated')}
          style={{
            flex: 1, padding: '12px 0', background: 'none', border: 'none',
            color: primaryTab === 'assets' ? '#D1FE17' : '#888',
            borderBottom: primaryTab === 'assets' ? '2px solid #D1FE17' : '2px solid transparent',
            cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            transition: 'all 0.2s ease'
          }}
        >
          My Edits
        </button>
      </div> */}
      {/* 👆 END NEW TAB BAR 👆 */}


      {/* 👇 ADD THIS NEW TAB BAR 👇 */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
        <button
          onClick={() => setPrimaryTab('assets')}
          style={{
            flex: 1, padding: '12px 0', background: 'none', border: 'none',
            color: primaryTab === 'assets' ? '#D1FE17' : '#888',
            borderBottom: primaryTab === 'assets' ? '2px solid #D1FE17' : '2px solid transparent',
            cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            transition: 'all 0.2s ease'
          }}
        >
          Project Assets
        </button>

        <button
          onClick={() => setPrimaryTab('generated')}
          style={{
            flex: 1, padding: '12px 0', background: 'none', border: 'none',
            // 👇 CHANGE 1: Use 'generated' here
            color: primaryTab === 'generated' ? '#D1FE17' : '#888',
            // 👇 CHANGE 2: Use 'generated' here too!
            borderBottom: primaryTab === 'generated' ? '2px solid #D1FE17' : '2px solid transparent',
            cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            transition: 'all 0.2s ease'
          }}
        >
          My Edits
        </button>
      </div>
      {/* 👆 END NEW TAB BAR 👆 */}


      {/* Filter Dropdown */}
      <div style={{ position: 'relative', marginBottom: 16, zIndex: 100 }}>
        <button
          className="glass-dropdown-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18 }}>
              {FILTERS.find(f => f.id === filter)?.icon}
            </span>
            <span>{FILTERS.find(f => f.id === filter)?.label || 'Filter'}</span>
          </div>
          <span className="material-icons" style={{ fontSize: 16, transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
            expand_more
          </span>
        </button>

        {isDropdownOpen && (
          <div className="glass-dropdown-menu">
            {FILTERS.map(f => (
              <button
                key={f.id}
                className={`glass-dropdown-item ${filter === f.id ? 'active' : ''}`}
                onClick={() => {
                  setFilter(f.id);
                  setIsDropdownOpen(false);
                }}
              >
                <span className="material-icons" style={{ fontSize: 16 }}>{f.icon}</span>
                {f.label}
                {filter === f.id && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: 14 }}>check</span>}
              </button>
            ))}
          </div>
        )}

        {isDropdownOpen && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>

      {isGenerating && originTab === 'assets' && (
        <div className="audio-loader" style={{ marginLeft: 16, display: 'flex', alignItems: 'center' }}>
          <span className="material-icons audio-loader-icon" style={{ fontSize: 24, color: '#bfaaff', animation: 'spin 1s linear infinite' }}>autorenew</span>
          <span style={{ color: '#bfaaff', marginLeft: 8 }}>Generating...</span>
        </div>
      )}

      <div className="media-grid-container" style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
        <div
          className="media-grid"
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12, marginBottom: 16,
          }}
        >
          {filtered.map((it) => {
            // Processing placeholder
            if (it.isProcessing) {
              return (
                <div key={it.id} style={{
                  position: 'relative', width: '100%', aspectRatio: '16/9',
                  background: '#222', borderRadius: 12, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: '2px solid #D1FE17', borderTopColor: 'transparent',
                      animation: 'spin 1s linear infinite',
                    }} />
                  </div>
                  <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
                  <div style={{ padding: 4, textAlign: 'center', fontSize: 10, color: '#aaa' }}>
                    Processing {it.name}...
                  </div>
                </div>
              );
            }

            // Real Media Item wrapped in helper to track hover state
            const t = inferType(it);
            const itemId = it.id || keyOf(it);
            const isEditing = editingId === itemId;

            return (
              <MediaGridItem
                key={itemId}
                it={it}
                t={t}
                isEditing={isEditing}
                editName={editName}
                setEditName={setEditName}
                startEditing={startEditing}
                saveEditing={saveEditing}
                cancelEditing={cancelEditing}
                audioManager={audioManager}
                onDurationLoaded={handleDurationLoaded}
              />
            );
          })}

          {!usingLocal && hasMore && (
            <div ref={loaderRef} style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', minHeight: 40, color: '#aaa' }}>
              {loadingMore ? 'Loading more...' : ''}
            </div>
          )}
        </div>

        {loading && mediaItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem' }}>Loading...</div>
        )}
        {error && (
          <div style={{ color: '#ff8a8a', padding: '0 16px 16px' }}>Error: {error.message}</div>
        )}
      </div>

      <GenerateMediaSlider
        isOpen={showGenerateForm}
        onClose={() => setShowGenerateForm(false)}
        userId={userId} initialTab="video" originTab="assets"
      />
    </div>
  );
};

export default MediaSection;