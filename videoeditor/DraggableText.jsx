


import React, { useRef, useMemo } from "react";
import { Text, Group, Rect } from "react-konva";
import { useVideoConfig, useCurrentFrame, interpolate, Easing } from "remotion";
import { useEffect } from "react";

export const DraggableText = ({
  item,
  isSelected,
  isLocked = false,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
  canvasWidth,
  canvasHeight,
  transitionType = 'none',
  transitionPhase = 'none',
  transitionProgress = 0
}) => {
  const groupRef = useRef();
  const textRef = useRef();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const style = item.style || {};
  const fontSize = style.fontSize || 50;
  const fullText = item.text || "Double Click to Edit";
  
  const curWidth = item.width || 500;
  const curHeight = item.height || 100;

  // --- STROKE LOGIC ---
  let strokeColor = null;
  let strokeWidth = 0;
  if (style.WebkitTextStroke && style.WebkitTextStroke !== '0px') {
    const match = style.WebkitTextStroke.match(/^([\d.]+[a-z%]*)\s+(.*)$/i);
    if (match) {
        strokeWidth = parseFloat(match[1]); 
        strokeColor = match[2];             
    }
  }

  // --- SHADOW LOGIC ---
  const shadowEnabled = !!(style.textShadow && style.textShadow !== 'none');
  let shadowColor = 'rgba(0,0,0,0.5)';
  let shadowBlur = 0;
  let shadowOffsetX = 0;
  let shadowOffsetY = 0;

  if (shadowEnabled && style.textShadow) {
    const shadowMatch = style.textShadow.match(/^([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+(.*)$/);
    if (shadowMatch) {
        shadowOffsetX = parseFloat(shadowMatch[1]) || 0;
        shadowOffsetY = parseFloat(shadowMatch[2]) || 0;
        shadowBlur = parseFloat(shadowMatch[3]) || 0;
        shadowColor = shadowMatch[4] || 'rgba(0,0,0,0.5)';
    }
  }

  // --- TEXT SPACING ---
  const letterSpacing = parseFloat(style.letterSpacing) || 0;
  const lineHeight = parseFloat(style.lineHeight) || 1.2;
  
  // --- FONT STYLE ---
  const isBold = style.fontWeight === 'bold' || (typeof style.fontWeight === 'number' && style.fontWeight >= 700);
  const isItalic = style.fontStyle === 'italic';
  
  const finalFontStyle = useMemo(() => {
      if (isBold && isItalic) return "bold italic";
      if (isBold) return "bold";
      if (isItalic) return "italic";
      return "normal";
  }, [isBold, isItalic]);


  // --- AUTO-SIZE LOGIC (FIXED) ---
  useEffect(() => {
    if (textRef.current && onUpdate) {
       const node = textRef.current;
       
       // Calculate actual dimensions based on text content
       const calculatedWidth = node.width();
       const calculatedHeight = node.height();
       
       // Update if dimensions differ significantly (prevents loops)
       if (Math.abs(calculatedWidth - curWidth) > 2 || Math.abs(calculatedHeight - curHeight) > 2) {
           onUpdate({ 
             ...item, 
             width: calculatedWidth, 
             height: calculatedHeight 
           });
       }
    }
  }, [fullText, fontSize, style, curWidth, curHeight, onUpdate]);

  // --- ANIMATION LOGIC ---
  const itemStartFrame = (item.startTime || 0) * fps;
  const itemDurationFrames = (item.duration || 5) * fps;
  const localFrame = frame - itemStartFrame;
  const isFrameInRange = localFrame >= 0 && localFrame <= itemDurationFrames;

  const animIn = item.animation?.in || { type: 'none', duration: 0 };
  const animOut = item.animation?.out || { type: 'none', duration: 0 };
  const animInDuration = (animIn.duration || 0) * fps;
  const animOutDuration = (animOut.duration || 0) * fps;

  const baseOpacity = typeof item.opacity === 'number' ? item.opacity : 1;

  // ⚠️ CRITICAL: Check if transition is active
  const hasActiveTransition = transitionPhase !== 'none';

  // --- ✨ ENHANCED ANIMATION WITH COMBINED EFFECTS ---
  const { localAlpha, localX, localY, localScale, localWipe } = useMemo(() => {
    let alpha = 1, xOff = 0, yOff = 0, sVal = 1, wipe = null;

    // 🚫 SKIP ANIMATION IF TRANSITION IS ACTIVE
    if (hasActiveTransition) {
      return { localAlpha: alpha, localX: xOff, localY: yOff, localScale: sVal, localWipe: wipe };
    }

    // ===== ENTRANCE ANIMATIONS =====
    if (animIn.type !== 'none' && animInDuration > 0 && localFrame < animInDuration) {
       const t = interpolate(localFrame, [0, animInDuration], [0, 1], { 
         extrapolateRight: "clamp", 
         easing: Easing.bezier(0.25, 0.1, 0.25, 1)
       });
       
       if (animIn.type === 'fade') {
         alpha = t;
         sVal = interpolate(localFrame, [0, animInDuration], [0.9, 1], { 
           extrapolateRight: "clamp", 
           easing: Easing.out(Easing.ease) 
         });
       }
       else if (animIn.type === 'slideLeft') {
         xOff = (curWidth + 100) * (1 - t);
         alpha = interpolate(localFrame, [0, animInDuration * 0.5], [0, 1], { 
           extrapolateRight: "clamp" 
         });
         sVal = interpolate(localFrame, [0, animInDuration], [0.95, 1], { 
           extrapolateRight: "clamp",
           easing: Easing.out(Easing.ease)
         });
       }
       else if (animIn.type === 'slideRight') {
         xOff = -(curWidth + 100) * (1 - t);
         alpha = interpolate(localFrame, [0, animInDuration * 0.5], [0, 1], { 
           extrapolateRight: "clamp" 
         });
         sVal = interpolate(localFrame, [0, animInDuration], [0.95, 1], { 
           extrapolateRight: "clamp",
           easing: Easing.out(Easing.ease)
         });
       }
       else if (animIn.type === 'slideUp') {
         yOff = (curHeight + 100) * (1 - t);
         alpha = interpolate(localFrame, [0, animInDuration * 0.5], [0, 1], { 
           extrapolateRight: "clamp" 
         });
         sVal = interpolate(localFrame, [0, animInDuration], [0.95, 1], { 
           extrapolateRight: "clamp",
           easing: Easing.out(Easing.ease)
         });
       }
       else if (animIn.type === 'slideDown') {
         yOff = -(curHeight + 100) * (1 - t);
         alpha = interpolate(localFrame, [0, animInDuration * 0.5], [0, 1], { 
           extrapolateRight: "clamp" 
         });
         sVal = interpolate(localFrame, [0, animInDuration], [0.95, 1], { 
           extrapolateRight: "clamp",
           easing: Easing.out(Easing.ease)
         });
       }
       else if (animIn.type === 'zoom') {
         sVal = interpolate(localFrame, [0, animInDuration], [0, 1], { 
           extrapolateRight: "clamp", 
           easing: Easing.out(Easing.back(1.8))
         });
         alpha = interpolate(localFrame, [0, animInDuration * 0.4], [0, 1], { 
           extrapolateRight: "clamp" 
         });
       }
       else if (animIn.type === 'wipeRight') {
         wipe = { x: 0, y: 0, w: curWidth * t, h: curHeight };
         alpha = interpolate(localFrame, [0, animInDuration * 0.3], [0.3, 1], { 
           extrapolateRight: "clamp" 
         });
       }
       else if (animIn.type === 'wipeLeft') {
         wipe = { x: curWidth * (1 - t), y: 0, w: curWidth * t, h: curHeight };
         alpha = interpolate(localFrame, [0, animInDuration * 0.3], [0.3, 1], { 
           extrapolateRight: "clamp" 
         });
       }
    }

    // ===== EXIT ANIMATIONS =====
    const startOutFrame = itemDurationFrames - animOutDuration;
    if (animOut.type !== 'none' && animOutDuration > 0 && localFrame > startOutFrame) {
       const t = interpolate(localFrame, [startOutFrame, itemDurationFrames], [0, 1], { 
         extrapolateLeft: "clamp", 
         easing: Easing.bezier(0.42, 0, 0.58, 1)
       });
       
       if (animOut.type === 'fade') {
         alpha = 1 - t;
         sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.9], { 
           extrapolateLeft: "clamp", 
           easing: Easing.in(Easing.ease) 
         });
       }
       else if (animOut.type === 'slideLeft') {
         xOff = -(curWidth + 100) * t;
         alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.5, itemDurationFrames], [1, 0], { 
           extrapolateLeft: "clamp" 
         });
         sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.95], { 
           extrapolateLeft: "clamp",
           easing: Easing.in(Easing.ease)
         });
       }
       else if (animOut.type === 'slideRight') {
         xOff = (curWidth + 100) * t;
         alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.5, itemDurationFrames], [1, 0], { 
           extrapolateLeft: "clamp" 
         });
         sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.95], { 
           extrapolateLeft: "clamp",
           easing: Easing.in(Easing.ease)
         });
       }
       else if (animOut.type === 'slideUp') {
         yOff = -(curHeight + 100) * t;
         alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.5, itemDurationFrames], [1, 0], { 
           extrapolateLeft: "clamp" 
         });
         sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.95], { 
           extrapolateLeft: "clamp",
           easing: Easing.in(Easing.ease)
         });
       }
       else if (animOut.type === 'slideDown') {
         yOff = (curHeight + 100) * t;
         alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.5, itemDurationFrames], [1, 0], { 
           extrapolateLeft: "clamp" 
         });
         sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0.95], { 
           extrapolateLeft: "clamp",
           easing: Easing.in(Easing.ease)
         });
       }
       else if (animOut.type === 'zoom') {
         sVal = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0], { 
           extrapolateLeft: "clamp", 
           easing: Easing.in(Easing.back(1.5))
         });
         alpha = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0], { 
           extrapolateLeft: "clamp" 
         });
       }
       else if (animOut.type === 'wipeLeft') {
         wipe = { x: 0, y: 0, w: curWidth * (1 - t), h: curHeight };
         alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.7, itemDurationFrames], [1, 0.3], { 
           extrapolateLeft: "clamp" 
         });
       }
       else if (animOut.type === 'wipeRight') {
         wipe = { x: curWidth * t, y: 0, w: curWidth * (1 - t), h: curHeight };
         alpha = interpolate(localFrame, [startOutFrame + animOutDuration * 0.7, itemDurationFrames], [1, 0.3], { 
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

  // --- MERGE WITH GLOBAL TRANSITIONS (OVERRIDES ANIMATIONS) ---
  const { finalAlpha, finalX, finalY, finalScale, finalWipe } = useMemo(() => {
     let a = localAlpha, x = localX, y = localY, s = localScale, w = localWipe;
     
     a = a * baseOpacity; 

     // Force hide if out of range
     if (!isFrameInRange) a = 0; 

     // 🔥 TRANSITION OVERRIDES EVERYTHING
     if (transitionPhase !== 'none') {
        const prog = transitionProgress;
        
        // Reset animation effects
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

  // --- TYPEWRITER EFFECT ---
  const visibleText = useMemo(() => {
    if (animIn.type === 'typewriter' && localFrame < animInDuration) {
       const percent = Math.max(0, Math.min(1, localFrame / animInDuration));
       return fullText.substring(0, Math.floor(fullText.length * percent));
    }
    const startOutFrame = itemDurationFrames - animOutDuration;
    if (animOut.type === 'typewriter' && localFrame > startOutFrame) {
       const t = interpolate(localFrame, [startOutFrame, itemDurationFrames], [1, 0], { extrapolateLeft: "clamp" });
       return fullText.substring(0, Math.floor(fullText.length * t));
    }
    return fullText;
  }, [fullText, animIn, animOut, localFrame, animInDuration, animOutDuration, itemDurationFrames]);

  // --- CLIPPING (FOR WIPE) ---
  const clipFunc = useMemo(() => {
    if (!finalWipe) return undefined;
    return (ctx) => { ctx.rect(finalWipe.x, finalWipe.y, finalWipe.w, finalWipe.h); };
  }, [finalWipe]);
  
  // --- TRANSFORM HANDLER ---
  const handleTransformEnd = () => {
    const group = groupRef.current;
    if (!group) return;
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();
    
    group.scaleX(1); 
    group.scaleY(1);
    
    const newFontSize = Math.round(fontSize * scaleX);
    const newWidth = Math.max(20, curWidth * scaleX);
    const newHeight = Math.max(20, curHeight * scaleY);

    onUpdate({ 
        ...item, 
        x: group.x(), 
        y: group.y(), 
        // width: newWidth, 
        // height: newHeight, 
        rotation: group.rotation(), 
        style: { ...item.style, fontSize: newFontSize } 
    });
  };

  // Calculate zoom offset for scale animation
  const zoomOffsetX = (curWidth * (1 - finalScale)) / 2;
  const zoomOffsetY = (curHeight * (1 - finalScale)) / 2;
  const renderX = (item.x || 0) + finalX + zoomOffsetX;
  const renderY = (item.y || 0) + finalY + zoomOffsetY;

  return (
    <Group
      id={item.id}
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

      onClick={(e) => { if(isLocked) return; e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { if(isLocked) return; e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      
      onTransformEnd={!isLocked && isSelected ? handleTransformEnd : undefined}
      
      clipFunc={clipFunc}
    >
      <Rect
        width={curWidth}
        height={curHeight}
        fill={style.backgroundColor === 'transparent' ? null : style.backgroundColor}
        cornerRadius={style.borderRadius || 0}
        opacity={style.backgroundColor ? (style.backgroundOpacity ?? 1) : 1}
      />
      
      <Text
        ref={textRef} 
        text={visibleText}
        fontSize={fontSize}
        fontFamily={style.fontFamily || 'Roboto'}
        fill={style.color || '#ffffff'}
        fontStyle={finalFontStyle}
        textDecoration={style.textDecoration || 'none'}
        
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fillAfterStrokeEnabled={true}
        
        shadowEnabled={shadowEnabled}
        shadowColor={shadowColor}
        shadowBlur={shadowBlur}
        shadowOffsetX={shadowOffsetX}
        shadowOffsetY={shadowOffsetY}
        
        letterSpacing={letterSpacing}
        lineHeight={lineHeight}
        
        padding={style.padding || 10}
        align={style.textAlign || 'center'}
        verticalAlign="middle"
        // width={curWidth}
      />
    </Group>
  );
};