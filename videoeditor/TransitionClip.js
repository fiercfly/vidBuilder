const TransitionClip = ({
    item,
    totalFrames,
    transitionFrames,
    enter, // "fade" | "zoom-in" | "zoom-out" | "slide-left" | "slide-right" | "none"
    exit,  // same as above
  }) => {
    const frame = useCurrentFrame();
  
    // ---- ENTER PROGRESS (0 → 1) ----
    let enterProgress = 1; // default: fully visible
    if (enter !== "none" && frame < transitionFrames) {
      enterProgress = interpolate(
        frame,
        [0, transitionFrames - 1],
        [0, 1],
        {
          easing: Easing.inOut(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );
    }
  
    // ---- EXIT PROGRESS (0 → 1) ----
    let exitProgress = 0; // 0 = not yet exiting, 1 = fully gone
    if (exit !== "none" && frame >= totalFrames - transitionFrames) {
      const f = frame - (totalFrames - transitionFrames);
      exitProgress = interpolate(
        f,
        [0, transitionFrames - 1],
        [0, 1],
        {
          easing: Easing.inOut(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }
      );
    }
  
    // ---- OPACITY FROM ENTER / EXIT ----
    const enterOpacity =
      enter === "fade" || enter === "zoom-in" || enter === "zoom-out" || enter?.startsWith("slide")
        ? enterProgress
        : 1;
  
    const exitOpacity =
      exit === "fade" || exit === "zoom-in" || exit === "zoom-out" || exit?.startsWith("slide")
        ? 1 - exitProgress
        : 1;
  
    const opacity = Math.min(enterOpacity, exitOpacity);
  
    // ---- TRANSFORM (ZOOM / SLIDE) ----
    let scale = 1;
    let translateXPercent = 0;
  
    // ENTER transforms
    if (enter === "zoom-in") {
      // start slightly smaller, grow to 1
      scale = 0.9 + 0.1 * enterProgress;
    } else if (enter === "zoom-out") {
      // start larger, shrink to 1
      scale = 1.1 - 0.1 * enterProgress;
    } else if (enter === "slide-left") {
      // come from right to center
      translateXPercent = (1 - enterProgress) * 100; // 100% -> 0
    } else if (enter === "slide-right") {
      // come from left to center
      translateXPercent = (enterProgress - 1) * 100; // -100% -> 0
    }
  
    // EXIT transforms (stacked on top)
    if (exit === "zoom-in") {
      scale *= 1 + 0.1 * exitProgress; // zoom in while exiting
    } else if (exit === "zoom-out") {
      scale *= 1 - 0.1 * exitProgress; // zoom out while exiting
    } else if (exit === "slide-left") {
      translateXPercent -= exitProgress * 100; // move to left
    } else if (exit === "slide-right") {
      translateXPercent += exitProgress * 100; // move to right
    }
  
    const transform = `translateX(${translateXPercent}%) scale(${scale})`;
  
    return (
      <AbsoluteFill
        style={{
          opacity,
          transform,
          transformOrigin: "50% 50%",
        }}
      >
        {item.type === "video" && item.url && (
          <Video
            src={item.url}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {item.type === "image" && item.url && (
          <img
            src={item.url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </AbsoluteFill>
    );
  };
  