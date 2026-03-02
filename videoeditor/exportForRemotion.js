


const FPS = 30;

export function exportTimelineForRemotion(
  timelineItems, 
  tracks, 
  transitions, 
  canvasWidth, 
  canvasHeight, 
  exportRange,
  canvasBackgroundColor = "#000000", // ✅ ADD THIS PARAMETER
  exportOptions = {} // ✅ ADD THIS PARAMETER
) {
  
  // 1. Calculate total duration
  const computedMax = Math.max(
    0, 
    ...timelineItems.map(i => Math.round((i.startTime + i.duration) * FPS))
  );
  
  const durationInFrames = computedMax || (FPS * 5);

  // 2. Format data for the Backend
  return {
    width: canvasWidth,
    height: canvasHeight,
    fps: FPS,
    durationInFrames,

    resolution: exportOptions.resolution || '1080p',
    format: exportOptions.format || 'mp4',

    // ✅ CRITICAL: Pass canvas background color
    canvasBackgroundColor: canvasBackgroundColor || "#000000",
    
    // Canvas dimensions (for InteractiveComposition scaling)
    canvasWidth: canvasWidth,
    canvasHeight: canvasHeight,

    // Export Window info
    exportWindow: {
        start: exportRange?.start || 0,
        end: exportRange?.end || null 
    },

    // The backend expects "timelineItems"
    timelineItems: timelineItems.map(item => {
        
        // CRITICAL CHECK: Warn dev if sending Blob URLs
        const src = item.remoteUrl || item.src || item.url;
        if (src && src.startsWith('blob:')) {
            console.warn(`⚠️ WARNING: Item ${item.id} is using a Blob URL. The backend will fail to load this:`, src);
        }

        return {
            ...item,
            startFrame: Math.round(item.startTime * FPS),
            endFrame: Math.round((item.startTime + item.duration) * FPS),
            durationInFrames: Math.round(item.duration * FPS),
            src: item.remoteUrl || item.src || item.url, 
            file: undefined, 
            blob: undefined
        };
    }),
    
    tracks: tracks,
    transitions: transitions,
    
    // Force backend into read-only mode
    readOnly: true 
  };
}