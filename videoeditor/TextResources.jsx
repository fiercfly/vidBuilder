


import React, { useEffect } from 'react';

// --- CONFIGURATION: Text Styles ---
const TEXT_PRESETS = [
  // --- BASICS ---
  {
    id: 'basic_heading',
    label: 'Heading',
    style: {
      fontFamily: 'Roboto', fontWeight: '700', fontSize: 60, color: '#ffffff',
      textShadow: '0px 2px 4px rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'basic_sub',
    label: 'Subtext',
    style: {
      fontFamily: 'Open Sans', fontWeight: '400', fontSize: 35, color: '#e0e0e0'
    }
  },

  {
    id: 'basic',
    label: 'Basic',
    style: {
      fontFamily: 'Roboto', fontWeight: '700', fontSize: 60, color: '#ffffff',
      textShadow: '0px 2px 4px rgba(0,0,0,0.5)' // Standard Drop Shadow
    }
  },
  {
    id: 'neon',
    label: 'NEON',
    style: {
      fontFamily: 'Orbitron', fontWeight: '700', fontSize: 60, color: '#00ffff',
      // ✅ CHANGED: Single strong shadow for 1:1 mapping with Konva
      textShadow: '0px 0px 25px #00ffff'
    }
  },
  {
    id: 'impact',
    label: 'IMPACT',
    style: {
      fontFamily: 'Anton', fontWeight: '400', fontSize: 70, color: '#ffffff',
      textTransform: 'uppercase', letterSpacing: '2px',
      // ✅ Mapped to "Outline" section in properties
      WebkitTextStroke: '2px #000000'
    }
  },
  {
    id: 'cinematic',
    label: 'CINEMATIC',
    style: {
      fontFamily: 'Cinzel', fontWeight: '700', fontSize: 55, color: '#f0f0f0',
      letterSpacing: '8px', textTransform: 'uppercase',
      textShadow: '0px 5px 15px rgba(0,0,0,0.9)'
    }
  },
  {
    id: 'handwritten',
    label: 'Scribble',
    style: {
      fontFamily: 'Permanent Marker', fontWeight: '400', fontSize: 55, color: '#ff4d4d',
      transform: 'rotate(-3deg)',
      textShadow: '2px 2px 0px #000000' // Hard shadow
    }
  },
  {
    id: 'vlog',
    label: 'VLOG TITLE',
    style: {
      fontFamily: 'Montserrat', fontWeight: '900', fontSize: 65, color: '#FFD700',
      fontStyle: 'italic',
      textShadow: '4px 4px 0px #000000' // Hard shadow
    }
  },
  {
    id: 'retro',
    label: 'Retro',
    style: {
      fontFamily: 'Pacifico', fontWeight: '400', fontSize: 60, color: '#ff66b2',
      textShadow: '3px 3px 0px #ffffff'
    }
  },
  {
    id: 'comic',
    label: 'COMIC',
    style: {
      fontFamily: 'Bangers', fontWeight: '400', fontSize: 70, color: '#ff9900',
      letterSpacing: '2px',
      WebkitTextStroke: '2px #000000',
      textShadow: '4px 4px 0px #000000'
    }
  },

  // --- SOCIAL MEDIA / CAPTIONS ---
  {
    id: 'hormozi',
    label: 'VIRAL CAPTION',
    style: {
      fontFamily: 'Montserrat', fontWeight: '900', fontSize: 55, color: '#F1F1F1',
      textTransform: 'uppercase', 
      WebkitTextStroke: '2px #000000',
      textShadow: '3px 3px 0px #000000', // Hard drop shadow
      textAlign: 'center'
    }
  },
  {
    id: 'highlight_yellow',
    label: 'Highlight',
    style: {
      fontFamily: 'The Girl Next Door', fontWeight: '700', fontSize: 50, color: '#000000',
      backgroundColor: '#FFD700', // Bright Yellow Box
      padding: 10, borderRadius: 4,
      backgroundOpacity: 1
    }
  },
  {
    id: 'tiktok_bg',
    label: 'TIKTOK',
    style: {
      fontFamily: 'Proxima Nova', fontWeight: '700', fontSize: 45, color: '#ffffff',
      backgroundColor: '#ff0050', // TikTok Red
      padding: 8, borderRadius: 6,
      backgroundOpacity: 0.9
    }
  },

  // --- CINEMATIC & LUXURY ---
  {
    id: 'cinematic_fade',
    label: 'CINEMATIC',
    style: {
      fontFamily: 'Cinzel', fontWeight: '700', fontSize: 55, color: '#e6e6e6',
      letterSpacing: '8', textTransform: 'uppercase',
      textShadow: '0px 10px 20px rgba(0,0,0,0.8)' // Soft cinematic shadow
    }
  },
  {
    id: 'luxury_serif',
    label: 'VOGUE',
    style: {
      fontFamily: 'Playfair Display', fontWeight: '700', fontSize: 60, color: '#ffffff',
      fontStyle: 'italic',
      letterSpacing: '1',
      textShadow: '0px 4px 10px rgba(0,0,0,0.4)'
    }
  },
  {
    id: 'noir',
    label: 'NOIR FILM',
    style: {
      fontFamily: 'Abril Fatface', fontWeight: '400', fontSize: 65, color: '#f0f0f0',
      textShadow: '0px 0px 15px rgba(255,255,255,0.4)' // Glowy white
    }
  },

  // --- GAMING & TECH ---
  {
    id: 'cyberpunk',
    label: 'CYBER',
    style: {
      fontFamily: 'Orbitron', fontWeight: '900', fontSize: 60, color: '#fcee0a', // Cyber Yellow
      textShadow: '2px 2px 0px #000000',
      WebkitTextStroke: '1px #05d9e8', // Cyan Stroke
      letterSpacing: '2'
    }
  },
  {
    id: 'arcade',
    label: 'PLAYER 1',
    style: {
      fontFamily: 'Press Start 2P', fontWeight: '400', fontSize: 35, color: '#39ff14', // Neon Green
      textShadow: '2px 2px 0px #000000',
      lineHeight: 1.5
    }
  },
  {
    id: 'esports',
    label: 'ESPORTS',
    style: {
      fontFamily: 'Russo One', fontWeight: '400', fontSize: 65, color: '#ffffff',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      WebkitTextStroke: '2px #ff4655', // Valorant Red
      textShadow: '4px 4px 0px #000000'
    }
  },

  // --- FUN & CREATIVE ---
  {
    id: 'meme',
    label: 'MEME TEXT',
    style: {
      fontFamily: 'Anton', fontWeight: '400', fontSize: 65, color: '#ffffff',
      textTransform: 'uppercase',
      WebkitTextStroke: '2.5px #000000',
      textShadow: '2px 2px 0px #000000'
    }
  },
  {
    id: 'comics',
    label: 'KABOOM!',
    style: {
      fontFamily: 'Bangers', fontWeight: '400', fontSize: 75, color: '#FFD700',
      letterSpacing: '2',
      WebkitTextStroke: '2px #000000',
      textShadow: '5px 5px 0px #000000'
    }
  },
  {
    id: 'neon_pink',
    label: 'NIGHTCLUB',
    style: {
      fontFamily: 'Pacifico', fontWeight: '400', fontSize: 60, color: '#ff00ff',
      // Optimized for Konva: Single strong glow instead of multiple comma-separated ones
      textShadow: '0px 0px 25px #ff00ff' 
    }
  },
  {
    id: 'horror',
    label: 'THRILLER',
    style: {
      fontFamily: 'Creepster', fontWeight: '400', fontSize: 65, color: '#8a0303',
      textShadow: '1px 1px 1px #000000',
      letterSpacing: '3'
    }
  },
  {
    id: 'retro_80s',
    label: 'RETRO 80s',
    style: {
      fontFamily: 'Righteous', fontWeight: '400', fontSize: 60, color: '#ff0055',
      textShadow: '3px 3px 0px #00f2ff' // Cyan shadow offset
    }
  },
  {
    id: 'typewriter',
    label: 'Secret Files',
    style: {
      fontFamily: 'Special Elite', fontWeight: '400', fontSize: 45, color: '#ffffff',
      backgroundColor: '#000000',
      padding: 5,
      backgroundOpacity: 0.7
    }
  }

];

const TextResources = ({ onDragStart }) => {

  // --- PRELOAD FONTS ---
  useEffect(() => {
    const fontsToLoad = [
      'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Oswald', 'Raleway',
      // Creative
      'Anton', 'Bangers', 'Cinzel', 'Dancing Script', 'Orbitron', 'Pacifico', 'Permanent Marker',
      'Press Start 2P', 'Creepster', 'Special Elite', 'Righteous', 'Russo One', 
      'Abril Fatface', 'Playfair Display', 'The Girl Next Door'
    ];

    const fontQuery = fontsToLoad.join('&family=').replace(/\s+/g, '+');
    const linkId = 've-sidebar-fonts';

    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontQuery}&display=swap`;
      document.head.appendChild(link);
    }
  }, []);

  const handleDrag = (e, preset) => {
    const textData = {
      type: 'text',
      text: preset.label || "Add Text",
      style: {
        // Defaults
        color: '#ffffff',
        fontFamily: 'Roboto',
        fontSize: 50,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        WebkitTextStroke: '0px',
        backgroundColor: 'transparent',
        textAlign: 'center',
        padding: 0,
        // Merge preset specific styles
        ...preset.style
      }
    };

    e.dataTransfer.setData("application/json", JSON.stringify(textData));
    e.dataTransfer.effectAllowed = "copy";
    if (onDragStart) onDragStart(e, textData);
  };

  return (
    <div className="text-panel" style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '16px', marginTop: 0 }}>
        Drag to Timeline
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {TEXT_PRESETS.map((preset) => (
          <div
            key={preset.id}
            draggable
            className="supercool-hover"
            onDragStart={(e) => handleDrag(e, preset)}
            style={{
              padding: '12px',
              background: '#2a2a2a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              cursor: 'grab',
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '80px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* The Text Preview */}
            <span style={{
              ...preset.style,
              fontSize: Math.min(20, preset.style.fontSize * 0.4), 
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}>
              {preset.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: 40 }}></div>
    </div>
  );
};

export default TextResources;