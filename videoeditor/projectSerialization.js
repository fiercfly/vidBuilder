import { useCallback } from 'react';

const PROJECT_VERSION = "1.0.0";

/**
 * Validates if the imported data looks like a valid project.
 */
const validateProjectData = (data) => {
  if (!data || typeof data !== 'object') throw new Error("Invalid file format");
  if (data.version !== PROJECT_VERSION) console.warn("Version mismatch: Imported project might be from a different version.");
  if (!Array.isArray(data.items)) throw new Error("Missing timeline items");
  if (!Array.isArray(data.tracks)) throw new Error("Missing tracks");
  return true;
};

export function useProjectImportExport({
  items,
  setItems,
  tracks,
  setTracks,
  transitions,
  setTransitions,
  aspectRatio,
  setAspectRatio,
  canvasBackgroundColor,
  setCanvasBackgroundColor,
  mediaFiles,
  setMediaFiles,
  showToast
}) {

  // --- EXPORT ---
  const exportProject = useCallback(() => {
    try {
      // 1. Prepare State
      const projectData = {
        version: PROJECT_VERSION,
        meta: {
          createdAt: Date.now(),
          aspectRatio,
          canvasBackgroundColor,
          projectName: "My Video Project" // You could pass this in
        },
        // 2. Serialize Core Data
        tracks: tracks.map(t => ({
          id: t.id,
          type: t.type,
          label: t.label,
          locked: t.locked
        })),
        transitions: transitions || [],
        items: items.map(item => ({
          ...item,
          // Remove runtime-only properties if any (e.g., _hydrated is okay to keep or recalc)
          isLoading: false, 
          isDragging: false
        })),
        // 3. Serialize Media Library (Exclude huge raw Files)
        mediaFiles: mediaFiles.map(m => ({
          id: m.id,
          type: m.type,
          name: m.name,
          url: m.remoteUrl || m.url, // Prioritize remote URL
          remoteUrl: m.remoteUrl,
          naturalWidth: m.naturalWidth,
          naturalHeight: m.naturalHeight,
          actualDuration: m.actualDuration
        }))
      };

      // 4. Check for Local Blobs (Warning)
      const hasLocalBlobs = projectData.mediaFiles.some(m => m.url && m.url.startsWith('blob:'));
      if (hasLocalBlobs) {
        // We allow export, but warn that these won't work on other machines
        console.warn("Export warning: Project contains local Blob URLs which will not load on other devices.");
        if (showToast) showToast("Warning: Local files (Blobs) may not load on other devices.");
      }

      // 5. Create Download
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `project_export_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

      if (showToast) showToast("Project exported successfully!");

    } catch (err) {
      console.error("Export Failed:", err);
      if (showToast) showToast("Export failed. Check console.");
    }
  }, [items, tracks, transitions, aspectRatio, canvasBackgroundColor, mediaFiles, showToast]);


  // --- IMPORT ---
  const importProject = useCallback(async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 1. Validate
      validateProjectData(data);

      // 2. Restore Meta
      if (data.meta) {
        if (data.meta.aspectRatio) setAspectRatio(data.meta.aspectRatio);
        if (data.meta.canvasBackgroundColor) setCanvasBackgroundColor(data.meta.canvasBackgroundColor);
      }

      // 3. Restore Tracks & Transitions
      if (data.tracks) setTracks(data.tracks);
      if (data.transitions) setTransitions(data.transitions);

      // 4. Restore Media Files
      // We merge imported media with existing media to avoid duplicates
      if (data.mediaFiles) {
        setMediaFiles(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMedia = data.mediaFiles.filter(m => !existingIds.has(m.id));
          return [...prev, ...newMedia];
        });
      }

      // 5. Restore Items (Reconstruct Canvas)
      if (data.items) {
        const restoredItems = data.items.map(item => ({
          ...item,
          // Ensure critical runtime flags are reset
          isLoading: false,
          _hydrated: true // Assuming properties are valid from export
        }));
        setItems(restoredItems);
      }

      if (showToast) showToast("Project imported successfully!");

    } catch (err) {
      console.error("Import Failed:", err);
      if (showToast) showToast("Import failed: Invalid project file.");
    }
  }, [setItems, setTracks, setTransitions, setAspectRatio, setCanvasBackgroundColor, setMediaFiles, showToast]);

  return { exportProject, importProject };
}