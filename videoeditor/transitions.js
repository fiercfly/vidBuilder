// src/component/videoeditor/transitions.js
export const COMMON_TRANSITIONS = [
    { id: 'fade',       name: 'Fade',        shotstack: 'fade',       remotion: { fn: 'fade',       args: {} } },
    { id: 'wipeRight',  name: 'Wipe Right',  shotstack: 'wipeRight',  remotion: { fn: 'wipe',       args: { direction: 'from-left' } } },
    { id: 'wipeLeft',   name: 'Wipe Left',   shotstack: 'wipeLeft',   remotion: { fn: 'wipe',       args: { direction: 'from-right' } } },
    { id: 'slideRight', name: 'Slide Right', shotstack: 'slideRight', remotion: { fn: 'slide',      args: { direction: 'from-left' } } },
    { id: 'slideLeft',  name: 'Slide Left',  shotstack: 'slideLeft',  remotion: { fn: 'slide',      args: { direction: 'from-right' } } },
    // { id: 'zoom',       name: 'Zoom',        shotstack: 'zoom',       remotion: { fn: 'zoomCustom', args: { scale: 1.2 } } },
    { id: 'none',       name: 'None',        shotstack: 'none',       remotion: null },
  ];
  
  export const getTransitionById = (id) => COMMON_TRANSITIONS.find((t) => t.id === id) || null;
  export const toShotstackEnum = (id, durationSec) => {
    const t = getTransitionById(id);
    if (!t) return undefined;
    const base = t.shotstack;
    if (!base || base === 'none') return null;
    if (!Number.isFinite(durationSec)) return base;
    if (durationSec <= 0.25) return `${base}Fast`;
    if (durationSec >= 1.0)  return `${base}Slow`;
    return base;
  };