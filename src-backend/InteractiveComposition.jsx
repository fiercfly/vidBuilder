
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Stage, Layer, Rect, Group, Shape, Transformer } from "react-konva";
import { useVideoConfig, useCurrentFrame, Audio, Sequence, interpolate } from "remotion";
import { DraggableVideo } from "./DraggableVideo";
import { DraggableText } from "./DraggableText";
import Konva from "konva/lib/Core";




export const InteractiveComposition = ({
  timelineItems = [],
  tracks = [],
  transitions = [],
  onUpdateItem,
  onSelectItem,
  isPlaying,
  canvasWidth = 1080,
  canvasHeight = 1920,
  selectedItemId = null,
  canvasBackgroundColor = "#000000",
  readOnly = false
}) => {
  const { width: viewportWidth, height: viewportHeight, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0, visible: false });

  const stageRef = useRef(null);
  const trRef = useRef(null);
  const selectionRectRef = useRef(null);
  const dragStartPos = useRef({});

  // --- HELPER: Volume Calculation ---
  // const calculateVolume = (relativeFrame, item, durationFrames) => {
  //   const baseVolume = (item.muted ? 0 : (item.volume ?? 1));
  //   if (baseVolume === 0) return 0;

  //   const fadeInSec = item.fadeIn || 0;
  //   const fadeOutSec = item.fadeOut || 0;
  //   const fadeInFrames = fadeInSec * fps;
  //   const fadeOutFrames = fadeOutSec * fps;

  //   let vol = 1;

  //   if (fadeInFrames > 0) {
  //     vol *= interpolate(relativeFrame, [0, fadeInFrames], [0, 1], { extrapolateRight: "clamp" });
  //   }

  //   if (fadeOutFrames > 0) {
  //     const fadeOutStart = durationFrames - fadeOutFrames;
  //     vol *= interpolate(relativeFrame, [fadeOutStart, durationFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  //   }

  //   return vol * baseVolume;
  // };


  // --- HELPER: Volume Calculation ---
  const calculateVolume = (relativeFrame, item, durationFrames) => {
    const baseVolume = (item.muted ? 0 : (item.volume ?? 1));
    if (baseVolume === 0) return 0;

    const fadeInSec = item.fadeIn || 0;
    const fadeOutSec = item.fadeOut || 0;
    const fadeInFrames = fadeInSec * fps;
    const fadeOutFrames = fadeOutSec * fps;

    let vol = 1;

    if (fadeInFrames > 0) {
      // ✅ FIX: Added extrapolateLeft: "clamp" to prevent negative volume when frame < 0
      vol *= interpolate(relativeFrame, [0, fadeInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      });
    }

    if (fadeOutFrames > 0) {
      const fadeOutStart = durationFrames - fadeOutFrames;
      vol *= interpolate(relativeFrame, [fadeOutStart, durationFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp"
      });
    }

    // ✅ FIX: Final safety clamp to ensure result is always valid [0, 1]
    return Math.max(0, Math.min(1, vol * baseVolume));
  };

  // --- AUTO-DESELECT LOCKED ITEMS ---
  useEffect(() => {
    if (selectedIds.length === 0) return;

    const lockedSelectedItems = timelineItems.filter(item => {
      if (!selectedIds.includes(item.id)) return false;
      const parentTrack = tracks.find(t => t.id === item.trackId);
      return (parentTrack?.locked || false) || (item.locked || false);
    });

    if (lockedSelectedItems.length > 0) {
      const lockedIds = lockedSelectedItems.map(i => i.id);
      const newSelectedIds = selectedIds.filter(id => !lockedIds.includes(id));
      setSelectedIds(newSelectedIds);
      if (newSelectedIds.length === 0) {
        onSelectItem?.(null);
      }
    }
  }, [timelineItems, tracks, selectedIds, onSelectItem]);

  // --- SELECTION SYNC ---
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;

    if (readOnly) {
      trRef.current.nodes([]);
      return;
    }

    if (selectedIds.length > 0) {
      // Find the specific Group node created by DraggableVideo/DraggableText
      const nodes = selectedIds.map(id => stageRef.current.findOne("#" + id)).filter(Boolean);
      trRef.current.nodes(nodes);
      trRef.current.moveToTop();
      trRef.current.getLayer().batchDraw();
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedIds, timelineItems, readOnly]);

  useEffect(() => {
    if (readOnly) return;
    if (selectedItemId) {
      const item = timelineItems.find(i => i.id === selectedItemId);
      const track = tracks.find(t => t.id === item?.trackId);
      const isLocked = item?.locked || track?.locked;

      if (item && !isLocked && !selectedIds.includes(selectedItemId)) {
        setSelectedIds([selectedItemId]);
      }
    } else {
      if (selectedIds.length > 0) setSelectedIds([]);
    }
  }, [selectedItemId, readOnly, timelineItems, tracks]);

  // --- TRANSFORMER CONFIG ---
  const selectedItemNode = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return timelineItems.find(i => i.id === selectedIds[0]);
  }, [selectedIds, timelineItems]);

  const transformerConfig = useMemo(() => {
    const isText = selectedItemNode?.type === 'text';
    return {
      enabledAnchors: isText
        ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        : ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'],
      keepRatio: true
    };
  }, [selectedItemNode]);

  const audioItems = useMemo(() => {
    return timelineItems.filter(i => i.type === "audio" && i.url);
  }, [timelineItems]);

  const visibleItems = useMemo(() => {
    return timelineItems
      .filter(i => (i.type === "video" || i.type === "image" || i.type === "text" || i.type === "gif") && (i.url || i.text))
      .sort((a, b) => {
        if (a.type === "text" && b.type !== "text") return 1;
        if (b.type === "text" && a.type !== "text") return -1;
        const indexA = tracks.findIndex(t => t.id === a.trackId);
        const indexB = tracks.findIndex(t => t.id === b.trackId);
        if (indexA !== indexB) return indexB - indexA;
        return a.startTime - b.startTime;
      });
  }, [timelineItems, tracks]);

  const scale = Math.min((viewportWidth - 20) / canvasWidth, (viewportHeight - 20) / canvasHeight);

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e) => {
    if (readOnly) return;
    if (e.target.getParent()?.className === "Transformer") return;

    const stage = e.target.getStage();
    const isBg = e.target === stage || e.target.name() === "outer-bg" || e.target.name() === "video-bg" || e.target.name() === "mask-layer";

    if (isSelectionMode && isBg) {
      const { x, y } = stage.getPointerPosition();
      setSelectionRect({ x, y, width: 0, height: 0, visible: true });
      setSelectedIds([]);
    } else if (isBg) {
      setSelectedIds([]);
      onSelectItem?.(null);
    }
  };

  const handleMouseMove = (e) => {
    if (readOnly || !selectionRect.visible) return;
    const { x, y } = e.target.getStage().getPointerPosition();
    setSelectionRect(p => ({ ...p, width: x - p.x, height: y - p.y }));
  };

  const handleMouseUp = () => {
    if (readOnly || !selectionRect.visible) return;
    const selBox = selectionRectRef.current.getClientRect();
    const found = [];
    stageRef.current.find(".selectable").forEach(node => {
      const itemId = node.id();
      const itemData = timelineItems.find(i => i.id === itemId);
      const trackData = tracks.find(t => t.id === itemData?.trackId);
      const isLocked = itemData?.locked || trackData?.locked;

      if (itemData && !isLocked && Konva.Util.haveIntersection(selBox, node.getClientRect())) {
        found.push(itemId);
      }
    });
    setSelectedIds(found);
    setSelectionRect(p => ({ ...p, visible: false }));
    setIsSelectionMode(false);
  };

  const handleItemSelect = (id) => {
    if (readOnly) return;
    const item = timelineItems.find(i => i.id === id);
    const track = tracks.find(t => t.id === item?.trackId);

    if ((item && item.locked) || (track && track.locked)) return;

    if (selectedIds.length === 1 && selectedIds[0] === id) return;
    setSelectedIds([id]);
    onSelectItem?.(id);
  };

  const onDragStart = (e) => {
    if (readOnly) return;
    const id = e.target.id();
    const item = timelineItems.find(i => i.id === id);
    const track = tracks.find(t => t.id === item?.trackId);

    if ((item && item.locked) || (track && track.locked)) {
      e.target.stopDrag();
      return;
    }

    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
      onSelectItem?.(id);
      dragStartPos.current = { [id]: { x: e.target.x(), y: e.target.y() } };
      return;
    }
    const map = {};
    selectedIds.forEach(sid => {
      const n = stageRef.current.findOne("#" + sid);
      if (n) map[sid] = { x: n.x(), y: n.y() };
    });
    dragStartPos.current = map;
  };

  const onDragMove = (e) => {
    if (readOnly) return;
    const id = e.target.id();
    if (selectedIds.length > 1 && selectedIds.includes(id)) {
      const start = dragStartPos.current[id];
      if (!start) return;
      const dx = e.target.x() - start.x;
      const dy = e.target.y() - start.y;
      selectedIds.forEach(sid => {
        if (sid !== id) {
          const n = stageRef.current.findOne("#" + sid);
          const s = dragStartPos.current[sid];
          if (n && s) { n.x(s.x + dx); n.y(s.y + dy); }
        }
      });
    }
  };

  const onDragEnd = (e) => {
    if (readOnly) return;
    const id = e.target.id();
    const ids = selectedIds.includes(id) ? selectedIds : [id];
    ids.forEach(sid => {
      const n = stageRef.current.findOne("#" + sid);
      const item = timelineItems.find(t => t.id === sid);
      const track = tracks.find(t => t.id === item?.trackId);

      if (n && item && !item.locked && (!track || !track.locked)) {
        onUpdateItem({ ...item, x: n.x(), y: n.y() });
      }
    });
  };

  return (
    <>
      {audioItems.map((a) => {
        const startFrame = Math.round((a.startTime || 0) * fps);
        const durationFrames = Math.round((a.duration || 0) * fps);
        const startFrom = Math.round((Number(a.offset) || 0) * fps);
        if (frame < startFrame || frame >= startFrame + durationFrames) return null;
        return (
          <Sequence key={a.id} from={startFrame} durationInFrames={durationFrames}>
            <Audio
              src={a.url}
              startFrom={startFrom}
              endAt={startFrom + durationFrames}
              crossOrigin="anonymous"
              volume={(f) => calculateVolume(f, a, durationFrames)}
            />
          </Sequence>
        );
      })}

      <Stage
        ref={stageRef}
        width={viewportWidth}
        height={viewportHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ backgroundColor: "#1a1a1a" }}

        // 🚀 PERFORMANCE FIX: 
        // This stops Konva from calculating hit regions (mouse events) during playback.
        // It significantly reduces CPU load and increases FPS.
        listening={!isPlaying}
      >
        <Layer>
          <Rect name="outer-bg" width={viewportWidth} height={viewportHeight} />

          <Group
            x={viewportWidth / 2}
            y={viewportHeight / 2}
            offsetX={canvasWidth / 2}
            offsetY={canvasHeight / 2}
            scaleX={scale}
            scaleY={scale}
          >
            <Rect name="video-bg" width={canvasWidth} height={canvasHeight} fill={canvasBackgroundColor} />

            {visibleItems.map((item) => {
              const startFrame = Math.round((item.startTime || 0) * fps);
              const durationFrames = Math.round((item.duration || 0) * fps);
              const endFrame = startFrame + durationFrames;

              // Transitions
              const enterTrans = transitions.find(t => t.rightClipId === item.id && t.applied);
              const exitTrans = transitions.find(t => t.leftClipId === item.id && t.applied);

              const enterDuration = enterTrans ? Math.round((Number(enterTrans.duration) || 1) * fps) : 0;
              const exitDuration = exitTrans ? Math.round((Number(exitTrans.duration) || 1) * fps) : 0;

              const renderStart = startFrame - enterDuration;
              const renderEnd = endFrame + exitDuration;

              if (frame < renderStart || frame >= renderEnd) return null;

              let transType = 'none';
              let transPhase = 'none';
              let transProgress = 0;

              if (enterTrans && frame < startFrame) {
                transType = enterTrans.type;
                transPhase = 'in';
                transProgress = (frame - renderStart) / enterDuration;
              }
              else if (exitTrans && frame >= endFrame) {
                transType = exitTrans.type;
                transPhase = 'out';
                transProgress = (frame - endFrame) / exitDuration;
              }

              const localFrame = frame - startFrame;

              let videoVolume = 1;
              if (item.type === 'video') {
                videoVolume = calculateVolume(localFrame, item, durationFrames);
              }

              const parentTrack = tracks.find(t => t.id === item.trackId);
              const isEffectiveLocked = (item.locked === true) || (parentTrack?.locked === true);

              return (
                <React.Fragment key={item.id}>
                  {item.type === "video" || item.type === "image" || item.type === "gif" ? (
                    <DraggableVideo
                      item={{ ...item, volume: videoVolume }}
                      isSelected={!readOnly && selectedIds.includes(item.id)}
                      isLocked={isEffectiveLocked}

                      // Refs & Logic
                      transformerRef={trRef}
                      onUpdate={readOnly ? undefined : onUpdateItem}
                      onSelect={() => handleItemSelect(item.id)}

                      // Drag Handlers (Managed here, but transform managed in child)
                      onDragStart={readOnly ? undefined : onDragStart}
                      onDragMove={readOnly ? undefined : onDragMove}
                      onDragEnd={readOnly ? undefined : onDragEnd}

                      isPlaying={isPlaying}
                      isVisible={true}
                      localFrame={localFrame}
                      fps={fps}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}

                      transitionType={transType}
                      transitionPhase={transPhase}
                      transitionProgress={transProgress}
                    />
                  ) : (
                    <DraggableText
                      item={item}
                      isSelected={!readOnly && selectedIds.includes(item.id)}
                      isLocked={isEffectiveLocked}
                      onSelect={() => handleItemSelect(item.id)}
                      onUpdate={readOnly ? undefined : onUpdateItem}
                      onDragStart={readOnly ? undefined : onDragStart}
                      onDragMove={readOnly ? undefined : onDragMove}
                      onDragEnd={readOnly ? undefined : onDragEnd}
                      isPlaying={isPlaying}
                      canvasWidth={canvasWidth}
                      canvasHeight={canvasHeight}
                    />
                  )}
                </React.Fragment>
              );
            })}

            <Shape
              name="mask-layer"
              sceneFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.rect(-10000, -10000, 20000, 20000);
                ctx.rect(0, 0, canvasWidth, canvasHeight);
                ctx.closePath();
                ctx.fillStrokeShape(shape);
              }}
              fill="rgba(26,26,26,0.9)"
              fillRule="evenodd"
              listening={false}
            />

            <Rect width={canvasWidth} height={canvasHeight} stroke="rgba(255,255,255,0.1)" strokeWidth={1 / scale} listening={false} />

          </Group>

          {/* ── Transformer lives OUTSIDE the scaled Group so its handles always
              render above the mask-layer, even when a clip extends beyond the
              canvas boundary into the black letterbox area.
              The anchors are drawn in Stage (pixel) coordinates, which means
              they are never clipped or occluded by the evenodd mask shape. ── */}
          {!readOnly && selectedIds.length > 0 && (
            <Transformer
              ref={trRef}
              enabledAnchors={transformerConfig.enabledAnchors}
              keepRatio={true}
              flipEnabled={false} // Prevents applying scale < 0 which breaks width/height math
              anchorSize={20}
              anchorCornerRadius={2}
              borderStroke="#D1FE17"
              borderStrokeWidth={2}
              anchorFill="#D1FE17"
              anchorStroke="#000000"
              anchorStrokeWidth={1.5}
              hitStrokeWidth={20}
              rotateAnchorOffset={30}
              boundBoxFunc={(oldBox, newBox) => {
                // 1. Minimum size (in stage/scaled pixels)
                const minSize = selectedItemNode?.type === 'text' ? 20 : 10;

                // 2. Block negative dimensions (dragging past opposite edge)
                if (newBox.width < 0 || newBox.height < 0) {
                  return oldBox;
                }

                // 3. Enforce minimum size while preserving center
                if (newBox.width < minSize || newBox.height < minSize) {
                  const centerX = oldBox.x + oldBox.width / 2;
                  const centerY = oldBox.y + oldBox.height / 2;
                  const correctedWidth = Math.max(minSize, newBox.width);
                  const correctedHeight = Math.max(minSize, newBox.height);
                  return {
                    x: centerX - correctedWidth / 2,
                    y: centerY - correctedHeight / 2,
                    width: correctedWidth,
                    height: correctedHeight,
                    rotation: oldBox.rotation
                  };
                }

                // 4. Constrain text aspect ratio
                if (selectedItemNode?.type === 'text') {
                  const maxAspectRatio = 10;
                  const currentRatio = newBox.width / newBox.height;
                  if (currentRatio > maxAspectRatio || currentRatio < 1 / maxAspectRatio) {
                    return {
                      ...newBox,
                      width: currentRatio > maxAspectRatio ? newBox.height * maxAspectRatio : newBox.width,
                      height: currentRatio < 1 / maxAspectRatio ? newBox.width * maxAspectRatio : newBox.height,
                    };
                  }
                }

                return newBox;
              }}
            />
          )}

          <Rect ref={selectionRectRef} x={selectionRect.x} y={selectionRect.y} width={selectionRect.width} height={selectionRect.height} visible={selectionRect.visible} stroke="#0096fd" fill="rgba(0,150,253,0.2)" listening={false} />
        </Layer>
      </Stage>
    </>
  );
};