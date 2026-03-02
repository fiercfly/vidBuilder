

// import React, { useState, useMemo, useEffect, useRef } from 'react';
// import Lottie from "lottie-react"; // REQUIREMENT: npm install lottie-react
// // Ensure this path matches your file structure
// import elementsData from '../../data/elements.json';

// // --- HELPER COMPONENT FOR JSON ANIMATIONS ---
// // This fetches the JSON file from the URL and plays it on hover
// const LottiePlayer = ({ url }) => {
//   const [animationData, setAnimationData] = useState(null);
//   const lottieRef = useRef();

//   useEffect(() => {
//     // Fetch the raw JSON data from the public assets folder
//     fetch(url)
//       .then(res => {
//         if (!res.ok) throw new Error("Failed to fetch Lottie JSON");
//         return res.json();
//       })
//       .then(data => setAnimationData(data))
//       .catch(err => console.warn("Lottie Load Error:", err));
//   }, [url]);

//   if (!animationData) {
//     // Simple placeholder while loading JSON
//     return <div style={{ color: '#555', fontSize: '10px' }}>Loading...</div>;
//   }

//   return (
//     <div
//       style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
//       // Play on enter, stop (reset to frame 0) on leave
//       onMouseEnter={() => lottieRef.current?.play()}
//       onMouseLeave={() => lottieRef.current?.stop()}
//     >
//       <Lottie
//         lottieRef={lottieRef}
//         animationData={animationData}
//         loop={true}
//         autoplay={false} // Start paused so it only plays on hover
//         style={{ width: '85%', height: '85%' }} // Slightly smaller so it doesn't touch edges
//       />
//     </div>
//   );
// };


// // --- MAIN COMPONENT ---
// const ElementsPanel = ({ onDragStart }) => {
//   const BASE_PATH = "/assets/elements/";
//   const [activeCategory, setActiveCategory] = useState("All");
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false); // ✅ Added dropdown state

//   // 1. Organize data by category
//   const groupedData = useMemo(() => {
//     const groups = {};
//     const safeData = Array.isArray(elementsData) ? elementsData : [];

//     safeData.forEach(item => {
//       const cat = item.category || 'Uncategorized';
//       if (!groups[cat]) groups[cat] = [];
//       groups[cat].push(item);
//     });
//     return groups;
//   }, []);

//   const categories = ["All", ...Object.keys(groupedData).sort()];

//   return (
//     <div style={{
//       height: '100%',
//       display: 'flex',
//       flexDirection: 'column',
//       background: '#1a1a1a',
//       color: '#fff',
//       overflow: 'hidden'
//     }}>

//       {/* Filter Dropdown */}
//       <div style={{ position: 'relative', marginBottom: 12, padding: '12px 12px 0', zIndex: 100 }}>
//         <button
//           className="glass-dropdown-btn"
//           onClick={() => setIsDropdownOpen(!isDropdownOpen)}
//         >
//           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//             <span>{activeCategory || 'Category'}</span>
//           </div>
//           <span className="material-icons" style={{ fontSize: 16, transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
//             expand_more
//           </span>
//         </button>

//         {isDropdownOpen && (
//           <div className="glass-dropdown-menu">
//             {categories.map(cat => (
//               <button
//                 key={cat}
//                 className={`glass-dropdown-item ${activeCategory === cat ? 'active' : ''}`}
//                 onClick={() => {
//                   setActiveCategory(cat);
//                   setIsDropdownOpen(false);
//                 }}
//               >
//                 {cat}
//                 {activeCategory === cat && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: 14 }}>check</span>}
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

//       {/* Main Content Area */}
//       <div style={{
//         flex: 1,
//         overflowY: 'auto',
//         padding: '0 12px 20px 12px'
//       }}>

//         {Object.entries(groupedData).map(([category, items]) => {
//           if (activeCategory !== "All" && activeCategory !== category) return null;
//           if (items.length === 0) return null;

//           return (
//             <div key={category} style={{ marginTop: 24 }}>

//               {/* SECTION HEADER */}
//               <div style={{
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 alignItems: 'center',
//                 marginBottom: '12px',
//                 paddingLeft: 4
//               }}>
//                 <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#eee', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
//                   {category}
//                 </h3>
//               </div>

//               {/* GRID LAYOUT */}
//               <div style={{
//                 display: 'grid',
//                 gridTemplateColumns: 'repeat(2, 1fr)',
//                 gap: '12px'
//               }}>
//                 {items.map((item) => {
//                   // --- PATH & TYPE LOGIC ---
//                   const isFullUrl = item.fileName.startsWith('http') || item.fileName.startsWith('/');
//                   const fullUrl = isFullUrl ? item.fileName : `${BASE_PATH}${item.fileName}`;

//                   // Detect types based on extension or explicit type property
//                   const isLottieJson = item.type === 'lottie' || item.fileName.endsWith('.json');
//                   const isVideo = !isLottieJson && (item.type === 'video' || /\.(mp4|webm|mov)$/i.test(item.fileName));

//                   // Determine drag type for the editor drop handler
//                   let dragType = 'image';
//                   if (isVideo) dragType = 'video';
//                   if (isLottieJson) dragType = 'lottie';

//                   return (
//                     <div
//                       key={item.id}
//                       draggable
//                       className="premium-3d-card"
//                       onDragStart={(e) =>
//                         onDragStart(e, {
//                           ...item,
//                           type: dragType,
//                           url: fullUrl,
//                           naturalWidth: undefined,
//                           naturalHeight: undefined
//                         })
//                       }
//                       style={{
//                         position: 'relative',
//                         aspectRatio: '1',
//                         background: '#222',
//                         borderRadius: '12px',
//                         cursor: 'grab',
//                         display: 'flex',
//                         flexDirection: 'column',
//                         alignItems: 'center',
//                         justifyContent: 'center',
//                         border: '1px solid rgba(255,255,255,0.05)',
//                         // Overflow must be visible for 3D pop-out effects to not be clipped
//                         // but we need borderRadius clipping for the base card. 
//                         // Trick: use a separate background layer if strict clipping is needed, 
//                         // or just accept that the image might pop "through" the border radius slightly.
//                         // For this cool effect, let's keep it simple.
//                       }}
//                     >
//                       <div className="inner-content" style={{
//                         flex: 1, width: '100%', display: 'flex',
//                         alignItems: 'center', justifyContent: 'center', padding: 8,
//                         pointerEvents: 'none' // Let clicks pass through to container
//                       }}>
//                         {isLottieJson ? (
//                           <LottiePlayer url={fullUrl} />
//                         ) : isVideo ? (
//                           <video
//                             src={fullUrl}
//                             muted loop playsInline
//                             onMouseOver={event => event.target.play()}
//                             onMouseOut={event => event.target.pause()}
//                             style={{
//                               width: '100%', height: '100%',
//                               objectFit: 'cover', borderRadius: 4
//                             }}
//                           />
//                         ) : (
//                           <img
//                             src={fullUrl}
//                             alt={item.name}
//                             loading="lazy"
//                             style={{
//                               width: '90%', height: '90%',
//                               objectFit: 'contain',
//                               filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
//                             }}
//                             onError={(e) => e.target.style.display = 'none'}
//                           />
//                         )}
//                       </div>

//                       <div className="hover-overlay" style={{
//                         position: 'absolute', bottom: 0, left: 0, right: 0,
//                         padding: '12px 8px 6px', pointerEvents: 'none', width: '100%',
//                         transform: 'translateZ(10px)', // Text also pops slightly
//                         borderRadius: '0 0 12px 12px'
//                       }}>
//                         <span style={{
//                           display: 'block', fontSize: 10, color: '#fff',
//                           whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
//                           textAlign: 'center', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.8)'
//                         }}>
//                           {item.name}
//                         </span>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           );
//         })}
//         <div style={{ height: '40px' }} />
//       </div>
//     </div>
//   );
// };

// export default ElementsPanel;



import React, { useState, useMemo, useEffect, useRef } from 'react';
import Lottie from "lottie-react";
import elementsData from './standalone/elements.json';

// --- HELPER: LOTTIE PLAYER ---
const LottiePlayer = ({ url }) => {
  const [animationData, setAnimationData] = useState(null);
  const lottieRef = useRef();

  useEffect(() => {
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch Lottie JSON");
        return res.json();
      })
      .then(data => setAnimationData(data))
      .catch(err => console.warn("Lottie Load Error:", err));
  }, [url]);

  if (!animationData) return <div style={{ color: '#555', fontSize: '10px' }}>...</div>;

  return (
    <div
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => lottieRef.current?.stop()}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={true}
        autoplay={false}
        style={{ width: '85%', height: '85%' }}
      />
    </div>
  );
};

// --- MAIN COMPONENT ---
const ElementsPanel = ({ onDragStart, onItemClick }) => {
  const BASE_PATH = "/assets/elements/";
  const [activeCategory, setActiveCategory] = useState("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Organize Data
  const groupedData = useMemo(() => {
    const groups = {};
    const safeData = Array.isArray(elementsData) ? elementsData : [];
    safeData.forEach(item => {
      const cat = item.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, []);

  const categories = ["All", ...Object.keys(groupedData).sort()];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1a1a', color: '#fff', overflow: 'hidden' }}>

      {/* --- FILTER BAR --- */}
      <div style={{ position: 'relative', padding: '12px 12px 0', zIndex: 100 }} ref={dropdownRef}>
        <button
          className="glass-dropdown-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{ width: '100%' }}
        >
          <span>{activeCategory}</span>
          <span className="material-icons" style={{ fontSize: 16, transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
            expand_more
          </span>
        </button>

        {isDropdownOpen && (
          <div className="glass-dropdown-menu" style={{ width: 'calc(100% - 24px)', left: '12px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`glass-dropdown-item ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat);
                  setIsDropdownOpen(false);
                }}
              >
                {cat}
                {activeCategory === cat && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: 14 }}>check</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- GRID CONTENT --- */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {Object.entries(groupedData).map(([category, items]) => {
          if (activeCategory !== "All" && activeCategory !== category) return null;
          if (items.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: 4 }}>
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#eee', textTransform: 'uppercase' }}>
                  {category}
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {items.map((item) => {
                  const isExternal = item.fileName.startsWith('http') || item.fileName.startsWith('/') || item.fileName.startsWith('data:');
                  const fullUrl = isExternal ? item.fileName : `${BASE_PATH}${item.fileName}`;

                  const isLottie = item.type === 'lottie' || item.fileName.endsWith('.json');
                  const isVideo = !isLottie && (item.type === 'video' || item.fileName.match(/\.(mp4|webm|mov)$/i));

                  let dragType = 'image';
                  if (isVideo) dragType = 'video';
                  if (isLottie) dragType = 'lottie';

                  return (
                    <div
                      key={item.id}
                      draggable
                      className="premium-3d-card"
                      onClick={() => onItemClick && onItemClick(item)}
                      onDragStart={(e) => {
                        // 1. Try to get REAL dimensions if the video loaded
                        const videoEl = e.currentTarget.querySelector('video');
                        const realW = videoEl ? parseFloat(videoEl.dataset.width) : 0;
                        const realH = videoEl ? parseFloat(videoEl.dataset.height) : 0;

                        // 2. Default to 1080x1080 (Square) for stickers if unknown, NOT 1920x1080
                        const fallbackW = 1080;
                        const fallbackH = 1080;

                        onDragStart(e, {
                          ...item,
                          type: dragType,
                          url: fullUrl,
                          initialScale: 0.3,
                          naturalWidth: realW || fallbackW,
                          naturalHeight: realH || fallbackH
                        });
                      }}
                      style={{
                        aspectRatio: '1',
                        background: '#222', // Consider 'transparent' if stickers have their own dark outlines
                        borderRadius: '12px',
                        cursor: 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255,255,255,0.05)',
                        overflow: 'hidden'
                      }}
                    >
                      <div className="inner-content" style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isLottie ? (
                          <LottiePlayer url={fullUrl} />
                        ) : isVideo ? (
                          <video
                            src={fullUrl}
                            muted loop playsInline
                            // FIX 1: Load "auto" so the sticker is visible immediately
                            preload="auto"
                            // FIX 2: "contain" prevents cropping the sticker shape
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            // FIX 3: Capture dimensions on load for the Drag event
                            onLoadedMetadata={(e) => {
                              e.target.dataset.width = e.target.videoWidth;
                              e.target.dataset.height = e.target.videoHeight;
                            }}
                            onMouseEnter={e => e.target.play()}
                            onMouseLeave={e => e.target.pause()}
                          />
                        ) : (
                          <img
                            src={fullUrl}
                            alt={item.name}
                            loading="lazy"
                            style={{ width: '90%', height: '90%', objectFit: 'contain' }}
                          />
                        )}
                      </div>

                      <div className="hover-overlay" style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '4px', background: 'rgba(0,0,0,0.6)', textAlign: 'center'
                      }}>
                        <span style={{ fontSize: 9, color: '#fff' }}>{item.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{ height: '40px' }} />
      </div>
    </div>
  );
};

export default ElementsPanel;