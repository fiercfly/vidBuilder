import React, { useState, Suspense, useRef, useEffect, lazy, useCallback, useMemo } from 'react';
import { Player } from '@remotion/player';
import { InteractiveComposition } from './InteractiveComposition';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { setProjectName, setExportButton, setDownloader } from './standalone/storylineSlicer';
import RenderStoryLine from './VideoComposition';
import './VideoEditor.css';
import { uploadFile, uploadFileVideo, uploadFileAudio } from './standalone/sdk_factory';
import { ThumbStrip } from './ThumbStrip';
import { cleanImageData } from './standalone/useAiStudioCacheManager';
import elementsData from './standalone/elements.json';
import PropertiesPanel from './PropertiesPanel';
import TransitionPanel from './TransitionPanel';
const TopHeader = lazy(() => import('./standalone/TopHeader'));
const StudioHeader = lazy(() => import('./standalone/StudioHeader'));
import MediaSection from './MediaSection';
const UploadMedia = lazy(() => import('./UploadMedia'));
import AudioMedia from './audioMedia';
import TextResources from './TextResources';
import { COMMON_TRANSITIONS } from './transitions';
import Konva from 'konva';
import { exportTimelineForRemotion } from './exportForRemotion';
import { useProjectImportExport } from './projectSerialization';
import GlobalPropertiesPanel from './GlobalPropertiesPanel.jsx';
import GenerateMediaSlider from './GenerateMediaSlider';
// Helpers & hooks
import { getCookies } from './standalone/Cookies';
import { SIDEBAR_TABS } from './sideBarManu';
import MicPopup from './MicPopup.jsx';

import ElementsPanel from './elementsPanel';

import {
  usePlaybackControls,
  useExport,
  useProjectPersistence,
  useMediaLibrary,
  useToast,
  getMediaInfoFromFile,
  getMediaMetadata,
  formatTime,
  computeVideoAspectRatio,
  DURATION_LIMIT, FPS, MIN_CLIP_SEC, clampMinSec,
  useUniqueIdVideo,
} from './useVideoEditorHooks';

import { useAudioDurationManager } from './useAudioDurationManager';

const ASPECT_RATIOS = [
  // --- Video Platforms ---
  { id: 'youtube', label: 'YouTube', ratio: '16:9', width: 1920, height: 1080, icon: 'smart_display', category: 'video' },
  { id: 'youtube_short', label: 'YouTube Short', ratio: '9:16', width: 1080, height: 1920, icon: 'smartphone', category: 'video' },
  { id: 'tiktok', label: 'TikTok', ratio: '9:16', width: 1080, height: 1920, icon: 'music_note', category: 'social' },

  // --- Instagram ---
  { id: 'ig_reel', label: 'Instagram Reel', ratio: '9:16', width: 1080, height: 1920, icon: 'movie_filter', category: 'social' },
  { id: 'ig_reel_ultra', label: 'Instagram Reel Ultra', ratio: '32:9', width: 1920, height: 540, icon: 'panorama_wide_angle', category: 'social' }, // Approximation for ultra wide
  { id: 'ig_story', label: 'Instagram Story', ratio: '9:16', width: 1080, height: 1920, icon: 'history', category: 'social' },
  { id: 'ig_post', label: 'Instagram Post', ratio: '1:1', width: 1080, height: 1080, icon: 'crop_square', category: 'social' },

  // --- Facebook ---
  { id: 'fb_video', label: 'Facebook Video', ratio: '16:9', width: 1920, height: 1080, icon: 'facebook', category: 'social' },
  { id: 'fb_story', label: 'Facebook Story', ratio: '9:16', width: 1080, height: 1920, icon: 'amp_stories', category: 'social' },
  { id: 'fb_post', label: 'Facebook Post', ratio: '1:1', width: 1080, height: 1080, icon: 'article', category: 'social' },

  // --- Other Social ---
  { id: 'linkedin_portrait', label: 'LinkedIn', ratio: '9:16', width: 1080, height: 1920, icon: 'work', category: 'social' },
  { id: 'linkedin_sq', label: 'LinkedIn', ratio: '1:1', width: 1080, height: 1080, icon: 'work_outline', category: 'social' },
  { id: 'x_sq', label: 'X (Twitter)', ratio: '1:1', width: 1080, height: 1080, icon: 'tag', category: 'social' },
  { id: 'x_port', label: 'X (Twitter)', ratio: '3:4', width: 1080, height: 1440, icon: 'tag', category: 'social' },
  { id: 'snapchat', label: 'Snapchat', ratio: '9:16', width: 1080, height: 1920, icon: 'chat_bubble_outline', category: 'social' },

  // --- Generic Standards ---
  { id: 'tall_port', label: 'Tall Portrait', ratio: '9:16', width: 1080, height: 1920, icon: 'crop_portrait', category: 'generic' },
  { id: 'portrait', label: 'Portrait', ratio: '4:5', width: 1080, height: 1350, icon: 'portrait', category: 'generic' },
  { id: 'square', label: 'Square', ratio: '1:1', width: 1080, height: 1080, icon: 'check_box_outline_blank', category: 'generic' },
  { id: 'boxy', label: 'Boxy Landscape', ratio: '4:3', width: 1440, height: 1080, icon: 'crop_3_2', category: 'generic' }, // 4:3 usually 1440x1080 for HD
  { id: 'landscape_5_4', label: 'Landscape', ratio: '5:4', width: 1350, height: 1080, icon: 'crop_landscape', category: 'generic' },
  { id: 'wide', label: 'Wide Landscape', ratio: '16:9', width: 1920, height: 1080, icon: 'panorama', category: 'generic' },
];

// 🔥 HELPER FUNCTION: Find best matching aspect ratio option for a given ratio
const findBestMatchingRatioId = (ratio) => {
  // First try exact ratio match
  const exactMatch = ASPECT_RATIOS.find(r => r.ratio === ratio);
  if (exactMatch) {
    return exactMatch.id;
  }

  // If no exact match, find based on aspect ratio value and prefer popular platforms
  const [width, height] = ratio.split(':').map(Number);
  if (width && height) {
    const aspectValue = width / height;

    // Find all options with the same numeric ratio (in case of different notation like 16:9 vs 1920:1080)
    const sameRatioOptions = ASPECT_RATIOS.filter(r => {
      const [w, h] = r.ratio.split(':').map(Number);
      return w && h && Math.abs((w / h) - aspectValue) < 0.01; // Small tolerance for floating point
    });

    if (sameRatioOptions.length > 0) {
      // Prefer popular platforms: youtube > youtube_short > ig_post > others
      const preferredOrder = ['youtube', 'youtube_short', 'ig_post', 'ig_reel', 'tiktok'];
      for (const preferred of preferredOrder) {
        const found = sameRatioOptions.find(opt => opt.id === preferred);
        if (found) return found.id;
      }
      // Return the first match if no preferred option found
      return sameRatioOptions[0].id;
    }

    // Find the best matching platform based on aspect ratio ranges
    if (aspectValue > 1.7) {
      // Wide landscape (16:9, etc) - prefer YouTube
      return 'youtube';
    } else if (aspectValue < 0.6) {
      // Tall portrait (9:16, etc) - prefer YouTube Short
      return 'youtube_short';
    } else if (Math.abs(aspectValue - 1) < 0.1) {
      // Square (1:1) - prefer Instagram post
      return 'ig_post';
    } else if (aspectValue > 1 && aspectValue <= 1.7) {
      // Medium landscape - prefer boxy
      return 'boxy';
    } else {
      // Medium portrait - prefer portrait
      return 'portrait';
    }
  }

  // Final fallback
  return 'youtube';
};




import { useTimeline } from './useVideoEditorHooks';

// --- CONSTANTS ---
// const GOOGLE_FONTS_LIST = [
//   'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Merriweather', 
//   'Poppins', 'Nunito', 'Raleway', 'Oswald', 'Playfair Display'
// ];

const GOOGLE_FONTS_LIST = [
  'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Merriweather',
  'Poppins', 'Nunito', 'Raleway', 'Oswald', 'Playfair Display',
  // New Creative Fonts
  'Anton', 'Bangers', 'Cinzel', 'Dancing Script', 'Lobster',
  'Orbitron', 'Pacifico', 'Permanent Marker', 'Righteous',
  'Satisfy', 'Abril Fatface', 'Fredoka One'
];

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getFormattedDateTime = () => {
  const d = new Date();
  const mm = monthNames[d.getMonth()];
  const dd = d.getDate();
  const hh = d.getHours();
  const mi = d.getMinutes();
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${mm}_${dd}_${hh}:${mi}:${ss}`;
};
const sortTracksForDisplay = (a, b) => {
  const typeOrder = { 'text': 1, 'video': 2, 'image': 2, 'audio': 3 };
  if (typeOrder[a.type] !== typeOrder[b.type]) {
    return typeOrder[a.type] - typeOrder[b.type];
  }
  return 0;
};
// --- HELPER: Compatibility Check ---
const areTypesCompatible = (t1, t2) => {
  const isVisual = (t) => ['video', 'image'].includes(t);
  if (isVisual(t1) && isVisual(t2)) return true;
  return t1 === t2;
};



// ✅ UPDATED: Supports all formats in ASPECT_RATIOS
const getCompositionSize = (aspectRatio) => {
  // 1. Try to find a specific match first
  const found = ASPECT_RATIOS.find(r => r.ratio === aspectRatio);

  if (found) {
    return { width: found.width, height: found.height };
  }

  // 2. Fallbacks for common ratios (in case of any mismatch)
  switch (aspectRatio) {
    case "16:9": return { width: 1920, height: 1080 };
    case "9:16": return { width: 1080, height: 1920 };
    case "1:1": return { width: 1080, height: 1080 };
    case "4:5": return { width: 1080, height: 1350 };
    case "4:3": return { width: 1440, height: 1080 };
    case "3:4": return { width: 1080, height: 1440 };
    case "5:4": return { width: 1350, height: 1080 };
    case "32:9": return { width: 1920, height: 540 };
    default: return { width: 1920, height: 1080 };
  }
};






// Tooltip appears above its trigger button using fixed positioning
// so it escapes overflow:hidden containers
const TooltipButton = ({ label, children, style }) => {
  const [pos, setPos] = React.useState(null); // { bottom, left } in viewport coords
  const wrapRef = React.useRef(null);

  const show = React.useCallback(() => {
    if (!wrapRef.current || !label) return;
    const r = wrapRef.current.getBoundingClientRect();

    // FIX: Calculate distance from bottom of screen to top of element + gap
    // This forces the tooltip to sit ABOVE the button
    const distanceFromBottom = window.innerHeight - r.top + 8;

    setPos({ bottom: distanceFromBottom, left: r.left + r.width / 2 });
  }, [label]);

  const hide = React.useCallback(() => setPos(null), []);

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {pos && (
        <div style={{
          position: 'fixed',
          // FIX: Use bottom positioning instead of top
          bottom: pos.bottom,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: 'rgba(18,18,18,0.97)',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 600, // Match CSS tooltip weight
          padding: '6px 10px', // Match CSS tooltip padding
          borderRadius: 4,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 99999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.2)',
          letterSpacing: '0.2px',
          lineHeight: '1.4',
        }}>
          {label}
          {/* Arrow pointing DOWN */}
          <div style={{
            position: 'absolute',
            bottom: -5, // Move arrow to bottom of tooltip
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(18,18,18,0.97)', // Color the top border to point down
            borderBottom: 'none',
          }} />
        </div>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const VideoEditor = () => {
  const dispatch = useDispatch();
  const exportInProgressRef = useRef(false);
  const [orientation, setOrientation] = useState('portrait');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Assets');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [selectedAspectId, setSelectedAspectId] = useState('youtube_short'); // Track selected item by ID
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState({ resolution: '1080p', format: 'mp4' });
  // --- NEW: Canvas Background Color ---
  // const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#000000');

  const exportButton = useSelector(state => state.editor?.exportbutton);

  // Ref for polling interval
  const pollInterval = useRef(null);

  // Helper to dispatch progress event
  const updateProgressUI = (percent) => {
    window.dispatchEvent(new CustomEvent('video-export-progress', {
      detail: { percent }
    }));
  };








  // CDN URL builder — returns null to use local blob URLs only
  const buildCdnUrl = useCallback(() => null, []);

  const playerContainerRef = useRef(null);

  // 3. Define the Toggle Function
  const toggleFullScreen = useCallback(() => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      // Enter Fullscreen
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      // Exit Fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);



  // 1. Initialize from Storage
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(() => {
    return localStorage.getItem('ve_canvas_bg') || "#000000";
  });


  const [searchParams] = useSearchParams();

  const externalVideoUrl = useMemo(() => {
    const raw = searchParams.get("Videourl");
    console.log("RAW Videourl param:", raw);

    const decoded = raw ? decodeURIComponent(raw) : "";
    console.log("DECODED externalVideoUrl:", decoded);

    return decoded;
  }, [searchParams]);


  const [exportRange, setExportRange] = useState({ start: 0, end: null });

  // 2. Save to Storage whenever it changes
  useEffect(() => {
    localStorage.setItem('ve_canvas_bg', canvasBackgroundColor);
  }, [canvasBackgroundColor]);

  const [contextMenu, setContextMenu] = useState(null);




  // Close context menu on any click or right-click outside a gap item
  useEffect(() => {
    const close = () => setContextMenu(null);
    const closeOnCtx = (e) => { if (!e.target.closest('.gap-item')) setContextMenu(null); };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', closeOnCtx);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', closeOnCtx);
    };
  }, []);


  const [migratetoststatus, setMigratetoststatus] = useState({ buttonStatus: false, messageStatus: false });
  const [rightopen, setRightOpen] = useState(true);

  const [transitions, setTransitions] = useState([]);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [transitionPanelOpen, setTransitionPanelOpen] = useState(false);
  const [transitionPanelHeight, setTransitionPanelHeight] = useState(0);
  const playerRef = useRef(null);
  // const [searchParams] = useSearchParams();
  const projectKey = searchParams.get('path') || 'default';
  const VideoUrldata = searchParams.get('Videourl');
  const userId = getCookies('userId');
  const { showToast, Toast } = useToast();

  // 🔥 NEW: Audio Duration Manager
  const audioManager = useAudioDurationManager();

  const insertedFromUrlRef = useRef(false);
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [activeCanvasItem, setActiveCanvasItem] = useState(null);
  const previewAreaRef = useRef(null);
  const [viewportSize, setViewportSize] = useState({ width: 400, height: 700 });
  const [selectedGap, setSelectedGap] = useState(null);
  const [draggingItemId, setDraggingItemId] = useState(null);
  const [snapLineTime, setSnapLineTime] = useState(null);

  // ... (Resize Observers logic) ...
  useEffect(() => {
    if (!previewAreaRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setViewportSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height)
        });
      }
    });
    observer.observe(previewAreaRef.current);
    return () => observer.disconnect();
  }, []);

  const [visibleWindowSec, setVisibleWindowSec] = useState(() => {
    const s = sessionStorage.getItem('ve_visibleWindowSec');
    return s ? Number(s) : 30;
  });
  const [visibleStart, setVisibleStart] = useState(() => {
    const s = sessionStorage.getItem('ve_visibleStart');
    return s ? Number(s) : 0;
  });
  const resizeRafRef = useRef(null);
  const pendingResizeRef = useRef(new Map());
  const timelineRef = useRef(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const isFittingRef = useRef(false);


  const fileInputRef = useRef(null);
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importProject(file);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };


  useEffect(() => {
    if (!timelineRef.current) return;
    const updateWidth = () => {
      setTimelineWidth(timelineRef.current.clientWidth || 0);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const { width: compositionWidth, height: compositionHeight } = useMemo(
    () => getCompositionSize(aspectRatio),
    [aspectRatio]
  );

  const {
    items, setItems, undo, redo, canUndo, canRedo,
    addPastedItem, toggleTrackLock,
    tracks, setTracks, findOrCreateTrack, getLastClipEndTime,
    timelineItemStyle, deleteItemByIndex, removeGap,
    handleResizeFactory, handleDragFactory, onDropFactory,
    selectedIds, setSelectedIds,
    removeSelectedItems
  } = useTimeline([], compositionWidth, compositionHeight);

  // --- DYNAMIC FONT LOADER (SMOOTHNESS FIX) ---
  useEffect(() => {
    const usedFonts = new Set();
    items.forEach(item => {
      if (item.type === 'text' && item.style?.fontFamily) {
        usedFonts.add(item.style.fontFamily);
      }
    });
    if (selectedItem?.type === 'text' && selectedItem.style?.fontFamily) {
      usedFonts.add(selectedItem.style.fontFamily);
    }
    const fontsToLoad = Array.from(usedFonts).filter(f => GOOGLE_FONTS_LIST.includes(f));

    if (fontsToLoad.length === 0) return;

    const fontQuery = fontsToLoad
      .map(font => `family=${font.replace(/\s+/g, '+')}:ital,wght@0,400;0,700;1,400;1,700`)
      .join('&');

    const linkId = 've-dynamic-fonts';
    let link = document.getElementById(linkId);
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    const newUrl = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
    if (link.href !== newUrl) {
      link.href = newUrl;
    }

  }, [items, selectedItem]);


  const sortedTracks = useMemo(() => {
    return [...tracks].sort(sortTracksForDisplay);
  }, [tracks]);
  const trackZIndex = useMemo(() => {
    const map = new Map();
    [...sortedTracks].forEach((t, i) => {
      map.set(t.id, 100 - i);
    });
    return map;
  }, [sortedTracks]);


  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const { playPause, seek } = usePlaybackControls({
    isPlaying, setIsPlaying, currentTime, setCurrentTime,
    getLastClipEndTime, playerRef,
  });


  //  const handleGlobalPropertyUpdate = useCallback((updates) => {
  //   setItems((prevItems) => {
  //       return prevItems.map((item) => {
  //            // Create a shallow copy of updates to modify if necessary
  //            let itemUpdates = { ...updates };

  //            // Rule 1: Volume only applies to audio and video
  //            if (itemUpdates.volume !== undefined && !['video', 'audio'].includes(item.type)) {
  //                delete itemUpdates.volume;
  //            }

  //            // Rule 2: Speed only applies to video and audio
  //            if (itemUpdates.speed !== undefined && !['video', 'audio'].includes(item.type)) {
  //                delete itemUpdates.speed;
  //            }

  //            // If no relevant updates remain for this item type, return original item
  //            if (Object.keys(itemUpdates).length === 0) return item;

  //            // Return item with updates merged
  //            return { ...item, ...itemUpdates };
  //       });
  //   });
  //   showToast("Applied to all items");
  // }, [setItems, showToast]);



  //   const forceSeek = useCallback((time) => {
  //     const t = Math.max(0, Math.min(DURATION_LIMIT, time));
  //     if (playerRef.current) {
  //       playerRef.current.seekTo(Math.round(t * FPS)); 
  //     }
  //     seek(t); 

  //     // ✅ NEW: Deselect all items as soon as the timeline pointer moves
  //     setSelectedItem(null);
  //     setActiveCanvasItem(null);
  //     setSelectedIds([]);

  //   }, [seek, setSelectedIds]);


  // ✅ FIX: Automatically deselect items when Playback starts

  // VideoEditor.jsx

  const handleGlobalPropertyUpdate = useCallback((updates) => {
    const { _scope, ...data } = updates; // Extract scope (text, visual, or generic)

    setItems((prevItems) => {
      return prevItems.map((item) => {
        // -- Filter by Scope --
        // If scope is 'text', only apply to text items
        if (_scope === 'text' && item.type !== 'text') return item;

        // If scope is 'visual', only apply to video/image/text (not audio)
        if (_scope === 'visual' && !['video', 'image', 'text'].includes(item.type)) return item;

        // -- Prepare Updates --
        let itemUpdates = { ...data };

        // Rule 1: Volume/Speed only applies to audio and video
        if ((itemUpdates.volume !== undefined || itemUpdates.speed !== undefined) && !['video', 'audio'].includes(item.type)) {
          delete itemUpdates.volume;
          delete itemUpdates.speed;
        }

        // Rule 2: Merge Nested Objects (Style & Animation)
        // Instead of overwriting, we merge with existing
        if (itemUpdates.style) {
          itemUpdates.style = { ...item.style, ...itemUpdates.style };
        }
        if (itemUpdates.animation) {
          itemUpdates.animation = { ...item.animation, ...itemUpdates.animation };
        }

        // If no relevant updates remain, return original
        if (Object.keys(itemUpdates).length === 0) return item;

        return { ...item, ...itemUpdates };
      });
    });

    // Provide specific feedback
    const msg = _scope === 'text' ? "Applied to all Text"
      : _scope === 'visual' ? "Applied to all Visual clips"
        : "Applied Global Properties";
    showToast(msg);
  }, [setItems, showToast]);


  // 3. NEW FUNCTION: handleGlobalTransitions
  // Add this function inside VideoEditor to auto-generate transitions
  const handleGlobalTransitions = useCallback((type, duration) => {
    // 1. Clear existing transitions (optional strategy: overwrite all)
    setTransitions([]);

    // 2. Helper to find gaps between clips
    const newTransitions = [];

    // Process each track independently
    tracks.forEach(track => {
      // Only apply to visual tracks
      if (track.type !== 'video' && track.type !== 'image') return;

      // Get items for this track, sorted by time
      const trackItems = items
        .filter(it => it.trackId === track.id)
        .sort((a, b) => a.startTime - b.startTime);

      // Loop through items to find adjacencies
      for (let i = 0; i < trackItems.length - 1; i++) {
        const currentItem = trackItems[i];
        const nextItem = trackItems[i + 1];

        const currentEnd = currentItem.startTime + currentItem.duration;
        const gap = nextItem.startTime - currentEnd;

        // If items are touching (gap is negligible, e.g., < 0.1s)
        if (gap < 0.1) {
          newTransitions.push({
            id: `auto_trans_${Date.now()}_${i}`,
            leftClipId: currentItem.id,
            rightClipId: nextItem.id,
            type: type,      // e.g., 'crossfade', 'wipe'
            duration: duration,
            position: currentEnd,
            applied: true
          });
        }
      }
    });

    if (newTransitions.length > 0) {
      setTransitions(newTransitions);
      showToast(`Applied ${type} transition to ${newTransitions.length} cuts`);
    } else {
      showToast("No adjacent clips found to apply transitions");
    }

  }, [items, tracks, setTransitions, showToast]);




  const forceSeek = useCallback((time) => {
    const t = Math.max(0, Math.min(DURATION_LIMIT, time));
    seek(t); // seek() already calls playerRef.current.seekTo internally — don't call it again
    setSelectedItem(null);
    setActiveCanvasItem(null);
    setSelectedIds([]);
  }, [seek, setSelectedIds]);


  useEffect(() => {
    if (isPlaying) {
      setSelectedItem(null);
      setActiveCanvasItem(null);
      setSelectedIds([]);
    }
  }, [isPlaying]);


  const playheadLeft = useMemo(() => {
    if (!timelineWidth || visibleWindowSec <= 0) return 0;
    return ((currentTime - visibleStart) / visibleWindowSec) * timelineWidth;
  }, [currentTime, visibleStart, visibleWindowSec, timelineWidth]);
  const currentTimeRef = useRef(currentTime);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  const ensureNewTrack = useCallback((type) => {
    const idx = tracks.filter(t => t.type === type).length + 1;
    const id = `${type}-${Date.now()}-${idx}`;
    let label = `Track ${idx}`;
    if (type === 'video') label = `Video ${idx}`;
    else if (type === 'audio') label = `Audio ${idx}`;
    else if (type === 'text') label = `Text ${idx}`;
    else if (type === 'image') label = `Image ${idx}`;
    const newTrack = { id, type, label };
    setTracks(prev => [...prev, newTrack]);
    return id;
  }, [tracks, setTracks]);

  const handleTimelineScrub = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const timelineContainer = e.currentTarget.closest('.timeline-container') || e.currentTarget.closest('.video-editor-container');
    const markers = timelineContainer?.querySelector('.timeline-markers');
    if (!markers) return;
    const rect = markers.getBoundingClientRect();
    const calculateTime = (clientX) => {
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      return visibleStart + (percentage * visibleWindowSec);
    };
    const initialT = calculateTime(e.clientX);
    forceSeek(initialT);
    let isBusy = false;
    // const onMove = (moveEvent) => {
    //   if (isBusy) return; 
    //   isBusy = true;
    //   requestAnimationFrame(() => {
    //     const t = calculateTime(moveEvent.clientX);
    //     forceSeek(t);
    //     isBusy = false; 
    //   });
    // };
    // const onUp = () => {
    //   document.removeEventListener('mousemove', onMove);
    //   document.removeEventListener('mouseup', onUp);
    // };


    // In handleTimelineScrub, change the rAF throttle to only seek on mouseUp
    // when playing, and seek live only when paused:

    const onMove = (moveEvent) => {
      if (isBusy) return;
      isBusy = true;
      requestAnimationFrame(() => {
        const t = calculateTime(moveEvent.clientX);
        // ✅ Only live-seek during drag if paused — avoids timer resets while playing
        if (!isPlaying) forceSeek(t);
        else setCurrentTime(t); // just move the playhead visually, don't reset the clock
        isBusy = false;
      });
    };

    const onUp = (upEvent) => {
      // ✅ On release, do the real seek (works for both playing and paused)
      const t = calculateTime(upEvent.clientX);
      forceSeek(t);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };


    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [visibleStart, visibleWindowSec, forceSeek, isPlaying, setCurrentTime]);


  useEffect(() => {
    // 🚀 PERFORMANCE OPTIMIZATION: 
    // Force Konva to render at 1:1 pixel ratio.
    // Without this, Retina screens render at 2x/3x resolution (4x/9x pixel count),
    // causing massive lag in the preview player.
    Konva.pixelRatio = 1;
  }, []);


  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden) { setIsResizing(false); if (resizeRafRef.current) { cancelAnimationFrame(resizeRafRef.current); resizeRafRef.current = null; } } };
    const handleGlobalMouseUp = () => setIsResizing(false);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => { document.removeEventListener("visibilitychange", handleVisibilityChange); window.removeEventListener("mouseup", handleGlobalMouseUp); };
  }, []);
  useEffect(() => {
    const forceRelease = () => { setIsResizing(false); isDraggingMini.current = false; };
    window.addEventListener('blur', forceRelease);
    window.addEventListener('mouseup', forceRelease);
    return () => { window.removeEventListener('blur', forceRelease); window.removeEventListener('mouseup', forceRelease); };
  }, []);

  useEffect(() => {
    if (selectedItem) {
      const freshItem = items.find(i => i.id === selectedItem.id);
      if (!freshItem) { setSelectedItem(null); setIsPanelOpen(false); }
      else if (freshItem !== selectedItem) { setSelectedItem(freshItem); if (activeCanvasItem && activeCanvasItem.id === freshItem.id) setActiveCanvasItem(freshItem); }
    }
  }, [items, selectedItem, activeCanvasItem]);


  const [timelineLasso, setTimelineLasso] = useState(null);
  const timelineLassoStart = useRef(null);

  // Add this helper near the top of your component or outside it
  const SNAP_THRESHOLD_SEC = 0.2; // Magnetic snap strength

  const handleTimelineItemDrag = useCallback((e, item) => {
    // 1. Prevent default browser drag ghosts
    e.preventDefault();
    e.stopPropagation();

    // 2. Capture Initial State (The "Anchor" points)
    const startX = e.clientX;
    const startY = e.clientY;
    const originalStartTime = item.startTime || 0;
    const originalTrackId = item.trackId;

    // 3. Get Geometry Context
    // We calculate pixels-per-second ONCE at the start of the drag
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const pixelsPerSecond = timelineRect.width / visibleWindowSec;

    // Cache track positions for vertical dropping
    // (Querying DOM inside the loop is slow, so we do it once here)
    const trackElements = Array.from(document.querySelectorAll('.timeline-track'));
    const trackRects = trackElements.map(el => ({
      id: el.getAttribute('data-track-id'),
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom
    }));

    // 4. Animation Frame Tracker
    let animationFrameId = null;

    // 5. The Move Handler (High Performance)
    const onMouseMove = (moveEvent) => {
      // Cancel previous frame if it hasn't fired yet (throttling)
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      animationFrameId = requestAnimationFrame(() => {
        const currentX = moveEvent.clientX;
        const currentY = moveEvent.clientY;

        // --- A. Horizontal Time Calculation ---
        const deltaX = currentX - startX;
        const deltaSeconds = deltaX / pixelsPerSecond;
        let newStartTime = Math.max(0, originalStartTime + deltaSeconds);

        // --- B. Vertical Track Calculation ---
        // Check which track we are hovering over
        let newTrackId = originalTrackId;
        const hoveredTrack = trackRects.find(t =>
          currentY >= t.top && currentY <= t.bottom
        );
        if (hoveredTrack) {
          newTrackId = hoveredTrack.id;
        }

        // --- C. Magnetic Snapping (Optional but Smooth) ---
        // Snap to other clips in the *target* track
        const otherClips = items.filter(i => i.id !== item.id && i.trackId === newTrackId);
        let isSnapped = false;

        for (let other of otherClips) {
          const otherEnd = (other.startTime || 0) + (other.duration || 5);
          const otherStart = other.startTime || 0;

          // Snap Start to End of previous clip (common case)
          if (Math.abs(newStartTime - otherEnd) < SNAP_THRESHOLD_SEC) {
            newStartTime = otherEnd;
            isSnapped = true;
            break;
          }
          // Snap Start to Start of adjacent clip (alignment)
          if (Math.abs(newStartTime - otherStart) < SNAP_THRESHOLD_SEC) {
            newStartTime = otherStart;
            isSnapped = true;
            break;
          }
        }

        // Snap to Playhead (if close)
        if (!isSnapped && Math.abs(newStartTime - currentTime) < SNAP_THRESHOLD_SEC) {
          newStartTime = currentTime;
        }

        // --- D. Update State ---
        setItems(prevItems => prevItems.map(it => {
          if (it.id === item.id) {
            // Only return new object if changed (Optimization)
            if (it.startTime === newStartTime && it.trackId === newTrackId) return it;

            return {
              ...it,
              startTime: newStartTime,
              trackId: newTrackId
            };
          }
          return it;
        }));
      });
    };

    // 6. Cleanup Handler
    const onMouseUp = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      // Optional: Trigger a 'save' or 'history push' here
    };

    // 7. Attach to WINDOW (Critical for smoothness)
    // This ensures drag continues even if mouse leaves the specific div
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

  }, [visibleWindowSec, items, currentTime, timelineRef]); // Dependencies


  /* Adds a media item from the library to the timeline at the current playhead.
     Fetches real video metadata in the background and corrects dimensions/duration. */
  const handleAutoAddToTimeline = useCallback(async ({
    id,
    url,
    type = 'video',
    naturalWidth,
    naturalHeight,
    duration,
    size // <--- ✅ ADDED THIS
  }) => {

    const isFirebase = url.includes('firebasestorage.googleapis.com');
    const proxiedUrl = isFirebase ? `https://corsproxy.io/?${encodeURIComponent(url)}` : url;

    // 🔥 NEW: Use cached audio duration if available
    let effectiveDuration = duration && duration > 0 ? duration : 5;
    if (type === 'audio') {
      const cachedDuration = audioManager.getDuration(url);
      if (cachedDuration) {
        effectiveDuration = cachedDuration;
      } else {
        audioManager.loadDuration(url);
      }
    }

    const optimisticDuration = effectiveDuration;
    effectiveDuration = (optimisticDuration > 3600) ? 3600 : optimisticDuration;

    // Safety dimensions
    const safeNatW = (Number(naturalWidth) > 0) ? Number(naturalWidth) : 1920;
    const safeNatH = (Number(naturalHeight) > 0) ? Number(naturalHeight) : 1080;

    // Aspect Fit
    const wRatio = compositionWidth / safeNatW;
    const hRatio = compositionHeight / safeNatH;
    const scale = Math.min(wRatio, hRatio);
    const baseW = Math.round(safeNatW * scale);
    const baseH = Math.round(safeNatH * scale);

    const centerX = (compositionWidth - baseW) / 2;
    const centerY = (compositionHeight - baseH) / 2;
    const newTrackId = ensureNewTrack(type);

    const itemId = `${Date.now()}_auto`;

    const newItem = {
      id: itemId,
      type: type,
      url: proxiedUrl,
      mediaId: String(id),
      startTime: currentTime,
      duration: effectiveDuration,
      sourceDuration: optimisticDuration,
      offset: 0,
      trackId: newTrackId,
      x: centerX,
      y: centerY,
      width: baseW,
      height: baseH,
      naturalWidth: safeNatW,
      naturalHeight: safeNatH,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      speed: 1,
      lockAspectRatio: true,
      _hydrated: true,
      isLoading: false
    };

    setItems(prev => [...prev, newItem]);
    showToast(`${type === 'video' ? 'Video' : 'Item'} added to timeline`);

    if (type === 'video' || type === 'image') {
      (async () => {
        try {
          let meta = null;

          // 🚀 PERFORMANCE FIX: Now 'size' is defined, so this actually works!
          const BIG_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

          if (type === 'video' && size > BIG_FILE_THRESHOLD) {
            console.log("Large video detected — skipping deep metadata load");
            // We trust the passed-in naturalWidth/Height to avoid crashing browser
          } else {
            if (type === 'video') meta = await getMediaMetadata(url);
            else meta = await cleanImageData(url); // Ensure cleanImageData is imported or use generic image loader
          }

          const realW = meta?.naturalWidth || safeNatW;
          const realH = meta?.naturalHeight || safeNatH;
          const realDur = meta?.duration || optimisticDuration;

          setItems(prev => {
            const index = prev.findIndex(i => i.id === itemId);
            if (index === -1) return prev;

            const existing = prev[index];

            const wRatio = compositionWidth / realW;
            const hRatio = compositionHeight / realH;
            const scale = Math.min(wRatio, hRatio);
            const finalW = Math.round(realW * scale);
            const finalH = Math.round(realH * scale);

            const updated = {
              ...existing,
              width: finalW,
              height: finalH,
              naturalWidth: realW,
              naturalHeight: realH,
              sourceDuration: realDur,
              duration: (type === 'video' && realDur > 0) ? realDur : existing.duration,
              x: (compositionWidth - finalW) / 2,
              y: (compositionHeight - finalH) / 2,
              isLoading: false
            };

            const newArr = [...prev];
            newArr[index] = updated;
            return newArr;
          });

        } catch (e) {
          console.warn("Background metadata fetch failed", e);
          setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLoading: false } : i));
        }
      })();
    } else {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLoading: false } : i));
    }
  }, [currentTime, compositionWidth, compositionHeight, ensureNewTrack, setItems, showToast, audioManager]);


  const onTimelineMouseDown = useCallback((e) => {
    // 1. Ignore if clicking on an item, header, or resizing
    if (e.target.closest('.timeline-item') ||
      e.target.closest('.timeline-header') ||
      e.target.closest('.resize-handle') ||
      e.target.closest('.video-transition-btn')
    ) return;

    // 2. Get the specific container (timeline-tracks)
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();

    // Calculate start position relative to the container
    const startX = e.clientX - rect.left + container.scrollLeft;
    const startY = e.clientY - rect.top + container.scrollTop;

    timelineLassoStart.current = { x: startX, y: startY, left: rect.left, top: rect.top, container };
    setTimelineLasso({ x: startX, y: startY, w: 0, h: 0 });

    // 3. Clear existing selection if Shift isn't held
    if (!e.shiftKey) {
      setSelectedIds([]);
      setSelectedItem(null);
    }
  }, [setSelectedIds]);

  const onTimelineMouseMove = useCallback((e) => {
    if (!timelineLassoStart.current) return;

    const { x: startX, y: startY, left, top, container } = timelineLassoStart.current;

    // Calculate current mouse position relative to container
    // We use the cached 'left' and 'top' to ensure dragging works even if scroll changes slightly
    const currX = e.clientX - left + container.scrollLeft;
    const currY = e.clientY - top + container.scrollTop;

    const newX = Math.min(startX, currX);
    const newY = Math.min(startY, currY);
    const newW = Math.abs(currX - startX);
    const newH = Math.abs(currY - startY);

    setTimelineLasso({ x: newX, y: newY, w: newW, h: newH });
  }, []);


  const onTimelineMouseUp = useCallback((e) => {
    if (!timelineLassoStart.current) return;

    // Final Intersection Check
    if (timelineLasso) {
      const { x, y, w, h } = timelineLasso;
      // Convert lasso coordinates back to screen coordinates for comparison with getBoundingClientRect
      const containerRect = timelineLassoStart.current.container.getBoundingClientRect();

      // Define Lasso Box in Screen Space
      const lassoRect = {
        left: containerRect.left + x - timelineLassoStart.current.container.scrollLeft,
        top: containerRect.top + y - timelineLassoStart.current.container.scrollTop,
        right: containerRect.left + x + w - timelineLassoStart.current.container.scrollLeft,
        bottom: containerRect.top + y + h - timelineLassoStart.current.container.scrollTop
      };

      const foundIds = [];

      // Check all timeline items
      document.querySelectorAll('.timeline-item').forEach(el => {
        // ✅ FIX: Skip if the item is locked
        if (el.classList.contains('locked')) return;

        const box = el.getBoundingClientRect();
        // Standard AABB Intersection
        const intersects = !(box.right < lassoRect.left ||
          box.left > lassoRect.right ||
          box.bottom < lassoRect.top ||
          box.top > lassoRect.bottom);

        if (intersects) {
          const id = el.getAttribute('data-item-id'); // We need to ensure items have this attribute
          if (id) foundIds.push(id);
        }
      });

      if (foundIds.length > 0) {
        setSelectedIds(prev => [...new Set([...prev, ...foundIds])]);
      }
    }

    setTimelineLasso(null);
    timelineLassoStart.current = null;
  }, [timelineLasso, setSelectedIds]);


  // Attach Global Listeners for Dragging (prevents getting stuck if mouse leaves div)
  useEffect(() => {
    if (timelineLasso) {
      window.addEventListener('mousemove', onTimelineMouseMove);
      window.addEventListener('mouseup', onTimelineMouseUp);
    } else {
      window.removeEventListener('mousemove', onTimelineMouseMove);
      window.removeEventListener('mouseup', onTimelineMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onTimelineMouseMove);
      window.removeEventListener('mouseup', onTimelineMouseUp);
    };
  }, [timelineLasso, onTimelineMouseMove, onTimelineMouseUp]);


  // ADD THESE LINES:
  const { uniqueIdVideoUrl, uniqueIdLoading } = useUniqueIdVideo();

  useEffect(() => {
    if (!uniqueIdVideoUrl) return;

    const id = `uniqueid_video_${uniqueIdVideoUrl}`;

    setMediaFiles(prev => {
      // Prevent duplicates
      if (prev.some(f => f.id === id || f.url === uniqueIdVideoUrl || f.remoteUrl === uniqueIdVideoUrl)) {
        return prev;
      }
      return [
        {
          id,
          type: 'video',
          name: 'Marketing Video',
          url: uniqueIdVideoUrl,
          remoteUrl: uniqueIdVideoUrl,
          actualDuration: 0,
          naturalWidth: 1080,
          naturalHeight: 1920,
          _uploaded: true,
          source: 'uniqueid',
        },
        ...prev,
      ];
    });
  }, [uniqueIdVideoUrl]); // eslint-disable-line react-hooks/exhaustive-deps



  const handleAspectRatioChange = (newRatio) => {
    // 1. Helper to get precise dimensions based on the aspect ratio string
    const getDim = (r) => getCompositionSize(r);

    const oldDim = getDim(aspectRatio); // Dimensions of the current state
    const newDim = getDim(newRatio);    // Dimensions of the target state

    // Early exit if dimensions are invalid
    if (!newDim.width || !newDim.height || !oldDim.width || !oldDim.height) {
      console.error('Invalid dimensions detected for aspect ratio change');
      return;
    }

    // 2. Calculate raw scale factors (how much the canvas grew/shrank)
    const scaleX = newDim.width / oldDim.width;
    const scaleY = newDim.height / oldDim.height;

    // 3. Update every item on the timeline to fit the new stage
    const updatedItems = items.map(item => {
      // Skip non-visual elements like Audio
      if (!['video', 'image', 'text', 'gif'].includes(item.type)) return item;

      // STEP A: Calculate the item's current CENTER point
      const oldCenterX = item.x + (item.width / 2);
      const oldCenterY = item.y + (item.height / 2);

      // STEP B: Determine relative position (0.0 to 1.0)
      const relativeX = oldCenterX / oldDim.width;
      const relativeY = oldCenterY / oldDim.height;

      // STEP C: Determine New Dimensions
      let newWidth = item.width * scaleX;
      let newHeight = item.height * scaleY;

      // Special handling for Images, GIFs, and Text:
      // We do NOT want to stretch/squash them (distorting the image/font).
      // Instead, we scale them uniformly based on the average change in canvas size.
      if (item.type === 'image' || item.type === 'gif' || item.type === 'text') {
        // Geometric Mean serves as a good average scale factor
        const uniformScale = Math.sqrt(scaleX * scaleY);

        const aspect = item.width / item.height;
        newWidth = item.width * uniformScale;
        newHeight = newWidth / aspect;
      }

      // STEP D: Map the relative center to the new canvas pixel coordinates
      const newCenterX = relativeX * newDim.width;
      const newCenterY = relativeY * newDim.height;

      // STEP E: Calculate new Top-Left (x, y) coordinates
      const newX = newCenterX - (newWidth / 2);
      const newY = newCenterY - (newHeight / 2);

      return {
        ...item,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
    });

    // 4. Apply updates
    setItems(updatedItems);
    setAspectRatio(newRatio);
  };



  const handleSrtToTimeline = useCallback((cues) => {
    if (!cues || cues.length === 0) return;

    const newTrackId = `subtitles-${Date.now()}`;
    const newTrack = { id: newTrackId, type: 'text', label: 'Subtitles', locked: false };
    setTracks(prev => [newTrack, ...prev]);

    // ✅ NEW: Generate Unique Group ID
    const groupId = `srt_group_${Date.now()}`;

    const newItems = cues.map((cue, i) => ({
      id: `srt_${Date.now()}_${i}`,
      type: 'text',
      text: cue.text,
      startTime: cue.startTime,
      duration: cue.duration,
      trackId: newTrackId,

      // ✅ NEW: Assign Group ID
      subtitleGroupId: groupId,

      width: 800,
      height: 120,
      x: (compositionWidth - 800) / 2,
      y: compositionHeight - 200,
      style: {
        fontSize: 40,
        fontFamily: 'Roboto',
        fill: '#ffffff',
        align: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 8,
        padding: 10
      },
      rotation: 0,
      opacity: 1,
      _hydrated: true
    }));

    setItems(prev => [...prev, ...newItems]);
    showToast(`Imported ${newItems.length} subtitles to timeline`);

  }, [setItems, setTracks, compositionWidth, compositionHeight, showToast]);

  const uploaders = useMemo(() => ({ uploadFile: (f, p) => uploadFile(f, p), uploadFileVideo: (f, p) => uploadFileVideo(f, p), uploadFileAudio: (f, p) => uploadFileAudio(f, p), }), []);

  const { mediaFiles, setMediaFiles, addFiles, removeFile, handleMediaItemDrag, renameFile } = useMediaLibrary({
    userId,
    uploaders,
    persistKey: `ve_media_${userId || 'guest'}`,
    fileCdnUrlBuilder: buildCdnUrl,
    swapTimelineOnUpload: false,

    // ✅ Pass the SRT handler here
    onSrtUpload: handleSrtToTimeline,
    showToast: showToast,

    onUploaded: (fileData) => { handleAutoAddToTimeline({ id: fileData.id, url: fileData.url, type: fileData.type || 'video', naturalWidth: fileData.naturalWidth, naturalHeight: fileData.naturalHeight, duration: fileData.actualDuration }); },
  });

  const handleFullDeletion = useCallback((fileId) => {
    removeFile(fileId);
    setItems((prevItems) => { const filtered = prevItems.filter(item => String(item.mediaId) !== String(fileId)); return filtered; });
    if (selectedItem && String(selectedItem.mediaId) === String(fileId)) { setSelectedItem(null); setIsPanelOpen(false); }
    if (activeCanvasItem && String(activeCanvasItem.mediaId) === String(fileId)) { setActiveCanvasItem(null); }
  }, [removeFile, setItems, selectedItem, activeCanvasItem]);

  const { loaded } = useProjectPersistence({ projectKey, items, setItems, mediaFiles, setMediaFiles, tracks, setTracks, transitions, setTransitions, aspectRatio, setAspectRatio });
  const [formatSearch, setFormatSearch] = useState("");

  // 🔥 FIX: Auto-sync selectedAspectId when aspectRatio changes (from project load, etc.)
  // BUT NOT during manual dropdown selections
  const manualSelectionRef = useRef(false);

  useEffect(() => {
    // Skip auto-sync if this was a manual selection
    if (manualSelectionRef.current) {
      manualSelectionRef.current = false;
      return;
    }

    // Only auto-sync during project loads or other non-manual changes
    const matchingId = findBestMatchingRatioId(aspectRatio);
    if (matchingId !== selectedAspectId) {
      setSelectedAspectId(matchingId);
    }
  }, [aspectRatio, selectedAspectId]);

  useEffect(() => {
    setItems((prevItems) => {
      let changed = false;
      const newItems = prevItems.map((item) => {
        if (item.type !== 'image' && item.type !== 'video') return item;
        if (item._hydrated) return item;
        const { width: cw, height: ch } = getCompositionSize(aspectRatio);
        const natW = item.naturalWidth || item.width || 500;
        const natH = item.naturalHeight || item.height || (natW * 9 / 16);
        const naturalAspect = natW / natH;
        let fitW = natW; let fitH = natH;
        if (fitW > cw || fitH > ch) { const scale = Math.min(cw / fitW, ch / fitH); fitW = fitW * scale; fitH = fitH * scale; }
        changed = true;
        return { ...item, width: fitW, height: fitH, x: (cw - fitW) / 2, y: (ch - fitH) / 2, naturalAspect, lockAspectRatio: true, _hydrated: true, };
      });
      return changed ? newItems : prevItems;
    });
  }, [items.length, aspectRatio]);

  // In VideoEditor.jsx

  const handleCanvasUpdate = useCallback((updatedItem) => {
    if (isPlaying) return;

    // 1. Check if this is a size/crop update (keep existing logic)
    const hasSizeChange = updatedItem.width !== undefined || updatedItem.height !== undefined;

    // Logic for Pending Resizes (Smoothness optimization you already had)
    if (hasSizeChange && updatedItem.cropWidth === undefined) {
      const current = pendingResizeRef.current.get(updatedItem.id) || {};
      pendingResizeRef.current.set(updatedItem.id, { ...current, ...updatedItem });

      if (!resizeRafRef.current) {
        resizeRafRef.current = requestAnimationFrame(() => {
          setItems((prevItems) => {
            const nextItems = prevItems.map((it) => {
              const p = pendingResizeRef.current.get(it.id);
              if (!p) return it;

              // ... (Existing aspect ratio logic) ...
              let next = { ...it, ...p };
              // [Keep your existing Aspect Ratio/MinSize logic here]
              next.width = Math.round(Math.max(next.width || 20, 20));
              next.height = Math.round(Math.max(next.height || 20, 20));

              // ✅ SYNC LOGIC FOR RESIZING
              if (it.subtitleGroupId) {
                // If we just resized a subtitle, we must return the map
                // But since this is inside the RAF loop, it's safer to just handle
                // single updates here and let the specific group logic below handle style/position syncs
              }
              return next;
            });

            // ✅ APPLY SYNC AFTER RESIZE CALCULATION
            // If the item that triggered this resize has a Group ID, sync the others
            if (updatedItem.subtitleGroupId) {
              const sourceParams = pendingResizeRef.current.get(updatedItem.id) || updatedItem;
              return nextItems.map(it => {
                if (it.subtitleGroupId === updatedItem.subtitleGroupId && it.id !== updatedItem.id) {
                  return {
                    ...it,
                    width: sourceParams.width || it.width,
                    height: sourceParams.height || it.height,
                    // Also sync position if included in update
                    x: sourceParams.x !== undefined ? sourceParams.x : it.x,
                    y: sourceParams.y !== undefined ? sourceParams.y : it.y,
                  };
                }
                return it;
              });
            }

            pendingResizeRef.current.clear();
            return nextItems;
          });
          resizeRafRef.current = null;
        });
      }
      return;
    }

    // 2. STANDARD UPDATES (Dragging Position, Changing Styles via Properties Panel)
    setItems((prevItems) => {
      // Check if the item being updated belongs to a subtitle group
      if (updatedItem.subtitleGroupId) {
        return prevItems.map(it => {
          // If it's the exact item being modified, update it
          if (it.id === updatedItem.id) {
            return { ...it, ...updatedItem };
          }

          // If it's a sibling in the same group, sync specific properties
          if (it.subtitleGroupId === updatedItem.subtitleGroupId) {
            return {
              ...it,
              // ✅ Sync Position
              x: updatedItem.x !== undefined ? updatedItem.x : it.x,
              y: updatedItem.y !== undefined ? updatedItem.y : it.y,

              // ✅ Sync Dimensions
              width: updatedItem.width !== undefined ? updatedItem.width : it.width,
              height: updatedItem.height !== undefined ? updatedItem.height : it.height,
              rotation: updatedItem.rotation !== undefined ? updatedItem.rotation : it.rotation,

              // ✅ Sync Styles (Font, Color, Bg)
              // We merge: Existing Style <- New Style from Leader
              style: updatedItem.style ? { ...it.style, ...updatedItem.style } : it.style
            };
          }
          return it;
        });
      }

      // Default behavior for non-grouped items
      return prevItems.map((it) => (it.id === updatedItem.id ? { ...it, ...updatedItem } : it));
    });

  }, [compositionWidth, compositionHeight, setItems, isPlaying]);

  const handleBringToFront = useCallback((itemId) => {
    setItems((prevItems) => {
      const idx = prevItems.findIndex(i => i.id === itemId);
      if (idx === -1 || idx === prevItems.length - 1) return prevItems;
      const newArr = [...prevItems];
      const [item] = newArr.splice(idx, 1);
      newArr.push(item);
      return newArr;
    });
  }, [setItems]);

  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const prevCompSize = useRef({ width: compositionWidth, height: compositionHeight });
  const hydrationSyncRef = useRef(false);
  useEffect(() => {
    if (loaded && !hydrationSyncRef.current) {
      prevCompSize.current = { width: compositionWidth, height: compositionHeight };
      hydrationSyncRef.current = true;
      return;
    }
    const prevW = prevCompSize.current.width; const prevH = prevCompSize.current.height;
    if (prevW !== compositionWidth || prevH !== compositionHeight) {
      setItems((prevItems) => prevItems.map((item) => {
        const oldCenterX = item.x + (item.width / 2); const oldCenterY = item.y + (item.height / 2);
        const relCx = oldCenterX / prevW; const relCy = oldCenterY / prevH;
        let newWidth, newHeight;
        if ((item.type === 'video' || item.type === 'image') && item.naturalWidth && item.naturalHeight) {
          const natW = item.naturalWidth; const natH = item.naturalHeight;
          const fitScale = Math.min(compositionWidth / natW, compositionHeight / natH);
          newWidth = natW * fitScale; newHeight = natH * fitScale;
          newWidth = Math.max(newWidth, 100); newHeight = Math.max(newHeight, 100);
        } else {
          const areaScale = Math.sqrt((compositionWidth * compositionHeight) / (prevW * prevH));
          newWidth = item.width * areaScale; newHeight = item.height * areaScale;
        }
        const newCx = relCx * compositionWidth; const newCy = relCy * compositionHeight;
        const newX = newCx - (newWidth / 2); const newY = newCy - (newHeight / 2);
        return { ...item, x: newX, y: newY, width: newWidth, height: newHeight };
      })
      );
      prevCompSize.current = { width: compositionWidth, height: compositionHeight };
    }
  }, [compositionWidth, compositionHeight, loaded]);


  const addTextWithAudio = useCallback((textData, _, __) => {
    const currentPlayhead = currentTime;
    const duration = 5;

    const textWidth = 500;
    const textHeight = 100;

    const centerX = (compositionWidth - textWidth) / 2;
    const centerY = (compositionHeight - textHeight) / 2;
    const newTrackId = ensureNewTrack('text');

    const textItem = {
      id: `text_${Date.now()}`,
      type: 'text',
      text: textData.text || "Add Your Text",

      animation: {
        in: { type: 'fade', duration: 1.0 },
        out: { type: 'fade', duration: 1.0 }
      },
      style: {
        fontSize: 50,
        fontFamily: 'Roboto',
        fill: '#ffffff',
        fontWeight: 'normal',
        fontStyle: 'normal',
        align: 'center',
        verticalAlign: 'middle',
        strokeWidth: 0,
        strokeColor: '#000000',
        ...textData.style
      },
      startTime: currentPlayhead,
      duration: duration,
      trackId: newTrackId,
      x: centerX, y: centerY, width: textWidth, height: textHeight,
      rotation: 0, scaleX: 1, scaleY: 1,
      _hydrated: true
    };
    setItems((prev) => [...prev, textItem]);
    setSelectedItem(textItem);
    setActiveCanvasItem(textItem);
  }, [currentTime, ensureNewTrack, setItems, compositionWidth, compositionHeight]);


  /* =========================================================================
     UPDATED: handleDeleteItem (Handles Gap Deletion)
     ========================================================================= */
  const handleDeleteItem = useCallback((itemId, forcedDuration = null) => {
    if (!itemId) return;

    // 1. GAP DELETION LOGIC
    if (itemId.toString().startsWith('gap_')) {
      const parts = itemId.split('_');
      // ID Format: gap_{trackId}_{startTime}
      // We pop the time off the end to handle trackIds with underscores
      const startTimeStr = parts.pop();
      const start = parseFloat(startTimeStr);
      const trackId = parts.slice(1).join('_');

      // Determine duration: passed explicitly OR from currently selected item
      const durationToDelete = forcedDuration || (selectedItem?.id === itemId ? selectedItem.duration : null);

      if (trackId && !isNaN(start) && durationToDelete) {
        // Call the hook function to shift items back
        removeGap(trackId, start, durationToDelete);
        setSelectedItem(null);
        showToast("Gap Removed");
      }
      return;
    }

    // 2. STANDARD ITEM DELETION
    const item = items.find(i => i.id === itemId);
    if (item) {
      // Check locks
      const parentTrack = tracks.find(t => t.id === item.trackId);
      if (item.locked || (parentTrack && parentTrack.locked)) {
        showToast("Item is locked");
        return;
      }

      setItems((prev) => prev.filter((it) => it.id !== itemId));
      if (selectedItem?.id === itemId) setSelectedItem(null);
      if (activeCanvasItem?.id === itemId) setActiveCanvasItem(null);
    }
  }, [items, setItems, selectedItem, activeCanvasItem, showToast, removeGap, tracks]);



  const handleTimelineResize = useCallback((e) => {
    e.preventDefault(); setIsResizing(true); const startY = e.clientY; const startHeight = timelineHeight;
    const onMouseMove = (moveEvent) => { const deltaY = startY - moveEvent.clientY; const newHeight = Math.min(Math.max(100, startHeight + deltaY), 600); setTimelineHeight(newHeight); };
    const onMouseUp = () => { setIsResizing(false); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
  }, [timelineHeight]);

  useEffect(() => {
    const updateTransitionPanelHeight = () => { if (previewAreaRef.current) { const height = previewAreaRef.current.offsetHeight + 30; setTransitionPanelHeight(height); } };
    updateTransitionPanelHeight(); const timer = setTimeout(updateTransitionPanelHeight, 100); window.addEventListener('resize', updateTransitionPanelHeight); return () => { clearTimeout(timer); window.removeEventListener('resize', updateTransitionPanelHeight); };
  }, [timelineHeight]);

  // Auto-scroll timeline to keep the playhead visible
  useEffect(() => {
    // ✅ BLOCKER: If we are fitting to screen, don't auto-scroll to playhead
    if (isFittingRef.current) return;

    // Only run this check if the Playhead (currentTime) moved.
    // If the USER moved the view (visibleStart), we do NOT want to snap back.

    const left = visibleStart;
    const right = Math.min(DURATION_LIMIT, visibleStart + visibleWindowSec);

    // If Playhead goes out of view, center it
    if (currentTime < left || currentTime > right) {
      const half = visibleWindowSec / 2;
      let newStart = Math.max(0, Math.min(DURATION_LIMIT - visibleWindowSec, currentTime - half));

      // Prevent micro-updates/loops
      if (Math.abs(newStart - visibleStart) > 0.1) {
        setVisibleStart(newStart);
        sessionStorage.setItem('ve_visibleStart', String(newStart));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime]); // 👈 CRITICAL FIX: Removed 'visibleStart' and 'visibleWindowSec' from here


  useEffect(() => {
    // ✅ BLOCKER: If we are fitting to screen, skip this auto-center logic
    if (isFittingRef.current) {
      isFittingRef.current = false;
      return;
    }

    sessionStorage.setItem('ve_visibleWindowSec', String(visibleWindowSec));
    const half = visibleWindowSec / 2;
    const center = Math.max(0, Math.min(DURATION_LIMIT, currentTime));

    let newStart = center - half;
    if (newStart < 0) newStart = 0;
    if (newStart + visibleWindowSec > DURATION_LIMIT) newStart = Math.max(0, DURATION_LIMIT - visibleWindowSec);

    setVisibleStart(newStart);
    sessionStorage.setItem('ve_visibleStart', String(newStart));
  }, [visibleWindowSec]);




  const [micPopupOpen, setMicPopupOpen] = useState(false);


  const handleMicRecordingComplete = useCallback(async (file, duration) => {
    // 1. Create a blob URL so the audio element can play it
    const url = URL.createObjectURL(file);
    const mediaId = `rec_${Date.now()}`;

    // 2. Get the real duration from the audio element (more accurate
    //    than the timer, especially for short recordings)
    const audioDur = await new Promise((resolve) => {
      const el = document.createElement('audio');
      el.preload = 'metadata';
      el.src = url;
      el.onloadedmetadata = () => resolve(el.duration && isFinite(el.duration) ? el.duration : duration || 5);
      el.onerror = () => resolve(duration || 5);
      setTimeout(() => resolve(duration || 5), 2000); // safety timeout
    });

    // 3. Register in mediaFiles so the player can look it up
    setMediaFiles(prev => [
      {
        id: mediaId,
        type: 'audio',
        name: file.name,
        url,
        file,                           // keep File ref for export upload
        actualDuration: audioDur,
        _uploaded: false,          // not uploaded to cloud yet
        source: 'recording',
      },
      ...prev,
    ]);

    // 4. Create a new audio track
    const trackId = ensureNewTrack('audio');

    // 5. Drop item at current playhead position
    const startTime = currentTime;

    setItems(prev => [
      ...prev,
      {
        id: `${mediaId}_item`,
        type: 'audio',
        url,
        mediaId,
        startTime,
        duration: audioDur,
        sourceDuration: audioDur,
        offset: 0,
        trackId,
        volume: 1,
        _hydrated: true,
        isLoading: false,
      },
    ]);

    showToast('🎙 Recording added to timeline!');
  }, [currentTime, ensureNewTrack, setMediaFiles, setItems, showToast]);


  // Project ID: from URL 'path' param, or extracted from URL pattern
  const rawPath = searchParams.get('path');
  const urlMatch = window.location.href.match(/ai_projects_([^/?&]+)/);
  const exportProjectId = rawPath || (urlMatch ? urlMatch[1] : 'unknown_project');

  // 2. User ID: Specifically from Session Storage 'clientId'
  const exportUserId = sessionStorage.getItem("clientId") || userId;




  const { isExporting, exportVideo } = useExport({
    aspectRatio,
    items,
    tracks: sortedTracks,
    mediaFiles,
    userId,
    projectId: exportProjectId,
    exportUserId,
    canvasWidth: compositionWidth,
    canvasHeight: compositionHeight,
    canvasBackgroundColor,
    uploaders: { uploadFile, uploadFileVideo, uploadFileAudio },
    transitions,
    fileCdnUrlBuilder: buildCdnUrl,
    exportRange,

    onStart: () => {
      dispatch(setDownloader(true));
      updateProgressUI(0);
      showToast('Starting export...');
    },
    onProgress: (status) => {
      if (status === 'uploading') showToast('Uploading files...');
      else if (status === 'building') showToast('Building timeline...');
      else if (status === 'submitting') showToast('Submitting to render service...');
      else if (status === 'rendering') showToast('Rendering video... this may take a moment');
      else if (status === 'downloading') showToast('Preparing download...');
    },



    // useExport handles the streaming download internally.
    // onDone fires after the file has been saved to disk.
    onDone: (renderUrl) => {
      dispatch(setDownloader(false));
      showToast('Export complete! File downloaded.');
    },


    onError: (err) => {
      dispatch(setDownloader(false));
      console.error(`Export Failed: ${err.message}`);
      showToast(`Export Failed: ${err.message}`); // Toast for error
    }


  });


  useEffect(() => {
    setItems((prev) => prev.map((it) => {
      if (!it) return it;
      const mf = mediaFiles.find((m) => String(m.id) === String(it.mediaId));
      if (mf && mf.url && !it.url) return { ...it, url: mf.url };
      return it;
    }));
  }, [mediaFiles, setItems]);

  useEffect(() => {
    try { const raw = sessionStorage.getItem('storylineItemsData'); const rawdata = raw ? JSON.parse(raw) : null; const projectName = rawdata?.project_name || getFormattedDateTime(); dispatch(setProjectName(projectName)); } catch { dispatch(setProjectName(getFormattedDateTime())); }
  }, []);

  // ✅ FIXED: Single combined effect for VideoUrldata + uniqueIdVideoUrl.
  // — Fetches real metadata FIRST before inserting, so duration + dimensions are always correct.
  // — Also derives the correct aspect ratio from real video dimensions and sets it before insert.
  // — Eliminates the separate computeVideoAspectRatio effect (was a second parallel fetch of same URL).
  // — Deduplicates against mediaFiles AND items (URL-normalized).
  useEffect(() => {
    if (!loaded) return;

    const rawUrl = VideoUrldata || uniqueIdVideoUrl;
    if (!rawUrl) return;

    const targetUrl = decodeURIComponent(rawUrl);

    // Guard 1: already processed this exact URL this session
    if (insertedFromUrlRef.current === targetUrl) return;

    const stableMediaId = `ext-${targetUrl.replace(/[^a-z0-9]/gi, '').slice(-20)}`;

    // Guard 2: already in mediaFiles AND timeline (survives project-restore)
    const alreadyInMedia = mediaFiles.some(
      m => m.id === stableMediaId || m.url === targetUrl || m.remoteUrl === targetUrl
    );
    const alreadyInTimeline = items.some(
      it => it.url === targetUrl || decodeURIComponent(it.url || '') === targetUrl
    );
    if (alreadyInMedia && alreadyInTimeline) {
      insertedFromUrlRef.current = targetUrl;
      return;
    }

    // Mark immediately so concurrent re-renders cannot double-fire while awaiting metadata
    insertedFromUrlRef.current = targetUrl;

    let cancelled = false;
    (async () => {
      try {
        // Fetch real metadata first — only loads video headers, typically <500ms
        const meta = await getMediaMetadata(targetUrl);
        if (cancelled) return;

        const finalW = meta.naturalWidth && meta.naturalWidth > 0 ? meta.naturalWidth : 1280;
        const finalH = meta.naturalHeight && meta.naturalHeight > 0 ? meta.naturalHeight : 720;
        const finalDur = Math.min(meta.duration && meta.duration > 0 ? meta.duration : 5, 300);

        // Derive exact canvas aspect ratio from real pixel dimensions
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(finalW, finalH);
        const ratioStr = `${finalW / divisor}:${finalH / divisor}`;
        const knownRatios = {
          '16:9': { w: 1920, h: 1080 }, '9:16': { w: 1080, h: 1920 },
          '1:1': { w: 1080, h: 1080 }, '4:5': { w: 1080, h: 1350 },
          '4:3': { w: 1440, h: 1080 }, '3:4': { w: 1080, h: 1440 },
          '5:4': { w: 1350, h: 1080 }, '32:9': { w: 1920, h: 540 },
        };
        let canvasW, canvasH, chosenRatio;
        if (knownRatios[ratioStr]) {
          ({ w: canvasW, h: canvasH } = knownRatios[ratioStr]);
          chosenRatio = ratioStr;
        } else {
          const aspect = finalW / finalH;
          const best = Object.entries(knownRatios).reduce((b, [r, dim]) => {
            const diff = Math.abs(dim.w / dim.h - aspect);
            return diff < b.diff ? { r, dim, diff } : b;
          }, { diff: Infinity, r: '16:9', dim: knownRatios['16:9'] });
          chosenRatio = best.r;
          canvasW = best.dim.w;
          canvasH = best.dim.h;
        }

        // Scale video to fill canvas (cover)
        const wRatio = canvasW / finalW;
        const hRatio = canvasH / finalH;
        const scale = Math.max(wRatio, hRatio);
        const scaledW = Math.round(finalW * scale);
        const scaledH = Math.round(finalH * scale);

        if (cancelled) return;

        // Set canvas aspect ratio to match video BEFORE inserting the item
        setAspectRatio(chosenRatio);

        if (!alreadyInMedia) {
          setMediaFiles(prev => {
            if (prev.some(m => m.id === stableMediaId || m.url === targetUrl || m.remoteUrl === targetUrl)) return prev;
            return [{
              id: stableMediaId,
              type: 'video',
              name: VideoUrldata ? 'Imported Video' : 'Marketing Video',
              url: targetUrl,
              remoteUrl: targetUrl,
              actualDuration: finalDur,
              naturalWidth: finalW,
              naturalHeight: finalH,
              _uploaded: true,
            }, ...prev];
          });
        }

        if (!alreadyInTimeline) {
          setItems(prev => {
            if (prev.some(it => it.url === targetUrl || decodeURIComponent(it.url || '') === targetUrl)) return prev;
            const trackId = ensureNewTrack('video');
            return [...prev, {
              id: `init-url-${Date.now()}`,
              type: 'video',
              url: targetUrl,
              mediaId: stableMediaId,
              trackId,
              startTime: 0,
              duration: finalDur,
              sourceDuration: finalDur,
              width: scaledW,
              height: scaledH,
              x: (canvasW - scaledW) / 2,
              y: (canvasH - scaledH) / 2,
              naturalWidth: finalW,
              naturalHeight: finalH,
              speed: 1,
              _hydrated: true,
              isLoading: false,
            }];
          });
        }

      } catch (err) {
        console.error('[VideoUrl insert] metadata fetch failed', err);
      }
    })();

    return () => { cancelled = true; };

  }, [loaded, VideoUrldata, uniqueIdVideoUrl, ensureNewTrack, setItems, setMediaFiles, setAspectRatio, mediaFiles, items]);

  const [dragTooltip, setDragTooltip] = useState(null); // Stores real-time { start, end }

  // Intercept Redux export trigger to open the settings modal instead of exporting directly
  useEffect(() => {
    if (!exportButton) return;
    setExportModalOpen(true); // Open modal instead of directly exporting
    dispatch(setExportButton(false));
  }, [exportButton, dispatch]);


  useEffect(() => { if (aspectRatio === '16:9') setOrientation('landscape'); else if (aspectRatio === '9:16') setOrientation('portrait'); }, [aspectRatio]);

  const handleTransitionClick = useCallback((transition) => { setSelectedTransition(transition); setTransitionPanelOpen(true); setIsPanelOpen(false); setSelectedItem(null); }, []);
  const handleTransitionPanelClose = useCallback(() => { setTransitionPanelOpen(false); setSelectedTransition(null); }, []);
  const handleRemoveTransition = useCallback((transitionId) => { setTransitions((prev) => prev.filter(t => t.id !== transitionId)); showToast('Transition removed'); }, [showToast]);


  // ✅ UPDATED: Handle Property Updates (Support "Apply to All" for Style AND Animation)
  const handlePropertyUpdate = (updatedItem) => {
    // Check for the special flag
    if (updatedItem._applyToGroup && updatedItem.subtitleGroupId) {
      const { _applyToGroup, _targetProp, ...cleanItem } = updatedItem;

      setItems(prev => prev.map(it => {
        // Apply attributes to everything in the same subtitle group
        if (it.subtitleGroupId === cleanItem.subtitleGroupId) {
          const newItem = { ...it };

          // Sync Style if targeted or generic
          if (!_targetProp || _targetProp === 'style') {
            newItem.style = cleanItem.style ? { ...it.style, ...cleanItem.style } : it.style;
          }

          // Sync Animation if targeted or generic
          if (!_targetProp || _targetProp === 'animation') {
            newItem.animation = cleanItem.animation ? { ...cleanItem.animation } : it.animation;
          }

          return newItem;
        }
        return it;
      }));

      // Update the selected item specifically to refresh UI
      if (selectedItem && selectedItem.id === cleanItem.id) {
        setSelectedItem(cleanItem);
      }

      showToast(_targetProp === 'animation' ? "Animation applied to all captions" : "Style applied to all captions");
    } else {
      // Standard single item update
      setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
      if (selectedItem && selectedItem.id === updatedItem.id) setSelectedItem(updatedItem);
    }
  };

  const detectAdjacentClips = useCallback((trackItems) => {
    if (trackItems.length < 2) return [];
    const transitionsList = [];
    const sortedItems = [...trackItems].sort((a, b) => a.startTime - b.startTime);
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const currentClip = sortedItems[i]; const nextClip = sortedItems[i + 1];
      const currentEnd = currentClip.startTime + currentClip.duration; const nextStart = nextClip.startTime;
      const gap = nextStart - currentEnd;
      if (gap <= 0.01) {
        const transitionId = `transition-${currentClip.id}-${nextClip.id}`;
        const existingTransition = transitions.find(t => t.id === transitionId);
        transitionsList.push({ id: transitionId, leftClip: currentClip, rightClip: nextClip, position: currentEnd, type: existingTransition?.type || 'crossfade', duration: existingTransition?.duration || 0.5, applied: !!existingTransition });
      }
    }
    return transitionsList;
  }, [transitions]);

  const getAdjustedDuration = useCallback((item) => {
    if (!item || transitions.length === 0) return item?.duration || 0;
    const itemIdStr = String(item.id);
    const affectingTransitions = transitions.filter(t => String(t.leftClipId) === itemIdStr || String(t.rightClipId) === itemIdStr);
    if (affectingTransitions.length === 0) return item.duration;
    let adjustedDuration = item.duration;
    affectingTransitions.forEach(t => {
      const transitionDuration = Math.max(0.1, Math.min(2, toNumber(t.duration, 0.5)));
      if (String(t.leftClipId) === itemIdStr) adjustedDuration = Math.max(0, adjustedDuration - transitionDuration);
      if (String(t.rightClipId) === itemIdStr) adjustedDuration = Math.max(0, adjustedDuration - transitionDuration);
    });
    return Math.max(0.1, adjustedDuration);
  }, [transitions]);

  const isItemVisibleWithTransition = useCallback((item, t) => {
    const start = item.startTime ?? 0; let duration = item.duration ?? 0;
    const exitTransition = transitions.find(tr => String(tr.leftClipId) === String(item.id) && tr.applied);
    if (exitTransition) { duration += (Number(exitTransition.duration) || 1.0); }
    const end = start + duration; return t >= start && t < end;
  }, [transitions]);

  const handleItemClick = (item) => { setSelectedItem(item); setIsPanelOpen(true); setSelectedTransition(null); setTransitionPanelOpen(false); };
  const handlePanelClose = () => { setIsPanelOpen(false); setSelectedItem(null); };

  const contentDuration = useMemo(() => {
    if (items.length === 0) return 30;
    const maxEnd = Math.max(...items.map(i => i.startTime + i.duration));
    return Math.min(DURATION_LIMIT, Math.max(maxEnd, 1));
  }, [items]);



  // Handle Keyboard Shortcuts (Delete, Copy, Paste, Undo, Redo, Play/Pause, Zoom)
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName.toLowerCase();
      // Don't trigger if user is typing in an input/textarea
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      // --- DELETE / BACKSPACE ---
      if (e.key === "Delete" || e.key === "Backspace") {

        // 1. Priority: Multi-Select Delete
        if (selectedIds.length > 0) {
          e.preventDefault();
          removeSelectedItems();
          setSelectedItem(null); // Cleanup UI
          setSelectedGap(null);
          return;
        }

        // 2. Priority: Delete Active Canvas Item
        if (activeCanvasItem) {
          e.preventDefault();
          handleDeleteItem(activeCanvasItem.id);
          return;
        }
        // 3. Priority: Delete Selected Timeline Item
        if (selectedItem) {
          e.preventDefault();
          handleDeleteItem(selectedItem.id);
          return;
        }
        // 4. Priority: Delete Selected Gap
        if (selectedGap) {
          e.preventDefault();
          removeGap(selectedGap.trackId, selectedGap.startTime, selectedGap.duration);
          setSelectedGap(null);
          showToast("Gap deleted");
          return;
        }
      }


      // --- MARK IN (I) ---
      if (e.key.toLowerCase() === 'i' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setExportRange(prev => ({ ...prev, start: currentTime }));
        showToast(`Mark In: ${formatTime(currentTime)}`);
      }

      // --- MARK OUT (O) ---
      if (e.key.toLowerCase() === 'o' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setExportRange(prev => ({ ...prev, end: currentTime }));
        showToast(`Mark Out: ${formatTime(currentTime)}`);
      }

      // --- CLEAR MARKS (P) ---
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setExportRange({ start: 0, end: null });
        showToast("Export Range Cleared");
      }



      // --- PASTE (Ctrl+V / Cmd+V) ---
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // copy crow
        if (selectedItem && selectedItem.type !== 'gap') {
          // Store selected item in session storage
          window.sessionStorage.setItem('ve_clipboard', JSON.stringify(selectedItem));
          // showToast("Copied to clipboard");
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        //paste crow
        const raw = window.sessionStorage.getItem('ve_clipboard');
        if (raw) {
          try {
            const clipboardItem = JSON.parse(raw);
            // Uses current playhead time for pasting
            const newItem = addPastedItem(clipboardItem, currentTime);
            if (newItem) {
              setSelectedItem(newItem);
              showToast("Pasted");
            }
          } catch (err) {
            console.error("Paste failed", err);
          }
        }
      }

      // --- UNDO (Ctrl+Z / Cmd+Z) ---
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }

      // --- REDO (Ctrl+Y / Cmd+Y) ---
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }

      // --- PLAY/PAUSE (Spacebar) ---
      if (e.code === 'Space') {
        e.preventDefault();
        playPause();
      }

      // --- ZOOM IN (+ or =) ---
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        // Decrease visible window to zoom in. 
        // Using 5s limit (matches your handleFitTimeline logic) allows deeper zoom than the 30s button limit.
        setVisibleWindowSec(prev => Math.max(5, prev - 5));
      }

      // --- ZOOM OUT (_ or -) ---
      if (e.key === '_' || e.key === '-') {
        e.preventDefault();
        // Increase visible window to zoom out
        setVisibleWindowSec(prev => Math.min(DURATION_LIMIT, prev + 5));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    // ✅ Dependencies maintained to ensure shortcuts use fresh data
    activeCanvasItem, selectedItem, selectedGap,
    removeGap, handleDeleteItem, showToast,
    addPastedItem, currentTime,
    undo, redo, canUndo, canRedo, playPause,
    selectedIds, removeSelectedItems // Added missing deps for consistency
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIds.length === 0 || e.target.tagName === 'INPUT') return;

      const nudgeSec = e.shiftKey ? 1 : 0.1; // Nudge 1s with shift, else 0.1s

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const direction = e.key === 'ArrowLeft' ? -1 : 1;

        setItems(prev => prev.map(it => {
          if (selectedIds.includes(it.id) && !it.locked) {
            return { ...it, startTime: Math.max(0, it.startTime + (direction * nudgeSec)) };
          }
          return it;
        }));
      }

      // Move Up/Down Tracks
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setItems(prev => prev.map(it => {
          if (selectedIds.includes(it.id) && !it.locked) {
            // Logic to find current track index and move to next/prev
            const currentTrackIdx = tracks.findIndex(t => t.id === it.trackId);
            const newTrackIdx = e.key === 'ArrowUp' ? currentTrackIdx - 1 : currentTrackIdx + 1;
            if (newTrackIdx >= 0 && newTrackIdx < tracks.length) {
              return { ...it, trackId: tracks[newTrackIdx].id };
            }
          }
          return it;
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, setItems, tracks]);

  const toNumber = (value, fallback = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback;
  };

  const playerInputProps = useMemo(() => ({
    timelineItems: items,
    onUpdateItem: handleCanvasUpdate,
    onSelectItem: (itemId) => {
      handleBringToFront(itemId);
      const found = items.find(i => i.id === itemId);
      setActiveCanvasItem(found || null);
      setSelectedItem(found || null);
    },
    onDeleteItem: handleDeleteItem,
    isPlaying,
    canvasWidth: compositionWidth,
    canvasHeight: compositionHeight,
    canvasBackgroundColor, // ✅ Passed to InteractiveComposition
    transitions,
    tracks: sortedTracks,
    selectedItemId: selectedItem?.id || null
  }), [items, isPlaying, compositionWidth, compositionHeight, transitions, sortedTracks, selectedItem, canvasBackgroundColor]);




  /* ===========================
     UPDATED: renderTrack
     - Renders Loader Overlay if item.isLoading is true
  =========================== */
  const renderTrack = (track, index, allTracks) => {
    const trackItems = items.filter((item) => item.trackId === track.id);
    const detectedTransitions = (track.type === 'video' || track.type === 'image') ? detectAdjacentClips(trackItems) : [];
    const isLocked = track.isLocked || track.locked;

    // Sort & Gap logic (kept brief, standard)
    const sortedItems = [...trackItems].sort((a, b) => a.startTime - b.startTime);
    const gaps = [];
    if (sortedItems.length > 0 && sortedItems[0].startTime > 0.05) {
      gaps.push({ id: `gap-${track.id}-start`, type: 'gap', trackId: track.id, startTime: 0, duration: sortedItems[0].startTime });
    }
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const currentEnd = sortedItems[i].startTime + sortedItems[i].duration;
      const nextStart = sortedItems[i + 1].startTime;
      if (nextStart - currentEnd > 0.05) {
        gaps.push({ id: `gap-${track.id}-${sortedItems[i].id}`, type: 'gap', trackId: track.id, startTime: currentEnd, duration: nextStart - currentEnd });
      }
    }

    return (
      <div
        key={track.id}
        className={`timeline-track ${track.type}-track ${isLocked ? 'locked' : ''}`}
        data-track-id={track.id}
        tabIndex={-1}
        onDragOver={(e) => { if (isLocked) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDrop={isLocked ? undefined : onDropFactory({ mediaFiles, currentTimeRef, visibleStart, visibleWindowSec })}
        style={{
          background: isLocked ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 10px, transparent 10px, transparent 20px)' : undefined,
          position: 'relative', display: 'block'
        }}
      >
        <div className="timeline-track-label" style={{ position: 'sticky', left: 0, zIndex: 500, display: 'flex', alignItems: 'center', padding: '4px 12px 4px 4px', width: 'fit-content', maxWidth: '200px', background: 'rgba(26, 26, 26, 0.95)', backdropFilter: 'blur(4px)', borderRight: '1px solid rgba(255,255,255,0.1)', borderRadius: '0 4px 4px 0', height: '100%' }}>
          <button className="track-lock-btn" onClick={(e) => { e.stopPropagation(); toggleTrackLock(track.id); }} style={{ background: 'transparent', border: 'none', color: isLocked ? '#ff4444' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', padding: '4px', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isLocked ? "Unlock Track" : "Lock Track"}>
            <span className="material-icons" style={{ fontSize: '16px' }}>{isLocked ? "lock" : "lock_open"}</span>
          </button>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{track.label}</span>
        </div>

        {/* Render Gaps */}
        {gaps.map((gap) => {
          const isSelected = selectedGap?.id === gap.id;
          const leftPct = ((gap.startTime - visibleStart) / visibleWindowSec) * 100;
          const widthPct = (gap.duration / visibleWindowSec) * 100;
          if (leftPct + widthPct < 0 || leftPct > 100) return null;
          return (
            <div key={gap.id} className={`gap-item ${isSelected ? 'selected' : ''}`} style={{ left: `${leftPct}%`, width: `${widthPct}%`, position: 'absolute', height: '100%', zIndex: 90, cursor: isLocked ? 'default' : 'pointer' }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isLocked) return; setSelectedGap(gap); setSelectedItem(null); setActiveCanvasItem(null); setSelectedIds([]); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); if (isLocked) return; setContextMenu({ x: e.clientX, y: e.clientY, gap: gap }); setSelectedGap(gap); }}
            />
          );
        })}

        {/* Render Items */}
        {trackItems.map((item) => {
          const z = trackZIndex.get(track.id) ?? 0;
          const isRealGif = item.url?.match(/\.gif($|\?)/i);
          const showAsVideo = item.type === 'video' || (item.type === 'gif' && !isRealGif);
          const showAsImage = item.type === 'image' || (item.type === 'gif' && isRealGif);

          const isMultiSelected = selectedIds.includes(item.id);
          const isSelected = (selectedItem?.id === item.id) || isMultiSelected;
          const isItemLocked = isLocked || item.locked;
          const isDragging = item.id === draggingItemId;

          return (
            <div
              key={item.id}
              data-item-id={item.id}
              tabIndex={0}
              className={`timeline-item ${item.type} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${item.isShadow ? 'shadow-frame' : ''} ${isItemLocked ? 'locked' : ''}`}
              style={{
                ...timelineItemStyle(item, visibleStart, Math.min(DURATION_LIMIT, visibleStart + visibleWindowSec)),
                zIndex: isDragging ? 9999 : (z + 100),
                position: 'absolute', overflow: 'hidden',
                pointerEvents: 'auto',
                opacity: isItemLocked ? 0.8 : 1,
                outline: 'none'
              }}
              onKeyDown={(e) => { if (isItemLocked && (e.key === 'Delete')) { e.preventDefault(); e.stopPropagation(); } }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (isItemLocked) return;
                if (e.shiftKey) { setSelectedIds(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]); } else { setSelectedIds([item.id]); }
                handleItemClick(item);
                setDraggingItemId(item.id);
                // (Keep existing drag setup logic here) ...
                const startX = e.clientX;
                const originalStartTime = item.startTime || item.start || 0;
                const duration = item.duration;
                const trackContainer = e.currentTarget.closest('.timeline-tracks');
                const containerWidth = trackContainer ? trackContainer.getBoundingClientRect().width : 1000;

                const handleMouseMove = (moveEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const secondsPerPixel = visibleWindowSec / containerWidth;
                  const newStart = Math.max(0, originalStartTime + (deltaX * secondsPerPixel));
                  setDragTooltip({ start: newStart, end: newStart + duration, x: moveEvent.clientX, y: moveEvent.clientY });
                };
                const handleMouseUp = () => {
                  setDraggingItemId(null); setDragTooltip(null);
                  window.removeEventListener('mousemove', handleMouseMove);
                  window.removeEventListener('mouseup', handleMouseUp);
                };
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
                handleDragFactory(item, visibleStart, visibleWindowSec, null)(e);
              }}
            >
              {isItemLocked && (<div style={{ position: 'absolute', left: 4, top: 4, zIndex: 99, color: '#ff4d4d', pointerEvents: 'none' }}><span className="material-icons" style={{ fontSize: 14 }}>lock</span></div>)}

              {isDragging && dragTooltip && (
                <div className="item-drag-overlay" style={{ pointerEvents: 'none' }}>
                  <div className="drag-info-pill">
                    <span className="time-val start">{formatTime(dragTooltip.start)}</span>
                    <span className="drag-arrow">➜</span>
                    <span className="time-val end">{formatTime(dragTooltip.end)}</span>
                  </div>
                </div>
              )}

              {/* <div className="media-content">
              {showAsVideo ? ( <ThumbStrip src={item.url} durationSec={getAdjustedDuration(item)} height={46} /> ) : 
               showAsImage ? ( <div className="media-preview" style={{ backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%' }} /> ) : 
               item.type === 'text' ? ( <div style={{ width: '100%', height: '100%', background: '#4a4a4a', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', fontSize: 12, color: '#fff' }}> <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', padding:4}}>T: {item.text}</span> </div> ) : 
               ( <div className="audio-waveform" draggable={false} onDragStart={(e) => e.preventDefault()} /> )}
            </div> */}

              <div className="media-content">
                {showAsVideo ? (
                  // <ThumbStrip 
                  //   src={item.url} 
                  //   durationSec={getAdjustedDuration(item)} 
                  //   offset={item.offset || 0} // <--- ADD THIS: Ensures thumbs respect the trim
                  //   height={46} 
                  // /> 

                  // After
                  <ThumbStrip
                    src={item.url}
                    fullDuration={item.sourceDuration}         // ← full source length (never changes)
                    offset={item.offset || 0}
                    visibleDuration={getAdjustedDuration(item)} // ← trimmed/visible portion
                    height={46}
                  />
                ) :
                  showAsImage ? (<div className="media-preview" style={{ backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center', width: '100%', height: '100%' }} />) :
                    item.type === 'text' ? (<div style={{ width: '100%', height: '100%', background: '#4a4a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 12, color: '#fff' }}> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: 4 }}>T: {item.text}</span> </div>) :
                      (<div className="audio-waveform" draggable={false} onDragStart={(e) => e.preventDefault()} />)}
              </div>

              {!isItemLocked && (
                <>
                  <div className="resize-handle left" onMouseDown={handleResizeFactory(item, 'left', mediaFiles, visibleStart, visibleWindowSec)}></div>
                  <div className="resize-handle right" onMouseDown={handleResizeFactory(item, 'right', mediaFiles, visibleStart, visibleWindowSec)}></div>
                </>
              )}
            </div>
          );
        })}

        {(track.type === 'video' || track.type === 'image') && detectedTransitions.map((transition) => (
          <div key={transition.id} className={`video-transition-btn ${transition.applied ? 'applied' : ''}`}
            style={{ left: `${((transition.position - visibleStart) / visibleWindowSec) * 100}%`, top: '50%', zIndex: 200, pointerEvents: isLocked ? 'none' : 'auto', opacity: isLocked ? 0.5 : 1 }}
            onClick={(e) => { e.stopPropagation(); if (!isLocked) handleTransitionClick(transition); }}>
            <div className="transition-btn-icon">{transition.applied ? '✓' : '+'}</div>
          </div>
        ))}
      </div>
    );
  };


  // --- SCREENSHOT HANDLER (SMART CROP) ---
  const handleScreenshot = useCallback(() => {
    const wrapper = playerContainerRef.current;
    if (!wrapper) {
      console.error("Screenshot Error: Player container not found.");
      return;
    }

    const canvas = wrapper.querySelector('canvas');
    if (!canvas) {
      alert("Screenshot Failed: Canvas element not found.");
      return;
    }

    try {
      // 1. Get Dimensions
      // viewportSize = The size of the UI container (grey area)
      // compositionWidth/Height = The actual video resolution (e.g., 1080x1920)
      const stageW = viewportSize.width;
      const stageH = viewportSize.height;

      // 2. Replicate the Scaling Logic from InteractiveComposition.jsx
      // We subtract 20px padding because that's what your composition uses
      const padding = 20;
      const availableW = stageW - padding;
      const availableH = stageH - padding;

      // Calculate the scale factor used to fit the video in the preview
      const scale = Math.min(availableW / compositionWidth, availableH / compositionHeight);

      // Calculate the visual size and position of the "Black Area" on screen
      const visualW = compositionWidth * scale;
      const visualH = compositionHeight * scale;
      const visualX = (stageW - visualW) / 2;
      const visualY = (stageH - visualH) / 2;

      // 3. Handle High-DPI Screens (Retina)
      // The actual canvas pixels might be 2x or 3x the CSS size
      const pixelRatio = canvas.width / stageW;

      const cropX = visualX * pixelRatio;
      const cropY = visualY * pixelRatio;
      const cropW = visualW * pixelRatio;
      const cropH = visualH * pixelRatio;

      // 4. Create a Temp Canvas to Crop & Resize
      const tempCanvas = document.createElement('canvas');
      // Set temp canvas to the REAL video resolution (e.g., 1080x1920)
      tempCanvas.width = compositionWidth;
      tempCanvas.height = compositionHeight;
      const ctx = tempCanvas.getContext('2d');

      // Draw only the relevant part of the source canvas onto the temp canvas
      ctx.drawImage(
        canvas,
        cropX, cropY, cropW, cropH, // Source Crop (The Black Area)
        0, 0, compositionWidth, compositionHeight // Destination (Full Res)
      );

      // 5. Download
      const dataUrl = tempCanvas.toDataURL("image/png");
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `Screenshot_${timestamp}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Screenshot error:", err);
      if (err.name === 'SecurityError') {
        alert("Security Error: Cannot capture screenshot because an image/video is loaded from an external URL without CORS headers.");
      }
    }
  }, [viewportSize, compositionWidth, compositionHeight]);



  const { exportProject, importProject } = useProjectImportExport({
    items,
    setItems,
    tracks,
    setTracks,
    transitions,
    setTransitions,
    aspectRatio,
    setAspectRatio,
    canvasBackgroundColor,
    setCanvasBackgroundColor,
    mediaFiles,
    setMediaFiles,
    showToast
  });




  const miniRef = useRef(null);
  const isDraggingMini = useRef(false);
  useEffect(() => {
    const onMove = (e) => { if (!isDraggingMini.current || !miniRef.current) return; const rect = miniRef.current.getBoundingClientRect(); const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left)); const pct = relX / rect.width; const newStart = Math.max(0, Math.min(DURATION_LIMIT - visibleWindowSec, pct * DURATION_LIMIT - visibleWindowSec / 2)); setVisibleStart(newStart); sessionStorage.setItem('ve_visibleStart', String(newStart)); };
    const onUp = () => { isDraggingMini.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    if (isDraggingMini.current) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [visibleWindowSec]);
  const onMiniMouseDown = (e) => { isDraggingMini.current = true; };
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentLabel = {
    '16:9': '16:9 YouTube',
    '9:16': '9:16 Story',
    '1:1': '1:1 Instagram',
    '4:5': '4:5 Portrait'
  }[aspectRatio] || '9:16 Portrait';


  const handleToggleLock = useCallback(() => {
    if (!selectedItem) return;
    // Toggle in Timeline
    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, locked: !i.locked } : i));
    // Toggle in Selection State
    setSelectedItem(prev => ({ ...prev, locked: !prev.locked }));
    showToast(selectedItem.locked ? "Clip Unlocked" : "Clip Locked");
  }, [selectedItem, setItems, showToast]);

  // Zooms the timeline view to fit all clips with 5% padding
  const handleFitTimeline = useCallback(() => {
    if (!items || items.length === 0) {
      setVisibleStart(0);
      setVisibleWindowSec(30);
      return;
    }

    // 1. Find boundaries of CONTENT (Ignore Playhead)
    let minT = DURATION_LIMIT;
    let maxT = 0;

    items.forEach(it => {
      if (it.startTime < minT) minT = it.startTime;
      const end = (it.startTime || 0) + (it.duration || 0);
      if (end > maxT) maxT = end;
    });

    // 2. Calculate View
    const span = maxT - minT;
    const padding = Math.max(1, span * 0.05); // 5% padding

    let newStart = Math.max(0, minT - padding);
    let newWindow = span + (padding * 2);

    // 3. Constraints
    newWindow = Math.max(5, Math.min(DURATION_LIMIT, newWindow));
    if (newStart + newWindow > DURATION_LIMIT) {
      newStart = Math.max(0, DURATION_LIMIT - newWindow);
    }

    // 4. ✅ LOCK: Prevent the other Effects from undoing our work
    isFittingRef.current = true;

    // 5. Apply Changes
    setVisibleStart(newStart);
    setVisibleWindowSec(newWindow);

    sessionStorage.setItem('ve_visibleStart', String(newStart));
    sessionStorage.setItem('ve_visibleWindowSec', String(newWindow));

    // 6. ✅ UNLOCK: Release the lock after React renders are done (200ms)
    setTimeout(() => {
      isFittingRef.current = false;
    }, 200);

  }, [items]);

  const handleSplitClip = useCallback(() => {
    if (!selectedItem) { showToast("Select a clip to split!"); return; }

    // ✅ LOCK CHECK
    if (selectedItem.locked) { showToast("Cannot split locked clip"); return; }

    const itemStart = selectedItem.startTime;
    const itemEnd = itemStart + selectedItem.duration;

    if (currentTime <= itemStart + 0.1 || currentTime >= itemEnd - 0.1) {
      showToast("Move playhead inside the selected clip");
      return;
    }

    const splitOffset = currentTime - itemStart;
    const leftDuration = splitOffset;
    const originalOffset = selectedItem.offset || 0;

    const rightClip = {
      ...selectedItem,
      id: `${selectedItem.type}_${Date.now()}_split`,
      startTime: currentTime,
      duration: selectedItem.duration - splitOffset,
      offset: originalOffset + leftDuration,
    };

    setItems(prevItems => {
      const newItems = prevItems.map(it => {
        if (it.id === selectedItem.id) return { ...it, duration: leftDuration };
        return it;
      });
      return [...newItems, rightClip];
    });

    setSelectedItem(rightClip);
    showToast("Clip Split!");
  }, [selectedItem, currentTime, setItems, showToast]);



  const handleGlobalReset = React.useCallback((resetType, scope = 'all') => {
    if (resetType === 'transitions') {
      setTransitions([]);
      showToast("All transitions removed");
      return;
    }
    setItems((prevItems) => {
      return prevItems.map((item) => {
        if (scope === 'text' && item.type !== 'text') return item;
        if (scope === 'visual' && !['video', 'image', 'text'].includes(item.type)) return item;

        const newItem = { ...item };
        if (resetType === 'animations') {
          newItem.animation = { in: { type: 'none' }, out: { type: 'none' } };
        }
        else if (resetType === 'styles' && item.type === 'text') {
          newItem.style = {
            fontSize: 80, fill: '#ffffff', fontWeight: 'bold', fontStyle: 'normal', align: 'center'
          };
        }
        return newItem;
      });
    });
    showToast(`Reset ${resetType} for all ${scope === 'all' ? 'applicable' : scope} clips`);
  }, [setItems, setTransitions, showToast]);



  return (
    <div className="video-editor-container0">
      <div className="top-strip" style={{ width: '100%', zIndex: 100 }}>
        <Suspense fallback={<div className="h-16 bg-neutral-950 w-full" />}>
          <TopHeader />
        </Suspense>
      </div>
      <div className="video-editor-container">
        <div className="sidebar">
          <div className="sidebar-nav">


            {SIDEBAR_TABS.map((tab) => (
              <div
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                title={`${tab.label} Panel`}
                onClick={() => setActiveTab(tab.id)}
              >
                {/* 1. RESET: No extra span wrappers, just the icon and label */}
                <div className="nav-icon-wrapper">
                  <div className="nav-icon-inner">
                    {tab.icon}
                  </div>
                </div>
                <span className="nav-label">{tab.label}</span>
              </div>
            ))}

          </div>

          <div className="sidebar-content">
            <div className="content-header"><h2>{activeTab === 'Assets' ? 'Media' : activeTab}</h2></div>

            {activeTab === 'Assets' && (
              <div className="assets-content"><div className="media-section">
                <Suspense fallback={<div />}>
                  <MediaSection
                    userId={userId}
                    externalVideoUrl={externalVideoUrl || uniqueIdVideoUrl}
                    onDurationLoaded={() => {
                      audioManager.preloadDurations(
                        items.filter(i => i.type === 'audio').map(i => i.url).filter(Boolean)
                      );
                    }}
                    onAddItem={(mediaItem) => {
                      const payload = {
                        id: mediaItem.id,
                        type: mediaItem.type || mediaItem.type || 'image',
                        url: mediaItem.VideoUrl || mediaItem.AudioUrl || mediaItem.ImageUrl || mediaItem.url || '',
                        name: mediaItem.name || 'Media',
                        actualDuration: mediaItem.actualDuration || 5,
                        naturalWidth: mediaItem.naturalWidth || mediaItem.width || 500,
                        naturalHeight: mediaItem.naturalHeight || mediaItem.height || 500,
                      };
                      const e = {
                        preventDefault: () => { },
                        stopPropagation: () => { },
                        dataTransfer: {
                          getData: () => JSON.stringify(payload),
                          files: []
                        }
                      };
                      onDropFactory({ currentTimeRef })(e);
                    }}
                  />
                </Suspense>
              </div></div>
            )}

            {/* Add this new block to render the UploadMedia component */}
            {activeTab === 'Media' && (
              <div className="upload-content" style={{ height: '100%' }}>
                <Suspense fallback={<div />}>
                  <UploadMedia
                    onUpload={(files) => addFiles(files)}
                    mediaFiles={mediaFiles}
                    handleMediaItemDrag={handleMediaItemDrag}
                    handleDeleteMediaFile={handleFullDeletion}
                    showToast={showToast}
                  />
                </Suspense>
              </div>
            )}

            {/* --- NEW ELEMENTS PANEL --- */}
            {activeTab === 'Elements' && (
              <div className="elements-content">
                <ElementsPanel onDragStart={handleMediaItemDrag} />
              </div>
            )}
            {/* --------------------------- */}

            {activeTab === 'Properties' && (
              <GlobalPropertiesPanel
                onApplyGlobal={handleGlobalPropertyUpdate}
                onApplyTransitions={handleGlobalTransitions}
                onGlobalReset={handleGlobalReset}
              />
            )}

            {activeTab === 'Text' && <div className="text-content"><TextResources /></div>}
            {activeTab === 'Aistory' && <div className="aistory-content"><Suspense fallback={<div />}><Aistory /></Suspense></div>}

          </div>
        </div>
        <div className="main-content">
          <div className="preview-area" ref={previewAreaRef} onDragOver={(e) => e.preventDefault()} onDrop={onDropFactory({ mediaFiles, currentTimeRef })}>
            <div className="canvas-frame" ref={playerContainerRef} style={{ width: "100%", height: "100%", background: 'transparent', boxShadow: 'none' }}>
              <Player
                ref={playerRef}
                component={InteractiveComposition}
                inputProps={playerInputProps}
                durationInFrames={DURATION_LIMIT * FPS}
                compositionWidth={compositionWidth}
                compositionHeight={compositionHeight}
                fps={FPS}
                style={{ width: "100%", height: "100%", background: 'transparent' }}
                playing={isPlaying}
                acknowledgeRemotionLicense
              />
            </div>
          </div>
          <div className="timeline-container" style={{ height: `${timelineHeight}px` }} onMouseDown={(e) => { if (e.target === e.currentTarget.querySelector('::before')) setIsResizing(true); }}>
            <div className="video-progress-container" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); forceSeek(pct * contentDuration); }}>
              <div className="video-progress-track"></div>

              {/* ✅ ADD THIS: Export Range Visual Indicator */}
              {(exportRange.start > 0 || exportRange.end !== null) && (
                <div style={{
                  position: 'absolute',
                  top: 0, bottom: 0,
                  left: `${(exportRange.start / contentDuration) * 100}%`,
                  width: `${((exportRange.end === null ? contentDuration : exportRange.end) - exportRange.start) / contentDuration * 100}%`,
                  background: 'rgba(209, 254, 23, 0.3)', // Highlighter color
                  borderLeft: '2px solid #D1FE17',
                  borderRight: '2px solid #D1FE17',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
              )}


            </div>
            <div className="timeline-resizer" onMouseDown={handleTimelineResize} style={{ cursor: 'ns-resize', userSelect: 'none', position: 'relative', borderRadius: '8px 8px 0 0' }}>
              <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: "center", color: '#999', top: "-13px", fontSize: '12px', zIndex: "99", width: "100%" }}>-^-</span>
            </div>




            {/* ✅ FIXED TIMELINE CONTROLS LAYOUT */}
            <div className="timeline-controls" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0 16px',
              boxSizing: 'border-box',
              gap: '0',
              height: '50px'
            }}>

              <div className="right-controls" style={{ minWidth: '200px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', flexShrink: 0, flex: 1 }}>
                <div className="playback-controls" style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 20px'
                }}>

                  <div className="time-display" style={{
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: '120px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: '500'
                  }}>
                    <span>{formatTime(currentTime)}</span>
                    <span style={{ opacity: 0.5 }}> / {formatTime(DURATION_LIMIT)}</span>
                  </div>
                </div>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>

                {/* ✅ FIX: Removed TooltipButton wrapper, added title attribute */}
                <button className="zoom-btn" onClick={undo} disabled={!canUndo} style={{ opacity: canUndo ? 1 : 0.3 }} title="Undo (Ctrl+Z)">
                  <span className="material-icons">undo</span>
                </button>

                <button className="zoom-btn" onClick={redo} disabled={!canRedo} style={{ opacity: canRedo ? 1 : 0.3 }} title="Redo (Ctrl+Y)">
                  <span className="material-icons">redo</span>
                </button>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>

                <button className="zoom-btn" onClick={handleSplitClip} style={{ opacity: selectedItem ? 1 : 0.4 }} title="Split Clip">
                  <span className="material-icons">content_cut</span>
                </button>

                <button
                  className="zoom-btn"
                  title="Delete"
                  onClick={() => {
                    if (selectedIds.length > 0) {
                      removeSelectedItems();
                      setSelectedItem(null);
                      setSelectedGap(null);
                    } else if (selectedItem) {
                      handleDeleteItem(selectedItem.id);
                    }
                  }}
                  style={{ opacity: (selectedIds.length > 0 || selectedItem) ? 1 : 0.4 }}
                >
                  <span className="material-icons">delete</span>
                </button>

                <button
                  className="zoom-btn"
                  title="Add Audio / Record"
                  onClick={() => setMicPopupOpen(v => !v)}
                  style={{ color: micPopupOpen ? '#D1FE17' : undefined, position: 'relative' }}
                >
                  <span className="material-icons">mic</span>
                  {micPopupOpen && (
                    <span style={{
                      position: 'absolute', top: 3, right: 3,
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#D1FE17',
                    }} />
                  )}
                </button>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>

                <button className="zoom-btn" onClick={() => forceSeek(Math.max(0, currentTime - 5))} title="Rewind 5s">
                  <span className="material-icons">fast_rewind</span>
                </button>

                <button className="play-button" onClick={playPause} title={isPlaying ? "Pause" : "Play"}>
                  <span className="material-icons" style={{ fontSize: '24px', marginLeft: isPlaying ? '0' : '2px' }}>
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                <button className="zoom-btn" onClick={() => forceSeek(Math.min(DURATION_LIMIT, currentTime + 5))} title="Forward 5s">
                  <span className="material-icons">fast_forward</span>
                </button>

                <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 8px, overflow: visible' }}></div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ marginRight: 5, fontSize: 12, color: '#aaa' }}>Bg:</label>
                  <input
                    type="color"
                    className="circle-picker"  // ✅ Added Class
                    title="Canvas Background Color"
                    value={canvasBackgroundColor}
                    onChange={(e) => setCanvasBackgroundColor(e.target.value)}
                    style={{
                      width: 26,             // Slightly bigger for better clicking
                      height: 26,
                      padding: 0,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      cursor: 'pointer',
                      borderRadius: '50%',   // ✅ Makes the container round
                      overflow: 'hidden'     // ✅ Clips the corners
                    }}
                  />
                </div>

                <div className="modern-dropdown-container" ref={dropdownRef}>
                  <button
                    className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                    title="Select Canvas Aspect Ratio"
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      setFormatSearch("");
                    }}
                  >
                    <span className="current-value" style={{
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: 0,
                      gap: '4px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                        flex: '1 1 auto'
                      }}>
                        {ASPECT_RATIOS.find(r => r.id === selectedAspectId)?.label || 'Custom'}
                      </span>
                      <span style={{
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        opacity: 0.8
                      }}>
                        ({aspectRatio})
                      </span>
                    </span>
                    <span className="material-icons arrow">expand_more</span>
                  </button>



                  <div className={`dropdown-menu-animated ${isDropdownOpen ? 'open' : ''}`} style={{ width: 280, maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px', position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <input
                        type="text"
                        placeholder="Search formats..."
                        value={formatSearch}
                        onChange={(e) => setFormatSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          padding: '8px 10px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none'
                        }}
                      />
                    </div>




                    {/* PLACE THIS IN YOUR JSX (e.g., inside .right-controls or a settings menu) */}

                    <div style={{ display: 'flex', gap: '8px', marginRight: '12px' }}>
                      {/* Export Button */}
                      <button
                        className="icon-button"
                        title="Export Project (JSON)"
                        onClick={exportProject}
                      >
                        <span className="material-icons">save_alt</span>
                      </button>

                      {/* Import Button */}
                      <button
                        className="icon-button"
                        title="Import Project (JSON)"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <span className="material-icons">file_upload</span>
                      </button>

                      {/* Hidden Input for Import */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json"
                        onChange={handleFileChange}
                      />
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                      {ASPECT_RATIOS
                        .filter(item => item.label.toLowerCase().includes(formatSearch.toLowerCase()))
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`dropdown-item ${selectedAspectId === item.id ? 'selected' : ''}`}
                            onClick={() => {
                              // Set flag to prevent auto-sync from interfering with manual selection
                              manualSelectionRef.current = true;
                              setSelectedAspectId(item.id); // Update selected ID FIRST
                              handleAspectRatioChange(item.ratio); // Then change ratio
                              setIsDropdownOpen(false);
                            }}
                            style={{ display: 'flex', alignItems: 'center', padding: '10px 12px' }}
                          >
                            <span className="material-icons" style={{
                              fontSize: 18,
                              marginRight: 10,
                              color: item.category === 'social' ? '#FFD700' : '#aaa'
                            }}>
                              {item.icon}
                            </span>

                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              flex: 1,
                              minWidth: 0 // Allow text truncation
                            }}>
                              <span style={{
                                fontSize: 13,
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '180px' // Adjust based on dropdown width
                              }}>
                                {item.label}
                              </span>
                              <span style={{
                                fontSize: 11,
                                color: 'rgba(255,255,255,0.4)',
                                marginTop: '2px'
                              }}>
                                {item.ratio}
                              </span>
                            </div>

                            {selectedAspectId === item.id && (
                              <span className="material-icons" style={{ marginLeft: '8px', fontSize: 16, color: '#D1FE17' }}>check</span>
                            )}
                          </div>
                        ))}

                      {ASPECT_RATIOS.filter(item => item.label.toLowerCase().includes(formatSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#666', fontSize: 12 }}>
                          No formats found
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="divider-vertical"></div>


                <div className="zoom-group">
                  <button
                    className="zoom-btn"
                    title="Take Screenshot"
                    onClick={handleScreenshot}
                    style={{ marginRight: 4 }}
                  >
                    <span className="material-icons">camera_alt</span>
                  </button>


                  <button className="zoom-btn" title="Fit Timeline to Screen" onClick={handleFitTimeline}>
                    <span className="material-icons">straighten</span>
                  </button>

                  <button className="zoom-btn" title="Zoom Out Timeline" onClick={() => setVisibleWindowSec(Math.max(30, visibleWindowSec - 5))}><span className="material-icons">remove</span></button>
                  <input type="range" min={30} max={DURATION_LIMIT} step={0.1} value={visibleWindowSec} onChange={(e) => setVisibleWindowSec(Number(e.target.value))} className="zoom-slider" title="Timeline Zoom Level" />
                  <button className="zoom-btn" title="Zoom In Timeline" onClick={() => setVisibleWindowSec(Math.min(DURATION_LIMIT, visibleWindowSec + 5))}><span className="material-icons">add</span></button>
                </div>
              </div>
            </div>









            {/* =====================================================================================
    TIMELINE AREA 
    - Handles Horizontal Scrolling via Wheel/Trackpad
    - Syncs Ruler (Markers) and Tracks perfectly
   ===================================================================================== */}
            <div
              className="timeline"
              ref={timelineRef}
              /* ROBUST SCROLL HANDLER */
              onWheel={(e) => {
                // Check if horizontal scroll is intended
                const isHorizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

                if (isHorizontal) {
                  // 🛑 STOP browser history navigation immediately
                  e.preventDefault();
                  e.stopPropagation();

                  const scrollSpeed = visibleWindowSec / 1000;
                  const delta = e.deltaX || e.deltaY;

                  // Calculate new start time
                  let newStart = visibleStart + (delta * scrollSpeed);

                  // HARD CLAMP: Prevent it from going below 0 or above limit
                  newStart = Math.max(0, Math.min(DURATION_LIMIT - visibleWindowSec, newStart));

                  // Only update if value actually changed (Optimization)
                  if (Math.abs(newStart - visibleStart) > 0.001) {
                    setVisibleStart(newStart);
                    sessionStorage.setItem('ve_visibleStart', String(newStart));
                  }
                }
                // If vertical (deltaY > deltaX), we let it bubble to .timeline-tracks naturally
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
              onDrop={onDropFactory({ mediaFiles, currentTimeRef })}
            >
              {/* Playhead Line */}
              <div
                className="playhead-line"
                style={{
                  left: `${((currentTime - visibleStart) / visibleWindowSec) * 100}%`,
                  pointerEvents: 'none',
                  zIndex: 50
                }}
              />

              {/* FIXED TIMELINE HEADER (RULER) */}
              <div
                className="timeline-markers"
                style={{ position: 'relative', cursor: 'ew-resize', zIndex: 600, height: '30px' }}
                onMouseDown={handleTimelineScrub}
              >
                {(() => {
                  // 1. Dynamic Step Calculation
                  let step;
                  if (visibleWindowSec <= 30) step = 1;
                  else {
                    const rawStep = visibleWindowSec / 15;
                    const allowedSteps = [5, 10, 15, 30, 60];
                    step = allowedSteps.find(s => s >= rawStep) || 60;
                  }

                  // 2. Render Range
                  const startTick = Math.floor(visibleStart / step) * step;
                  const endTick = visibleStart + visibleWindowSec;
                  const markers = [];
                  for (let t = startTick; t <= endTick + step; t += step) {
                    // Buffer of +/- step to ensure smooth edge rendering
                    if (t >= visibleStart - step && t <= endTick + step) markers.push(t);
                  }

                  return markers.map((t) => {
                    const leftPct = ((t - visibleStart) / visibleWindowSec) * 100;

                    // Skip if way off screen
                    if (leftPct < -5 || leftPct > 105) return null;

                    let label = `${Math.round(t)}s`;
                    if (t >= 60) {
                      const m = Math.floor(t / 60);
                      const s = Math.round(t % 60);
                      label = s === 0 ? `${m}m` : `${m}m ${s}s`;
                    }

                    // Align "0s" to left edge, center all other markers
                    const isStart = t === 0;
                    const transformStyle = isStart ? 'translateX(0)' : 'translateX(-50%)';

                    return (
                      <div key={t} className="marker" style={{ left: `${leftPct}%`, position: 'absolute', transform: transformStyle }}>
                        <span>{label}</span>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Tracks Container */}
              <div className="timeline-tracks" onMouseDown={onTimelineMouseDown}>
                {sortedTracks.map((t, i, arr) => renderTrack(t, i, arr))}
                <div
                  className="timeline-tracks-drop-area"
                  style={{ minHeight: '50px', width: '100%' }}
                  onDrop={onDropFactory({ mediaFiles, currentTimeRef, visibleStart, visibleWindowSec })}
                  onDragOver={(e) => e.preventDefault()}
                />
                {timelineLasso && (
                  <div
                    className="timeline-lasso-box"
                    style={{ left: timelineLasso.x, top: timelineLasso.y, width: timelineLasso.w, height: timelineLasso.h }}
                  />
                )}
              </div>
            </div>


            {/* =====================================================================================
    TIMELINE NAVIGATOR (Draggable Scrollbar)
   ===================================================================================== */}
            <div className="timeline-bottom-navigator">
              <div
                ref={miniRef}
                className="mini-overview"
                title="Click to jump, Drag handle to scroll"

                // 1. TRACK CLICK (Jump to Position)
                onMouseDown={(e) => {
                  // If we clicked the Handle, ignore (let the handle logic work)
                  if (e.target.closest('.mini-handle')) return;

                  const rect = miniRef.current.getBoundingClientRect();
                  const relX = e.clientX - rect.left;
                  const pct = Math.max(0, Math.min(1, relX / rect.width));

                  // Center the view on the click point
                  const centerTime = pct * DURATION_LIMIT;
                  const newStart = Math.max(0, Math.min(DURATION_LIMIT - visibleWindowSec, centerTime - (visibleWindowSec / 2)));

                  setVisibleStart(newStart);
                  sessionStorage.setItem('ve_visibleStart', String(newStart));
                }}
              >
                {/* Mini Item Indicators */}
                {items.map(it => {
                  const left = (it.startTime / DURATION_LIMIT) * 100;
                  const width = (it.duration / DURATION_LIMIT) * 100;
                  return (
                    <div key={it.id} style={{
                      position: 'absolute', left: `${left}%`, width: `${width}%`,
                      top: 4, bottom: 4, borderRadius: 2,
                      background: it.type === 'video' ? 'rgba(255,200,50,0.5)' : 'rgba(100,200,255,0.5)',
                      pointerEvents: 'none' // Let clicks pass through to track
                    }} />
                  );
                })}

                {/* 2. THE DRAGGABLE HANDLE (Yellow Box) */}
                <div
                  className="mini-handle"
                  style={{
                    left: `${(visibleStart / DURATION_LIMIT) * 100}%`,
                    width: `${(visibleWindowSec / DURATION_LIMIT) * 100}%`
                  }}

                  // DRAG LOGIC
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Stop parent "Jump" click

                    const startX = e.clientX;
                    const startVisibleStart = visibleStart;
                    const rect = miniRef.current.getBoundingClientRect();

                    document.body.style.cursor = 'grabbing'; // Global cursor override

                    const onMouseMove = (moveEvent) => {
                      const deltaX = moveEvent.clientX - startX;

                      // Convert Pixels -> Seconds
                      // (Amount Moved / Total Width) * Total Seconds
                      const deltaSeconds = (deltaX / rect.width) * DURATION_LIMIT;

                      const newStart = Math.max(0, Math.min(DURATION_LIMIT - visibleWindowSec, startVisibleStart + deltaSeconds));
                      setVisibleStart(newStart);
                    };

                    const onMouseUp = () => {
                      document.body.style.cursor = ''; // Reset cursor
                      window.removeEventListener('mousemove', onMouseMove);
                      window.removeEventListener('mouseup', onMouseUp);
                      sessionStorage.setItem('ve_visibleStart', String(visibleStart));
                    };

                    // Attach to Window so you can drag outside the box
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
      {Toast}
      <PropertiesPanel
        selectedItem={selectedItem}
        onUpdate={handlePropertyUpdate}
        onSelect={(item) => { setSelectedItem(item); setActiveCanvasItem(item); }}
        onClose={handlePanelClose}
        isOpen={isPanelOpen}
        height={transitionPanelHeight}
        canvasWidth={compositionWidth}
        canvasHeight={compositionHeight}
        items={items}
      />
      <MicPopup
        isOpen={micPopupOpen}
        onClose={() => setMicPopupOpen(false)}
        onAddAudio={handleMicRecordingComplete}
        showToast={showToast}
        canvasRef={previewAreaRef}
      />


      <TransitionPanel transition={selectedTransition} onClose={handleTransitionPanelClose} onApply={(transitionData) => { setTransitions((prev) => { const filtered = prev.filter(t => t.id !== transitionData.id); return [...filtered, { id: transitionData.id, leftClipId: transitionData.leftClip.id, rightClipId: transitionData.rightClip.id, type: transitionData.type, duration: transitionData.duration, position: transitionData.position, applied: true }]; }); showToast(`Transition (${transitionData.type}) applied!`); handleTransitionPanelClose(); }} onRemove={handleRemoveTransition} isOpen={transitionPanelOpen} height={transitionPanelHeight} />

      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '12px',
            zIndex: 10000, // High z-index ensures it appears above everything
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: '140px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
          // Prevent clicks inside the menu from triggering the global close listener
          onClick={(e) => e.stopPropagation()}
          // Prevent right-click inside the menu from opening the browser menu
          onContextMenu={(e) => e.preventDefault()}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (contextMenu.gap) {
                  removeGap(contextMenu.gap.trackId, contextMenu.gap.startTime, contextMenu.gap.duration);
                  showToast("Gap Deleted");
                }
                setContextMenu(null);
                setSelectedGap(null);
              }}
              style={{ flex: 1, background: '#d93025', color: 'white', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              Delete
            </button>
          </div>
        </div>
      )}


      {exportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1a1a1a', padding: '24px', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)', width: '340px', color: '#fff'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Export Settings</h3>

            {/* Resolution Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#aaa' }}>Resolution</label>
              <select
                value={exportSettings.resolution}
                onChange={(e) => setExportSettings({ ...exportSettings, resolution: e.target.value })}
                style={{
                  width: '100%', padding: '10px', background: '#2a2a2a',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px'
                }}
              >
                <option value="480p">480p (Standard)</option>
                <option value="1080p">1080p (HD)</option>
                <option value="2048p">2K (Pro HD)</option>
                <option value="4098p">4K (Ultra HD)</option>
              </select>
            </div>

            {/* Format Selection */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#aaa' }}>Format</label>
              <select
                value={exportSettings.format}
                onChange={(e) => setExportSettings({ ...exportSettings, format: e.target.value })}
                style={{
                  width: '100%', padding: '10px', background: '#2a2a2a',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px'
                }}
              >
                <option value="mp4">MP4 (Video)</option>
                <option value="mp3">MP3 (Audio Only)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setExportModalOpen(false)}
                style={{
                  padding: '8px 16px', background: 'transparent', border: 'none',
                  color: '#aaa', cursor: 'pointer', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setExportModalOpen(false);
                  exportVideo(exportSettings); // Pass settings to the hook
                }}
                style={{
                  padding: '8px 16px', background: '#D1FE17', border: 'none',
                  color: '#000', cursor: 'pointer', fontWeight: 'bold', borderRadius: '6px'
                }}
              >
                Export Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default VideoEditor;