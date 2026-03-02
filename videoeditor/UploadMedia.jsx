

// // import React, { useState } from 'react';

// // // ✅ STRICT LIST OF ALLOWED EXTENSIONS
// // const VALID_EXTENSIONS = new Set([
// //   // Video
// //   'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts', 'hevc',
// //   // Image
// //   'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic',
// //   // Audio
// //   'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus', 'mpga', 'weba',
// //   // Text
// //   'srt'
// // ]);

// // // ✅ FILTER DEFINITIONS
// // const FILTERS = [
// //   { id: 'all', label: 'All', icon: 'dashboard' },
// //   { id: 'video', label: 'Video', icon: 'movie' },
// //   { id: 'image', label: 'Image', icon: 'image' },
// //   { id: 'audio', label: 'Audio', icon: 'audiotrack' },
// // ];

// // const UploadMedia = ({ 
// //   onUpload, 
// //   mediaFiles = [], 
// //   handleMediaItemDrag, 
// //   handleDeleteMediaFile, 
// //   showToast 
// // }) => {
// //   const [isHovered, setIsHovered] = useState(false);
// //   const [activeFilter, setActiveFilter] = useState('all'); // ✅ Added Filter State

// //   const handleValidation = (incomingFiles) => {
// //     const files = Array.from(incomingFiles);
// //     const validFiles = [];
// //     const invalidNames = [];

// //     files.forEach(file => {
// //         const parts = file.name.split('.');
// //         const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

// //         if (ext && VALID_EXTENSIONS.has(ext)) {
// //             validFiles.push(file);
// //         } else {
// //             invalidNames.push(file.name);
// //         }
// //     });

// //     if (invalidNames.length > 0) {
// //         const msg = `Unsupported file type: ${invalidNames[0]}...`; 
// //         const fullMsg = `Unsupported file(s): ${invalidNames.join(', ')}`;
// //         if (showToast) showToast(fullMsg);
// //         else alert(fullMsg);
// //     }

// //     if (validFiles.length > 0) {
// //         onUpload(validFiles);
// //     }
// //   };

// //   const onInputChange = (e) => {
// //     const file = e.target.files?.[0];
// //     if (file) {
// //         const maxSize = 20 * 1024 * 1024 * 1024; // 20GB (Note: Your original code had this calculation, kept it)
// //         if (file.size > maxSize) {
// //             alert("File too large! Please upload a file smaller than 20MB."); 
// //             e.target.value = ""; 
// //             return; 
// //         }
// //     }
// //     if (e.target.files && e.target.files.length > 0) {
// //         handleValidation(e.target.files);
// //     }
// //     e.target.value = ''; 
// //   };

// //   const onDropHandler = (e) => {
// //     e.preventDefault();
// //     e.stopPropagation();
// //     setIsHovered(false);
// //     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
// //       handleValidation(e.dataTransfer.files);
// //     }
// //   };

// //   const getDisplayType = (item) => {
// //     if (!item) return 'unknown'; 
// //     const name = item.name || '';
// //     const ext = name.split('.').pop().toLowerCase();

// //     const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus', 'mpga', 'weba'];
// //     const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts', 'hevc'];
// //     const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic'];

// //     if (name.toLowerCase().endsWith('.srt') || item.type === 'caption') return 'caption';
// //     if (AUDIO_EXTS.includes(ext)) return 'audio';
// //     if (VIDEO_EXTS.includes(ext)) return 'video';
// //     if (IMAGE_EXTS.includes(ext)) return 'image';

// //     return item.type;
// //   };

// //   const safeMediaFiles = Array.isArray(mediaFiles) ? mediaFiles : [];

// //   // ✅ FILTER LOGIC
// //   const filteredFiles = safeMediaFiles.filter(item => {
// //     if (activeFilter === 'all') return true;
// //     const type = getDisplayType(item);
// //     // Map caption to text if you want, or just let it be hidden for specific filters
// //     return type === activeFilter;
// //   });

// //   return (
// //     <div style={{ padding: '15px', height: '100%', display: 'flex', flexDirection: 'column' }}>

// //       {/* Upload Area */}
// //       <div 
// //         onClick={() => document.getElementById('fileInput').click()}
// //         onDrop={onDropHandler}
// //         onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
// //         onDragLeave={() => setIsHovered(false)}
// //         onMouseEnter={() => setIsHovered(true)}
// //         onMouseLeave={() => setIsHovered(false)}
// //         style={{
// //           border: isHovered ? '1px dashed #D1FE17' : '1px dashed rgba(255,255,255,0.15)',
// //           backgroundColor: isHovered ? 'rgba(209, 254, 23, 0.03)' : 'rgba(255,255,255,0.02)',
// //           borderRadius: '12px',
// //           padding: '24px 20px',
// //           display: 'flex',
// //           flexDirection: 'column',
// //           alignItems: 'center',
// //           justifyContent: 'center',
// //           cursor: 'pointer',
// //           marginBottom: '16px',
// //           transition: 'all 0.3s ease',
// //           gap: '8px',
// //           flexShrink: 0
// //         }}
// //       >
// //         <div style={{
// //           width: '40px', height: '40px', borderRadius: '50%',
// //           background: isHovered ? 'rgba(209, 254, 23, 0.1)' : 'rgba(255,255,255,0.05)',
// //           display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease'
// //         }}>
// //           <span className="material-icons" style={{ fontSize: '20px', color: isHovered ? '#D1FE17' : '#666' }}>cloud_upload</span>
// //         </div>
// //         <div style={{ textAlign: 'center' }}>
// //           <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: isHovered ? '#fff' : '#ccc' }}>Click to Upload</span>
// //         </div>

// //         <input 
// //             id="fileInput" 
// //             type="file" 
// //             multiple 
// //             accept="video/*,image/*,audio/*,.srt" 
// //             onChange={onInputChange} 
// //             style={{ display: 'none' }} 
// //         />
// //       </div>

// //       {/* ✅ FILTER BAR */}
// //       <div style={{ 
// //         display: 'flex', 
// //         gap: '8px', 
// //         marginBottom: '12px', 
// //         overflowX: 'auto', 
// //         paddingBottom: '4px',
// //         flexShrink: 0
// //       }}>
// //         {FILTERS.map(f => (
// //           <button
// //             key={f.id}
// //             onClick={() => setActiveFilter(f.id)}
// //             style={{
// //               background: activeFilter === f.id ? '#D1FE17' : 'rgba(255,255,255,0.05)',
// //               color: activeFilter === f.id ? '#000' : '#888',
// //               border: activeFilter === f.id ? '1px solid #D1FE17' : '1px solid rgba(255,255,255,0.1)',
// //               borderRadius: '20px',
// //               padding: '6px 14px',
// //               fontSize: '11px',
// //               fontWeight: '600',
// //               cursor: 'pointer',
// //               display: 'flex',
// //               alignItems: 'center',
// //               gap: '6px',
// //               transition: 'all 0.2s ease',
// //               outline: 'none',
// //               whiteSpace: 'nowrap'
// //             }}
// //           >
// //             <span className="material-icons" style={{ fontSize: '14px' }}>{f.icon}</span>
// //             {f.label}
// //           </button>
// //         ))}
// //       </div>

// //       {/* Media Gallery */}
// //       <div style={{ 
// //           display: 'flex',
// //           flexWrap: 'wrap',
// //           gap: '8px', 
// //           overflowY: 'auto', 
// //           paddingRight: '4px',
// //           alignContent: 'flex-start',
// //           flex: 1
// //       }}>
// //         {filteredFiles.length === 0 ? (
// //           <div style={{ width: '100%', textAlign: 'center', color: '#444', fontSize: '12px', padding: '40px 0', fontStyle: 'italic' }}>
// //              {activeFilter === 'all' ? 'No uploads yet.' : `No ${activeFilter} files found.`}
// //           </div>
// //         ) : (
// //           filteredFiles.map(item => {
// //             const displayType = getDisplayType(item);

// //             return (
// //               <div
// //                 key={item.id}
// //                 draggable
// //                 onDragStart={(e) => handleMediaItemDrag(e, item)}
// //                 className="media-upload-item"
// //                 style={{
// //                   position: 'relative', 
// //                   background: '#1a1a1a', 
// //                   borderRadius: '6px', 
// //                   overflow: 'hidden',
// //                   cursor: 'grab',
// //                   border: '1px solid rgba(255,255,255,0.08)',
// //                   height: '100px', 
// //                   width: 'auto',
// //                   maxWidth: '100%',
// //                   display: 'flex',
// //                   alignItems: 'center',
// //                   justifyContent: 'center',
// //                   aspectRatio: '16/9',
// //                   flexGrow: 1
// //                 }}
// //                 onMouseEnter={(e) => {
// //                     e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
// //                     const overlay = e.currentTarget.querySelector('.hover-name-overlay');
// //                     if(overlay) {
// //                         overlay.style.opacity = '1';
// //                         overlay.style.transform = 'translateY(0)';
// //                     }
// //                 }}
// //                 onMouseLeave={(e) => {
// //                     e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
// //                     const overlay = e.currentTarget.querySelector('.hover-name-overlay');
// //                     if(overlay) {
// //                         overlay.style.opacity = '0';
// //                         overlay.style.transform = 'translateY(10px)';
// //                     }
// //                 }}
// //               >
// //                 <div
// //                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMediaFile(item.id); }}
// //                   style={{
// //                     position: 'absolute', top: '4px', right: '4px', 
// //                     background: 'rgba(0,0,0,0.6)', borderRadius: '50%', 
// //                     width: '18px', height: '18px', cursor: 'pointer', zIndex: 10, color: '#fff',
// //                     display: 'flex', alignItems: 'center', justifyContent: 'center',
// //                     backdropFilter: 'blur(4px)'
// //                   }}
// //                 >
// //                   <span className="material-icons" style={{ fontSize: '12px' }}>close</span>
// //                 </div>

// //                 {displayType === 'video' && (
// //                   <video 
// //                     src={item.url || item.remoteUrl} 
// //                     style={{ height: '100%', width: '100%', objectFit: 'cover' }} 
// //                     muted 
// //                   />
// //                 )}

// //                 {displayType === 'image' && (
// //                   <img 
// //                     src={item.url || item.remoteUrl} 
// //                     alt={item.name} 
// //                     style={{ height: '100%', width: '100%', objectFit: 'cover' }} 
// //                   />
// //                 )}

// //                 {(displayType === 'audio' || displayType === 'caption') && (
// //                   <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
// //                      <span className="material-icons" style={{ fontSize: '28px', color: displayType === 'audio' ? '#D1FE17' : '#fff' }}>
// //                        {displayType === 'audio' ? 'audiotrack' : 'subtitles'}
// //                      </span>
// //                   </div>
// //                 )}

// //                 <div 
// //                     className="hover-name-overlay"
// //                     style={{
// //                         position: 'absolute',
// //                         bottom: 0, left: 0, right: 0,
// //                         background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
// //                         padding: '16px 4px 4px',
// //                         opacity: 0, 
// //                         transform: 'translateY(10px)',
// //                         transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
// //                         pointerEvents: 'none',
// //                         width: '100%'
// //                     }}
// //                 >
// //                     <span style={{ 
// //                         display: 'block', fontSize: '10px', color: '#fff', 
// //                         whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
// //                         textAlign: 'center', fontWeight: '500'
// //                     }}>
// //                         {item.name}
// //                     </span>
// //                 </div>

// //               </div>
// //             );
// //           })
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default UploadMedia;



// import React, { useState, useEffect } from 'react';

// // ✅ STRICT LIST OF ALLOWED EXTENSIONS
// const VALID_EXTENSIONS = new Set([
//   // Video
//   'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts', 'hevc',
//   // Image
//   'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic',
//   // Audio
//   'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus', 'mpga', 'weba',
//   // Text
//   'srt',
// ]);

// // ✅ FILTER DEFINITIONS
// const FILTERS = [
//   { id: 'all', label: 'All', icon: 'dashboard' },
//   { id: 'video', label: 'Video', icon: 'movie' },
//   { id: 'image', label: 'Image', icon: 'image' },
//   { id: 'audio', label: 'Audio', icon: 'audiotrack' },
// ];

// // ─── Dead-blob detection ────────────────────────────────────────────────────
// // blob: URLs from a previous page session are revoked on reload.
// // We track all blobs created in THIS session in a Set.
// // Any blob: URL not in the Set was created in a prior session and is dead.
// const sessionBlobs = new Set();

// function isDeadBlob(url) {
//   if (!url || typeof url !== 'string') return false;
//   if (!url.startsWith('blob:')) return false;
//   return !sessionBlobs.has(url);
// }

// // Call this whenever you create a new blob URL so it's marked as live.
// export function registerBlobUrl(url) {
//   if (url && url.startsWith('blob:')) sessionBlobs.add(url);
// }

// // ─── VideoItem ──────────────────────────────────────────────────────────────
// // Isolated component — handles dead-blob fallback and first-frame seek
// // without causing the whole list to re-render.
// function VideoItem({ item, style }) {
//   // Pick the best src: prefer live url, fallback to remoteUrl.
//   const pickSrc = (it) => {
//     if (it.url && !isDeadBlob(it.url)) return it.url;
//     if (it.remoteUrl && !isDeadBlob(it.remoteUrl)) return it.remoteUrl;
//     return '';
//   };

//   const [src, setSrc] = useState(() => pickSrc(item));
//   const [dead, setDead] = useState(!pickSrc(item));

//   // If item gains a remoteUrl after mount (upload finished), update src.
//   useEffect(() => {
//     const newSrc = pickSrc(item);
//     if (newSrc && newSrc !== src) {
//       setSrc(newSrc);
//       setDead(false);
//     }
//   }, [item.url, item.remoteUrl]); // eslint-disable-line react-hooks/exhaustive-deps

//   if (dead || !src) {
//     return (
//       <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
//         <span className="material-icons" style={{ fontSize: 28, color: '#333' }}>videocam</span>
//       </div>
//     );
//   }

//   return (
//     <video
//       src={src}
//       style={style}
//       muted
//       playsInline
//       // preload="metadata" tells the browser to fetch just enough to decode
//       // duration + dimensions, then stop — no unnecessary data download.
//       preload="metadata"
//       onLoadedMetadata={(e) => {
//         const vid = e.currentTarget;
//         if (vid.duration > 0 && Number.isFinite(vid.duration)) {
//           // Seek to 10% so the thumbnail shows a real frame, not black frame 0.
//           vid.currentTime = Math.min(vid.duration * 0.1, 2);
//         }
//       }}
//       onMouseEnter={(e) => {
//         // Upgrade to 'auto' on hover so scrubbing is instant.
//         if (e.currentTarget.preload !== 'auto') e.currentTarget.preload = 'auto';
//       }}
//       onError={() => {
//         // If primary src fails, try remoteUrl.
//         const fallback = item.remoteUrl && !isDeadBlob(item.remoteUrl) ? item.remoteUrl : '';
//         if (fallback && fallback !== src) {
//           setSrc(fallback);
//         } else {
//           setDead(true);
//         }
//       }}
//     />
//   );
// }

// // ─── ImageItem ───────────────────────────────────────────────────────────────
// function ImageItem({ item, style }) {
//   const pickSrc = (it) => {
//     if (it.url && !isDeadBlob(it.url)) return it.url;
//     if (it.remoteUrl && !isDeadBlob(it.remoteUrl)) return it.remoteUrl;
//     return '';
//   };

//   const [src, setSrc] = useState(() => pickSrc(item));
//   const [dead, setDead] = useState(!pickSrc(item));

//   useEffect(() => {
//     const newSrc = pickSrc(item);
//     if (newSrc && newSrc !== src) { setSrc(newSrc); setDead(false); }
//   }, [item.url, item.remoteUrl]); // eslint-disable-line react-hooks/exhaustive-deps

//   if (dead || !src) {
//     return (
//       <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
//         <span className="material-icons" style={{ fontSize: 28, color: '#333' }}>image</span>
//       </div>
//     );
//   }

//   return (
//     <img
//       src={src}
//       alt={item.name}
//       style={style}
//       onError={() => {
//         const fallback = item.remoteUrl && !isDeadBlob(item.remoteUrl) ? item.remoteUrl : '';
//         if (fallback && fallback !== src) setSrc(fallback);
//         else setDead(true);
//       }}
//     />
//   );
// }

// // ─── UploadMedia ─────────────────────────────────────────────────────────────
// const UploadMedia = ({
//   onUpload,
//   mediaFiles = [],
//   handleMediaItemDrag,
//   handleDeleteMediaFile,
//   showToast,
// }) => {
//   const [isHovered, setIsHovered] = useState(false);
//   const [activeFilter, setActiveFilter] = useState('all');
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false); // ✅ Added dropdown state

//   const handleValidation = (incomingFiles) => {
//     const files = Array.from(incomingFiles);
//     const validFiles = [];
//     const invalidNames = [];
//     files.forEach(file => {
//       const parts = file.name.split('.');
//       const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
//       if (ext && VALID_EXTENSIONS.has(ext)) validFiles.push(file);
//       else invalidNames.push(file.name);
//     });
//     if (invalidNames.length > 0) {
//       const fullMsg = `Unsupported file(s): ${invalidNames.join(', ')}`;
//       if (showToast) showToast(fullMsg); else alert(fullMsg);
//     }
//     if (validFiles.length > 0) onUpload(validFiles);
//   };

//   const onInputChange = (e) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       const maxSize = 20 * 1024 * 1024 * 1024;
//       if (file.size > maxSize) {
//         alert('File too large! Please upload a file smaller than 20GB.');
//         e.target.value = ''; return;
//       }
//     }
//     if (e.target.files && e.target.files.length > 0) handleValidation(e.target.files);
//     e.target.value = '';
//   };

//   const onDropHandler = (e) => {
//     e.preventDefault(); e.stopPropagation();
//     setIsHovered(false);
//     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleValidation(e.dataTransfer.files);
//   };

//   const getDisplayType = (item) => {
//     if (!item) return 'unknown';
//     const name = item.name || '';
//     const ext = name.split('.').pop().toLowerCase();
//     const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus', 'mpga', 'weba'];
//     const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts', 'hevc'];
//     const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic'];
//     if (name.toLowerCase().endsWith('.srt') || item.type === 'caption') return 'caption';
//     if (AUDIO_EXTS.includes(ext)) return 'audio';
//     if (VIDEO_EXTS.includes(ext)) return 'video';
//     if (IMAGE_EXTS.includes(ext)) return 'image';
//     return item.type || 'unknown';
//   };

//   const safeMediaFiles = Array.isArray(mediaFiles) ? mediaFiles : [];
//   const filteredFiles = safeMediaFiles.filter(item => {
//     if (activeFilter === 'all') return true;
//     return getDisplayType(item) === activeFilter;
//   });

//   const mediaStyle = { height: '100%', width: '100%', objectFit: 'cover', display: 'block' };

//   return (
//     <div style={{ padding: 15, height: '100%', display: 'flex', flexDirection: 'column' }}>

//       {/* Upload area */}
//       <div
//         onClick={() => document.getElementById('fileInput').click()}
//         onDrop={onDropHandler}
//         onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
//         onDragLeave={() => setIsHovered(false)}
//         onMouseEnter={() => setIsHovered(true)}
//         onMouseLeave={() => setIsHovered(false)}
//         style={{
//           border: isHovered ? '1px dashed #D1FE17' : '1px dashed rgba(255,255,255,0.15)',
//           backgroundColor: isHovered ? 'rgba(209,254,23,0.03)' : 'rgba(255,255,255,0.02)',
//           borderRadius: 12, padding: '24px 20px',
//           display: 'flex', flexDirection: 'column',
//           alignItems: 'center', justifyContent: 'center',
//           cursor: 'pointer', marginBottom: 16,
//           transition: 'all 0.3s ease', gap: 8, flexShrink: 0,
//         }}
//       >
//         <div style={{
//           width: 40, height: 40, borderRadius: '50%',
//           background: isHovered ? 'rgba(209,254,23,0.1)' : 'rgba(255,255,255,0.05)',
//           display: 'flex', alignItems: 'center', justifyContent: 'center',
//           transition: 'all 0.3s ease',
//         }}>
//           <span className="material-icons" style={{ fontSize: 20, color: isHovered ? '#D1FE17' : '#666' }}>
//             cloud_upload
//           </span>
//         </div>
//         <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isHovered ? '#fff' : '#ccc' }}>
//           Click to Upload
//         </span>
//         <input
//           id="fileInput" type="file" multiple
//           accept="video/*,image/*,audio/*,.srt"
//           onChange={onInputChange} style={{ display: 'none' }}
//         />
//       </div>

//       {/* Filter Dropdown */}
//       <div style={{ position: 'relative', marginBottom: 12, zIndex: 100 }}>
//         <button
//           className="glass-dropdown-btn"
//           onClick={() => setIsDropdownOpen(!isDropdownOpen)}
//         >
//           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//             <span className="material-icons" style={{ fontSize: 18 }}>
//               {FILTERS.find(f => f.id === activeFilter)?.icon}
//             </span>
//             <span>{FILTERS.find(f => f.id === activeFilter)?.label || 'Filter'}</span>
//           </div>
//           <span className="material-icons" style={{ fontSize: 16, transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
//             expand_more
//           </span>
//         </button>

//         {isDropdownOpen && (
//           <div className="glass-dropdown-menu">
//             {FILTERS.map(f => (
//               <button
//                 key={f.id}
//                 className={`glass-dropdown-item ${activeFilter === f.id ? 'active' : ''}`}
//                 onClick={() => {
//                   setActiveFilter(f.id);
//                   setIsDropdownOpen(false);
//                 }}
//               >
//                 <span className="material-icons" style={{ fontSize: 16 }}>{f.icon}</span>
//                 {f.label}
//                 {activeFilter === f.id && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: 14 }}>check</span>}
//               </button>
//             ))}
//           </div>
//         )}

//         {isDropdownOpen && (
//           <div
//             style={{ position: 'fixed', inset: 0, zIndex: 99 }}
//             onClick={() => setIsDropdownOpen(false)}
//           />
//         )}
//       </div>

//       {/* Gallery */}
//       <div style={{
//         display: 'flex', flexWrap: 'wrap', gap: 12,
//         overflowY: 'auto', paddingRight: 4, paddingBottom: 20,
//         alignContent: 'flex-start', flex: 1,
//       }}>
//         {filteredFiles.length === 0 ? (
//           <div style={{ width: '100%', textAlign: 'center', color: '#444', fontSize: 13, padding: '40px 0', fontStyle: 'italic' }}>
//             {activeFilter === 'all' ? 'No uploads yet.' : `No ${activeFilter} files found.`}
//           </div>
//         ) : (
//           filteredFiles.map(item => {
//             const displayType = getDisplayType(item);
//             return (
//               <div
//                 key={item.id}
//                 draggable
//                 onDragStart={(e) => handleMediaItemDrag(e, item)}
//                 className="media-upload-item supercool-hover"
//                 style={{
//                   position: 'relative', background: '#1a1a1a',
//                   borderRadius: 12, overflow: 'hidden', cursor: 'grab',
//                   border: '1px solid rgba(255,255,255,0.05)',
//                   aspectRatio: '16/9',
//                   maxWidth: '100%', display: 'flex',
//                   alignItems: 'center', justifyContent: 'center',
//                   flexGrow: 1,
//                   boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
//                 }}
//               >
//                 {/* Delete button */}
//                 <div
//                   className="action-btn"
//                   onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMediaFile(item.id); }}
//                   style={{
//                     position: 'absolute', top: 6, right: 6,
//                     background: 'rgba(255, 59, 59, 0.9)', borderRadius: '50%',
//                     width: 22, height: 22, cursor: 'pointer', zIndex: 10,
//                     color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
//                     backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
//                   }}
//                 >
//                   <span className="material-icons" style={{ fontSize: 14 }}>close</span>
//                 </div>

//                 {/* Media content */}
//                 {displayType === 'video' && (
//                   <VideoItem item={item} style={mediaStyle} />
//                 )}

//                 {displayType === 'image' && (
//                   <ImageItem item={item} style={mediaStyle} />
//                 )}

//                 {(displayType === 'audio' || displayType === 'caption') && (
//                   <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #222, #1a1a1a)' }}>
//                     <span className="material-icons" style={{ fontSize: 32, color: displayType === 'audio' ? '#D1FE17' : '#fff', filter: 'drop-shadow(0 0 8px rgba(209,254,23,0.4))' }}>
//                       {displayType === 'audio' ? 'audiotrack' : 'subtitles'}
//                     </span>
//                   </div>
//                 )}

//                 {/* Hover name overlay */}
//                 <div className="hover-overlay" style={{
//                   position: 'absolute', bottom: 0, left: 0, right: 0,
//                   padding: '24px 8px 8px', pointerEvents: 'none', width: '100%'
//                 }}>
//                   <span style={{
//                     display: 'block', fontSize: 11, color: '#fff',
//                     whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
//                     textAlign: 'center', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)'
//                   }}>
//                     {item.name}
//                   </span>
//                 </div>
//               </div>
//             );
//           })
//         )}
//       </div>
//     </div>
//   );
// };

// export default UploadMedia;






import React, { useState, useEffect } from 'react';

// ✅ STRICT LIST OF ALLOWED EXTENSIONS
const VALID_EXTENSIONS = new Set([
  // Video
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts', 'hevc',
  // Image
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic',
  // Audio
  'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus', 'mpga', 'weba',
  // Text
  'srt',
]);

// ✅ FILTER DEFINITIONS
const FILTERS = [
  { id: 'all', label: 'All', icon: 'dashboard' },
  { id: 'video', label: 'Video', icon: 'movie' },
  { id: 'image', label: 'Image', icon: 'image' },
  { id: 'audio', label: 'Audio', icon: 'audiotrack' },
];

// ─── Dead-blob detection ────────────────────────────────────────────────────
const sessionBlobs = new Set();

function isDeadBlob(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('blob:')) return false;
  return !sessionBlobs.has(url);
}

export function registerBlobUrl(url) {
  if (url && url.startsWith('blob:')) sessionBlobs.add(url);
}

// ─── VideoItem ──────────────────────────────────────────────────────────────
function VideoItem({ item, style }) {
  const pickSrc = (it) => {
    if (it.url && !isDeadBlob(it.url)) return it.url;
    if (it.remoteUrl && !isDeadBlob(it.remoteUrl)) return it.remoteUrl;
    return '';
  };

  const [src, setSrc] = useState(() => pickSrc(item));
  const [dead, setDead] = useState(!pickSrc(item));

  useEffect(() => {
    const newSrc = pickSrc(item);
    if (newSrc && newSrc !== src) {
      setSrc(newSrc);
      setDead(false);
    }
  }, [item.url, item.remoteUrl]);

  if (dead || !src) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
        <span className="material-icons" style={{ fontSize: 28, color: '#333' }}>videocam</span>
      </div>
    );
  }

  return (
    <video
      src={src}
      style={style}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        const vid = e.currentTarget;
        if (vid.duration > 0 && Number.isFinite(vid.duration)) {
          vid.currentTime = Math.min(vid.duration * 0.1, 2);
        }
      }}
      onMouseEnter={(e) => {
        if (e.currentTarget.preload !== 'auto') e.currentTarget.preload = 'auto';
      }}
      onError={() => {
        const fallback = item.remoteUrl && !isDeadBlob(item.remoteUrl) ? item.remoteUrl : '';
        if (fallback && fallback !== src) {
          setSrc(fallback);
        } else {
          setDead(true);
        }
      }}
    />
  );
}

// ─── ImageItem ───────────────────────────────────────────────────────────────
function ImageItem({ item, style }) {
  const pickSrc = (it) => {
    if (it.url && !isDeadBlob(it.url)) return it.url;
    if (it.remoteUrl && !isDeadBlob(it.remoteUrl)) return it.remoteUrl;
    return '';
  };

  const [src, setSrc] = useState(() => pickSrc(item));
  const [dead, setDead] = useState(!pickSrc(item));

  useEffect(() => {
    const newSrc = pickSrc(item);
    if (newSrc && newSrc !== src) { setSrc(newSrc); setDead(false); }
  }, [item.url, item.remoteUrl]);

  if (dead || !src) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a' }}>
        <span className="material-icons" style={{ fontSize: 28, color: '#333' }}>image</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={item.name}
      style={style}
      onError={() => {
        const fallback = item.remoteUrl && !isDeadBlob(item.remoteUrl) ? item.remoteUrl : '';
        if (fallback && fallback !== src) setSrc(fallback);
        else setDead(true);
      }}
    />
  );
}

// // ─── UploadMedia ─────────────────────────────────────────────────────────────
// const UploadMedia = ({
//   onUpload,
//   mediaFiles = [],
//   handleMediaItemDrag,
//   handleDeleteMediaFile,
//   showToast,
// }) => {
//   const [isHovered, setIsHovered] = useState(false);
//   const [activeFilter, setActiveFilter] = useState('all');
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);




const UploadMedia = ({
  onUpload,
  mediaFiles = [],
  handleMediaItemDrag,
  handleDeleteMediaFile,
  showToast,
  onRename, // <--- 1. Add this prop
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // --- 2. Add State for Renaming ---
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const startEditing = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(item.id);
    setEditName(item.name);
  };

  const cancelEditing = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setEditingId(null);
    setEditName('');
  };

  const saveEditing = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (editName.trim() && onRename) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEditing(e);
    if (e.key === 'Escape') cancelEditing(e);
    e.stopPropagation(); // Prevent triggering other app shortcuts
  };

  const handleValidation = (incomingFiles) => {
    const files = Array.from(incomingFiles);
    const validFiles = [];
    const invalidNames = [];
    files.forEach(file => {
      const parts = file.name.split('.');
      const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
      if (ext && VALID_EXTENSIONS.has(ext)) validFiles.push(file);
      else invalidNames.push(file.name);
    });
    if (invalidNames.length > 0) {
      const fullMsg = `Unsupported file(s): ${invalidNames.join(', ')}`;
      if (showToast) showToast(fullMsg); else alert(fullMsg);
    }
    if (validFiles.length > 0) onUpload(validFiles);
  };

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 20 * 1024 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File too large! Please upload a file smaller than 20GB.');
        e.target.value = ''; return;
      }
    }
    if (e.target.files && e.target.files.length > 0) handleValidation(e.target.files);
    e.target.value = '';
  };

  const onDropHandler = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsHovered(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleValidation(e.dataTransfer.files);
  };

  const getDisplayType = (item) => {
    if (!item) return 'unknown';
    const name = item.name || '';
    const ext = name.split('.').pop().toLowerCase();
    const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus', 'mpga', 'weba'];
    const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ts', 'hevc'];
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'heic'];
    if (name.toLowerCase().endsWith('.srt') || item.type === 'caption') return 'caption';
    if (AUDIO_EXTS.includes(ext)) return 'audio';
    if (VIDEO_EXTS.includes(ext)) return 'video';
    if (IMAGE_EXTS.includes(ext)) return 'image';
    return item.type || 'unknown';
  };

  const safeMediaFiles = Array.isArray(mediaFiles) ? mediaFiles : [];
  const filteredFiles = safeMediaFiles.filter(item => {
    if (activeFilter === 'all') return true;
    return getDisplayType(item) === activeFilter;
  });

  const mediaStyle = { height: '100%', width: '100%', objectFit: 'cover', display: 'block' };

  return (
    <div style={{ padding: 15, height: '100%', display: 'flex', flexDirection: 'column' }}>



      {/* ✅ CONDITIONAL FILTER DROPDOWN: Shows "Media" label if no files, else shows Dropdown */}
      {mediaFiles && mediaFiles.length > 0 ? (
        <div style={{ position: 'relative', marginBottom: 12, zIndex: 100 }}>
          <button
            className="glass-dropdown-btn"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ fontSize: 18 }}>
                {FILTERS.find(f => f.id === activeFilter)?.icon}
              </span>
              <span>{FILTERS.find(f => f.id === activeFilter)?.label || 'Filter'}</span>
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
                  className={`glass-dropdown-item ${activeFilter === f.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFilter(f.id);
                    setIsDropdownOpen(false);
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>{f.icon}</span>
                  {f.label}
                  {activeFilter === f.id && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: 14 }}>check</span>}
                </button>
              ))}
            </div>
          )}

          {isDropdownOpen && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setIsDropdownOpen(false)}
            />
          )}
        </div>
      ) : (
        /* 🛑 Static Label when empty */
        <div style={{
          marginBottom: 12,
          padding: '8px 4px',
          fontSize: 13,
          fontWeight: 600,
          color: '#aaa',
          letterSpacing: '0.5px'
        }}>

        </div>
      )}


      {/* Upload area */}
      <div
        onClick={() => document.getElementById('fileInput').click()}
        onDrop={onDropHandler}
        onDragOver={(e) => { e.preventDefault(); setIsHovered(true); }}
        onDragLeave={() => setIsHovered(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          border: isHovered ? '1px dashed #D1FE17' : '1px dashed rgba(255,255,255,0.15)',
          backgroundColor: isHovered ? 'rgba(209,254,23,0.03)' : 'rgba(255,255,255,0.02)',
          borderRadius: 12, padding: '24px 20px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginBottom: 16,
          transition: 'all 0.3s ease', gap: 8, flexShrink: 0,
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: isHovered ? 'rgba(209,254,23,0.1)' : 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
        }}>
          <span className="material-icons" style={{ fontSize: 20, color: isHovered ? '#D1FE17' : '#666' }}>
            cloud_upload
          </span>
        </div>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isHovered ? '#fff' : '#ccc' }}>
          Click to Upload
        </span>
        <input
          id="fileInput" type="file" multiple
          accept="video/*,image/*,audio/*,.srt"
          onChange={onInputChange} style={{ display: 'none' }}
        />
      </div>











      {/* Gallery */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, overflowY: 'auto', paddingRight: 4, paddingBottom: 20, alignContent: 'flex-start', flex: 1 }}>
        {filteredFiles.map(item => {
          const displayType = getDisplayType(item);
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              draggable={!isEditing}
              onDragStart={(e) => !isEditing && handleMediaItemDrag(e, item)}
              onClick={(e) => {
                if (!isEditing && onItemClick) onItemClick(item);
              }}
              className="media-upload-item"
              style={{
                position: 'relative', background: '#1a1a1a',
                borderRadius: 12, overflow: 'hidden',
                cursor: isEditing ? 'default' : 'grab',
                border: isEditing ? '1px solid #D1FE17' : '1px solid rgba(255,255,255,0.05)',
                aspectRatio: '16/9',
                maxWidth: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexGrow: 1,
                boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
              }}
            >
              {/* --- ACTION BUTTONS (Edit & Delete) --- */}
              {!isEditing && (
                <>
                  {/* EDIT BUTTON (Left of delete) */}
                  <div
                    onClick={(e) => startEditing(e, item)}
                    title="Rename"
                    style={{
                      position: 'absolute', top: 6, right: 34, /* 22px(btn) + 6px(gap) + 6px(margin) */
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '50%',
                      width: 22, height: 22,
                      cursor: 'pointer', zIndex: 10,
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(4px)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#D1FE17'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                    {/* Change text color on hover via css or just keep standard */}
                    <span className="material-icons" style={{ fontSize: 13, color: 'inherit', pointerEvents: 'none' }}>edit</span>
                  </div>

                  {/* DELETE BUTTON */}
                  <div
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMediaFile(item.id); }}
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(255, 59, 59, 0.9)', borderRadius: '50%',
                      width: 22, height: 22, cursor: 'pointer', zIndex: 10,
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 14 }}>close</span>
                  </div>
                </>
              )}

              {/* --- MEDIA PREVIEW --- */}
              {displayType === 'video' ? (
                <video src={item.url} style={{ height: '100%', width: '100%', objectFit: 'cover' }} muted />
              ) : displayType === 'image' ? (
                <img src={item.url} alt={item.name} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                  <span className="material-icons" style={{ fontSize: 32, color: displayType === 'audio' ? '#D1FE17' : '#fff' }}>
                    {displayType === 'audio' ? 'audiotrack' : 'subtitles'}
                  </span>
                </div>
              )}

              {/* --- HOVER / EDIT OVERLAY --- */}
              {/* We use inline logic to switch between the 'Hover Name' and 'Edit Input' */}
              <div
                className="hover-overlay"
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  width: '100%',
                  // If editing, solid background, padding for inputs. If not, gradient for text.
                  background: isEditing ? 'rgba(0,0,0,0.9)' : 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                  padding: isEditing ? '8px' : '24px 8px 8px',
                  // If editing, force visible. If not, use class hover effect (handled in CSS usually, but we set opacity here for safety)
                  opacity: isEditing ? 1 : undefined,
                  transform: isEditing ? 'none' : undefined,
                  zIndex: 20
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                    {/* INPUT FIELD */}
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') saveEditing(e); if (e.key === 'Escape') cancelEditing(e); }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      autoFocus
                      style={{
                        flex: 1,
                        background: '#333',
                        border: '1px solid #555',
                        color: '#fff',
                        fontSize: '11px',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        outline: 'none',
                        minWidth: 0
                      }}
                    />

                    {/* SAVE BUTTON */}
                    <button onClick={saveEditing} style={{
                      background: 'rgba(209, 254, 23, 0.2)', border: '1px solid #D1FE17', borderRadius: '4px',
                      width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#D1FE17', padding: 0
                    }}>
                      <span className="material-icons" style={{ fontSize: 14 }}>check</span>
                    </button>

                    {/* CANCEL BUTTON */}
                    <button onClick={cancelEditing} style={{
                      background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '4px',
                      width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: '#aaa', padding: 0
                    }}>
                      <span className="material-icons" style={{ fontSize: 14 }}>close</span>
                    </button>
                  </div>
                ) : (
                  <span style={{
                    display: 'block', fontSize: 11, color: '#fff',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    textAlign: 'center', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                  }}>
                    {item.name}
                  </span>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UploadMedia;