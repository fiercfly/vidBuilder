


// import React from "react";
// import { Composition } from "remotion";
// import { InteractiveComposition } from "./InteractiveComposition";

// export const RemotionRoot = () => {
//   return (
//     <Composition
//       id="EditorVideo"
//       component={InteractiveComposition}
//       durationInFrames={300} // Default, gets overridden by calculateMetadata
//       fps={30}
//       width={1080}
//       height={1920}
//       calculateMetadata={async ({ props }) => {
//         return {
//           durationInFrames: props.durationInFrames || 300,
//           width: props.width || 1080,
//           height: props.height || 1920,
//           fps: props.fps || 30,
//         };
//       }}
//       defaultProps={{
//         timelineItems: [],
//         tracks: [],
//         transitions: [],
//         canvasBackgroundColor: "#000000", // ✅ FIXED: Ensure default is passed through inputProps
//         readOnly: true, // Force read-only mode
//       }}
//     />
//   );
// };




import React from "react";
import { Composition } from "remotion";
import { InteractiveComposition } from "./InteractiveComposition";

export const RemotionRoot = () => {
  return (
    <Composition
      id="EditorVideo"
      component={InteractiveComposition}
      durationInFrames={300} // Default, gets overridden by calculateMetadata
      fps={30}
      width={1080}
      height={1920}
      calculateMetadata={async ({ props }) => {
        return {
          durationInFrames: props.durationInFrames || 300,
          width: props.width || 1080,
          height: props.height || 1920,
          fps: props.fps || 30,
        };
      }}
      defaultProps={{
        timelineItems: [],
        tracks: [],
        transitions: [],
        canvasBackgroundColor: "#000000",
        isPlaying: true, // ✅ Added isPlaying to default props
      }}
    />
  );
};