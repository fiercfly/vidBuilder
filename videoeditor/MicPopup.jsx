// ─────────────────────────────────────────────────────────────
//  MicPopup.jsx
// ─────────────────────────────────────────────────────────────

import React    from 'react';
import ReactDOM from 'react-dom';
import { useMicRecorder } from './useVideoEditorHooks';

/* ── language + voice options (No Emojis) ───────────────────── */
const VOICE_MAP = {
  english: [
    { id: 'matthew', label: 'Matthew',  desc: 'Professional & clear' },
    { id: 'sophia',  label: 'Sophia',   desc: 'Warm & natural'       },
    { id: 'ryan',    label: 'Ryan',     desc: 'Energetic & fast'     },
    { id: 'alice',   label: 'Alice',    desc: 'Calm narrator'        },
    { id: 'marcus',  label: 'Marcus',   desc: 'Deep & authoritative' },
    { id: 'luna',    label: 'Luna',     desc: 'Soft & whispery'      },
  ],
  hindi: [
    { id: 'phoolchand',  label: 'Phoolchand',  desc: 'Meetha awaaz'      },
    { id: 'chintu',      label: 'Chintu',      desc: 'Ekdum chikna'       },
    { id: 'chaman',      label: 'Chaman',      desc: 'Dil ki baat'        },
    { id: 'Rinku',       label: 'Rinku',       desc: 'Gehri aawaz'        },
    { id: 'pappu',       label: 'Pappu',       desc: 'Thoda pagal'        },
    { id: 'guddi',       label: 'Guddi',       desc: 'Pyaari si'          },
  ],
};

const LANGUAGES = [
  { id: 'english', label: 'English', flag: '🇺🇸' },
  { id: 'hindi',   label: 'Hindi',   flag: '🇮🇳' },
];

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   views: 'menu' | 'record' | 'tts'
══════════════════════════════════════════════════════════════ */
export default function MicPopup({ isOpen, onClose, onAddAudio, showToast, canvasRef }) {
  const [view,       setView]       = React.useState('menu');
  const [ttsText,    setTtsText]    = React.useState('');
  const [language,   setLanguage]   = React.useState('english');
  const [voice,      setVoice]      = React.useState('matthew');
  const [ttsLoading, setTtsLoading] = React.useState(false);
  const textareaRef = React.useRef(null);

  /* ── recording hook ──────────────────────────────────────── */
  const handleDone = React.useCallback((file, dur) => {
    onAddAudio?.(file, dur);
    showToast?.('🎙 Recording added to timeline!');
    setView('menu');
    onClose?.();
  }, [onAddAudio, showToast, onClose]);

  const { isRecording, recordingTime, hasPermission, startRecording, stopRecording, cancelRecording } =
    useMicRecorder({ onRecordingComplete: handleDone });

  /* ── lifecycle ───────────────────────────────────────────── */
  React.useEffect(() => {
    if (isOpen) { setView('menu'); setTtsText(''); }
  }, [isOpen]);

  React.useEffect(() => {
    if (view === 'tts') setTimeout(() => textareaRef.current?.focus(), 60);
  }, [view]);

  React.useEffect(() => {
    if (!isOpen && isRecording) {
      cancelRecording?.() || stopRecording();
    }
  }, [isOpen, isRecording, stopRecording, cancelRecording]);

  /* ── when language changes, reset voice to first of that language ── */
  React.useEffect(() => {
    const voiceExists = VOICE_MAP[language].find(v => v.id === voice);
    if (!voiceExists) {
      setVoice(VOICE_MAP[language][0].id);
    }
  }, [language, voice]);

  /* ── Cancel handler ──────────────────────────────────────── */
  const handleCancel = React.useCallback(() => {
    if (cancelRecording) cancelRecording();
    else stopRecording();
    setView('menu');
  }, [cancelRecording, stopRecording]);

  /* ── TTS generate ────────────────────────────────────────── */
  const handleGenerate = React.useCallback(async () => {
    if (!ttsText.trim()) { showToast?.('Please enter some text.'); return; }
    setTtsLoading(true);
    try {
      // ── Replace with API call ──
      await new Promise(r => setTimeout(r, 1400));
      showToast?.(`TTS stub — Voice: ${voice}, Lang: ${language}`);
      setView('menu');
      onClose?.();
    } catch (e) {
      console.error('[MicPopup TTS]', e);
      showToast?.('TTS failed.');
    } finally {
      setTtsLoading(false);
    }
  }, [ttsText, voice, language, onAddAudio, showToast, onClose]);

  /* ── portal target ───────────────────────────────────────── */
  const portalTarget = canvasRef?.current ?? document.body;

  if (!isOpen) return null;

  const currentVoices = VOICE_MAP[language];
  const charCount = ttsText.length;
  const MAX_CHARS = 500;

  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes mp-in {
          from { opacity:0; transform:translate(-50%,-48%) scale(.93); }
          to   { opacity:1; transform:translate(-50%,-50%) scale(1);   }
        }
        @keyframes mp-wave  { from{height:6px} to{height:44px} }
        @keyframes mp-pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(255,75,75,.55)}
          55%    {box-shadow:0 0 0 20px rgba(255,75,75,0)}
        }
        @keyframes mp-blink { 0%,100%{opacity:1} 50%{opacity:.15} }
        @keyframes mp-spin  { to{transform:rotate(360deg)} }

        .mp-backdrop {
          position:absolute; inset:0; z-index:900;
          background:rgba(0,0,0,.65);
          backdrop-filter:blur(6px);
          -webkit-backdrop-filter:blur(6px);
        }
        .mp-card {
          position:absolute; top:50%; left:50%;
          transform:translate(-50%,-50%);
          z-index:901;
          background:#111113;
          border:1px solid rgba(255,255,255,.09);
          border-radius:20px;
          box-shadow:0 40px 100px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.05);
          color:#f0f0f0; font-family:inherit; overflow:hidden;
          animation:mp-in .2s cubic-bezier(.34,1.4,.64,1) both;
        }

        /* ── Common Utilities ── */
        .mp-icon-btn {
          width:30px; height:30px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
          color:#999; cursor:pointer; transition:background .15s;
        }
        .mp-icon-btn:hover { background:rgba(255,255,255,.12); }

        .mp-row {
          display:flex; align-items:center; gap:16px;
          background:rgba(255,255,255,.025);
          border:1.5px solid rgba(255,255,255,.07);
          border-radius:14px; padding:14px 16px;
          cursor:pointer; text-align:left; width:100%; color:#f0f0f0;
          transition:background .15s, border-color .15s, transform .15s;
        }
        .mp-row:hover {
          background:rgba(255,255,255,.055);
          border-color:rgba(255,255,255,.18);
          transform:translateY(-2px);
        }

        /* ── TTS Specific Layout ── */
        .mp-tts-container {
          padding: 24px 24px 20px;
          height: 400px;
          display: flex; flex-direction: column;
        }

        .mp-tts-header {
          display:flex; align-items:center; gap:12px; margin-bottom:16px; flex-shrink:0;
        }

        /* The big text area wrapper */
        .mp-textarea-wrapper {
          flex:1; position:relative; display:flex; flex-direction:column;
          background:rgba(255,255,255,.03);
          border:1px solid rgba(255,255,255,.08);
          border-radius:14px;
          transition: border-color .2s;
        }
        .mp-textarea-wrapper:focus-within {
          border-color:rgba(209,254,23,.4);
          background:rgba(255,255,255,.045);
        }
        .mp-ta {
          flex:1; width:100%; box-sizing:border-box;
          background:transparent; border:none;
          color:#f0f0f0; font-size:16px; line-height:1.6;
          padding:16px; resize:none; outline:none;
          font-family:inherit;
        }
        .mp-ta::placeholder { color:rgba(255,255,255,0.2); }

        .mp-char-count {
          padding: 0 16px 12px; text-align:right;
          font-size:11px; color:#555;
        }

        /* ── Bottom Bar ── */
        .mp-footer-bar {
          display: flex; align-items:center; justify-content:space-between;
          margin-top: 16px; gap: 12px; flex-shrink:0;
        }

        .mp-footer-left {
          display:flex; align-items:center; gap:8px;
        }

        /* ── Dropdown Buttons (Pills) ── */
        .mp-select-pill {
          position:relative;
          display:flex; align-items:center; gap:6px;
          height: 40px;
          padding: 0 12px 0 10px;
          background:rgba(255,255,255,.06);
          border:1px solid rgba(255,255,255,.1);
          border-radius:10px;
          color:#e0e0e0; font-size:13px; font-weight:600;
          cursor:pointer;
          transition: background .15s;
        }
        .mp-select-pill:hover { background:rgba(255,255,255,.1); }
        
        /* The native select sits on top, invisible but clickable */
        .mp-native-select {
          position:absolute; inset:0; opacity:0; width:100%; height:100%;
          cursor:pointer; appearance:none;
        }

        /* ── Generate Button ── */
        .mp-gen-btn {
          height: 40px; padding: 0 20px;
          border-radius:10px; border:none;
          background:#D1FE17; color:#000;
          font-size:13px; font-weight:700;
          display:flex; align-items:center; gap:6px;
          cursor:pointer;
          box-shadow:0 4px 12px rgba(209,254,23,.2);
          transition: transform .1s, opacity .1s;
        }
        .mp-gen-btn:hover:not(:disabled) { transform:translateY(-1px); opacity:0.9; }
        .mp-gen-btn:disabled { background:rgba(255,255,255,.1); color:#555; box-shadow:none; cursor:not-allowed; }

        /* ── Record View Styles ── */
        .mp-primary {
          width:100%; padding:13px 0; border-radius:12px; border:none;
          font-size:14px; font-weight:700; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:opacity .15s, transform .15s;
        }
        .mp-ghost {
          flex:1; padding:12px 0; border-radius:11px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.09);
          color:#bbb; cursor:pointer; font-size:13px; font-weight:600;
        }
      `}</style>

      {/* backdrop */}
      <div className="mp-backdrop" onClick={onClose} />

      {/* card */}
      <div
        className="mp-card"
        style={{ width: view === 'tts' ? 600 : 340, maxWidth:'calc(100% - 32px)' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ══════════════════════ MENU ══════════════════════ */}
        {view === 'menu' && (
          <div style={{ padding:'26px 24px 22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700, letterSpacing:'-.3px' }}>Add Audio</div>
                <div style={{ fontSize:12, color:'#555', marginTop:3 }}>Choose how to create your audio clip</div>
              </div>
              <button className="mp-icon-btn" onClick={onClose}>
                <span className="material-icons" style={{ fontSize:16 }}>close</span>
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              <button className="mp-row" onClick={() => { setView('record'); startRecording(); }}>
                <div style={{
                  width:48, height:48, borderRadius:'50%', flexShrink:0,
                  background:'rgba(255,75,75,.12)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <span className="material-icons" style={{ color:'#FF4B4B', fontSize:26 }}>mic</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>Record</div>
                  <div style={{ fontSize:12, color:'#555' }}>Capture live audio from your microphone</div>
                </div>
                <span className="material-icons" style={{ color:'#333', fontSize:20 }}>chevron_right</span>
              </button>

              {/* <button className="mp-row" onClick={() => setView('tts')}>
                <div style={{
                  width:48, height:48, borderRadius:'50%', flexShrink:0,
                  background:'rgba(209,254,23,.09)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <span className="material-icons" style={{ color:'#D1FE17', fontSize:26 }}>auto_awesome</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:14, fontWeight:600 }}>Text to Audio</span>
                    <span style={{
                      fontSize:10, fontWeight:800, letterSpacing:'.5px',
                      background:'rgba(209,254,23,.13)', color:'#D1FE17',
                      padding:'2px 7px', borderRadius:5,
                    }}>AI</span>
                  </div>
                  <div style={{ fontSize:12, color:'#555' }}>Type a script, pick a voice &amp; generate</div>
                </div>
                <span className="material-icons" style={{ color:'#333', fontSize:20 }}>chevron_right</span>
              </button> */}
            </div>
          </div>
        )}

        {/* ══════════════════════ RECORD ══════════════════════ */}
        {view === 'record' && (
          <div style={{ padding:'26px 24px 22px' }}>
             <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:26 }}>
              <button className="mp-icon-btn" onClick={handleCancel}>
                <span className="material-icons" style={{ fontSize:16 }}>arrow_back</span>
              </button>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
                  {isRecording && (
                    <span style={{
                      width:8, height:8, borderRadius:'50%', background:'#FF4B4B', display:'inline-block',
                      animationName:'mp-blink', animationDuration:'1.1s', animationIterationCount:'infinite',
                    }}/>
                  )}
                  {isRecording ? 'Recording…' : 'Starting…'}
                </div>
                {hasPermission === false && (
                  <div style={{ fontSize:11, color:'#FF4B4B', marginTop:2 }}>Microphone access denied</div>
                )}
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'center', marginBottom:22 }}>
              <div style={{
                width:80, height:80, borderRadius:'50%',
                background:'rgba(255,75,75,.11)',
                display:'flex', alignItems:'center', justifyContent:'center',
                animation: isRecording ? 'mp-pulse 1.7s infinite' : 'none',
              }}>
                <span className="material-icons" style={{ color:'#FF4B4B', fontSize:42 }}>mic</span>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, height:56, marginBottom:14 }}>
              {Array.from({ length:16 }).map((_,i) => (
                <div key={i} style={{
                  width:4, borderRadius:3, minHeight:6,
                  background: isRecording ? '#D1FE17' : 'rgba(255,255,255,.1)',
                  animationName:           isRecording ? 'mp-wave' : 'none',
                  animationDuration:       '.65s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDirection:      'alternate',
                  animationDelay:          `${i * .055}s`,
                  height:                  isRecording ? undefined : 6,
                  transition:              'background .3s',
                }}/>
              ))}
            </div>

            <div style={{
              textAlign:'center', fontSize:40, fontWeight:700,
              letterSpacing:5, marginBottom:26,
              fontVariantNumeric:'tabular-nums',
              color: isRecording ? '#fff' : '#333',
            }}>
              {fmt(recordingTime)}
            </div>

            <div style={{ display:'flex', gap:9 }}>
              <button className="mp-ghost" onClick={handleCancel}>Cancel</button>
              <button
                className="mp-primary"
                onClick={stopRecording}
                disabled={!isRecording}
                style={{
                  flex:2,
                  background: isRecording ? '#D1FE17' : 'rgba(255,255,255,.06)',
                  color:      isRecording ? '#000'    : '#444',
                }}
              >
                <span className="material-icons" style={{ fontSize:17 }}>stop_circle</span>
                Stop &amp; Add
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════ TTS ══════════════════════ */}
        {/* {view === 'tts' && (
          <div className="mp-tts-container">


            <div className="mp-tts-header">
              <button className="mp-icon-btn" onClick={() => { setView('menu'); setTtsLoading(false); }}>
                <span className="material-icons" style={{ fontSize:16 }}>arrow_back</span>
              </button>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>AI Text to Audio</div>
              </div>
              <button className="mp-icon-btn" onClick={onClose}>
                <span className="material-icons" style={{ fontSize:16 }}>close</span>
              </button>
            </div>


            <div className="mp-textarea-wrapper">
              <textarea
                ref={textareaRef}
                className="mp-ta"
                maxLength={MAX_CHARS}
                placeholder={
                  language === 'hindi'
                    ? 'Apna script yahan likhein…'
                    : 'Type your script here…'
                }
                value={ttsText}
                onChange={e => setTtsText(e.target.value)}
              />
              <div className="mp-char-count">
                <span style={{ color: charCount > MAX_CHARS * 0.9 ? '#FBBF24' : '#555' }}>
                  {charCount}/{MAX_CHARS}
                </span>
              </div>
            </div>


            <div className="mp-footer-bar">
              <div className="mp-footer-left">
                

                <div className="mp-select-pill">
                  <span className="material-icons" style={{ fontSize:16, color:'#999' }}>language</span>
                  <span>{LANGUAGES.find(l => l.id === language)?.label}</span>
                  <span className="material-icons" style={{ fontSize:14, color:'#555' }}>expand_more</span>
                  

                  <select 
                    className="mp-native-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>


                <div className="mp-select-pill">
                  <span>{VOICE_MAP[language].find(v => v.id === voice)?.label}</span>
                  <span className="material-icons" style={{ fontSize:14, color:'#555' }}>expand_more</span>


                   <select 
                    className="mp-native-select"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                  >
                    {VOICE_MAP[language].map(v => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>


              <button
                className="mp-gen-btn"
                onClick={handleGenerate}
                disabled={ttsLoading || !ttsText.trim()}
              >
                {ttsLoading ? (
                   <>
                    <span className="material-icons" style={{ 
                      fontSize:16, animation:'mp-spin 1s linear infinite' 
                    }}>autorenew</span>
                    Generating...
                   </>
                ) : (
                  <>Add Audio <span className="material-icons" style={{fontSize:16}}>arrow_forward</span></>
                )}
              </button>
            </div>

          </div>
        )} */}

      </div>
    </>,
    portalTarget
  );
}