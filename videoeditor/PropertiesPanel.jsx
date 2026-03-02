




import React, { useState, useEffect, useRef } from 'react';
import './PropertiesPanel.css';
import ReactDOM from 'react-dom'; // <--- ADD THIS

// --- CONSTANTS ---
const MASK_SHAPES = [
  { id: 'none', name: 'None', icon: 'crop_free' },
  { id: 'circle', name: 'Circle', icon: 'radio_button_unchecked' },
  { id: 'oval', name: 'Oval', icon: 'panorama_fish_eye' },
];

const ANIMATION_TYPES = [
  { id: 'none', label: 'None', allowedTypes: ['all'] },
  { id: 'fade', label: 'Fade', allowedTypes: ['all'] },
  { id: 'typewriter', label: 'Typewriter', allowedTypes: ['text'] },
  { id: 'slideLeft', label: 'Slide In Left', allowedTypes: ['all'] },
  { id: 'slideRight', label: 'Slide In Right', allowedTypes: ['all'] },
  { id: 'slideUp', label: 'Slide In Up', allowedTypes: ['all'] },
  { id: 'slideDown', label: 'Slide In Down', allowedTypes: ['all'] },
  { id: 'zoom', label: 'Zoom / Scale', allowedTypes: ['all'] },
  { id: 'wipeLeft', label: 'Wipe Left', allowedTypes: ['all'] },
  { id: 'wipeRight', label: 'Wipe Right', allowedTypes: ['all'] }
];

// const FONTS = ['Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Oswald', 'Raleway'];
// const FONTS = [
//   'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Oswald', 'Raleway',
//   'Anton', 'Bangers', 'Cinzel', 'Dancing Script', 'Orbitron', 'Pacifico', 'Permanent Marker'
// ];

// Find the CONSTANTS section at the top and replace FONTS with this:

const FONTS = [
  // Sans Serif / Basic
  'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Raleway', 'Oswald',

  // Display / Impact
  'Anton', 'Bangers', 'Russo One',

  // Serif / Luxury
  'Cinzel', 'Playfair Display', 'Abril Fatface',

  // Creative / Script
  'Dancing Script', 'Pacifico', 'Permanent Marker', 'The Girl Next Door',

  // Tech / Gaming
  'Orbitron', 'Press Start 2P', 'Righteous',

  // Horror / Grunge
  'Creepster', 'Special Elite'
];

const PropertiesPanel = ({
  selectedItem,
  onUpdate,
  onSelect,
  onClose,
  isOpen,
  height,
  canvasWidth,
  canvasHeight,
  items = []
}) => {
  const [tab, setTab] = useState('props');

  // State
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedMask, setSelectedMask] = useState('none');
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);

  // Transform State
  const [xPos, setXPos] = useState('');
  const [yPos, setYPos] = useState('');
  const [rotation, setRotation] = useState('');

  // Size State
  const [widthVal, setWidthVal] = useState('');
  const [heightVal, setHeightVal] = useState('');
  const [relScale, setRelScale] = useState(100);

  // Text State
  const [textContent, setTextContent] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('transparent');
  const [fontFamily, setFontFamily] = useState('Roboto');
  const [fontSize, setFontSize] = useState(50);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Animation State
  const [animInType, setAnimInType] = useState('none');
  const [animOutType, setAnimOutType] = useState('none');
  const [animInDur, setAnimInDur] = useState(2.0);
  const [animOutDur, setAnimOutDur] = useState(2.0);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);


  // // ✅ NEW STATE FOR WIDELY USED PROPERTIES
  // const [strokeWidth, setStrokeWidth] = useState(0);
  // const [strokeColor, setStrokeColor] = useState('#000000');
  // const [letterSpacing, setLetterSpacing] = useState(0);
  // const [lineHeight, setLineHeight] = useState(1.2);


  // // --- ✅ NEW: ADVANCED TEXT PROPERTIES ---
  // const [strokeWidth, setStrokeWidth] = useState(0);
  // const [strokeColor, setStrokeColor] = useState('#000000');

  // const [shadowEnabled, setShadowEnabled] = useState(false);
  // const [shadowColor, setShadowColor] = useState('#000000');
  // const [shadowBlur, setShadowBlur] = useState(0);
  // const [shadowX, setShadowX] = useState(0);
  // const [shadowY, setShadowY] = useState(0);

  // const [letterSpacing, setLetterSpacing] = useState(0);
  // const [lineHeight, setLineHeight] = useState(1.2);


  const [borderRadius, setBorderRadius] = useState(0);
  const [padding, setPadding] = useState(0);
  const [textAlign, setTextAlign] = useState('center');

  // --- ✅ NEW: ADVANCED TEXT PROPERTIES ---
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#000000');

  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowX, setShadowX] = useState(0);
  const [shadowY, setShadowY] = useState(0);

  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.2);
  const [bgOpacity, setBgOpacity] = useState(1);

  // --- ADD THESE TWO LINES ---
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });
  const fontTriggerRef = useRef(null);



  // Ref to track previous item ID to prevent tab resetting while editing
  const prevItemIdRef = useRef(null);

  const triggerUpdate = (changes) => {
    if (!selectedItem) return;
    onUpdate({ ...selectedItem, ...changes });
  };

  const updateStyle = (styleUpdates) => {
    triggerUpdate({
      style: {
        ...(selectedItem.style || {}),
        ...styleUpdates
      }
    });
  };

  // --- EFFECT 1: Sync Inputs with Item Data (Run on every update) ---
  useEffect(() => {
    if (selectedItem && isOpen) {
      // 1. Common
      setVolume((selectedItem.volume ?? 1) * 100);
      setSpeed(selectedItem.speed ?? 1);
      setIsMuted(selectedItem.muted ?? false);
      setFadeIn(selectedItem.fadeIn || 0);
      setFadeOut(selectedItem.fadeOut || 0);
      setOpacity((selectedItem.opacity ?? 1) * 100);
      setSelectedMask(selectedItem.maskType || 'none');

      // 2. Transform
      setXPos(Math.round(selectedItem.x || 0));
      setYPos(Math.round(selectedItem.y || 0));
      setRotation(Math.round(selectedItem.rotation || 0));

      // 3. Size
      const w = Math.round(selectedItem.width || 0);
      const h = Math.round(selectedItem.height || 0);
      setWidthVal(w);
      setHeightVal(h);
      if (canvasWidth > 0) setRelScale(Math.round((w / canvasWidth) * 100));

      // 4. Animation
      const anim = selectedItem.animation || {};
      setAnimInType(anim.in?.type || 'none');
      setAnimOutType(anim.out?.type || 'none');
      setAnimInDur(anim.in?.duration || 2.0);
      setAnimOutDur(anim.out?.duration || 2.0);

      // 5. Text / Caption
      //     if (selectedItem.type === 'text') {
      //       setTextContent(selectedItem.text || '');
      //       const style = selectedItem.style || {};
      //       setTextColor(style.color || '#ffffff');
      //       setBgColor(style.backgroundColor || 'transparent');
      //       setFontFamily(style.fontFamily || 'Roboto');
      //       setFontSize(style.fontSize || 50);
      //       setIsBold(style.fontWeight === 'bold');
      //       setIsItalic(style.fontStyle === 'italic');
      //       setIsUnderline(style.textDecoration === 'underline');


      //       // Parse Stroke (e.g., "2px #000000")
      //       const stroke = style.WebkitTextStroke || '0px #000000';
      //       const strokeMatch = stroke.match(/([\d.]+)px\s+(.+)/);
      //       if (strokeMatch) {
      //           setStrokeWidth(parseFloat(strokeMatch[1]));
      //           setStrokeColor(strokeMatch[2]);
      //       } else {
      //           setStrokeWidth(0);
      //           setStrokeColor('#000000');
      //       }

      //       setLetterSpacing(parseFloat(style.letterSpacing) || 0);
      //       setLineHeight(parseFloat(style.lineHeight) || 1.2);
      //     }
      //   }
      // }, [selectedItem, isOpen, canvasWidth]);

      if (selectedItem.type === 'text') {
        setTextContent(selectedItem.text || '');

        const style = selectedItem.style || {};
        setFontSize(style.fontSize || 50);
        setFontFamily(style.fontFamily || 'Roboto');
        setTextColor(style.color || '#ffffff');
        setBgColor(style.backgroundColor || '#000000');
        setBgOpacity(style.backgroundOpacity ?? (style.backgroundColor === 'transparent' ? 0 : 1));
        setBorderRadius(style.borderRadius || 0);
        setPadding(style.padding || 0);
        setTextAlign(style.textAlign || 'center');
        setIsBold(style.fontWeight === 'bold' || style.fontWeight >= 700);
        setIsItalic(style.fontStyle === 'italic');
        setIsUnderline(style.textDecoration === 'underline');
        setLineHeight(style.lineHeight || 1.2);

        // --- ✅ MAP LETTER SPACING ---
        // "10px" -> 10
        const spacing = style.letterSpacing ? parseFloat(style.letterSpacing) : 0;
        setLetterSpacing(isNaN(spacing) ? 0 : spacing);

        // --- ✅ MAP STROKE (Outline) ---
        // "2px #ff0000" -> Width: 2, Color: #ff0000
        if (style.WebkitTextStroke && style.WebkitTextStroke !== '0px') {
          const parts = style.WebkitTextStroke.match(/^([\d.]+)px\s+(.+)$/i);
          if (parts) {
            setStrokeWidth(parseFloat(parts[1]));
            setStrokeColor(parts[2]);
          } else {
            setStrokeWidth(0);
          }
        } else {
          setStrokeWidth(0);
        }

        // --- ✅ MAP SHADOW (Neon / Drop Shadow) ---
        // "0px 0px 20px #00ffff" -> X:0, Y:0, Blur:20, Color:#00ffff
        if (style.textShadow && style.textShadow !== 'none') {
          setShadowEnabled(true);
          // Parse: "x y blur color"
          // Handles: "4px 4px 0px #000" OR "0 0 20px cyan"
          const shadowRegex = /(-?[\d.]+)px?\s+(-?[\d.]+)px?\s+(-?[\d.]+)px?\s+(.+)/;
          const shadowParts = style.textShadow.match(shadowRegex);

          if (shadowParts) {
            setShadowX(parseFloat(shadowParts[1]));
            setShadowY(parseFloat(shadowParts[2]));
            setShadowBlur(parseFloat(shadowParts[3]));
            setShadowColor(shadowParts[4]);
          } else {
            // Fallback for simple "2px 2px #000" (no blur)
            const simple = style.textShadow.match(/(-?[\d.]+)px?\s+(-?[\d.]+)px?\s+(.+)/);
            if (simple) {
              setShadowX(parseFloat(simple[1]));
              setShadowY(parseFloat(simple[2]));
              setShadowBlur(0);
              setShadowColor(simple[3]);
            }
          }
        } else {
          setShadowEnabled(false);
          setShadowBlur(0);
          setShadowX(2);
          setShadowY(2);
        }
      }
    }
  }, [selectedItem, isOpen]);

  // --- EFFECT 2: Manage Tab Switching (Run ONLY when ID changes or Panel Opens) ---
  useEffect(() => {
    if (selectedItem && isOpen) {
      // Only auto-switch tabs if the actual ITEM changed (not just a property update)
      if (selectedItem.id !== prevItemIdRef.current) {
        prevItemIdRef.current = selectedItem.id;

        if (selectedItem.type === 'video' || selectedItem.type === 'image') {
          setTab('transform');
        } else if (selectedItem.type === 'text') {
          if (selectedItem.subtitleGroupId) {
            setTab('captionStyle');
          } else {
            setTab('textStyle');
          }
        } else if (selectedItem.type === 'audio') {
          setTab('props');
        }
      }
    }
  }, [selectedItem?.id, isOpen]);

  const alignItem = (direction) => {
    if (!selectedItem || !canvasWidth || !canvasHeight) return;

    const w = selectedItem.width || 0;
    const h = selectedItem.height || 0;
    let updates = {};

    switch (direction) {
      case 'left': updates.x = 0; break;
      case 'center': updates.x = (canvasWidth - w) / 2; break;
      case 'right': updates.x = canvasWidth - w; break;
      case 'top': updates.y = 0; break;
      case 'middle': updates.y = (canvasHeight - h) / 2; break;
      case 'bottom': updates.y = canvasHeight - h; break;
      default: break;
    }

    if (updates.x !== undefined) setXPos(Math.round(updates.x));
    if (updates.y !== undefined) setYPos(Math.round(updates.y));

    triggerUpdate(updates);
  };

  const updateAnimation = (field, value) => {
    let newInType = animInType;
    let newOutType = animOutType;
    let newInDur = animInDur;
    let newOutDur = animOutDur;

    if (field === 'inType') { newInType = value; setAnimInType(value); }
    if (field === 'outType') { newOutType = value; setAnimOutType(value); }
    if (field === 'inDur') { newInDur = parseFloat(value); setAnimInDur(newInDur); }
    if (field === 'outDur') { newOutDur = parseFloat(value); setAnimOutDur(newOutDur); }

    triggerUpdate({
      animation: {
        in: { type: newInType, duration: newInDur },
        out: { type: newOutType, duration: newOutDur }
      }
    });
  };

  // const updateTextStyle = (overrides = {}) => {
  //   const finalContent = overrides.text !== undefined ? overrides.text : textContent;
  //    triggerUpdate({
  //        text: finalContent,
  //        style: {
  //          ...selectedItem.style,
  //          color: overrides.color !== undefined ? overrides.color : textColor,
  //          backgroundColor: overrides.backgroundColor !== undefined ? overrides.backgroundColor : bgColor,
  //          fontFamily: overrides.fontFamily !== undefined ? overrides.fontFamily : fontFamily,
  //          fontSize: overrides.fontSize !== undefined ? Number(overrides.fontSize) : fontSize,
  //          fontWeight: (overrides.isBold !== undefined ? overrides.isBold : isBold) ? 'bold' : 'normal',
  //          fontStyle: (overrides.isItalic !== undefined ? overrides.isItalic : isItalic) ? 'italic' : 'normal',
  //          textDecoration: (overrides.isUnderline !== undefined ? overrides.isUnderline : isUnderline) ? 'underline' : 'none',
  //          WebkitTextStroke: '0px'
  //        }
  //    });
  // };



  // // ✅ UPDATED: updateTextStyle to include new properties
  // const updateTextStyle = (overrides = {}) => {
  //   const finalContent = overrides.text !== undefined ? overrides.text : textContent;

  //   // Calculate final stroke string
  //   const sWidth = overrides.strokeWidth !== undefined ? overrides.strokeWidth : strokeWidth;
  //   const sColor = overrides.strokeColor !== undefined ? overrides.strokeColor : strokeColor;
  //   const finalStroke = `${sWidth}px ${sColor}`;

  //    triggerUpdate({
  //        text: finalContent,
  //        style: {
  //          ...selectedItem.style,
  //          color: overrides.color !== undefined ? overrides.color : textColor,
  //          backgroundColor: overrides.backgroundColor !== undefined ? overrides.backgroundColor : bgColor,
  //          fontFamily: overrides.fontFamily !== undefined ? overrides.fontFamily : fontFamily,
  //          fontSize: overrides.fontSize !== undefined ? Number(overrides.fontSize) : fontSize,
  //          fontWeight: (overrides.isBold !== undefined ? overrides.isBold : isBold) ? 'bold' : 'normal',
  //          fontStyle: (overrides.isItalic !== undefined ? overrides.isItalic : isItalic) ? 'italic' : 'normal',
  //          textDecoration: (overrides.isUnderline !== undefined ? overrides.isUnderline : isUnderline) ? 'underline' : 'none',

  //          // ✅ APPLY NEW PROPERTIES
  //          WebkitTextStroke: finalStroke,
  //          letterSpacing: overrides.letterSpacing !== undefined ? `${overrides.letterSpacing}px` : `${letterSpacing}px`,
  //          lineHeight: overrides.lineHeight !== undefined ? overrides.lineHeight : lineHeight,
  //        }
  //    });
  // };

  // --- ADD THIS FUNCTION ---
  const toggleFontDropdown = () => {
    if (isFontDropdownOpen) {
      setIsFontDropdownOpen(false);
    } else if (fontTriggerRef.current) {
      const rect = fontTriggerRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.top,
        left: rect.left
      });
      setIsFontDropdownOpen(true);
    }
  };


  // --- UPDATE HANDLER ---
  const updateTextStyle = (overrides = {}) => {
    if (!selectedItem) return;

    // 1. Calculate Stroke String
    const sWidth = overrides.strokeWidth !== undefined ? overrides.strokeWidth : strokeWidth;
    const sColor = overrides.strokeColor !== undefined ? overrides.strokeColor : strokeColor;
    const finalStroke = sWidth > 0 ? `${sWidth}px ${sColor}` : '0px';

    // 2. Calculate Shadow String
    const sEnabled = overrides.shadowEnabled !== undefined ? overrides.shadowEnabled : shadowEnabled;
    const sx = overrides.shadowX !== undefined ? overrides.shadowX : shadowX;
    const sy = overrides.shadowY !== undefined ? overrides.shadowY : shadowY;
    const sb = overrides.shadowBlur !== undefined ? overrides.shadowBlur : shadowBlur;
    const sc = overrides.shadowColor !== undefined ? overrides.shadowColor : shadowColor;
    const finalShadow = sEnabled ? `${sx}px ${sy}px ${sb}px ${sc}` : 'none';

    // 3. Calculate Spacing
    const finalSpacing = overrides.letterSpacing !== undefined ? overrides.letterSpacing : letterSpacing;

    triggerUpdate({
      text: overrides.text !== undefined ? overrides.text : textContent,
      style: {
        ...selectedItem.style,
        // Basic
        fontSize: overrides.fontSize || fontSize,
        fontFamily: overrides.fontFamily || fontFamily,
        color: overrides.color || textColor,
        backgroundColor: overrides.backgroundColor !== undefined ? overrides.backgroundColor : bgColor,
        backgroundOpacity: overrides.bgOpacity !== undefined ? overrides.bgOpacity : bgOpacity,
        textAlign: overrides.textAlign || textAlign,
        padding: overrides.padding !== undefined ? overrides.padding : padding,
        borderRadius: overrides.borderRadius !== undefined ? overrides.borderRadius : borderRadius,

        // Toggles
        fontWeight: (overrides.isBold !== undefined ? overrides.isBold : isBold) ? 'bold' : 'normal',
        fontStyle: (overrides.isItalic !== undefined ? overrides.isItalic : isItalic) ? 'italic' : 'normal',
        textDecoration: (overrides.isUnderline !== undefined ? overrides.isUnderline : isUnderline) ? 'underline' : 'none',

        // Advanced Mapped Props
        WebkitTextStroke: finalStroke,
        textShadow: finalShadow,
        letterSpacing: `${finalSpacing}px`,
        lineHeight: overrides.lineHeight !== undefined ? overrides.lineHeight : lineHeight,
      }
    });
  };



  // const triggerUpdate = (newProps) => {
  //   onUpdate({ ...selectedItem, ...newProps });
  // };

  const applyMask = (maskId) => {
    setSelectedMask(maskId);
    triggerUpdate({ maskType: maskId === 'none' ? undefined : maskId });
  };

  const getSliderStyle = (value, min, max) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return {
      background: `linear-gradient(to right, #FFD700 ${percentage}%, #333 ${percentage}%)`,
      width: '100%'
    };
  };

  const getCompatibleAnimations = () => {
    if (!selectedItem) return [];
    return ANIMATION_TYPES.filter(anim =>
      anim.allowedTypes.includes('all') || anim.allowedTypes.includes(selectedItem.type)
    );
  };

  const handleTransformChange = (type, rawValue) => {
    if (rawValue === '' || rawValue === '-') {
      if (type === 'x') setXPos(rawValue);
      if (type === 'y') setYPos(rawValue);
      if (type === 'rot') setRotation(rawValue);
      return;
    }
    const val = Number(rawValue);
    if (isNaN(val)) return;

    if (type === 'x') { setXPos(val); triggerUpdate({ x: val }); }
    else if (type === 'y') { setYPos(val); triggerUpdate({ y: val }); }
    else if (type === 'rot') { setRotation(val); triggerUpdate({ rotation: val }); }
  };

  const handleSizeChange = (type, rawValue) => {
    const currentW = selectedItem.width || 1;
    const currentH = selectedItem.height || 1;
    const aspect = currentW / currentH;

    if (type === 'scale') {
      const pct = parseFloat(rawValue);
      setRelScale(pct);

      if (canvasWidth > 0) {
        const newW = Math.round(canvasWidth * (pct / 100));
        const newH = Math.round(newW / aspect);
        setWidthVal(newW);
        setHeightVal(newH);
        triggerUpdate({ width: newW, height: newH });
      }
      return;
    }

    if (rawValue === '') {
      if (type === 'w') { setWidthVal(''); }
      if (type === 'h') { setHeightVal(''); }
      return;
    }

    const val = Math.max(1, Number(rawValue));
    if (isNaN(val)) return;

    if (type === 'w') {
      const newH = Math.round(val / aspect);
      setWidthVal(val);
      setHeightVal(newH);
      if (canvasWidth > 0) setRelScale(Math.round((val / canvasWidth) * 100));
      triggerUpdate({ width: val, height: newH });
    } else if (type === 'h') {
      const newW = Math.round(val * aspect);
      setHeightVal(val);
      setWidthVal(newW);
      if (canvasWidth > 0) setRelScale(Math.round((newW / canvasWidth) * 100));
      triggerUpdate({ width: newW, height: val });
    }
  };

  if (!isOpen || !selectedItem) return null;

  const currentBgColor = selectedItem.style?.backgroundColor || 'transparent';
  const isBgEnabled = currentBgColor !== 'transparent';

  const isVideo = selectedItem.type === 'video';
  const isImage = selectedItem.type === 'image';
  const isAudio = selectedItem.type === 'audio';
  const isCaption = selectedItem.type === 'text' && !!selectedItem.subtitleGroupId;
  const isText = selectedItem.type === 'text' && !selectedItem.subtitleGroupId;

  const isVisual = isVideo || isImage || isText || isCaption;
  const compatibleAnims = getCompatibleAnimations();

  const panelStyle = height > 0 ? { height: `${Math.max(200, height - 90)}px` } : {};




  const SpeedButton = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 4px',
        background: active ? '#FFD700' : 'rgba(255,255,255,0.05)',
        color: active ? '#000' : '#888',
        border: active ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 600,
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  );

  const triggerGroupStyleUpdate = () => {
    const currentStyle = {
      color: textColor,
      backgroundColor: bgColor,
      fontFamily: fontFamily,
      fontSize: fontSize,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecoration: isUnderline ? 'underline' : 'none',
    };

    const updated = {
      ...selectedItem,
      style: { ...selectedItem.style, ...currentStyle },
      _applyToGroup: true
    };

    onUpdate(updated);
  };

  const triggerGroupAnimationUpdate = () => {
    const currentAnimation = {
      in: { type: animInType, duration: animInDur },
      out: { type: animOutType, duration: animOutDur }
    };

    const updated = {
      ...selectedItem,
      animation: currentAnimation,
      _applyToGroup: true,
      _targetProp: 'animation' // Signal to sync animation
    };

    onUpdate(updated);
  };

  // --- RENDER HELPERS ---
  // const renderAlignmentControls = () => (
  //   <div className="property-section">
  //     <div className="property-label">Alignment</div>
  //     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
  //       {/* Horizontal Alignment */}
  //       <div style={{ display: 'flex', background: '#111', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
  //         <button onClick={() => alignItem('left')} title="Align Left" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
  //           <span className="material-icons" style={{ fontSize: 18 }}>align_horizontal_left</span>
  //         </button>
  //         <button onClick={() => alignItem('center')} title="Align Center" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
  //           <span className="material-icons" style={{ fontSize: 18 }}>align_horizontal_center</span>
  //         </button>
  //         <button onClick={() => alignItem('right')} title="Align Right" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
  //           <span className="material-icons" style={{ fontSize: 18 }}>align_horizontal_right</span>
  //         </button>
  //       </div>
  //       {/* Vertical Alignment */}
  //       <div style={{ display: 'flex', background: '#111', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
  //         <button onClick={() => alignItem('top')} title="Align Top" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
  //           <span className="material-icons" style={{ fontSize: 18 }}>align_vertical_top</span>
  //         </button>
  //         <button onClick={() => alignItem('middle')} title="Align Middle" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
  //           <span className="material-icons" style={{ fontSize: 18 }}>align_vertical_center</span>
  //         </button>
  //         <button onClick={() => alignItem('bottom')} title="Align Bottom" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
  //           <span className="material-icons" style={{ fontSize: 18 }}>align_vertical_bottom</span>
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  // );

  const renderAlignmentControls = () => (
    <div className="property-section">
      <div className="property-label">Alignment</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Horizontal Alignment */}
        <div style={{ display: 'flex', background: '#111', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => alignItem('left')} title="Align Left" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>format_align_left</span>
          </button>
          <button onClick={() => alignItem('center')} title="Align Center" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>format_align_center</span>
          </button>
          <button onClick={() => alignItem('right')} title="Align Right" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>format_align_right</span>
          </button>
        </div>
        {/* Vertical Alignment */}
        <div style={{ display: 'flex', background: '#111', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
          <button onClick={() => alignItem('top')} title="Align Top" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>vertical_align_top</span>
          </button>
          <button onClick={() => alignItem('middle')} title="Align Middle" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', borderRight: '1px solid #333', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>vertical_align_center</span>
          </button>
          <button onClick={() => alignItem('bottom')} title="Align Bottom" style={{ flex: 1, padding: '8px 4px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>vertical_align_bottom</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`properties-panel ${isOpen ? 'open' : ''}`} style={panelStyle}>
      <div className="properties-header">
        <h3>
          <span className="material-icons" style={{ color: '#FFD700' }}>{isText || isCaption ? 'edit' : 'settings'}</span>
          {isCaption ? 'Caption Properties' : isText ? 'Text Properties' : 'Properties'}
        </h3>
        <button className="close-btn" onClick={onClose}>
          <span className="material-icons" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      <div className="properties-content">
        <div className="tabs-container">
          {(isVideo || isImage) && (
            <button className={`tab-btn ${tab === 'transform' ? 'active' : ''}`} onClick={() => setTab('transform')}>Transform</button>
          )}
          {/* ADD THIS FOR AUDIO */}
          {isAudio && (
            <button className={`tab-btn ${tab === 'props' ? 'active' : ''}`} onClick={() => setTab('props')}>Audio</button>
          )}

          {isText && (
            <button className={`tab-btn ${tab === 'textStyle' ? 'active' : ''}`} onClick={() => setTab('textStyle')}>Style</button>
          )}

          {isCaption && (
            <>
              <button className={`tab-btn ${tab === 'captionStyle' ? 'active' : ''}`} onClick={() => setTab('captionStyle')}>Style</button>
              <button className={`tab-btn ${tab === 'captionList' ? 'active' : ''}`} onClick={() => setTab('captionList')}>All Captions</button>
            </>
          )}

          {isVisual && (
            <button className={`tab-btn ${tab === 'animate' ? 'active' : ''}`} onClick={() => setTab('animate')}>Animate</button>
          )}

          {(isVideo || isImage) && (
            <button className={`tab-btn ${tab === 'masking' ? 'active' : ''}`} onClick={() => setTab('masking')}>Masks</button>
          )}
        </div>

        {/* --- ANIMATION TAB --- */}
        {isVisual && tab === 'animate' && (
          <div className="animation-tab-content" style={{ padding: '10px 0' }}>
            {/* ✅ NEW: Apply Animation Button (Only for Captions) */}
            {isCaption && (
              <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={triggerGroupAnimationUpdate}
                  className="apply-all-btn"
                  style={{
                    width: '100%', padding: '10px', background: 'rgba(209, 254, 23, 0.1)',
                    border: '1px solid #D1FE17', color: '#D1FE17', borderRadius: '6px',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>motion_photos_on</span>
                  Apply Animation to All
                </button>
              </div>
            )}
            <div className="property-group-box">
              <div className="property-label" style={{ color: '#FFD700', marginBottom: 8 }}>Entrance (In)</div>
              <div className="property-section">
                <select className="modern-input" value={animInType} onChange={(e) => updateAnimation('inType', e.target.value)}>
                  {compatibleAnims.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              {animInType !== 'none' && (
                <div className="property-section" style={{ marginTop: 10 }}>
                  <div className="property-label">{isText ? 'Speed' : 'Duration'}</div>
                  {isText || isCaption ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <SpeedButton label="Slow" active={animInDur >= 2.5} onClick={() => updateAnimation('inDur', 3.0)} />
                      <SpeedButton label="Normal" active={animInDur >= 1.5 && animInDur < 2.5} onClick={() => updateAnimation('inDur', 2.0)} />
                      <SpeedButton label="Fast" active={animInDur < 1.5} onClick={() => updateAnimation('inDur', 1.0)} />
                    </div>
                  ) : (
                    <div className="slider-container">
                      <span className="property-value-box" style={{ marginBottom: 4, display: 'block' }}>{animInDur.toFixed(1)}s</span>
                      <input type="range" min="0.5" max="3.0" step="0.5" value={animInDur} style={getSliderStyle(animInDur, 0.5, 3.0)} onChange={(e) => updateAnimation('inDur', e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="divider" style={{ margin: '15px 0' }} />

            <div className="property-group-box">
              <div className="property-label" style={{ color: '#FFD700', marginBottom: 8 }}>Exit (Out)</div>
              <div className="property-section">
                <select className="modern-input" value={animOutType} onChange={(e) => updateAnimation('outType', e.target.value)}>
                  {compatibleAnims.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              {animOutType !== 'none' && (
                <div className="property-section" style={{ marginTop: 10 }}>
                  <div className="property-label">{isText ? 'Speed' : 'Duration'}</div>
                  {isText || isCaption ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <SpeedButton label="Slow" active={animOutDur >= 2.5} onClick={() => updateAnimation('outDur', 3.0)} />
                      <SpeedButton label="Normal" active={animOutDur >= 1.5 && animOutDur < 2.5} onClick={() => updateAnimation('outDur', 2.0)} />
                      <SpeedButton label="Fast" active={animOutDur < 1.5} onClick={() => updateAnimation('outDur', 1.0)} />
                    </div>
                  ) : (
                    <div className="slider-container">
                      <span className="property-value-box" style={{ marginBottom: 4, display: 'block' }}>{animOutDur.toFixed(1)}s</span>
                      <input type="range" min="0.5" max="3.0" step="0.5" value={animOutDur} style={getSliderStyle(animOutDur, 0.5, 3.0)} onChange={(e) => updateAnimation('outDur', e.target.value)} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- CAPTION LIST TAB --- */}
        {isCaption && tab === 'captionList' && (
          <div className="caption-list-container" style={{ paddingBottom: 10 }}>
            <div className="property-label" style={{ marginBottom: 10 }}>Captions in this Group</div>
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items
                .filter(it => it.subtitleGroupId === selectedItem.subtitleGroupId)
                .sort((a, b) => a.startTime - b.startTime)
                .map((cap) => (
                  <div
                    key={cap.id}
                    className={`caption-list-item ${cap.id === selectedItem.id ? 'active' : ''}`}
                    onClick={() => {
                      // Switch to this item without closing panel
                      if (onSelect) onSelect(cap);
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#D1FE17', marginBottom: 2 }}>
                      {new Date(cap.startTime * 1000).toISOString().substr(14, 5)}
                    </div>
                    <textarea
                      className="modern-input"
                      rows={2}
                      style={{ fontSize: 12, resize: 'none', background: 'transparent', border: 'none', padding: 0 }}
                      value={cap.text}
                      onChange={(e) => {
                        // Specific update for this item in list
                        onUpdate({ ...cap, text: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* --- STYLE TABS (Common for Text & Captions) --- */}
        {((isText && tab === 'textStyle') || (isCaption && tab === 'captionStyle')) && (
          <>
            {isCaption && (
              <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={triggerGroupStyleUpdate}
                  className="apply-all-btn"
                  style={{
                    width: '100%', padding: '10px', background: 'rgba(209, 254, 23, 0.1)',
                    border: '1px solid #D1FE17', color: '#D1FE17', borderRadius: '6px',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 16 }}>style</span>
                  Apply Style to All
                </button>
              </div>
            )}

            {/* Added Alignment Controls to Text Style Tab as well */}
            {renderAlignmentControls()}
            <div className="divider" style={{ margin: '10px 0' }} />

            <div className="property-section">
              <div className="property-label">Content</div>
              <textarea className="modern-input" value={textContent} onChange={(e) => { setTextContent(e.target.value); updateTextStyle({ text: e.target.value }); }} rows={3} />
            </div>

            {/* <div className="property-section">
               <div className="property-label">Font Family</div>
               <select className="modern-input" value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); updateTextStyle({ fontFamily: e.target.value }); }}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
               </select>
            </div> */}

            {/* <div className="property-section">
   <div className="property-label">Font Family</div>
   
   <select 
      className="modern-select" 
      value={fontFamily} 
      onChange={(e) => { 
          setFontFamily(e.target.value); 
          updateTextStyle({ fontFamily: e.target.value }); 
      }}
      style={{ fontFamily: fontFamily }} // Shows selected font in its own style
   >
      {FONTS.map(f => (
        <option key={f} value={f} style={{ fontFamily: f, fontSize: '16px' }}>
          {f}
        </option>
      ))}
   </select>
</div> */}


            {/* <div className="property-section" style={{ position: 'relative', zIndex: 10 }}> 

   
   <div className="property-label">Font Family</div>
   
   <div className="custom-dropdown-container">

      <div 
        className={`custom-dropdown-trigger ${isFontDropdownOpen ? 'open' : ''}`} 
        onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
      >
         <span style={{ fontFamily: fontFamily, fontSize: '14px' }}>{fontFamily}</span>
         <span className="material-icons dropdown-arrow">expand_more</span>
      </div>

      {isFontDropdownOpen && (
        <>

          <div className="dropdown-backdrop" onClick={() => setIsFontDropdownOpen(false)} />
          
          <div className="custom-dropdown-list">
             {FONTS.map(f => (
               <div 
                 key={f} 
                 className={`custom-dropdown-option ${fontFamily === f ? 'selected' : ''}`} 
                 style={{ fontFamily: f }}
                 onClick={() => { 
                    setFontFamily(f); 
                    updateTextStyle({ fontFamily: f }); 
                    setIsFontDropdownOpen(false); 
                 }}
               >
                 {f}
               </div>
             ))}
          </div>
        </>
      )}
   </div>
</div> */}

            {/* --- REPLACED FONT FAMILY SECTION --- */}
            <div className="property-section">
              <div className="property-label">Font Family</div>
              <div className="custom-dropdown-container">

                {/* Trigger Button */}
                <div
                  ref={fontTriggerRef} // <--- Important: Attach Ref here
                  className={`custom-dropdown-trigger ${isFontDropdownOpen ? 'open' : ''}`}
                  onClick={toggleFontDropdown} // <--- Important: Use new handler
                >
                  <span style={{ fontFamily: fontFamily, fontSize: '14px' }}>{fontFamily}</span>
                  <span className="material-icons dropdown-arrow">expand_more</span>
                </div>

                {/* Render List via Portal (Outside Panel) */}
                {/* {isFontDropdownOpen && ReactDOM.createPortal(
                    <>
                      <div className="dropdown-backdrop" onClick={() => setIsFontDropdownOpen(false)} />
                      <div 
                        className="custom-dropdown-list"
                        style={{
                           position: 'fixed',
                           top: dropdownCoords.top,
                           // Adjust this value (-250) to move it further left or right
                           left: dropdownCoords.left - 250, 
                           width: '240px',
                           maxHeight: '300px',
                           zIndex: 99999 // Ensures it sits on top of Konva
                        }}
                      >
                         {FONTS.map(f => (
                           <div 
                             key={f} 
                             className={`custom-dropdown-option ${fontFamily === f ? 'selected' : ''}`} 
                             style={{ fontFamily: f }}
                             onClick={() => { 
                                setFontFamily(f); 
                                updateTextStyle({ fontFamily: f }); 
                                setIsFontDropdownOpen(false); 
                             }}
                           >
                             {f}
                           </div>
                         ))}
                      </div>
                    </>,
                    document.body // Appends to the <body> tag
                  )} */}

                {/* RENDER THE LIST INTO THE BODY (PORTAL) */}
                {isFontDropdownOpen && ReactDOM.createPortal(
                  <>
                    {/* Backdrop to close when clicking outside */}
                    <div className="dropdown-backdrop" onClick={() => setIsFontDropdownOpen(false)} />

                    <div
                      className="custom-dropdown-list"
                      style={{
                        position: 'fixed',
                        top: dropdownCoords.top,
                        left: dropdownCoords.left - 250,
                        width: '240px',
                        maxHeight: '300px',
                        zIndex: 99999
                      }}
                    >
                      {/* {FONTS.map(f => (
                           <div 
                             key={f} 
                             className={`custom-dropdown-option ${fontFamily === f ? 'selected' : ''}`} 
                             style={{ fontFamily: f }}
                             
                             // ✅ UPDATED HANDLER: Prioritizes applying the font
                             onClick={(e) => { 
                                e.stopPropagation(); // Stop event bubbling
                                
                                // 1. Apply visual change immediately (Local State)
                                setFontFamily(f); 
                                
                                // 2. Apply to Canvas (The real update)
                                updateTextStyle({ fontFamily: f }); 
                                
                                // 3. Close the dropdown LAST
                                setIsFontDropdownOpen(false); 
                             }}
                           >
                             {f}
                           </div>
                         ))} */}


                      {FONTS.map(f => (
                        <div
                          key={f}
                          className={`custom-dropdown-option ${fontFamily === f ? 'selected' : ''}`}
                          style={{ fontFamily: f }}

                          // ✅ FIXED: Async handler to wait for font load
                          onClick={async (e) => {
                            e.stopPropagation();

                            // 1. Update UI immediately (Local State)
                            setFontFamily(f);
                            setIsFontDropdownOpen(false);

                            // 2. Force Browser to Load Font BEFORE applying to Canvas
                            // This prevents the "Roboto" flash
                            try {
                              // We request the font to load explicitly
                              await document.fonts.load(`16px "${f}"`);
                            } catch (err) {
                              console.warn("Font loading timed out, applying anyway.");
                            }

                            // 3. NOW update the Canvas Item
                            // Since we awaited the load, Konva will draw with the correct font immediately
                            updateTextStyle({ fontFamily: f });
                          }}
                        >
                          {f}
                        </div>
                      ))}
                    </div>
                  </>,
                  document.body
                )}
              </div>
            </div>

            <div className="property-section">
              <div className="property-label"><span>Font Size</span><span className="property-value-box">{fontSize}px</span></div>
              <div className="slider-container">
                <input type="range" min="10" max="200" value={fontSize} style={getSliderStyle(fontSize, 10, 200)} onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setFontSize(newSize);
                  triggerUpdate({ style: { ...selectedItem.style, fontSize: newSize } });
                }}
                />
              </div>
            </div>

            <div className="property-section">
              <div className="property-label">Style</div>
              <div style={{ display: 'flex', background: '#111', border: '1px solid #333', borderRadius: 6, overflow: 'hidden' }}>
                <button onClick={() => { setIsBold(!isBold); updateTextStyle({ isBold: !isBold }); }} style={{ flex: 1, padding: 12, background: isBold ? '#FFD700' : 'transparent', color: isBold ? '#000' : '#888', border: 'none', borderRight: '1px solid #333', fontWeight: 'bold' }}>B</button>
                <button onClick={() => { setIsItalic(!isItalic); updateTextStyle({ isItalic: !isItalic }); }} style={{ flex: 1, padding: 12, background: isItalic ? '#FFD700' : 'transparent', color: isItalic ? '#000' : '#888', border: 'none', borderRight: '1px solid #333', fontStyle: 'italic' }}>I</button>
                <button onClick={() => { setIsUnderline(!isUnderline); updateTextStyle({ isUnderline: !isUnderline }); }} style={{ flex: 1, padding: 12, background: isUnderline ? '#FFD700' : 'transparent', color: isUnderline ? '#000' : '#888', border: 'none', textDecoration: 'underline' }}>U</button>
              </div>
            </div>
            <div className="property-section">
              <div className="property-label">Color</div>
              <input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); updateTextStyle({ color: e.target.value }); }} style={{ width: '100%', height: 35, border: 'none', background: 'none', cursor: 'pointer' }} />
            </div>

            <div className="divider" />



            {/* ✅ NEW: STROKE / OUTLINE CONTROLS
            <div className="property-section">
                <div className="property-row">
                    <div className="property-label">Outline (Stroke)</div>
                    <input type="color" value={strokeColor} onChange={(e) => { setStrokeColor(e.target.value); updateTextStyle({ strokeColor: e.target.value }); }} style={{ width: 30, height: 20, border: 'none', background: 'none', cursor: 'pointer' }} />
                </div>
                <div className="slider-container">
                    <input type="range" min="0" max="10" step="0.5" value={strokeWidth} 
                        style={getSliderStyle(strokeWidth, 0, 10)} 
                        onChange={(e) => { 
                            const val = parseFloat(e.target.value);
                            setStrokeWidth(val); 
                            updateTextStyle({ strokeWidth: val }); 
                        }} 
                    />
                    <span className="property-value-box">{strokeWidth}px</span>
                </div>
            </div>


            <div className="property-section" style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                    <div className="property-label">Spacing</div>
                    <input type="number" className="modern-input" 
                        value={letterSpacing} 
                        onChange={(e) => { 
                            const val = Number(e.target.value);
                            setLetterSpacing(val);
                            updateTextStyle({ letterSpacing: val });
                        }} 
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <div className="property-label">Line Height</div>
                    <input type="number" className="modern-input" step="0.1"
                        value={lineHeight} 
                        onChange={(e) => { 
                            const val = Number(e.target.value);
                            setLineHeight(val);
                            updateTextStyle({ lineHeight: val });
                        }} 
                    />
                </div>
            </div> */}



            {/* 3. ✅ NEW: STROKE / OUTLINE SECTION */}
            <div className="property-section">
              <div className="property-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Outline</span>
                <span className="property-value-box">{strokeWidth}px</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={strokeColor} onChange={(e) => { setStrokeColor(e.target.value); updateTextStyle({ strokeColor: e.target.value }); }} className="color-picker-small" />
                <input
                  type="range" min="0" max="10" step="0.5"
                  value={strokeWidth}
                  style={getSliderStyle(strokeWidth, 0, 10)}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setStrokeWidth(v);
                    updateTextStyle({ strokeWidth: v });
                  }}
                />
              </div>
            </div>

            {/* 4. ✅ NEW: SHADOW SECTION (Mapped from CSS) */}
            <div className="property-section">
              <div className="property-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={shadowEnabled}
                    onChange={(e) => {
                      setShadowEnabled(e.target.checked);
                      updateTextStyle({ shadowEnabled: e.target.checked });
                    }}
                  />
                  <span>Drop Shadow / Glow</span>
                </div>
                {shadowEnabled && <input type="color" value={shadowColor} onChange={(e) => { setShadowColor(e.target.value); updateTextStyle({ shadowColor: e.target.value }); }} className="color-picker-small" />}
              </div>

              {shadowEnabled && (
                <div className="sub-controls" style={{ paddingLeft: 10, borderLeft: '2px solid #333', marginTop: 8 }}>
                  {/* Blur */}
                  <div className="slider-row">
                    <span className="mini-label">Blur</span>
                    <input type="range" min="0" max="50" value={shadowBlur} style={getSliderStyle(shadowBlur, 0, 50)} onChange={(e) => { setShadowBlur(parseFloat(e.target.value)); updateTextStyle({ shadowBlur: parseFloat(e.target.value) }); }} />
                  </div>
                  {/* X Offset */}
                  <div className="slider-row">
                    <span className="mini-label">X</span>
                    <input type="range" min="-20" max="20" value={shadowX} style={getSliderStyle(shadowBlur, -20, 20)} onChange={(e) => { setShadowX(parseFloat(e.target.value)); updateTextStyle({ shadowX: parseFloat(e.target.value) }); }} />
                  </div>
                  {/* Y Offset */}
                  <div className="slider-row">
                    <span className="mini-label">Y</span>
                    <input type="range" min="-20" max="20" value={shadowY} style={getSliderStyle(shadowBlur, -20, 20)} onChange={(e) => { setShadowY(parseFloat(e.target.value)); updateTextStyle({ shadowY: parseFloat(e.target.value) }); }} />
                  </div>
                </div>
              )}
            </div>

            <div className="divider"></div>

            {/* 5. ✅ NEW: SPACING & LINE HEIGHT */}
            <div className="property-row-dual">
              <div className="half-col">
                <span className="property-label">Spacing</span>
                <input type="number" value={letterSpacing} onChange={(e) => { setLetterSpacing(Number(e.target.value)); updateTextStyle({ letterSpacing: Number(e.target.value) }); }} className="modern-input" />
              </div>
              <div className="half-col">
                <span className="property-label">Line Height</span>
                <input type="number" step="0.1" value={lineHeight} onChange={(e) => { setLineHeight(Number(e.target.value)); updateTextStyle({ lineHeight: Number(e.target.value) }); }} className="modern-input" />
              </div>
            </div>

            <div className="divider" />



            <div className="property-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="property-label">Background Box</div>
              <input
                type="checkbox"
                checked={isBgEnabled}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateStyle({ backgroundColor: 'rgba(0,0,0,0.6)', backgroundOpacity: 0.6, borderRadius: 8, padding: 10 });
                  } else {
                    updateStyle({ backgroundColor: 'transparent' });
                  }
                }}
              />
            </div>

            {isBgEnabled && (
              <>
                <div className="property-row">
                  <div className="property-label">Box Color</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="color" className="color-picker" value={currentBgColor.startsWith('#') ? currentBgColor : '#000000'} onChange={(e) => updateStyle({ backgroundColor: e.target.value })} />
                  </div>
                </div>
                <div className="property-row">
                  <div className="property-label-row">
                    <div className="property-label"><span>Box Opacity</span> <span className="property-value-box">{Math.round((selectedItem.style?.backgroundOpacity ?? 0.6) * 100)}%</span></div>
                  </div>
                  <div className="slider-container">
                    <input type="range" min="0" max="1" step="0.1" value={selectedItem.style?.backgroundOpacity ?? 0.6} onChange={(e) => updateStyle({ backgroundOpacity: parseFloat(e.target.value) })} style={getSliderStyle(selectedItem.style?.backgroundOpacity ?? 0.6, 0, 1)} />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* --- TRANSFORM TAB --- */}
        {tab === 'transform' && (
          <>
            {/* Added Alignment Controls to Transform Tab */}
            {renderAlignmentControls()}

            {(isImage || isVideo) && (
              <>
                <div className="property-section">
                  <div className="property-label">Transform</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: '#666', marginBottom: 4, display: 'block', fontWeight: 'bold' }}>X</span>
                      <input type="number" className="modern-input" value={xPos} onChange={(e) => handleTransformChange('x', e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: '#666', marginBottom: 4, display: 'block', fontWeight: 'bold' }}>Y</span>
                      <input type="number" className="modern-input" value={yPos} onChange={(e) => handleTransformChange('y', e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: '#666', marginBottom: 4, display: 'block', fontWeight: 'bold' }}>ROT</span>
                      <input type="number" className="modern-input" value={rotation} onChange={(e) => handleTransformChange('rot', e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="property-section">
                  <div className="property-label">Size & Scale</div>
                  <div className="slider-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#888' }}>Relative to Canvas</span>
                      <span style={{ fontSize: 10, color: '#D1FE17' }}>{relScale}%</span>
                    </div>
                    <input type="range" min="1" max="100" value={relScale} style={getSliderStyle(relScale, 1, 100)} onChange={(e) => handleSizeChange('scale', e.target.value)} />
                  </div>
                </div>
              </>
            )}
            {(isImage || isVideo) && (
              <div className="property-section">
                <div className="property-label"><span>Opacity</span><span className="property-value-box">{Math.round(opacity)}%</span></div>
                <div className="slider-container">
                  <input type="range" min="0" max="100" value={opacity} style={getSliderStyle(opacity, 0, 100)} onChange={(e) => { setOpacity(e.target.value); triggerUpdate({ opacity: e.target.value / 100 }); }} />
                </div>
              </div>
            )}
          </>
        )}

        {/* --- AUDIO PROPS --- */}
        {/* {tab === 'props' && isAudio && (
           <>
                 <div className="divider" />
                 <div className="property-section">
                    <div className="property-label"><span>Volume</span><span className="property-value-box">{volume}%</span></div>
                    <div className="slider-container">
                        <input type="range" min="0" max="100" value={volume} disabled={isMuted} style={getSliderStyle(volume, 0, 100)} onChange={(e) => { setVolume(parseInt(e.target.value)); triggerUpdate({ volume: parseInt(e.target.value) / 100 }); }} />
                    </div>
                 </div>
                 <div className="property-section">
                    <div className="property-label"><span>Fade In/Out</span></div>
                    <div style={{display:'flex', gap:10}}>
                       <div style={{flex:1}}>
                           <span style={{fontSize:10, color:'#888'}}>In: {fadeIn}s</span>
                           <input type="range" min="0" max="5" step="0.5" value={fadeIn} style={getSliderStyle(fadeIn, 0, 5)} onChange={(e) => { setFadeIn(parseFloat(e.target.value)); triggerUpdate({ fadeIn: parseFloat(e.target.value) }); }} />
                       </div>
                       <div style={{flex:1}}>
                           <span style={{fontSize:10, color:'#888'}}>Out: {fadeOut}s</span>
                           <input type="range" min="0" max="5" step="0.5" value={fadeOut} style={getSliderStyle(fadeOut, 0, 5)} onChange={(e) => { setFadeOut(parseFloat(e.target.value)); triggerUpdate({ fadeOut: parseFloat(e.target.value) }); }} />
                       </div>
                    </div>
                 </div>
           </>
        )} */}


        {(tab === 'props' || tab === 'transform') && (isVideo || isAudio) && (
          <>
            <div className="divider" />
            <div className="property-section">
              <div className="property-label"><span>Volume</span><span className="property-value-box">{volume}%</span></div>
              <div className="slider-container">
                <input type="range" min="0" max="100" value={volume} disabled={isMuted} style={getSliderStyle(volume, 0, 100)} onChange={(e) => { setVolume(parseInt(e.target.value)); triggerUpdate({ volume: parseInt(e.target.value) / 100 }); }} />
              </div>
            </div>
            <div className="divider" />
            <div className="property-section">
              <div className="property-label"><span>Fade In (Audio)</span><span className="property-value-box">{fadeIn}s</span></div>
              <div className="slider-container">
                <input type="range" min="0" max="5" step="0.5" value={fadeIn} style={getSliderStyle(fadeIn, 0, 5)} onChange={(e) => { setFadeIn(parseFloat(e.target.value)); triggerUpdate({ fadeIn: parseFloat(e.target.value) }); }} />
              </div>
            </div>
            <div className="property-section">
              <div className="property-label"><span>Fade Out (Audio)</span><span className="property-value-box">{fadeOut}s</span></div>
              <div className="slider-container">
                <input type="range" min="0" max="5" step="0.5" value={fadeOut} style={getSliderStyle(fadeOut, 0, 5)} onChange={(e) => { setFadeOut(parseFloat(e.target.value)); triggerUpdate({ fadeOut: parseFloat(e.target.value) }); }} />
              </div>
            </div>
            <div className="divider" />
            <label className="mute-row">
              <span>Mute Audio</span>
              <input type="checkbox" checked={isMuted} onChange={(e) => { setIsMuted(e.target.checked); triggerUpdate({ muted: e.target.checked }); }} />
            </label>
          </>
        )}

        {tab === 'masking' && (
          <div className="property-section">
            <div className="property-label">Mask Shape</div>
            <div className="mask-grid">
              {MASK_SHAPES.map(mask => (
                <div key={mask.id} onClick={() => applyMask(mask.id)} className={`mask-item ${selectedMask === mask.id ? 'selected' : ''}`}>
                  <span className="material-icons" style={{ fontSize: 22 }}>{mask.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{mask.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;




