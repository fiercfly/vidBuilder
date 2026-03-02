// import React from "react";
// import {
//   AbsoluteFill,
//   useCurrentFrame,
//   useVideoConfig,
//   Sequence,
//   Video,
//   Easing,
//   Img,
// } from "remotion";

// const CROSSFADE_SEC = 0.6;

// const buildCrossfadesAndMeta = (timelineItems, fps) => {
//   const sorted = [...(timelineItems || [])].sort(
//     (a, b) => (a.startTime || 0) - (b.startTime || 0)
//   );

//   const transitionFrames = Math.max(1, Math.floor(CROSSFADE_SEC * fps));

//   const clipMeta = new Map();
//   sorted.forEach((item) => {
//     const startF = Math.floor((item.startTime || 0) * fps);
//     const durF = Math.max(1, Math.floor((item.duration || 5) * fps));
//     clipMeta.set(item.id, {
//       item,
//       startF,
//       durF,
//       earliestFrom: startF,
//     });
//   });

//   const crossfades = [];

//   for (let i = 0; i < sorted.length - 1; i++) {
//     const A = sorted[i];
//     const B = sorted[i + 1];

//     const metaA = clipMeta.get(A.id);
//     const metaB = clipMeta.get(B.id);
//     if (!metaA || !metaB) continue;

//     const Astart = metaA.startF;
//     const Adur = metaA.durF;

//     const fadeStart = Astart + Adur - transitionFrames;
//     const fadeEnd = fadeStart + transitionFrames;

//     crossfades.push({
//       AId: A.id,
//       BId: B.id,
//       fadeStart,
//       fadeEnd,
//       type: "fade",
//     });

//     metaB.earliestFrom = Math.min(metaB.earliestFrom, fadeStart);
//   }

//   return { sorted, clipMeta, crossfades };
// };

// const getClipOpacity = ({ clipId, frame, clipMeta, crossfades }) => {
//   const meta = clipMeta.get(clipId);
//   if (!meta) return 0;

//   let opacity = 1;
//   const { earliestFrom } = meta;

//   if (frame < earliestFrom) return 0;

//   crossfades.forEach(({ AId, BId, fadeStart, fadeEnd, type }) => {
//     if (type !== "fade") return;

//     const len = fadeEnd - fadeStart;
//     if (len <= 0) return;

//     if (clipId === AId) {
//       if (frame >= fadeStart && frame <= fadeEnd) {
//         const tNorm = (frame - fadeStart) / len;
//         opacity = Math.min(opacity, 1 - Easing.inOut(Easing.cubic)(tNorm));
//       } else if (frame > fadeEnd) {
//         opacity = 0;
//       }
//     }

//     if (clipId === BId) {
//       if (frame < fadeStart) {
//         opacity = 0;
//       } else if (frame >= fadeStart && frame <= fadeEnd) {
//         const tNorm = (frame - fadeStart) / len;
//         opacity = Easing.inOut(Easing.cubic)(tNorm);
//       }
//     }
//   });

//   return opacity;
// };

// // --- HELPER: Dynamic CSS Masking ---
// const getMaskStyle = (maskType) => {
//   // Using mask-image with radial-gradient ensures the shape is calculated 
//   // independently of the container's aspect ratio.
  
//   if (maskType === 'circle') {
//     // 'circle closest-side' creates a circle that fits within the smallest dimension (width or height)
//     // without stretching into an oval.
//     const circleMask = 'radial-gradient(circle closest-side, black 100%, transparent 100%)';
//     return {
//       maskImage: circleMask,
//       WebkitMaskImage: circleMask,
//       maskPosition: 'center',
//       WebkitMaskPosition: 'center',
//       maskRepeat: 'no-repeat',
//       WebkitMaskRepeat: 'no-repeat',
//     };
//   }
  
//   if (maskType === 'oval') {
//     // 'ellipse closest-side' creates an oval that fits the container
//     const ovalMask = 'radial-gradient(ellipse closest-side, black 100%, transparent 100%)';
//     return {
//       maskImage: ovalMask,
//       WebkitMaskImage: ovalMask,
//       maskPosition: 'center',
//       WebkitMaskPosition: 'center',
//       maskRepeat: 'no-repeat',
//       WebkitMaskRepeat: 'no-repeat',
//     };
//   }

//   // 'rect' or 'none' -> standard box (no mask)
//   return {};
// };

// // ----------------- MAIN COMPONENT -----------------

// export const VideoComposition = ({
//   timelineItems = [],
// }) => {
//   const frame = useCurrentFrame();
//   const { fps, width, height } = useVideoConfig();

//   if (!timelineItems || timelineItems.length === 0) {
//     return <AbsoluteFill style={{ backgroundColor: "black" }} />;
//   }

//   if (timelineItems.length === 1) {
//     const item = timelineItems[0];
//     const startF = Math.floor((item.startTime || 0) * fps);
//     const durF = Math.max(1, Math.floor((item.duration || 5) * fps));
//     const offsetF = Math.floor((item.offset || 0) * fps);

//     // Apply masking style
//     const maskStyle = getMaskStyle(item.maskType);

//     return (
//       <AbsoluteFill style={{ backgroundColor: "black" }}>
//         <Sequence from={startF} durationInFrames={durF}>
//           <AbsoluteFill>
//              {/* Wrapper Div for Masking */}
//              <div style={{ width: '100%', height: '100%', ...maskStyle }}>
//                 {item.type === "video" && item.url && (
//                   <Video
//                     src={item.url}
//                     startFrom={offsetF} 
//                     playbackRate={item.speed || 1}
//                     volume={item.muted ? 0 : (item.volume ?? 1)}
//                     style={{ width: "100%", height: "100%", objectFit: "cover" }}
//                   />
//                 )}
//                 {item.type === "image" && item.url && (
//                   <Img
//                     src={item.url}
//                     style={{ width: "100%", height: "100%", objectFit: "cover" }}
//                   />
//                 )}
//              </div>
//           </AbsoluteFill>
//         </Sequence>
//       </AbsoluteFill>
//     );
//   }

//   const { sorted, clipMeta, crossfades } = buildCrossfadesAndMeta(
//     timelineItems,
//     fps
//   );

//   const renderClips = () =>
//     sorted.map((item) => {
//       const meta = clipMeta.get(item.id);
//       if (!meta) return null;

//       const { earliestFrom, durF, startF } = meta;
      
//       const seqFrom = earliestFrom;
//       const seqDuration = startF + durF - earliestFrom;

//       if (seqDuration <= 0) return null;

//       const opacity = getClipOpacity({
//         clipId: item.id,
//         frame,
//         clipMeta,
//         crossfades,
//       });

//       if (opacity <= 0.001) return null;

//       const offsetF = Math.floor((item.offset || 0) * fps);
//       const shiftAmount = startF - earliestFrom; 
//       const startFromF = Math.max(0, offsetF - shiftAmount);

//       // Apply masking style per clip
//       const maskStyle = getMaskStyle(item.maskType);

//       return (
//         <Sequence
//           key={`clip-${item.id}`}
//           from={seqFrom}
//           durationInFrames={seqDuration}
//         >
//           <AbsoluteFill style={{ opacity }}>
//              {/* Wrapper Div for Masking */}
//              <div style={{ width: '100%', height: '100%', ...maskStyle }}>
//                 {item.type === "video" && item.url && (
//                   <Video
//                     src={item.url}
//                     startFrom={startFromF}
//                     playbackRate={item.speed || 1}
//                     volume={item.muted ? 0 : (item.volume ?? 1)}
//                     style={{
//                       width: "100%",
//                       height: "100%",
//                       objectFit: "cover",
//                     }}
//                   />
//                 )}
//                 {item.type === "image" && item.url && (
//                   <Img
//                     src={item.url}
//                     style={{
//                       width: "100%",
//                       height: "100%",
//                       objectFit: "cover",
//                     }}
//                   />
//                 )}
//             </div>
//           </AbsoluteFill>
//         </Sequence>
//       );
//     });

//   return (
//     <AbsoluteFill style={{ backgroundColor: "black" }}>
//       {renderClips()}
//     </AbsoluteFill>
//   );
// };

// export default VideoComposition;




import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Video,
  Easing,
  Img,
  interpolate
} from "remotion";

const FPS_DEFAULT = 30;

// --- 1. Transition Logic Builder ---
const buildCrossfadesAndMeta = (timelineItems, transitions, fps) => {
  const sorted = [...(timelineItems || [])].sort(
    (a, b) => (a.startTime || 0) - (b.startTime || 0)
  );

  const clipMeta = new Map();
  sorted.forEach((item) => {
    const startF = Math.floor((item.startTime || 0) * fps);
    const durF = Math.max(1, Math.floor((item.duration || 5) * fps));
    clipMeta.set(item.id, {
      item,
      startF,
      durF,
      earliestFrom: startF, // Will shift earlier if it needs to handle a transition
    });
  });

  const activeTransitions = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const A = sorted[i];
    const B = sorted[i + 1];

    const metaA = clipMeta.get(A.id);
    const metaB = clipMeta.get(B.id);
    if (!metaA || !metaB) continue;

    const Astart = metaA.startF;
    const Adur = metaA.durF;
    const Aend = Astart + Adur;

    // Find if a transition exists between these two clips
    const transDef = transitions.find(t => t.leftClipId === A.id && t.rightClipId === B.id && t.applied);
    
    // Default overlap duration (0.6s) if simply overlapping, or use specific transition duration
    const transDurationSec = transDef ? (Number(transDef.duration) || 0.6) : 0.6; 
    const transitionFrames = Math.max(1, Math.floor(transDurationSec * fps));

    // Calculate overlap window
    // Logic: The transition ends exactly when Clip A ends.
    const transEnd = Aend; 
    const transStart = transEnd - transitionFrames;

    if (transDef) {
        activeTransitions.push({
          AId: A.id,
          BId: B.id,
          start: transStart,
          end: transEnd,
          type: transDef.type || 'fade',
        });
    } else {
        // Fallback for natural overlaps (treat as crossfade)
        if (metaB.startF < Aend) {
             activeTransitions.push({
                AId: A.id,
                BId: B.id,
                start: Math.max(Aend - transitionFrames, metaB.startF),
                end: Aend,
                type: 'fade',
              });
        }
    }

    // Shift Clip B's render start time earlier if needed to cover the transition
    metaB.earliestFrom = Math.min(metaB.earliestFrom, transStart);
  }

  return { sorted, clipMeta, activeTransitions };
};

// --- 2. Style Calculator ---
const getClipStyle = ({ clipId, frame, clipMeta, activeTransitions, width, height }) => {
  const meta = clipMeta.get(clipId);
  if (!meta) return { opacity: 0 };

  const { earliestFrom } = meta;
  if (frame < earliestFrom) return { opacity: 0 };

  // Default State
  let style = { opacity: 1, zIndex: 1, transform: 'none', clipPath: 'none' };

  // Check if this clip is involved in any active transition at the current frame
  activeTransitions.forEach(({ AId, BId, start, end, type }) => {
    if (frame < start || frame > end) return;

    const progress = interpolate(frame, [start, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    
    // --- Transition: FADE ---
    if (type === 'fade' || type === 'crossfade') {
       if (clipId === AId) {
           // A fades out
           style.opacity = 1 - progress; 
           style.zIndex = 2;
       } else if (clipId === BId) {
           // B fades in (Wait, standard crossfade is A fading out revealing B, or B fading in?)
           // Usually B is opaque underneath, A fades out on top.
           style.opacity = 1; 
           style.zIndex = 1;
       }
    }

    // --- Transition: WIPE RIGHT (Reveal from Left -> Right) ---
    else if (type === 'wipeRight') {
        if (clipId === BId) {
            style.zIndex = 10; // B is on top
            // Inset from Right shrinks from 100% to 0%
            const pct = (1 - progress) * 100;
            style.clipPath = `inset(0 ${pct}% 0 0)`;
        }
    }
    
    // --- Transition: WIPE LEFT (Reveal from Right -> Left) ---
    else if (type === 'wipeLeft') {
        if (clipId === BId) {
            style.zIndex = 10;
            // Inset from Left shrinks from 100% to 0%
            const pct = (1 - progress) * 100;
            style.clipPath = `inset(0 0 0 ${pct}%)`;
        }
    }

    // --- Transition: SLIDE LEFT (Enter from Right) ---
    else if (type === 'slideLeft') {
        if (clipId === BId) {
            style.zIndex = 10;
            // Move from 100% (Right) to 0% (Center)
            const x = (1 - progress) * 100;
            style.transform = `translateX(${x}%)`;
        } else if (clipId === AId) {
            // Optional: A moves Left out of the way? Or stays? 
            // Standard slide usually pushes A. Let's push A to -100%.
            const x = -progress * 100;
            style.transform = `translateX(${x}%)`;
        }
    }

    // --- Transition: SLIDE RIGHT (Enter from Left) ---
    else if (type === 'slideRight') {
        if (clipId === BId) {
            style.zIndex = 10;
            // Move from -100% (Left) to 0% (Center)
            const x = (progress - 1) * 100;
            style.transform = `translateX(${x}%)`;
        } else if (clipId === AId) {
             const x = progress * 100;
             style.transform = `translateX(${x}%)`;
        }
    }
    
    // --- Transition: SLIDE UP (Enter from Bottom) ---
    else if (type === 'slideUp') {
        if (clipId === BId) {
            style.zIndex = 10;
            const y = (1 - progress) * 100;
            style.transform = `translateY(${y}%)`;
        }
    }

     // --- Transition: SLIDE DOWN (Enter from Top) ---
     else if (type === 'slideDown') {
        if (clipId === BId) {
            style.zIndex = 10;
            const y = (progress - 1) * 100;
            style.transform = `translateY(${y}%)`;
        }
    }

  });

  return style;
};

// --- HELPER: Static Masking (Circle/Oval) ---
const getMaskStyle = (maskType) => {
  if (maskType === 'circle') {
    const circleMask = 'radial-gradient(circle closest-side, black 100%, transparent 100%)';
    return {
      maskImage: circleMask,
      WebkitMaskImage: circleMask,
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
    };
  }
  if (maskType === 'oval') {
    const ovalMask = 'radial-gradient(ellipse closest-side, black 100%, transparent 100%)';
    return {
      maskImage: ovalMask,
      WebkitMaskImage: ovalMask,
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
    };
  }
  return {};
};

// ----------------- MAIN COMPONENT -----------------

export const VideoComposition = ({
  timelineItems = [],
  transitions = [],
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (!timelineItems || timelineItems.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: "black" }} />;
  }

  // Optimize: Single Item (No transitions needed)
  if (timelineItems.length === 1) {
    const item = timelineItems[0];
    const startF = Math.floor((item.startTime || 0) * fps);
    const durF = Math.max(1, Math.floor((item.duration || 5) * fps));
    const offsetF = Math.floor((item.offset || 0) * fps);
    const maskStyle = getMaskStyle(item.maskType);

    return (
      <AbsoluteFill style={{ backgroundColor: "black" }}>
        <Sequence from={startF} durationInFrames={durF}>
          <AbsoluteFill>
             <div style={{ width: '100%', height: '100%', ...maskStyle }}>
                {item.type === "video" && item.url && (
                  <Video
                    src={item.url}
                    startFrom={offsetF} 
                    playbackRate={item.speed || 1}
                    volume={item.muted ? 0 : (item.volume ?? 1)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                {item.type === "image" && item.url && (
                  <Img src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
                {item.type === "text" && (
                    <div style={{
                        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: item.style?.fontSize || 50,
                        color: item.style?.fill || 'white',
                        fontFamily: item.style?.fontFamily || 'Arial'
                    }}>
                        {item.text}
                    </div>
                )}
             </div>
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>
    );
  }

  // Complex: Multiple Items with Transitions
  const { sorted, clipMeta, activeTransitions } = buildCrossfadesAndMeta(
    timelineItems,
    transitions,
    fps
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {sorted.map((item) => {
        const meta = clipMeta.get(item.id);
        if (!meta) return null;

        const { earliestFrom, durF, startF } = meta;
        const seqFrom = earliestFrom;
        const seqDuration = startF + durF - earliestFrom;

        if (seqDuration <= 0) return null;

        // Calculate dynamic styles (Opacity, Transform, ClipPath)
        const computedStyle = getClipStyle({
            clipId: item.id,
            frame,
            clipMeta,
            activeTransitions,
            width,
            height
        });

        // Don't render invisible clips
        if (computedStyle.opacity <= 0.001) return null;

        const offsetF = Math.floor((item.offset || 0) * fps);
        const shiftAmount = startF - earliestFrom; 
        const startFromF = Math.max(0, offsetF - shiftAmount);
        const maskStyle = getMaskStyle(item.maskType);

        return (
          <Sequence
            key={`clip-${item.id}`}
            from={seqFrom}
            durationInFrames={seqDuration}
            style={{ zIndex: computedStyle.zIndex }} // Remotion Sequence accepts style for zIndex wrapper
          >
            <AbsoluteFill style={{ 
                opacity: computedStyle.opacity, 
                transform: computedStyle.transform,
                clipPath: computedStyle.clipPath,
                WebkitClipPath: computedStyle.clipPath
            }}>
               <div style={{ width: '100%', height: '100%', ...maskStyle }}>
                  {item.type === "video" && item.url && (
                    <Video
                      src={item.url}
                      startFrom={startFromF}
                      playbackRate={item.speed || 1}
                      volume={item.muted ? 0 : (item.volume ?? 1)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  {item.type === "image" && item.url && (
                    <Img src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                   {item.type === "text" && (
                     <div style={{
                        width: '100%', height: '100%', 
                        position: 'absolute', top: item.y, left: item.x, // Respect Position
                        fontSize: item.style?.fontSize,
                        color: item.style?.fill,
                        fontFamily: item.style?.fontFamily
                    }}>
                        {item.text}
                    </div>
                )}
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default VideoComposition;