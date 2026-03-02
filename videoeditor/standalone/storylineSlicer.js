// Stub for Redux slice: storylineSlicer
export const setProjectName = (name) => ({ type: 'SET_PROJECT_NAME', payload: name });
export const setExportButton = (isExporting) => ({ type: 'SET_EXPORT_BUTTON', payload: isExporting });
export const setDownloader = (isDownloading) => ({ type: 'SET_DOWNLOADER', payload: isDownloading });

const initialState = { projectName: 'Untitled Video', exportbutton: false, isDownloading: false };
export default function storylineSlicer(state = initialState, action) {
  switch (action.type) {
    case 'SET_PROJECT_NAME': return { ...state, projectName: action.payload };
    case 'SET_EXPORT_BUTTON': return { ...state, exportbutton: action.payload };
    case 'SET_DOWNLOADER': return { ...state, isDownloading: action.payload };
    default: return state;
  }
}
