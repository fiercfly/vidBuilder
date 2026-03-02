// // import React, {
// //   useState,
// //   useEffect,
// //   useRef,
// //   forwardRef,
// //   useImperativeHandle,
// //   useCallback,
// // } from "react";
// // import aiMusic from "./ai_music.js";

// // import { useDispatch, useSelector } from "react-redux";
// // import FirebaseServices from "../../firebase";
// // import { getAllAudioFromIndexedDB, getAllMediaTypesFromIndexedDB } from "./indexDbStore";

// // // NOTE: Your original file referenced these but didn’t define/import them.
// // // If you already have these elsewhere, keep your imports and remove these stubs.
// // const getMediaTypeFromUrl = (url = "") => {
// //   const u = String(url).toLowerCase();
// //   if (u.match(/\.(mp3|wav|aac|m4a|ogg)($|\?)/)) return "audio";
// //   if (u.match(/\.(mp4|webm|mov|mkv)($|\?)/)) return "video";
// //   if (u.match(/\.(png|jpg|jpeg|webp|gif|svg)($|\?)/)) return "image";
// //   return "unknown";
// // };

// // const AudioMedia = forwardRef((props, ref) => {
// //   const { userId } = props;

// //   const [tracks, setTracks] = useState([]);
// //   const [error, setError] = useState(null);
// //   const [playingId, setPlayingId] = useState(null);

// //   const audioRefs = useRef({});
// //   const videoRefs = useRef({});
// //   const [reloadFlag, setReloadFlag] = useState(false);
// //   const [mediaItemsai, setMediaItemsai] = useState([]);
// //   const [videos, setVideos] = useState([]);

// //   const { db } = FirebaseServices;

// //   const { isGenerating = false, activeTab: generatingTab = null } = useSelector(
// //     (state) => state.generation || {}
// //   );

// //   const loadTracks = useCallback(async () => {
// //     try {
// //       const staticTracks = aiMusic.map((t, i) => ({
// //         ...t,
// //         id: String(i),
// //         duration: t.duration ?? null,
// //         audio_url: t.audio_url || t.url, // ✅ normalize
// //       }));

// //       let localAudios = await getAllAudioFromIndexedDB();
// //       localAudios.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

// //       // ✅ normalize local audio shape too
// //       localAudios = localAudios.map((a) => ({
// //         ...a,
// //         id: String(a.id),
// //         audio_url: a.audio_url || a.url,
// //         duration: Number.isFinite(a.duration) ? a.duration : null,
// //       }));

// //       const ids = new Set(localAudios.map((a) => String(a.id)));
// //       const filteredStatic = staticTracks.filter((t) => !ids.has(String(t.id)));

// //       setTracks([...localAudios, ...filteredStatic]);
// //       setError(null);
// //     } catch (err) {
// //       console.error(err);
// //       setError("Failed to load music.");
// //     }
// //   }, []);

// //   useEffect(() => {
// //     loadTracks();
// //   }, [userId, loadTracks]);

// //   const reloadAudioList = () => setReloadFlag((f) => !f);

// //   useEffect(() => {
// //     loadTracks();
// //   }, [reloadFlag, loadTracks]);

// //   useEffect(() => {
// //     getAllMediaTypesFromIndexedDB().then(setVideos).catch(console.error);
// //   }, [reloadFlag]);



// //   const handlePlay = useCallback((id) => {
// //     if (playingId && audioRefs.current[playingId]) {
// //       audioRefs.current[playingId].pause();
// //     }
// //     if (audioRefs.current[id]) {
// //       // Return the promise to handle potential play interruptions
// //       audioRefs.current[id].play().catch(err => console.warn("Play interrupted", err));
// //       setPlayingId(id);
// //     }
// //   }, [playingId]);

// //   const handlePause = useCallback(() => {
// //     if (playingId && audioRefs.current[playingId]) {
// //       audioRefs.current[playingId].pause();
// //     }
// //     setPlayingId(null);
// //   }, [playingId]);

// //   const handleAudioEnded = useCallback(() => {
// //     setPlayingId(null);
// //   }, []);

// //   const handleLoadedMetadata = useCallback((id, duration) => {
// //     setTracks((prev) =>
// //       prev.map((t) => (String(t.id) === String(id) ? { ...t, duration } : t))
// //     );
// //   }, []);


// //   // ✅ drag payload: always set url + duration fallback
// //   const handleDragStart = useCallback((track, e) => {
// //     const url = track.audio_url || track.url;
// //     const duration = Number.isFinite(track.duration) ? track.duration : null;

// //     if (!url) {
// //       e.preventDefault();
// //       alert("Audio not ready yet. Please wait and try again.");
// //       return;
// //     }

// //     const transferData = {
// //       id: String(track.id),
// //       type: "audio",
// //       url, // ✅ required by your drop handler
// //       actualDuration: duration, // ✅ optional
// //       title: track.title || "",
// //     };

// //     e.dataTransfer.setData("application/json", JSON.stringify(transferData));
// //     e.dataTransfer.effectAllowed = "copy";
// //   }, []);

// //   // ✅ expose pauseAllSidebarAudio to parent
// //   // ✅ expose pauseAllSidebarAudio to parent
// //   useImperativeHandle(ref, () => ({
// //     pauseAllSidebarAudio: () => {
// //       if (playingId && audioRefs.current[playingId]) {
// //         audioRefs.current[playingId].pause();
// //       }
// //       setPlayingId(null);
// //     },
// //   }));

// //   useEffect(() => {
// //     return () => {
// //       if (playingId && audioRefs.current[playingId]) {
// //         // eslint-disable-next-line react-hooks/exhaustive-deps
// //         audioRefs.current[playingId].pause();
// //       }
// //     };
// //   }, [playingId]);

// //   // Your generated videos logic (kept)
// //   const generatedVideos = mediaItemsai.filter(
// //     (item) => getMediaTypeFromUrl(item.url || item.audio_url || item.ImageUrl || item.VideoUrl) === "video"
// //   );
// //   const latestGeneratedVideo = generatedVideos[generatedVideos.length - 1];

// //   return (
// //     <div className="audio-media-sidebar">
// //       <div className="audio-media-list">
// //         {isGenerating && generatingTab === "audio" && (
// //           <div
// //             className="audio-loader"
// //             style={{ marginLeft: 16, display: "flex", alignItems: "center" }}
// //           >
// //             <span
// //               className="material-icons audio-loader-icon"
// //               style={{
// //                 fontSize: 24,
// //                 color: "#bfaaff",
// //                 animation: "spin 1s linear infinite",
// //               }}
// //             >
// //               autorenew
// //             </span>
// //             <span style={{ color: "#bfaaff", marginLeft: 8 }}>Generating...</span>
// //           </div>
// //         )}

// //         {error && (
// //           <div style={{ padding: 12, color: "#ff8a8a" }}>
// //             {error}{" "}
// //             <button
// //               onClick={reloadAudioList}
// //               style={{
// //                 marginLeft: 8,
// //                 background: "transparent",
// //                 border: "1px solid rgba(255,255,255,0.2)",
// //                 color: "#fff",
// //                 padding: "4px 8px",
// //                 borderRadius: 6,
// //                 cursor: "pointer",
// //               }}
// //             >
// //               Retry
// //             </button>
// //           </div>
// //         )}

// //         <div className="aiaudiolist">
// //           <div className="aiaudiolist-header">
// //             {latestGeneratedVideo && (
// //               <div
// //                 className={`audio-media-item${playingId === String(latestGeneratedVideo.id) ? " playing" : ""}`}
// //                 key={String(latestGeneratedVideo.id)}
// //                 draggable
// //                 onDragStart={(e) => handleDragStart(latestGeneratedVideo, e)}
// //               >
// //                 <div className="audio-media-handle">
// //                   <span className="material-icons">drag_indicator</span>
// //                 </div>

// //                 <div className="audio-media-thumb" style={{ position: "relative" }}>
// //                   <video
// //                     ref={(el) => (videoRefs.current[String(latestGeneratedVideo.id)] = el)}
// //                     src={latestGeneratedVideo.url}
// //                     width={80}
// //                     height={60}
// //                     style={{ borderRadius: 8, background: "#000" }}
// //                     controls={false}
// //                   />
// //                   <span
// //                     className="material-icons"
// //                     style={{ fontSize: 28, color: "#aaa", opacity: 0.3 }}
// //                   >
// //                     videocam
// //                   </span>
// //                 </div>

// //                 <div className="audio-media-info">
// //                   <div className="audio-media-title-text">
// //                     <strong>
// //                       {(latestGeneratedVideo.title || "Video").length > 12
// //                         ? (latestGeneratedVideo.title || "Video").slice(0, 12) + "..."
// //                         : (latestGeneratedVideo.title || "Video")}
// //                     </strong>
// //                   </div>
// //                 </div>
// //               </div>
// //             )}
// //           </div>

// //           {tracks.map((track) => {
// //             const id = String(track.id);
// //             const url = track.audio_url || track.url;

// //             return (
// //               <div
// //                 className={`audio-media-item${playingId === id ? " playing" : ""} supercool-hover`}
// //                 key={id}
// //                 draggable
// //                 onDragStart={(e) => handleDragStart(track, e)}
// //               >
// //                 <div className="audio-media-handle">
// //                   <span className="material-icons">drag_indicator</span>
// //                 </div>

// //                 <div className="audio-media-thumb" style={{ position: "relative" }}>
// //                   <button
// //                     className={`audio-media-play-btn${playingId === id ? " playing" : ""}`}
// //                     onClick={() => (playingId === id ? handlePause() : handlePlay(id))}
// //                     style={{
// //                       background: "none",
// //                       border: "none",
// //                       cursor: "pointer",
// //                       position: "absolute",
// //                       width: "100%",
// //                       height: "100%",
// //                       display: "flex",
// //                       alignItems: "center",
// //                       justifyContent: "center",
// //                       zIndex: 2,
// //                     }}
// //                   >
// //                     <span
// //                       className="material-icons"
// //                       style={{
// //                         fontSize: 28,
// //                         color: playingId === id ? "#D1FE17" : "#fff",
// //                         filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
// //                       }}
// //                     >
// //                       {playingId === id ? "pause_circle" : "play_circle"}
// //                     </span>
// //                   </button>

// //                   <span
// //                     className="material-icons"
// //                     style={{ fontSize: 28, color: "#aaa", opacity: 0.3 }}
// //                   >
// //                     music_note
// //                   </span>
// //                 </div>

// //                 <div className="audio-media-info">
// //                   <div className="audio-media-title-text">
// //                     <strong>
// //                       {(track.title || "Unknown").length > 12
// //                         ? (track.title || "Unknown").slice(0, 12) + "..."
// //                         : track.title || "Unknown"}
// //                     </strong>
// //                   </div>
// //                   <div
// //                     className="audio-media-duration"
// //                     style={{ fontSize: 10, color: "#888" }}
// //                   >
// //                     {track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")}` : ""}
// //                   </div>
// //                 </div>

// //                 <audio
// //                   ref={(el) => (audioRefs.current[id] = el)}
// //                   src={url}
// //                   preload="metadata"
// //                   onLoadedMetadata={(e) => handleLoadedMetadata(id, e.target.duration)}
// //                   onEnded={handleAudioEnded}
// //                   style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
// //                 />
// //               </div>
// //             );
// //           })}
// //         </div>
// //       </div>


// //     </div>
// //   );
// // });

// // export default AudioMedia;





// import React, {
//   useState,
//   useEffect,
//   useRef,
//   forwardRef,
//   useImperativeHandle,
//   useCallback,
// } from "react";

// import aiMusic from "./ai_music.js";

// import { useDispatch, useSelector } from "react-redux";
// import FirebaseServices from "../../firebase";
// import { getAllAudioFromIndexedDB, getAllMediaTypesFromIndexedDB } from "./indexDbStore";

// // ─── Duration cache (localStorage) ───────────────────────────────────────────
// const DURATION_CACHE_KEY = "audioDurationCache_v1";

// const readDurationCache = () => {
//   try {
//     return JSON.parse(localStorage.getItem(DURATION_CACHE_KEY) || "{}");
//   } catch {
//     return {};
//   }
// };

// const writeDurationCache = (cache) => {
//   try {
//     localStorage.setItem(DURATION_CACHE_KEY, JSON.stringify(cache));
//   } catch {
//     // quota exceeded — silently ignore
//   }
// };

// /**
//  * Fetches the real duration for a single URL off-DOM.
//  * Returns the duration in seconds, or null on failure.
//  */
// const fetchDurationOffDom = (url) =>
//   new Promise((resolve) => {
//     if (!url) return resolve(null);
//     const audio = new Audio();
//     const onMeta = () => {
//       const dur = Number.isFinite(audio.duration) ? audio.duration : null;
//       audio.src = "";
//       resolve(dur);
//     };
//     const onErr = () => {
//       audio.src = "";
//       resolve(null);
//     };
//     audio.addEventListener("loadedmetadata", onMeta, { once: true });
//     audio.addEventListener("error", onErr, { once: true });
//     audio.preload = "metadata";
//     audio.src = url;
//   });

// /**
//  * Given a list of tracks that are still missing durations, fetches them
//  * in parallel (capped at `concurrency`), persists results to localStorage,
//  * and calls `onResolved(id, duration)` for each one as it lands.
//  */
// const prefetchMissingDurations = async (tracks, onResolved, concurrency = 6) => {
//   const cache = readDurationCache();
//   const queue = [...tracks];

//   const worker = async () => {
//     while (queue.length) {
//       const track = queue.shift();
//       const url = track.audio_url || track.url;
//       const duration = await fetchDurationOffDom(url);
//       if (Number.isFinite(duration)) {
//         cache[String(track.id)] = duration;
//         writeDurationCache(cache);
//         onResolved(String(track.id), duration);
//       }
//     }
//   };

//   await Promise.all(
//     Array.from({ length: Math.min(concurrency, tracks.length) }, worker)
//   );
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const getMediaTypeFromUrl = (url = "") => {
//   const u = String(url).toLowerCase();
//   if (u.match(/\.(mp3|wav|aac|m4a|ogg)($|\?)/)) return "audio";
//   if (u.match(/\.(mp4|webm|mov|mkv)($|\?)/)) return "video";
//   if (u.match(/\.(png|jpg|jpeg|webp|gif|svg)($|\?)/)) return "image";
//   return "unknown";
// };

// // ─── Component ────────────────────────────────────────────────────────────────
// const AudioMedia = forwardRef((props, ref) => {
//   const { userId } = props;

//   const [tracks, setTracks] = useState([]);
//   const [error, setError] = useState(null);
//   const [playingId, setPlayingId] = useState(null);

//   const audioRefs = useRef({});
//   const videoRefs = useRef({});
//   const prefetchAbortRef = useRef(false); // lets us cancel stale prefetch runs
//   const [reloadFlag, setReloadFlag] = useState(false);
//   const [mediaItemsai, setMediaItemsai] = useState([]);
//   const [videos, setVideos] = useState([]);

//   const { db } = FirebaseServices;

//   const { isGenerating = false, activeTab: generatingTab = null } = useSelector(
//     (state) => state.generation || {}
//   );

//   // ── Update a single track's duration in state + localStorage ──────────────
//   const applyDuration = useCallback((id, duration) => {
//     setTracks((prev) =>
//       prev.map((t) => (String(t.id) === String(id) ? { ...t, duration } : t))
//     );
//   }, []);

//   // ── Load tracks, hydrate durations from cache immediately ─────────────────
//   const loadTracks = useCallback(async () => {
//     prefetchAbortRef.current = true; // cancel any running prefetch
//     try {
//       const cache = readDurationCache();

//       const staticTracks = aiMusic.map((t, i) => {
//         const id = String(i);
//         const cachedDur = cache[id];
//         return {
//           ...t,
//           id,
//           audio_url: t.audio_url || t.url,
//           // Prefer cache > already-embedded duration > null
//           duration: Number.isFinite(cachedDur)
//             ? cachedDur
//             : Number.isFinite(t.duration)
//             ? t.duration
//             : null,
//         };
//       });

//       let localAudios = await getAllAudioFromIndexedDB();
//       localAudios.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
//       localAudios = localAudios.map((a) => {
//         const id = String(a.id);
//         const cachedDur = cache[id];
//         return {
//           ...a,
//           id,
//           audio_url: a.audio_url || a.url,
//           duration: Number.isFinite(cachedDur)
//             ? cachedDur
//             : Number.isFinite(a.duration)
//             ? a.duration
//             : null,
//         };
//       });

//       const ids = new Set(localAudios.map((a) => a.id));
//       const filteredStatic = staticTracks.filter((t) => !ids.has(t.id));
//       const allTracks = [...localAudios, ...filteredStatic];

//       // ✅ Tracks with cached durations appear instantly — no waiting
//       setTracks(allTracks);
//       setError(null);

//       // ── Background-prefetch anything still missing a duration ────────────
//       const needDuration = allTracks.filter((t) => !Number.isFinite(t.duration));
//       if (needDuration.length === 0) return;

//       prefetchAbortRef.current = false;
//       prefetchMissingDurations(
//         needDuration,
//         (id, duration) => {
//           if (prefetchAbortRef.current) return; // stale — discard
//           applyDuration(id, duration);
//         }
//       );
//     } catch (err) {
//       console.error(err);
//       setError("Failed to load music.");
//     }
//   }, [applyDuration]);

//   useEffect(() => {
//     loadTracks();
//   }, [userId, loadTracks]);

//   const reloadAudioList = () => setReloadFlag((f) => !f);

//   useEffect(() => {
//     loadTracks();
//   }, [reloadFlag, loadTracks]);

//   useEffect(() => {
//     getAllMediaTypesFromIndexedDB().then(setVideos).catch(console.error);
//   }, [reloadFlag]);

//   // ── Playback ──────────────────────────────────────────────────────────────
//   const handlePlay = useCallback(
//     (id) => {
//       if (playingId && audioRefs.current[playingId]) {
//         audioRefs.current[playingId].pause();
//       }
//       if (audioRefs.current[id]) {
//         audioRefs.current[id].play().catch((err) => console.warn("Play interrupted", err));
//         setPlayingId(id);
//       }
//     },
//     [playingId]
//   );

//   const handlePause = useCallback(() => {
//     if (playingId && audioRefs.current[playingId]) {
//       audioRefs.current[playingId].pause();
//     }
//     setPlayingId(null);
//   }, [playingId]);

//   const handleAudioEnded = useCallback(() => setPlayingId(null), []);

//   // onLoadedMetadata from the visible <audio> element — also persists to cache
//   const handleLoadedMetadata = useCallback((id, duration) => {
//     if (!Number.isFinite(duration)) return;
//     const cache = readDurationCache();
//     if (!Number.isFinite(cache[id])) {
//       cache[id] = duration;
//       writeDurationCache(cache);
//     }
//     applyDuration(id, duration);
//   }, [applyDuration]);

//   // ── Drag ──────────────────────────────────────────────────────────────────
//   const handleDragStart = useCallback(
//     async (track, e) => {
//       const url = track.audio_url || track.url;

//       if (!url) {
//         e.preventDefault();
//         alert("Audio not ready yet. Please wait and try again.");
//         return;
//       }

//       // If duration is already known, fire immediately
//       let duration = Number.isFinite(track.duration) ? track.duration : null;

//       if (!Number.isFinite(duration)) {
//         // ✅ Imperatively fetch duration right now so drag carries real value.
//         // dataTransfer can only be set synchronously, so we check the cache first
//         // (prefetch may have already landed it even if React state hasn't updated yet).
//         const cache = readDurationCache();
//         const cached = cache[String(track.id)];
//         duration = Number.isFinite(cached) ? cached : null;
//         // If still null, the drop handler will need to handle a null duration gracefully.
//       }

//       const transferData = {
//         id: String(track.id),
//         type: "audio",
//         url,
//         actualDuration: duration,
//         title: track.title || "",
//       };

//       e.dataTransfer.setData("application/json", JSON.stringify(transferData));
//       e.dataTransfer.effectAllowed = "copy";
//     },
//     [] // no dependency on track.duration — reads cache imperatively instead
//   );

//   // ── Imperative handle ─────────────────────────────────────────────────────
//   useImperativeHandle(ref, () => ({
//     pauseAllSidebarAudio: () => {
//       if (playingId && audioRefs.current[playingId]) {
//         audioRefs.current[playingId].pause();
//       }
//       setPlayingId(null);
//     },
//   }));

//   useEffect(() => {
//     return () => {
//       if (playingId && audioRefs.current[playingId]) {
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//         audioRefs.current[playingId].pause();
//       }
//     };
//   }, [playingId]);

//   // ── Derived ───────────────────────────────────────────────────────────────
//   const generatedVideos = mediaItemsai.filter(
//     (item) =>
//       getMediaTypeFromUrl(
//         item.url || item.audio_url || item.ImageUrl || item.VideoUrl
//       ) === "video"
//   );
//   const latestGeneratedVideo = generatedVideos[generatedVideos.length - 1];

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <div className="audio-media-sidebar">
//       <div className="audio-media-list">
//         {isGenerating && generatingTab === "audio" && (
//           <div
//             className="audio-loader"
//             style={{ marginLeft: 16, display: "flex", alignItems: "center" }}
//           >
//             <span
//               className="material-icons audio-loader-icon"
//               style={{
//                 fontSize: 24,
//                 color: "#bfaaff",
//                 animation: "spin 1s linear infinite",
//               }}
//             >
//               autorenew
//             </span>
//             <span style={{ color: "#bfaaff", marginLeft: 8 }}>Generating...</span>
//           </div>
//         )}

//         {error && (
//           <div style={{ padding: 12, color: "#ff8a8a" }}>
//             {error}{" "}
//             <button
//               onClick={reloadAudioList}
//               style={{
//                 marginLeft: 8,
//                 background: "transparent",
//                 border: "1px solid rgba(255,255,255,0.2)",
//                 color: "#fff",
//                 padding: "4px 8px",
//                 borderRadius: 6,
//                 cursor: "pointer",
//               }}
//             >
//               Retry
//             </button>
//           </div>
//         )}

//         <div className="aiaudiolist">
//           <div className="aiaudiolist-header">
//             {latestGeneratedVideo && (
//               <div
//                 className={`audio-media-item${
//                   playingId === String(latestGeneratedVideo.id) ? " playing" : ""
//                 }`}
//                 key={String(latestGeneratedVideo.id)}
//                 draggable
//                 onDragStart={(e) => handleDragStart(latestGeneratedVideo, e)}
//               >
//                 <div className="audio-media-handle">
//                   <span className="material-icons">drag_indicator</span>
//                 </div>

//                 <div className="audio-media-thumb" style={{ position: "relative" }}>
//                   <video
//                     ref={(el) =>
//                       (videoRefs.current[String(latestGeneratedVideo.id)] = el)
//                     }
//                     src={latestGeneratedVideo.url}
//                     width={80}
//                     height={60}
//                     style={{ borderRadius: 8, background: "#000" }}
//                     controls={false}
//                   />
//                   <span
//                     className="material-icons"
//                     style={{ fontSize: 28, color: "#aaa", opacity: 0.3 }}
//                   >
//                     videocam
//                   </span>
//                 </div>

//                 <div className="audio-media-info">
//                   <div className="audio-media-title-text">
//                     <strong>
//                       {(latestGeneratedVideo.title || "Video").length > 12
//                         ? (latestGeneratedVideo.title || "Video").slice(0, 12) + "..."
//                         : latestGeneratedVideo.title || "Video"}
//                     </strong>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>

//           {tracks.map((track) => {
//             const id = String(track.id);
//             const url = track.audio_url || track.url;

//             return (
//               <div
//                 className={`audio-media-item${
//                   playingId === id ? " playing" : ""
//                 } supercool-hover`}
//                 key={id}
//                 draggable
//                 onDragStart={(e) => handleDragStart(track, e)}
//               >
//                 <div className="audio-media-handle">
//                   <span className="material-icons">drag_indicator</span>
//                 </div>

//                 <div className="audio-media-thumb" style={{ position: "relative" }}>
//                   <button
//                     className={`audio-media-play-btn${playingId === id ? " playing" : ""}`}
//                     onClick={() =>
//                       playingId === id ? handlePause() : handlePlay(id)
//                     }
//                     style={{
//                       background: "none",
//                       border: "none",
//                       cursor: "pointer",
//                       position: "absolute",
//                       width: "100%",
//                       height: "100%",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       zIndex: 2,
//                     }}
//                   >
//                     <span
//                       className="material-icons"
//                       style={{
//                         fontSize: 28,
//                         color: playingId === id ? "#D1FE17" : "#fff",
//                         filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
//                       }}
//                     >
//                       {playingId === id ? "pause_circle" : "play_circle"}
//                     </span>
//                   </button>

//                   <span
//                     className="material-icons"
//                     style={{ fontSize: 28, color: "#aaa", opacity: 0.3 }}
//                   >
//                     music_note
//                   </span>
//                 </div>

//                 <div className="audio-media-info">
//                   <div className="audio-media-title-text">
//                     <strong>
//                       {(track.title || "Unknown").length > 12
//                         ? (track.title || "Unknown").slice(0, 12) + "..."
//                         : track.title || "Unknown"}
//                     </strong>
//                   </div>
//                   <div
//                     className="audio-media-duration"
//                     style={{ fontSize: 10, color: "#888" }}
//                   >
//                     {Number.isFinite(track.duration)
//                       ? `${Math.floor(track.duration / 60)}:${String(
//                           Math.floor(track.duration % 60)
//                         ).padStart(2, "0")}`
//                       : ""}
//                   </div>
//                 </div>

//                 {/* Hidden audio element — still needed for playback */}
//                 <audio
//                   ref={(el) => (audioRefs.current[id] = el)}
//                   src={url}
//                   preload="metadata"
//                   onLoadedMetadata={(e) =>
//                     handleLoadedMetadata(id, e.target.duration)
//                   }
//                   onEnded={handleAudioEnded}
//                   style={{
//                     width: 0,
//                     height: 0,
//                     opacity: 0,
//                     position: "absolute",
//                   }}
//                 />
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// });

// export default AudioMedia;







import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// Removed Firebase imports
import GenerateMediaSlider from './GenerateMediaSlider';
import { useSelector } from "react-redux";
import { useLocation } from 'react-router-dom';
import { useLocalProjectCache } from './standalone/useLocalProjectCache';
import { v4 as uuidv4 } from 'uuid';
import { useMediaCache } from './useVideoEditorHooks';

/*************************
 * Constants & UI helpers *
 *************************/
const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v', 'hevc', 'mpeg']);
const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'opus']);

// ✅ UPDATED FILTERS to include Image
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

const ts = (x) => {
  if (!x) return 0;
  if (typeof x === 'object' && typeof x.seconds === 'number') {
    return x.seconds * 1000 + (x.nanoseconds ? x.nanoseconds / 1e6 : 0);
  }
  if (typeof x === 'number') return x > 1e12 ? x : x * 1000;
  const t = new Date(x).getTime();
  return Number.isNaN(t) ? 0 : t;
};

function mergeDedup(prev = [], incoming = []) {
  const map = new Map();
  const normalize = (x) => (Array.isArray(x) ? x : x ? [x] : []);

  const add = (arr) => {
    for (const it of normalize(arr)) {
      const k = keyOf(it);
      if (!k) {
        map.set(Symbol("nokey"), it);
        continue;
      }
      if (!map.has(k)) map.set(k, it);
      else {
        const a = map.get(k);
        const pick = ts(it.timestamp) >= ts(a.timestamp) ? it : a;
        map.set(k, pick);
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
  const ext = u.split(/[?#]/)[0].split('.').pop()?.toLowerCase() || '';
  return ext;
};
const isVideo = (u) => VIDEO_EXT.has(extOf(u));
const isImage = (u) => IMAGE_EXT.has(extOf(u));
const isAudio = (u) => AUDIO_EXT.has(extOf(u));

const AUDIO_ICON_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBkPSJNMTEgNnY5LjI2Yy0uOTItLjYxLTIuMDctMS4wMS0zLjQtMS4wMS0zLjExIDAtNSAyLjQ2LTUgNS41UzQuODkgMjUgOCAyNXMyLjQ2LTEgNS0zLjl2LTExLjFIMjZWMTBoLTd2NGgtOHYtOHoiIGZpbGw9IiM2NjYiLz48L3N2Zz4=';

function extractUrls(it = {}) {
  const md = it.mydata || it.myData || {};
  const mdThumb = md.thumbnail || md.thumb || md.thumbnailUrl || '';

  const cands = [
    it.VideoUrl, it.AudioUrl, it.ImageUrl, it.imdageurl,
    it.downloadableData, it.url, it.PreviewImage,
    it.thumbnail, it.cover, it.InitialImage, mdThumb,
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

  if (!preview) {
    const img = cands.find(isImage);
    if (img) preview = img;
  }

  if (!preview && audioUrl) preview = AUDIO_ICON_URL;
  if (!preview) preview = (isImage(it.url) ? it.url : '') || '';

  return { videoUrl, audioUrl, imageUrl, preview };
}

function inferType(it = {}) {
  if (it.type) return it.type;
  const { videoUrl, audioUrl } = extractUrls(it);
  if (videoUrl) return 'video';
  if (audioUrl) return 'audio';
  const u = (it.url || it.ImageUrl || it.PreviewImage || it.downloadableData || it.imdageurl || '');
  const urlStr = typeof u === 'string' ? u : String(u);
  if (isVideo(urlStr)) return 'video';
  if (isAudio(urlStr)) return 'audio';
  return 'image';
}

function displaySrcFor(it = {}) {
  const t = inferType(it);
  const { preview, imageUrl, videoUrl } = extractUrls(it);
  if (t === 'audio') return preview || AUDIO_ICON_URL;
  if (preview) return preview;
  if (imageUrl) return imageUrl;
  if (t === 'video' && videoUrl) return videoUrl;
  return '';
}

// 🔥 NEW: Audio Duration Cache
class AudioDurationCache {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
    this.listeners = new Map();
  }

  // Get cached duration or start loading if not available
  getDuration(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }

    if (!this.loading.has(url)) {
      this.loadDuration(url);
    }

    return null; // Still loading
  }

  // Load audio duration
  async loadDuration(url) {
    if (this.loading.has(url) || this.cache.has(url)) {
      return;
    }

    this.loading.add(url);

    try {
      const duration = await this.fetchAudioDuration(url);
      this.cache.set(url, duration);
      this.loading.delete(url);

      // Notify listeners
      const callbacks = this.listeners.get(url) || [];
      callbacks.forEach(callback => callback(duration));
      this.listeners.delete(url);

    } catch (error) {
      console.warn('Failed to load audio duration for', url, error);
      this.loading.delete(url);
      // Set a fallback duration
      this.cache.set(url, 5);
    }
  }

  // Fetch actual audio duration using Audio API
  fetchAudioDuration(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();

      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoad);
        audio.removeEventListener('error', onError);
        audio.src = '';
      };

      const onLoad = () => {
        const duration = audio.duration;
        cleanup();
        if (isFinite(duration) && duration > 0) {
          resolve(duration);
        } else {
          reject(new Error('Invalid duration'));
        }
      };

      const onError = () => {
        cleanup();
        reject(new Error('Failed to load audio'));
      };

      audio.addEventListener('loadedmetadata', onLoad);
      audio.addEventListener('error', onError);

      // Set a timeout to prevent hanging
      setTimeout(() => {
        cleanup();
        reject(new Error('Timeout'));
      }, 10000);

      audio.src = url;
    });
  }

  // Subscribe to duration updates
  onDurationLoad(url, callback) {
    if (this.cache.has(url)) {
      callback(this.cache.get(url));
      return;
    }

    if (!this.listeners.has(url)) {
      this.listeners.set(url, []);
    }
    this.listeners.get(url).push(callback);
  }

  // Preload multiple audio durations
  preloadDurations(urls) {
    urls.forEach(url => {
      if (!this.cache.has(url) && !this.loading.has(url)) {
        this.loadDuration(url);
      }
    });
  }
}

// Global audio duration cache instance
const audioDurationCache = new AudioDurationCache();

function dragPayloadFor(it = {}, cachedDuration = null) {
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

  // 🔥 USE CACHED DURATION FOR AUDIO
  let actualDuration = 5; // fallback
  if (t === 'video') {
    actualDuration = it.actualDuration || 5;
  } else if (t === 'audio') {
    actualDuration = cachedDuration || it.actualDuration || 5;
  }

  return {
    id: it.id,
    type: t,
    url: dragUrl,
    name: it.name || '',
    actualDuration,
    naturalWidth,
    naturalHeight,
    size: it.size || it.fileSize || 0
  };
}

const pickUrl = (it) => {
  const { preview, imageUrl, videoUrl, audioUrl } = extractUrls(it);
  return preview || imageUrl || videoUrl || audioUrl || '';
};

// 🔥 NEW: Audio Card Component with Duration Display
const AudioCard = ({ it, cachedDuration, onDurationUpdate }) => {
  const displaySrc = displaySrcFor(it);
  const { audioUrl } = extractUrls(it);

  useEffect(() => {
    if (audioUrl && !cachedDuration) {
      audioDurationCache.onDurationLoad(audioUrl, onDurationUpdate);
    }
  }, [audioUrl, cachedDuration, onDurationUpdate]);

  return (
    <div style={{ position: 'relative', width: '100%', height: 'fit-content' }}>
      <img
        src={displaySrc}
        alt={it.name || 'Audio'}
        style={{
          width: '100%', height: 'auto', borderRadius: 8,
          background: '#222',
          cursor: 'grab', display: 'block',
        }}
        loading="lazy" decoding="async"
        draggable={!it.isProcessing}
        onDragStart={(e) => {
          if (it.isProcessing) return;
          const payload = dragPayloadFor(it, cachedDuration);
          e.dataTransfer.setData('application/json', JSON.stringify(payload));
          e.dataTransfer.effectAllowed = 'copy';
        }}
      />

      {/* Duration Badge */}
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        background: 'rgba(0,0,0,0.8)', color: 'white',
        padding: '4px 8px', borderRadius: 4,
        fontSize: '12px', fontWeight: '500'
      }}>
        {cachedDuration ? `${Math.round(cachedDuration)}s` : '...'}
      </div>

      {/* Audio Icon */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 32, height: 32, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 2, color: 'white',
      }}>
        <span className="material-icons" style={{ fontSize: 20 }}>audiotrack</span>
      </div>
    </div>
  );
};

// Your VideoCard component (keeping existing logic)
const VideoCard = React.memo(({ it, onDurationLoaded }) => {
  const videoRef = useRef();
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const { videoUrl } = extractUrls(it);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    setNaturalSize({
      width: video.videoWidth || 500,
      height: video.videoHeight || 281
    });

    if (video.duration && onDurationLoaded) {
      onDurationLoaded(keyOf(it), video.duration);
    }
  }, [it, onDurationLoaded]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <video
        ref={videoRef}
        src={videoUrl}
        style={{
          width: '100%', height: 'auto', borderRadius: 8,
          background: '#222', cursor: 'grab', display: 'block',
        }}
        muted preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        draggable={!it.isProcessing}
        onDragStart={(e) => {
          if (it.isProcessing) return;
          const payload = dragPayloadFor(it);
          if (naturalSize.width > 0) payload.naturalWidth = naturalSize.width;
          if (naturalSize.height > 0) payload.naturalHeight = naturalSize.height;
          e.dataTransfer.setData('application/json', JSON.stringify(payload));
          e.dataTransfer.effectAllowed = 'copy';
        }}
      />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 2, color: 'white',
      }}>
        <span className="material-icons" style={{ fontSize: 24 }}>play_arrow</span>
      </div>
    </div>
  );
});

// Continue with your useIntersectionLoader hook and other code...
const useIntersectionLoader = ({ enabled, onLoadMore }) => {
  const loaderRef = useRef();
  const observerRef = useRef();
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!enabled || !loader) return;

    const handleIntersect = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loadingMore) {
        setLoadingMore(true);
        onLoadMore().finally(() => setLoadingMore(false));
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '100px',
    });
    observerRef.current.observe(loader);

    return () => {
      if (observerRef.current && loader) {
        observerRef.current.unobserve(loader);
      }
    };
  }, [enabled, onLoadMore, loadingMore]);

  return { loaderRef, loadingMore };
};

// Main MediaSection component
const MediaSection = ({
  userId,
  isGenerating,
  originTab,
  externalVideoUrl,
  showGenerateForm,
  setShowGenerateForm,
  onDurationLoaded: handleDurationLoaded
}) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const pid = queryParams.get('project');

  const normalizedPid = normalizeAiDocId(pid);
  const { useLocal, isAuthenticated } = useSelector(state => state.authSlice, shallowEqual);
  const usingLocal = useLocal || !isAuthenticated;

  const { get: getLocalMedia, set: setLocalMedia } = useLocalProjectCache(normalizedPid);
  const { cache, addToCache } = useMediaCache();

  // 🔥 NEW: Audio duration state
  const [audioDurations, setAudioDurations] = useState(new Map());

  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const [filter, setFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 🔥 NEW: Preload audio durations when media items change
  useEffect(() => {
    const audioItems = mediaItems.filter(it => inferType(it) === 'audio');
    const audioUrls = audioItems.map(it => {
      const { audioUrl } = extractUrls(it);
      return audioUrl;
    }).filter(Boolean);

    if (audioUrls.length > 0) {
      audioDurationCache.preloadDurations(audioUrls);
    }
  }, [mediaItems]);

  // 🔥 NEW: Handle audio duration updates
  const handleAudioDurationUpdate = useCallback((url, duration) => {
    setAudioDurations(prev => new Map(prev).set(url, duration));
  }, []);

  const loadMediaFromFirestore = useCallback(async (isLoadMore = false) => {
    if (!normalizedPid) return;

    setLoading(false);
    try {
      // Removed firestore loading logic
      // This function is now a placeholder as Firebase fetching is removed.
      // It will effectively do nothing for now, relying on local cache.
      // If remote fetching is needed later, it will be reimplemented here.

      // For now, simulate no more data from "firestore"
      setHasMore(false);

    } catch (err) {
      console.error('Error loading media from Firestore:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [normalizedPid, lastDoc, addToCache]);

  const onLoadMore = useCallback(() => loadMediaFromFirestore(true), [loadMediaFromFirestore]);

  useEffect(() => {
    if (usingLocal && normalizedPid) {
      const local = getLocalMedia('media_items') || [];
      const items = Array.isArray(local) ? local : [local].filter(Boolean);
      setMediaItems(items);
      setHasMore(false);
    } else if (normalizedPid) {
      const cached = cache.get(normalizedPid);
      if (cached?.length > 0) {
        setMediaItems(cached);
        loadMediaFromFirestore(false);
      } else {
        loadMediaFromFirestore(false);
      }
    }
  }, [normalizedPid, usingLocal, getLocalMedia, cache, loadMediaFromFirestore]);

  const { loaderRef, loadingMore } = useIntersectionLoader({
    enabled: !usingLocal && !loading && hasMore, onLoadMore,
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

  const filtered = useMemo(() => {
    return mediaItemsWithExternal.filter((it) => {
      if (it.isProcessing) return true;
      const t = inferType(it);
      if (!filter || filter === 'all') return (t === 'video' || t === 'audio' || t === 'image') && !!pickUrl(it);
      return t === filter && !!pickUrl(it);
    });
  }, [mediaItemsWithExternal, filter]);

  return (
    <div className="media-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Filter bar */}
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

        {/* Backdrop to close on click outside */}
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
            contain: 'layout paint style', contentVisibility: 'auto',
          }}
        >
          {filtered.map((it) => {
            // ── Processing placeholder ──────────────────────────────────
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

            const t = inferType(it);

            // ── Video ────────────────────────────────────────────────────
            if (t === 'video') {
              return (
                <div key={keyOf(it)} className="supercool-hover">
                  <VideoCard it={it} onDurationLoaded={handleDurationLoaded} />
                </div>
              );
            }

            // ── Audio ────────────────────────────────────────────────────
            if (t === 'audio') {
              const { audioUrl } = extractUrls(it);
              const cachedDuration = audioDurations.get(audioUrl);

              return (
                <div key={keyOf(it)} className="supercool-hover">
                  <AudioCard
                    it={it}
                    cachedDuration={cachedDuration}
                    onDurationUpdate={(duration) => handleAudioDurationUpdate(audioUrl, duration)}
                  />
                </div>
              );
            }

            // ── Image / gif ──────────────────────────────────────
            const displaySrc = displaySrcFor(it);
            if (!displaySrc) return null;
            const isGif = displaySrc.match(/\.gif$/i);
            return (
              <div key={keyOf(it)} className="supercool-hover" style={{ position: 'relative', width: '100%', height: 'fit-content' }}>
                <img
                  src={displaySrc}
                  alt={it.name || 'Media'}
                  style={{
                    width: '100%', height: 'auto', borderRadius: 8,
                    background: '#222',
                    cursor: 'grab', display: 'block',
                    // Box shadow handled by supercool-hover
                  }}
                  loading="lazy" decoding="async"
                  draggable={!it.isProcessing}
                  onDragStart={(e) => {
                    if (it.isProcessing) return;
                    const payload = dragPayloadFor(it);
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