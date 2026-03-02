


import React, { useState } from 'react';
import './PropertiesPanel.css';

// --- CONSTANTS ---
const ANIMATION_TYPES = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slideLeft', label: 'Slide In Left' },
  { id: 'slideRight', label: 'Slide In Right' },
  { id: 'slideUp', label: 'Slide In Up' },
  { id: 'slideDown', label: 'Slide In Down' },
  { id: 'zoom', label: 'Zoom / Scale' },
  { id: 'wipeLeft', label: 'Wipe Left' },
  { id: 'wipeRight', label: 'Wipe Right' }
];

const FONTS = [
  'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Raleway', 'Oswald',
  'Anton', 'Bangers', 'Russo One',
  'Cinzel', 'Playfair Display', 'Abril Fatface',
  'Dancing Script', 'Pacifico', 'Permanent Marker', 'The Girl Next Door',
  'Orbitron', 'Press Start 2P', 'Righteous',
  'Creepster', 'Special Elite'
];

const TRANSITIONS = [
    { id: 'fade', label: 'Fade' },
    { id: 'slideLeft', label: 'Slide Left' },
    { id: 'slideRight', label: 'Slide Right' },
    { id: 'slideUp', label: 'Slide Up' },
    { id: 'slideDown', label: 'Slide Down' },
    { id: 'wipe', label: 'Wipe Right' },
    { id: 'wipeLeft', label: 'Wipe Left' },
    { id: 'zoom', label: 'Zoom' }
];

const GlobalPropertiesPanel = ({ onApplyGlobal, onApplyTransitions }) => {
    // --- STATE ---
    // General
    const [volume, setVolume] = useState(100);
    const [opacity, setOpacity] = useState(100);
    const [fadeIn, setFadeIn] = useState(0);
    const [fadeOut, setFadeOut] = useState(0);

    // Animation
    const [animIn, setAnimIn] = useState('none');
    const [animOut, setAnimOut] = useState('none');
    const [animDur, setAnimDur] = useState(1.0);

    // Text Styling
    const [fontFamily, setFontFamily] = useState('Roboto');
    const [textColor, setTextColor] = useState('#ffffff');
    const [bgColor, setBgColor] = useState('#000000');
    const [bgOpacity, setBgOpacity] = useState(0); 
    const [fontSize, setFontSize] = useState(50);

    // Transitions
    const [transType, setTransType] = useState('fade');
    const [transDur, setTransDur] = useState(0.5);

    // Layout State
    const [openSection, setOpenSection] = useState('general'); 

    // --- HANDLERS ---
    const toggleSection = (sec) => setOpenSection(openSection === sec ? null : sec);

    // APPLY Handlers
    const handleApplyGeneral = (prop, val) => {
        let update = {};
        if (prop === 'volume') update = { volume: val / 100 };
        if (prop === 'opacity') update = { opacity: val / 100 };
        if (prop === 'fadeIn') update = { fadeIn: val };
        if (prop === 'fadeOut') update = { fadeOut: val };
        onApplyGlobal(update);
    };

    const handleApplyAnimation = () => {
        onApplyGlobal({
            _scope: 'visual',
            animation: {
                in: { type: animIn, duration: animDur },
                out: { type: animOut, duration: animDur }
            }
        });
    };

    const handleApplyText = () => {
        onApplyGlobal({
            _scope: 'text',
            style: {
                fontFamily,
                color: textColor,
                backgroundColor: bgColor,
                backgroundOpacity: bgOpacity / 100,
                fontSize: Number(fontSize)
            }
        });
    };

    const handleApplyTransitions = () => {
        if (typeof onApplyTransitions === 'function') {
            onApplyTransitions(transType, transDur);
        } else {
            console.error('onApplyTransitions is not a function!');
        }
    };

    // --- RESET HANDLERS ---
    const resetVolume = () => { setVolume(100); handleApplyGeneral('volume', 100); };
    const resetOpacity = () => { setOpacity(100); handleApplyGeneral('opacity', 100); };
    const resetFadeIn = () => { setFadeIn(0); handleApplyGeneral('fadeIn', 0); };
    const resetFadeOut = () => { setFadeOut(0); handleApplyGeneral('fadeOut', 0); };

    const handleResetAnimation = () => {
        setAnimIn('none');
        setAnimOut('none');
        setAnimDur(1.0);
        onApplyGlobal({
            _scope: 'visual',
            animation: {
                in: { type: 'none', duration: 1.0 },
                out: { type: 'none', duration: 1.0 }
            }
        });
    };

    const handleResetText = () => {
        setFontFamily('Roboto');
        setTextColor('#ffffff');
        setBgColor('#000000');
        setBgOpacity(0);
        setFontSize(50);
        onApplyGlobal({
            _scope: 'text',
            style: {
                fontFamily: 'Roboto',
                color: '#ffffff',
                backgroundColor: 'transparent',
                backgroundOpacity: 0,
                fontSize: 50
            }
        });
    };

    const handleResetTransitions = () => {
        setTransType('fade');
        setTransDur(0.5);
        if (typeof onApplyTransitions === 'function') {
            // Passing 'none' will signify removing the transitions
            onApplyTransitions('none', 0);
        }
    };

    return (
        <div className="global-properties-container">
            <div className="gp-header">
                <h3>Global Adjustments</h3>
                <p>Apply settings to all matching clips in timeline.</p>
            </div>

            <div className="gp-scroll-area">
                
                {/* 1. GENERAL SECTION */}
                <SectionItem 
                    title="General & Audio" 
                    icon="tune" 
                    isOpen={openSection === 'general'} 
                    onToggle={() => toggleSection('general')}
                >
                    <ControlRow label="Volume" value={volume} displayValue={`${volume}%`} min={0} max={100} 
                        onChange={setVolume} onApply={() => handleApplyGeneral('volume', volume)} onReset={resetVolume} />
                    
                    <ControlRow label="Opacity" value={opacity} displayValue={`${opacity}%`} min={0} max={100} 
                        onChange={setOpacity} onApply={() => handleApplyGeneral('opacity', opacity)} onReset={resetOpacity} />
                    
                    <div className="gp-divider"></div>
                    
                    <ControlRow label="Fade In" value={fadeIn} displayValue={`${fadeIn}s`} min={0} max={5} step={0.5} 
                        onChange={setFadeIn} onApply={() => handleApplyGeneral('fadeIn', fadeIn)} onReset={resetFadeIn} />
                    
                    <ControlRow label="Fade Out" value={fadeOut} displayValue={`${fadeOut}s`} min={0} max={5} step={0.5} 
                        onChange={setFadeOut} onApply={() => handleApplyGeneral('fadeOut', fadeOut)} onReset={resetFadeOut} />
                </SectionItem>

                {/* 2. ANIMATION SECTION */}
                <SectionItem 
                    title="Animations" 
                    icon="animation" 
                    isOpen={openSection === 'anim'} 
                    onToggle={() => toggleSection('anim')}
                >
                    <div className="gp-grid-row">
                        <div className="gp-input-group">
                            <label>Entrance</label>
                            <select value={animIn} onChange={e => setAnimIn(e.target.value)}>
                                {ANIMATION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="gp-input-group">
                            <label>Exit</label>
                            <select value={animOut} onChange={e => setAnimOut(e.target.value)}>
                                {ANIMATION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <ControlRow label="Duration" value={animDur} displayValue={`${animDur}s`} min={0.5} max={3.0} step={0.5} 
                        onChange={setAnimDur} hideApply />

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button className="gp-action-btn" style={{ flex: 2, marginTop: 0 }} onClick={handleApplyAnimation}>
                            <span className="material-icons">auto_fix_high</span> Apply
                        </button>
                        <button className="gp-action-btn secondary" style={{ flex: 1, marginTop: 0 }} onClick={handleResetAnimation}>
                            <span className="material-icons">refresh</span> Reset
                        </button>
                    </div>
                </SectionItem>

                {/* 3. TEXT SECTION */}
                <SectionItem 
                    title="Text Styling" 
                    icon="text_fields" 
                    isOpen={openSection === 'text'} 
                    onToggle={() => toggleSection('text')}
                >
                    <div className="gp-input-group">
                        <label>Font Family</label>
                        <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    <div className="gp-grid-row">
                        <div className="gp-input-group">
                            <label>Text Color</label>
                            <div className="color-preview-wrapper">
                                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                                <span className="color-hex">{textColor.toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="gp-input-group">
                            <label>Font Size</label>
                            <input type="number" value={fontSize} onChange={e => setFontSize(e.target.value)} 
                                   style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)', 
                                            color:'#fff', padding:'8px', borderRadius:'4px', outline:'none' }} />
                        </div>
                    </div>

                    <div className="gp-input-group">
                        <label>Background Color</label>
                        <div className="color-preview-wrapper">
                            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
                            <span className="color-hex">{bgColor.toUpperCase()}</span>
                        </div>
                    </div>

                    <ControlRow label="BG Opacity" value={bgOpacity} displayValue={`${bgOpacity}%`} min={0} max={100} 
                        onChange={setBgOpacity} hideApply />

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button className="gp-action-btn" style={{ flex: 2, marginTop: 0 }} onClick={handleApplyText}>
                            <span className="material-icons">text_format</span> Apply
                        </button>
                        <button className="gp-action-btn secondary" style={{ flex: 1, marginTop: 0 }} onClick={handleResetText}>
                            <span className="material-icons">refresh</span> Reset
                        </button>
                    </div>
                </SectionItem>

                {/* 4. TRANSITIONS SECTION */}
                <SectionItem 
                    title="Transitions" 
                    icon="swap_horiz" 
                    isOpen={openSection === 'trans'} 
                    onToggle={() => toggleSection('trans')}
                >
                    <div className="gp-info-box">
                        <span className="material-icons">info</span>
                        <span>Apply default transitions between all clips</span>
                    </div>

                    <div className="gp-input-group">
                        <label>Transition Type</label>
                        <select value={transType} onChange={e => setTransType(e.target.value)}>
                            {TRANSITIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>

                    <ControlRow 
                        label="Duration" 
                        value={transDur} 
                        displayValue={`${transDur}s`} 
                        min={0.1} 
                        max={3.0} 
                        step={0.1} 
                        onChange={setTransDur}
                        hideApply
                    />

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button className="gp-action-btn" style={{ flex: 2, marginTop: 0 }} onClick={handleApplyTransitions}>
                            <span className="material-icons">sync_alt</span> Apply
                        </button>
                        <button className="gp-action-btn secondary" style={{ flex: 1, marginTop: 0 }} onClick={handleResetTransitions} title="Clear Transitions">
                            <span className="material-icons">refresh</span> Reset
                        </button>
                    </div>

                    <div className="gp-info-box" style={{ marginTop: '12px', fontSize: '10px' }}>
                        <span className="material-icons">warning</span>
                        <span>This will replace existing transitions</span>
                    </div>
                </SectionItem>

            </div>

            {/* INLINE STYLES */}
            <style>{`
                .global-properties-container {
                    width: 100%;
                    height: 100%;
                    background: #1a1a1a;
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .gp-header {
                    padding: 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                    background: rgba(0,0,0,0.2);
                }
                .gp-header h3 {
                    font-size: 15px;
                    margin: 0 0 4px 0;
                    font-weight: 600;
                    color: #fff;
                }
                .gp-header p {
                    font-size: 11px;
                    margin: 0;
                    color: #888;
                    line-height: 1.4;
                }

                .gp-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 12px;
                }
                .gp-scroll-area::-webkit-scrollbar { width: 6px; }
                .gp-scroll-area::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
                .gp-scroll-area::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
                .gp-scroll-area::-webkit-scrollbar-thumb:hover { background: #666; }

                .gp-section {
                    background: #202020;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 6px;
                    margin-bottom: 10px;
                    transition: all 0.2s;
                }
                .gp-section.open {
                    border-color: rgba(255,255,255,0.15);
                    background: #252525;
                }
                .gp-section-head {
                    display: flex;
                    align-items: center;
                    padding: 12px 14px;
                    cursor: pointer;
                    user-select: none;
                }
                .gp-section-head:hover {
                    background: rgba(255,255,255,0.03);
                }
                .gp-sec-icon { font-size: 18px; color: #D1FE17; margin-right: 10px; opacity: 0.8; }
                .gp-sec-title { font-size: 13px; font-weight: 600; flex: 1; color: #eee; }
                .gp-sec-arrow { font-size: 18px; color: #666; transition: transform 0.2s; }
                .gp-section.open .gp-sec-arrow { transform: rotate(180deg); color: #fff; }

                .gp-section-body {
                    padding: 0 14px 16px;
                    border-top: 1px solid rgba(255,255,255,0.05);
                    animation: slideDown 0.2s ease-out;
                }

                /* Controls */
                .gp-row {
                    margin-top: 14px;
                }
                .gp-row-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                    font-size: 11px;
                    font-weight: 600;
                    color: #aaa;
                    text-transform: uppercase;
                }
                .gp-val { color: #D1FE17; font-family: monospace; }
                
                .gp-slider-wrap {
                    display: flex;
                    align-items: center;
                    gap: 8px; /* Slightly reduced gap to fit reset button */
                }
                .gp-slider {
                    flex: 1;
                    height: 4px;
                    border-radius: 2px;
                    outline: none;
                    -webkit-appearance: none;
                    cursor: pointer;
                }
                .gp-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 12px; height: 12px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }

                /* Inputs & Selects */
                .gp-input-group { margin-top: 14px; }
                .gp-input-group label {
                    display: block;
                    font-size: 11px;
                    color: #aaa;
                    margin-bottom: 6px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .gp-input-group select {
                    width: 100%;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #fff;
                    padding: 8px 10px;
                    border-radius: 4px;
                    font-size: 13px;
                    outline: none;
                    cursor: pointer;
                }
                .gp-input-group select:focus { border-color: #D1FE17; }

                /* Grids */
                .gp-grid-row { display: flex; gap: 12px; }
                .gp-grid-row > * { flex: 1; }

                /* Colors */
                .color-preview-wrapper {
                    display: flex;
                    align-items: center;
                    background: rgba(0,0,0,0.3);
                    padding: 4px;
                    border-radius: 4px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .color-preview-wrapper input[type="color"] {
                    -webkit-appearance: none;
                    width: 24px; height: 24px;
                    border: none; padding: 0;
                    background: none;
                    cursor: pointer;
                    margin-right: 8px;
                }
                .color-preview-wrapper input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
                .color-preview-wrapper input[type="color"]::-webkit-color-swatch { border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; }
                .color-preview-wrapper input[type="color"]::-moz-color-swatch { border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; }
                .color-hex { font-size: 11px; color: #bbb; font-family: monospace; }

                /* Buttons */
                .gp-mini-apply {
                    background: rgba(255,255,255,0.08);
                    border: none;
                    color: #ccc;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                .gp-mini-apply:hover { background: #D1FE17; color: #000; }

                /* Reset Icon Button next to sliders */
                .gp-mini-reset {
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: #aaa;
                    border-radius: 4px;
                    padding: 2px 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .gp-mini-reset:hover { background: #ff4444; color: #fff; }
                .gp-mini-reset .material-icons { font-size: 14px; }

                .gp-action-btn {
                    width: 100%;
                    margin-top: 16px;
                    padding: 10px;
                    background: rgba(209, 254, 23, 0.1);
                    border: 1px solid rgba(209, 254, 23, 0.3);
                    color: #D1FE17;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .gp-action-btn:hover { background: #D1FE17; color: #000; }
                .gp-action-btn .material-icons { font-size: 16px; }

                /* Reset secondary button style */
                .gp-action-btn.secondary {
                    background: rgba(255,255,255,0.05);
                    border-color: rgba(255,255,255,0.1);
                    color: #aaa;
                }
                .gp-action-btn.secondary:hover {
                    background: #ff4444;
                    border-color: #ff4444;
                    color: #fff;
                }

                .gp-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 12px 0; }
                
                .gp-info-box {
                    font-size: 11px; color: #888;
                    background: rgba(255,255,255,0.05);
                    padding: 8px; border-radius: 4px;
                    display: flex; align-items: center; gap: 6px;
                    margin-top: 10px;
                }
                .gp-info-box .material-icons { font-size: 14px; }

                @keyframes slideDown { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }
            `}</style>
        </div>
    );
};

// --- SUB-COMPONENTS FOR CLEANER CODE ---

const SectionItem = ({ title, icon, isOpen, onToggle, children }) => (
    <div className={`gp-section ${isOpen ? 'open' : ''}`}>
        <div className="gp-section-head" onClick={onToggle}>
            <span className="material-icons gp-sec-icon">{icon}</span>
            <span className="gp-sec-title">{title}</span>
            <span className="material-icons gp-sec-arrow">expand_more</span>
        </div>
        {isOpen && <div className="gp-section-body">{children}</div>}
    </div>
);

// Added onReset to props
const ControlRow = ({ label, value, displayValue, min, max, step=1, onChange, onApply, onReset, hideApply }) => {
    const bgStyle = {
        background: `linear-gradient(to right, #D1FE17 ${((value-min)/(max-min))*100}%, #444 ${((value-min)/(max-min))*100}%)`
    };

    return (
        <div className="gp-row">
            <div className="gp-row-header">
                <span>{label}</span>
                <span className="gp-val">{displayValue}</span>
            </div>
            <div className="gp-slider-wrap">
                <input 
                    type="range" 
                    className="gp-slider"
                    min={min} max={max} step={step} 
                    value={value} 
                    style={bgStyle}
                    onChange={(e) => onChange(Number(e.target.value))}
                    onMouseUp={onApply}
                    onTouchEnd={onApply}
                />
                {onReset && (
                    <button className="gp-mini-reset" onClick={onReset} title="Reset to Default">
                        <span className="material-icons">refresh</span>
                    </button>
                )}
                {!hideApply && (
                    <button className="gp-mini-apply" onClick={onApply} title="Apply to All">
                        Apply
                    </button>
                )}
            </div>
        </div>
    );
};

export default GlobalPropertiesPanel;