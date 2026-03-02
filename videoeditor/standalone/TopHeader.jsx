import React, { useState, useEffect } from 'react';

const TopHeader = ({ onExport, isExporting }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleProgress = (e) => setProgress(e.detail.percent || 0);
        window.addEventListener('video-export-progress', handleProgress);
        return () => window.removeEventListener('video-export-progress', handleProgress);
    }, []);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            boxSizing: 'border-box',
            color: 'white',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Logo and App Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '32px', height: '32px',
                    background: 'linear-gradient(135deg, #FFCC4D, #F4900C)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 'bold', fontSize: '18px'
                }}>
                    V
                </div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600', letterSpacing: '0.5px' }}>VidBuilder</h1>
            </div>

            {/* Right side controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <a
                    href="https://linkedin.com/kshtjn"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        color: '#bbb',
                        textDecoration: 'none',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#fff'}
                    onMouseLeave={(e) => e.target.style.color = '#bbb'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    .
                </a>

                <button
                    onClick={onExport}
                    disabled={isExporting}
                    className="top-header-export-btn"
                    style={{
                        background: '#FFCC4D',
                        color: '#000',
                        border: 'none',
                        padding: '8px 20px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: isExporting ? 0.7 : 1,
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => { if (!isExporting) e.target.style.background = '#F4900C' }}
                    onMouseLeave={(e) => { if (!isExporting) e.target.style.background = '#FFCC4D' }}
                >
                    {isExporting ? `Exporting... ${progress}%` : 'Export Video'}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <polyline points="9 15 12 18 15 15"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default TopHeader;
