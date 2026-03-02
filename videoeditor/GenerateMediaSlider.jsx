import React, { useState } from 'react';
// import { getRandomID } from "../../Reducer/Canvas_Slicer";
import { setFirebaseDocument, updateAigenerationStart } from "./standalone/sdk_factory";
import { getStudioServiceName } from "./standalone/PaymentService";
import { Lock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { startGeneration, stopGeneration } from "./standalone/GenerationSlice";
import { saveAudioToIndexedDB, saveImageToIndexedDB, saveMediaToIndexedDB } from './indexDbStore';  // adjust the path as needed

const TABS = [
  { key: 'image', label: 'Image', icon: 'image' },
  { key: 'audio', label: 'Audio', icon: 'music_note' },
  { key: 'video', label: 'Video', icon: 'videocam' },
  // Add more tabs here in the future
];

// Reusable Generate button component
export const GenerateButton = ({ onClick, style = {} }) => (
  <button
    onClick={onClick}
    style={{
      background: '#232323',
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      padding: '8px 18px',
      fontWeight: 300,
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      fontSize: '1rem',
      ...style
    }}
  >
    <span className="material-icons" style={{ fontSize: 20, marginRight: 6, color: '#bfaaff' }}>auto_awesome</span>
    Generate...
  </button>
);

const GenerateMediaSlider = ({
  isOpen,
  onClose,
  userId,
  initialTab,
  originTab,
  onMediaGenerated
}) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState("Musicgen");
  const [promptValue, setPromptValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  let uniqueImageIds = [];
  // Add Redux selectors with safe default values
  const userState = useSelector((state) => state.user?.userProductDetails || {});
  const { userType = '' } = userState;

  const billingState = useSelector((state) => state.meterBilling || {});
  const { paymentDetails = {} } = billingState;

  const getModelsForTab = (tab) => {
    switch (tab) {
      case 'image':
        return [
          { value: "StableDiffusion", label: "Stable Diffusion" },
          { value: "DALL-E", label: "DALL-E" }
        ];
      case 'audio':
        return [
          { value: "Musicgen", label: "Musicgen" }
        ];
      case 'video':
        return [
          { value: "VideoGen", label: "Video Generator" }
        ];
      default:
        return [];
    }
  };

  const getPlaceholderForTab = (tab) => {
    switch (tab) {
      case 'image':
        return "Describe the image you want to generate...";
      case 'audio':
        return "Describe the music you want to generate...";
      case 'video':
        return "Describe the video you want to generate...";
      default:
        return "Imagine...";
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file);
    } else {
      alert('Please upload an image file');
    }
  };

  // Helper to check if a tab should be disabled
  const isTabDisabled = (tab) => {
    // If originTab is set and not 'assets', only allow that tab
    if (originTab && originTab !== 'assets') {
      return tab !== originTab;
    }
    // If originTab is 'assets' or not set, allow all tabs
    return false;
  };

  const handleTabClick = (tab) => {
    if (isTabDisabled(tab)) {
      alert("Go to Assets tab to generate this media type.");
      return;
    }
    setActiveTab(tab);
    setUploadedImage(null);
  };



  return (
    <div className={`generate-form-slider${isOpen ? " open" : ""}`}>
      <div className="generate-form-header">
        <span>Generate {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
        <button className="close-btn" onClick={onClose}>
          <span className="material-icons">close</span>
        </button>
      </div>

      <div className="media-type-tabs" style={{
        display: 'flex',
        gap: '8px',
        padding: '16px',
        borderBottom: '1px solid #2a2a2a'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            disabled={isTabDisabled(tab.key)}
            style={{
              background: activeTab === tab.key ? '#bfaaff' : '#232323',
              color: activeTab === tab.key ? '#000' : '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: isTabDisabled(tab.key) ? 'not-allowed' : 'pointer',
              opacity: isTabDisabled(tab.key) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <span className="material-icons" style={{ fontSize: 20 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="generate-form-label">Choose model</div>
      <select
        className="generate-form-select"
        value={selectedModel}
        onChange={e => setSelectedModel(e.target.value)}
      >
        {getModelsForTab(activeTab).map(model => (
          <option key={model.value} value={model.value}>
            {model.label}
          </option>
        ))}
      </select>

      {activeTab === 'video' && (
        <div style={{ marginBottom: '16px' }}>
          <div className="generate-form-label">Upload Reference Image</div>
          <div style={{
            border: '2px dashed #2a2a2a',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            {uploadedImage ? (
              <div style={{ color: '#bfaaff' }}>
                <span className="material-icons" style={{ fontSize: 24, marginBottom: '8px' }}>check_circle</span>
                <p>{uploadedImage.name}</p>
              </div>
            ) : (
              <div>
                <span className="material-icons" style={{ fontSize: 24, marginBottom: '8px', color: '#666' }}>cloud_upload</span>
                <p style={{ color: '#666' }}>Click to upload an image</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Supports: JPG, PNG, GIF</p>
              </div>
            )}
          </div>
        </div>
      )}

      <textarea
        className="generate-form-textarea"
        placeholder={getPlaceholderForTab(activeTab)}
        value={promptValue}
        onChange={e => setPromptValue(e.target.value)}
      />
      <button className="enhance-btn">
        <span className="material-icons">auto_fix_high</span> Enhance Prompt
      </button>
      <button
        className="main-generate-btn"
        //   onClick={handleGenerateClick}
        disabled={activeTab === 'video' && !uploadedImage}
        style={{
          opacity: activeTab === 'video' && !uploadedImage ? 0.5 : 1,
          cursor: activeTab === 'video' && !uploadedImage ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Generating...' : 'Generate'}
      </button>
    </div>
  );
};

export default GenerateMediaSlider; 