import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Image as KonvaImage, Group, Rect, Text } from 'react-konva';
import { useVideoConfig, useCurrentFrame, interpolate, Easing, delayRender, continueRender } from "remotion";

export const DraggableVideo = ({
  item,
  isSelected,
  isLocked = false,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
  isPlaying,
  isVisible,
  fps: propFps,
  localFrame: propLocalFrame,
  canvasWidth,
  canvasHeight,
  transformerRef,
  zoomOffsetX = 0,
  zoomOffsetY = 0,
  // TRANSITION PROPS (from parent - between clips)
  transitionType = 'none',
  transitionPhase = 'none', // 'in' | 'out' | 'none'
  transitionProgress = 0    // 0 to 1
}) => {
  if (item.type === 'audio') return null;

  const groupRef = useRef(null);
  const imageRef = useRef(null);
  const borderRef = useRef(null);
  const tempStateRef = useRef({});
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const [mediaElement, setMediaElement] = useState(null);
  const [naturalSize, setNaturalSize] = useState({
    width: item.naturalWidth || 1,
    height: item.naturalHeight || 1
  });
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // --- 1. MEDIA LOADING ---
  useEffect(() => {
    if (!item?.url) return;

    // Remotion Headless Browsers cannot resolve local blob: URLs over CORS, and will hang.
    // The export pipeline safely replaces these with remote URLs, so we just skip the delayRender lock for blob payloads.
    const isBlob = item.url.startsWith('blob:');
    const handle = isBlob ? null : delayRender(`Loading media ${item.id}`);

    let isContinued = false;

    const finalizeLoad = () => {
      if (!isContinued && handle !== null) {
        isContinued = true;
        continueRender(handle);
      }
    };

    let element;
    let active = true;
    let checkReady = null;
    setIsReady(false);
    setHasError(false);

    if (item.type === 'image' || item.type === 'gif') {
      element = new Image();
      element.crossOrigin = 'Anonymous';
      element.onload = () => { if (active) { setNaturalSize({ width: element.naturalWidth || item.naturalWidth || 800, height: element.naturalHeight || item.naturalHeight || 800 }); setIsReady(true); finalizeLoad(); } };
      element.onerror = () => { if (active) { setHasError(true); finalizeLoad(); } };
      element.src = item.url;
    } else {
      element = document.createElement('video');
      element.crossOrigin = 'Anonymous';
      element.muted = item.muted ?? false;
      element.volume = item.volume ?? 1;
      element.playbackRate = item.speed ?? 1;
      element.playsInline = true;
      element.preload = 'auto';
      element.loop = false;

      checkReady = () => {
        if (active && element.readyState >= 2) {
          setNaturalSize({ width: element.videoWidth, height: element.videoHeight });
          setIsReady(true);
          finalizeLoad();
        }
      };

      element.addEventListener('loadeddata', checkReady);
      element.addEventListener('canplay', checkReady);
      element.addEventListener('error', () => { if (active) { setHasError(true); finalizeLoad(); } });

      element.src = item.url;
    }
    setMediaElement(element);

    return () => {
      active = false;
      if (!isContinued && handle !== null) {
        continueRender(handle);
      }
      if (item.type !== 'image' && element) {
        element.pause();
        element.removeAttribute('src');
        element.load();
      }
      setMediaElement(null);
    };
  }, [item?.url, item?.type, item?.id]);

  // --- 2. ATTRIBUTES SYNC ---
  useEffect(() => {
    if (mediaElement && item.type === 'video') {
      if (mediaElement.volume !== (item.volume ?? 1)) mediaElement.volume = item.volume ?? 1;
      if (mediaElement.muted !== (item.muted ?? false)) mediaElement.muted = item.muted ?? false;
      if (mediaElement.playbackRate !== (item.speed ?? 1)) mediaElement.playbackRate = item.speed ?? 1;
    }
  }, [item.volume, item.muted, item.speed, mediaElement]);

  // --- 3. PLAYBACK SYNC ---
  useEffect(() => {
    if (!mediaElement || !isReady || item.type !== "video") return;

    const speed = item.speed || 1;
    const offset = Number(item.offset) || 0;
    const localFrame = propLocalFrame ?? 0;
    const currentFps = propFps ?? fps ?? 30;

    const rawTime = (localFrame / currentFps) * speed + offset;
    const dur = Number.isFinite(mediaElement.duration) ? mediaElement.duration : 10000;

    const isOutOfBounds = rawTime < -0.01 || rawTime > dur + 0.01;
    const safeTime = Math.max(0, Math.min(rawTime, dur));
    const shouldPlay = isPlaying && !isOutOfBounds;

    const now = mediaElement.currentTime || 0;
    const drift = Math.abs(now - safeTime);

    if (shouldPlay) {
      if (drift > 0.25 && !mediaElement.seeking) {
        try { mediaElement.currentTime = safeTime; } catch { }
      }
      if (mediaElement.paused && mediaElement.readyState >= 2) {
        mediaElement.play().catch(() => { });
      }
    } else {
      if (!mediaElement.paused) mediaElement.pause();
      if (drift > 0.05) {
        try { mediaElement.currentTime = safeTime; } catch { }
      }
    }

    const redraw = () => imageRef.current?.getLayer()?.batchDraw?.();
    if (mediaElement.requestVideoFrameCallback) mediaElement.requestVideoFrameCallback(redraw);
    else requestAnimationFrame(redraw);

  }, [mediaElement, isReady, item.type, item.offset, item.speed, isPlaying, propLocalFrame, fps, propFps]);

  // --- 4. DIMENSIONS & CROP STATE ---
  let curWidth = item.width;
  let curHeight = item.height;

  if (!curWidth || !curHeight) {
    curWidth = 500;
    curHeight = 281;
  }

  const curCropX = item.cropX || 0;
  const curCropY = item.cropY || 0;
  const curCropW = item.cropWidth || naturalSize.width;
  const curCropH = item.cropHeight || naturalSize.height;

  const isCropped = curCropX > 0 || curCropY > 0 || Math.abs(curCropW - naturalSize.width) > 1 || Math.abs(curCropH - naturalSize.height) > 1;

  // --- 5. CALCULATE FRAME POSITION ---
  const itemStartFrame = (item.startTime || 0) * fps;
  const itemDurationFrames = (item.duration || 5) * fps;
  const localFrame = (propLocalFrame !== undefined) ? propLocalFrame : (frame - itemStartFrame);
  const isFrameInRange = localFrame >= 0 && localFrame <= itemDurationFrames;

  // Get base opacity
  const baseOpacity = typeof item.opacity === 'number' ? item.opacity : 1;

  // --- 6. ENHANCED ANIMATION LOGIC (only if no transition is active) ---
  const animIn = item.animation?.in || { type: 'none', duration: 0 };
  const animOut = item.animation?.out || { type: 'none', duration: 0 };
  const animInDuration = (animIn.duration || 0) * fps;
  const animOutDuration = (animOut.duration || 0) * fps;

  // ⚠️ CRITICAL: Check if transition is active (transition overrides animation)
  const hasActiveTransition = transitionPhase !== 'none';

  const { localAlpha, localX, localY, localScale, localWipe } = useMemo(() => {
    let alpha = 1, xOff = 0, yOff = 0, sVal = 1, wipe = null;

    // 🚫 SKIP ANIMATION IF TRANSITION IS ACTIVE
    if (hasActiveTransition) {
      return { localAlpha: alpha, localX: xOff, localY: yOff, localScale: sVal, localWipe: wipe };
    }

    // ===== ENTRANCE ANIMATIONS (only when no transition) =====
    if (animIn.type !== 'none' && animInDuration > 0 && localFrame < animInDuration) {
      const t = interpolate(localFrame, [0, animInDuration], [0, 1], {
        extrapolateRight: "clamp",
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });

      if (animIn.type === 'fade') {
        alpha = t;
        sVal = interpolate(localFrame, [0, animInDuration], [0.95, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.ease)
        });
      }
      else if (animIn.type === 'slideLeft') {
        xOff = curWidth * (1 - t);
        alpha = interpolate(localFrame, [0, animInDuration * 0.6], [0, 1], {
          extrapolateRight: "clamp"
        });
        sVal = interpolate(localFrame, [0, animInDuration], [0.98, 1], {
          extrapolateRight: "clamp"
        });
      }
      else if (animIn.type === 'slideRight') {
        xOff = -curWidth * (1 - t);
        alpha = interpolate(localFrame, [0, animInDuration * 0.6], [0, 1], {
          extrapolateRight: "clamp"
        });
        sVal = interpolate(localFrame, [0, animInDuration], [0.98, 1], {
          extrapolateRight: "clamp"
        });
      }
      else if (animIn.type === 'slideUp') {
        yOff = curHeight * (1 - t);
        alpha = interpolate(localFrame, [0, animInDuration * 0.6], [0, 1], {
          extrapolateRight: "clamp"
        });
        sVal = interpolate(localFrame, [0, animInDuration], [0.98, 1], {
          extrapolateRight: "clamp"
        });
      }
      else if (animIn.type === 'slideDown') {
        yOff = -curHeight * (1 - t);
        alpha = interpolate(localFrame, [0, animInDuration * 0.6], [0, 1], {
          extrapolateRight: "clamp"
        });
        sVal = interpolate(localFrame, [0, animInDuration], [0.98, 1], {
          extrapolateRight: "clamp"
        });
      }
      else if (animIn.type === 'zoom') {
        sVal = interpolate(localFrame, [0, animInDuration], [0, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.5))
        });
        alpha = interpolate(localFrame, [0, animInDuration * 0.4], [0, 1], {
          extrapolateRight: "clamp"
        });
      }
      else if (animIn.type === 'wipeRight') {
        wipe = { x: 0, y: 0, w: curWidth * t, h: curHeight };
        alpha = interpolate(localFrame, [0, animInDuration * 0.3], [0.5, 1], {
          extrapolateRight: "clamp"
        });
      }
      else if (animIn.type === 'wipeLeft') {
        wipe = { x: curWidth * (1 - t), y: 0, w: curWidth * t, h: curHeight };
        alpha = interpolate(localFrame, [0, animInDuration * 0.3], [0.5, 1], {
          extrapolateRight: "clamp"
        });
      }
    }

    // ===== EXIT ANIMATIONS (only when no transition) =====
    const startOutFrame = itemDurationFrames - animOutDuration;
    if (animOut.type !== 'none' && animOutDuration > 0 && localFrame > startOutFrame) {
      const t = interpolate(localFrame, [startOutFrame, itemDurationFrames], [0, 1], {
        extrapolateLeft: "clamp",
        easing: Easing.bezier(0.42, 0, 0.58, 1)
      });

      if (animOut.type === 'fade') {
        alpha = 1 - t;
        sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.95], {
          extrapolateLeft: "clamp",
          easing: Easing.in(Easing.ease)
        });
      }
      else if (animOut.type === 'slideLeft') {
        xOff = -curWidth * t;
        alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.4, itemDurationFrames], [1, 0], {
          extrapolateLeft: "clamp"
        });
        sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.98], {
          extrapolateLeft: "clamp"
        });
      }
      else if (animOut.type === 'slideRight') {
        xOff = curWidth * t;
        alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.4, itemDurationFrames], [1, 0], {
          extrapolateLeft: "clamp"
        });
        sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.98], {
          extrapolateLeft: "clamp"
        });
      }
      else if (animOut.type === 'slideUp') {
        yOff = -curHeight * t;
        alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.4, itemDurationFrames], [1, 0], {
          extrapolateLeft: "clamp"
        });
        sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.98], {
          extrapolateLeft: "clamp"
        });
      }
      else if (animOut.type === 'slideDown') {
        yOff = curHeight * t;
        alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.4, itemDurationFrames], [1, 0], {
          extrapolateLeft: "clamp"
        });
        sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.98], {
          extrapolateLeft: "clamp"
        });
      }
      else if (animOut.type === 'zoom') {
        sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0], {
          extrapolateLeft: "clamp",
          easing: Easing.in(Easing.back(1.2))
        });
        alpha = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0], {
          extrapolateLeft: "clamp"
        });
      }
      else if (animOut.type === 'wipeLeft') {
        wipe = { x: 0, y: 0, w: curWidth * (1 - t), h: curHeight };
        alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.7, itemDurationFrames], [1, 0.5], {
          extrapolateLeft: "clamp"
        });
      }
      else if (animOut.type === 'wipeRight') {
        wipe = { x: curWidth * t, y: 0, w: curWidth * (1 - t), h: curHeight };
        alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.7, itemDurationFrames], [1, 0.5], {
          extrapolateLeft: "clamp"
        });
      }
    }

    return {
      localAlpha: alpha,
      localX: xOff,
      localY: yOff,
      localScale: sVal,
      localWipe: wipe
    };
  }, [animIn, animOut, localFrame, animInDuration, animOutDuration, itemDurationFrames, curWidth, curHeight, hasActiveTransition]);

  // --- 7. 🎯 APPLY TRANSITIONS (OVERRIDES ANIMATIONS) ---
  const { finalAlpha, finalX, finalY, finalScale, finalWipe } = useMemo(() => {
    let a = localAlpha;
    let x = localX;
    let y = localY;
    let s = localScale;
    let w = localWipe;

    // Apply base opacity
    a = a * baseOpacity;

    // Force hide if out of range
    if (!isFrameInRange) a = 0;

    // 🔥 TRANSITION OVERRIDES EVERYTHING
    if (transitionPhase !== 'none') {
      const prog = transitionProgress; // 0 to 1

      // Reset animation effects when transition is active
      x = 0;
      y = 0;
      s = 1;
      w = null;

      // FADE / CROSSFADE
      if (transitionType === 'fade' || transitionType === 'crossfade') {
        a = baseOpacity * (transitionPhase === 'in' ? prog : (1 - prog));
      }

      // SLIDE LEFT
      else if (transitionType === 'slideLeft') {
        if (transitionPhase === 'out') {
          x = -curWidth * prog;
          a = baseOpacity * (1 - prog * 0.3);
        } else if (transitionPhase === 'in') {
          x = curWidth * (1 - prog);
          a = baseOpacity * (0.7 + prog * 0.3);
        }
      }

      // SLIDE RIGHT
      else if (transitionType === 'slideRight') {
        if (transitionPhase === 'out') {
          x = curWidth * prog;
          a = baseOpacity * (1 - prog * 0.3);
        } else if (transitionPhase === 'in') {
          x = -curWidth * (1 - prog);
          a = baseOpacity * (0.7 + prog * 0.3);
        }
      }

      // SLIDE UP
      else if (transitionType === 'slideUp') {
        if (transitionPhase === 'out') {
          y = -curHeight * prog;
          a = baseOpacity * (1 - prog * 0.3);
        } else if (transitionPhase === 'in') {
          y = curHeight * (1 - prog);
          a = baseOpacity * (0.7 + prog * 0.3);
        }
      }

      // SLIDE DOWN
      else if (transitionType === 'slideDown') {
        if (transitionPhase === 'out') {
          y = curHeight * prog;
          a = baseOpacity * (1 - prog * 0.3);
        } else if (transitionPhase === 'in') {
          y = -curHeight * (1 - prog);
          a = baseOpacity * (0.7 + prog * 0.3);
        }
      }

      // WIPE RIGHT
      else if (transitionType === 'wipeRight' || transitionType === 'wipe') {
        if (transitionPhase === 'out') {
          w = { x: curWidth * prog, y: 0, w: curWidth * (1 - prog), h: curHeight };
        } else if (transitionPhase === 'in') {
          w = { x: 0, y: 0, w: curWidth * prog, h: curHeight };
        }
      }

      // WIPE LEFT
      else if (transitionType === 'wipeLeft') {
        if (transitionPhase === 'out') {
          w = { x: 0, y: 0, w: curWidth * (1 - prog), h: curHeight };
        } else if (transitionPhase === 'in') {
          w = { x: curWidth * (1 - prog), y: 0, w: curWidth * prog, h: curHeight };
        }
      }

      // ZOOM TRANSITION
      else if (transitionType === 'zoom') {
        if (transitionPhase === 'out') {
          s = 1 - prog;
          a = baseOpacity * (1 - prog);
        } else if (transitionPhase === 'in') {
          s = prog;
          a = baseOpacity * prog;
        }
      }
    }

    return {
      finalAlpha: a,
      finalX: x,
      finalY: y,
      finalScale: s,
      finalWipe: w
    };
  }, [localAlpha, localX, localY, localScale, localWipe, transitionType, transitionPhase, transitionProgress, curWidth, curHeight, baseOpacity, isFrameInRange]);

  // Combine offsets
  const computedZoomOffX = (curWidth * (1 - finalScale)) / 2;
  const computedZoomOffY = (curHeight * (1 - finalScale)) / 2;
  const renderX = (item.x || 0) + finalX + computedZoomOffX;
  const renderY = (item.y || 0) + finalY + computedZoomOffY;

  // --- 8. TRANSFORM LOGIC ---
  const handleTransform = () => {
    const group = groupRef.current;
    const tr = transformerRef?.current;

    if (!group || !tr) return;

    const anchor = tr.getActiveAnchor();
    const isCorner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(anchor);

    const scaleX = group.scaleX();
    const scaleY = group.scaleY();

    group.scaleX(1);
    group.scaleY(1);

    const newWidth = Math.max(5, group.width() * scaleX);
    const newHeight = Math.max(5, group.height() * scaleY);

    let nextState = {
      width: newWidth,
      height: newHeight,
      x: group.x(),
      y: group.y(),
      cropX: curCropX,
      cropY: curCropY,
      cropWidth: curCropW,
      cropHeight: curCropH
    };

    if (isCorner) {
      const aspectRatio = naturalSize.width / naturalSize.height;
      const constrained = Math.abs(aspectRatio - (newWidth / newHeight)) < 0.01;
      if (constrained) {
        nextState.cropWidth = naturalSize.width;
        nextState.cropHeight = naturalSize.height;
      } else {
        const pixelsPerUnitX = naturalSize.width / item.width;
        const pixelsPerUnitY = naturalSize.height / item.height;
        nextState.cropWidth = newWidth * pixelsPerUnitX;
        nextState.cropHeight = newHeight * pixelsPerUnitY;
      }
    } else {
      const pixelsPerUnitX = curCropW / item.width;
      const pixelsPerUnitY = curCropH / item.height;

      const deltaW = newWidth - item.width;
      const deltaH = newHeight - item.height;

      if (anchor === 'middle-left' || anchor === 'middle-right') {
        const deltaCrop = deltaW * pixelsPerUnitX;
        if (anchor === 'middle-right') {
          const newCropWidth = curCropW + deltaCrop;
          if (newCropWidth <= naturalSize.width) {
            nextState.cropWidth = newCropWidth;
          } else {
            nextState.cropWidth = naturalSize.width;
            nextState.width = (naturalSize.width - curCropX) / pixelsPerUnitX;
          }
        } else {
          const newCropX = curCropX - deltaCrop;
          if (newCropX >= 0) {
            nextState.cropX = newCropX;
            nextState.cropWidth = curCropW + deltaCrop;
          } else {
            nextState.cropX = 0;
            nextState.cropWidth = curCropX + curCropW;
            nextState.width = nextState.cropWidth / pixelsPerUnitX;
            nextState.x = group.x() + (newWidth - nextState.width);
          }
        }
      }

      if (anchor === 'top-center' || anchor === 'bottom-center') {
        const deltaCrop = deltaH * pixelsPerUnitY;
        if (anchor === 'bottom-center') {
          const newCropHeight = curCropH + deltaCrop;
          if (newCropHeight <= naturalSize.height) {
            nextState.cropHeight = newCropHeight;
          } else {
            nextState.cropHeight = naturalSize.height;
            nextState.height = (naturalSize.height - curCropY) / pixelsPerUnitY;
          }
        } else {
          const newCropY = curCropY - deltaCrop;
          if (newCropY >= 0) {
            nextState.cropY = newCropY;
            nextState.cropHeight = curCropH + deltaCrop;
          } else {
            nextState.cropY = 0;
            nextState.cropHeight = curCropY + curCropH;
            nextState.height = nextState.cropHeight / pixelsPerUnitY;
            nextState.y = group.y() + (newHeight - nextState.height);
          }
        }
      }
    }

    group.setAttrs({
      width: nextState.width,
      height: nextState.height,
      x: nextState.x,
      y: nextState.y
    });

    if (imageRef.current) {
      imageRef.current.setAttrs({
        width: nextState.width,
        height: nextState.height,
        crop: { x: nextState.cropX, y: nextState.cropY, width: nextState.cropWidth, height: nextState.cropHeight }
      });
    }

    if (borderRef.current) {
      borderRef.current.width(nextState.width);
      borderRef.current.height(nextState.height);
    }

    tempStateRef.current = nextState;
  };

  const handleTransformEnd = () => {
    const group = groupRef.current;
    if (!group) return;
    const finalState = tempStateRef.current;
    if (!finalState.width) return;

    onUpdate({
      ...item,
      width: finalState.width,
      height: finalState.height,
      x: finalState.x - computedZoomOffX,
      y: finalState.y - computedZoomOffY,
      cropX: finalState.cropX,
      cropY: finalState.cropY,
      cropWidth: finalState.cropWidth,
      cropHeight: finalState.cropHeight,
      rotation: group.rotation(),
    });

    tempStateRef.current = {};
  };

  // --- 9. MASKING ---
  const clipFunc = useMemo(() => {
    const hasShapeMask = item.maskType && item.maskType !== 'none';
    const hasWipe = finalWipe !== null;
    if (!hasShapeMask && !hasWipe) return undefined;

    return (ctx) => {
      if (item.maskType === 'circle') {
        const radius = Math.min(curWidth, curHeight) / 2;
        ctx.arc(curWidth / 2, curHeight / 2, radius, 0, Math.PI * 2, false);
      } else if (item.maskType === 'oval') {
        ctx.ellipse(curWidth / 2, curHeight / 2, curWidth / 2, curHeight / 2, 0, 0, Math.PI * 2);
      }
      if (hasWipe) {
        ctx.rect(finalWipe.x, finalWipe.y, finalWipe.w, finalWipe.h);
      }
    };
  }, [item.maskType, curWidth, curHeight, finalWipe]);

  const dragBoundFunc = (pos) => pos;

  return (
    <Group
      id={item.id}
      name="selectable"
      ref={groupRef}
      x={renderX}
      y={renderY}
      width={curWidth}
      height={curHeight}
      rotation={item.rotation || 0}
      opacity={finalAlpha}
      scaleX={finalScale}
      scaleY={finalScale}
      draggable={!isLocked}
      listening={!isLocked}
      visible={true}

      onClick={(e) => { if (isLocked) return; e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { if (isLocked) return; e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      dragBoundFunc={dragBoundFunc}

      onTransform={!isLocked && isSelected ? handleTransform : undefined}
      onTransformEnd={!isLocked && isSelected ? handleTransformEnd : undefined}

      clipFunc={clipFunc}
    >
      {(!isReady || hasError) ? (
        <Group>
          <Rect
            width={curWidth}
            height={curHeight}
            fill="#1a1a1a"
            stroke="#444"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text
            text={hasError ? "Load Failed" : "Loading..."}
            width={curWidth}
            height={curHeight}
            align="center"
            verticalAlign="middle"
            fill={hasError ? "#ff5555" : "#888"}
            fontSize={14}
            fontFamily="sans-serif"
          />
        </Group>
      ) : (
        <KonvaImage
          ref={imageRef}
          image={mediaElement}
          width={curWidth}
          height={curHeight}
          perfectDrawEnabled={false}
          {...(isCropped ? {
            crop: {
              x: curCropX,
              y: curCropY,
              width: curCropW,
              height: curCropH
            }
          } : {})}
        />
      )}

      {isSelected && !isLocked && (
        <Rect
          ref={borderRef}
          width={curWidth}
          height={curHeight}
          stroke="#D1FE17"
          strokeWidth={2}
          listening={false}
        />
      )}
    </Group>
  );
};