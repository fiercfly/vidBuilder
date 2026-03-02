// Stub for sdk_factory: Actually uploading files to the local Render backend
export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    try {
        const res = await fetch(`${backendUrl}/api/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        return { url: data.url };
    } catch (err) {
        console.error('Error uploading file:', err);
        // Fallback to blob if backend is down (though export will fail)
        return { url: URL.createObjectURL(file) };
    }
};

export const uploadFileVideo = uploadFile;
export const uploadFileAudio = uploadFile;

export const setFirebaseDocument = async (docId, data) => {
    console.log('Mock setFirebaseDocument:', docId, data);
};

export const updateAigenerationStart = async (data) => {
    console.log('Mock updateAigenerationStart:', data);
};
