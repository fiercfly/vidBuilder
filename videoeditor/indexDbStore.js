


// updated for current device, audio was not loading -- error: failed to load audio ---------- NOTE------------------

// Utility to open (or create) the database with all media stores
function openDB() {
  return new Promise((resolve, reject) => {
    // BUMP VERSION TO 3 to trigger upgrade for 'keyval' store
    const request = window.indexedDB.open('MediaDB', 3);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('audio')) {
        db.createObjectStore('audio', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('image')) {
        db.createObjectStore('image', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('video')) {
        db.createObjectStore('video', { keyPath: 'id' });
      }
      // NEW: Generic Key-Value store for Project Persistence
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval'); // No keyPath, using out-of-line keys
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Alias for audio-specific DB open
function openAudioDB() { return openDB(); }

// --- NEW HELPER FUNCTIONS FOR PROJECT SAVING ---

export function idbSet(key, val) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) { reject(err); }
  });
}

export function idbGet(key) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) { reject(err); }
  });
}

// --- EXISTING MEDIA FUNCTIONS ---

export function saveAudioToIndexedDB(audioObj) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction('audio', 'readwrite');
      tx.objectStore('audio').put(audioObj);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) { reject(err); }
  });
}

export function getAllAudioFromIndexedDB() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction('audio', 'readonly');
      const store = tx.objectStore('audio');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) { reject(err); }
  });
}

export async function removeAudioFromIndexedDB(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction('audio', 'readwrite');
      tx.objectStore('audio').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) { reject(err); }
  });
}

export async function saveMediaToIndexedDB(media) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      if (!db.objectStoreNames.contains(media.type)) {
        throw new Error(`Object store '${media.type}' not found in MediaDB.`);
      }
      const tx = db.transaction(media.type, 'readwrite');
      tx.objectStore(media.type).put(media);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    } catch (err) { reject(err); }
  });
}

export async function saveImageToIndexedDB(imageObj) {
  return saveMediaToIndexedDB({ ...imageObj, type: 'image' });
}

export async function saveVideoToIndexedDB(videoObj) {
  return saveMediaToIndexedDB({ ...videoObj, type: 'video' });
}

export function getAllVideoFromIndexedDB() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction('video', 'readonly');
      const store = tx.objectStore('video');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) { reject(err); }
  });
}

export function getAllImageFromIndexedDB() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction('image', 'readonly');
      const store = tx.objectStore('image');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) { reject(err); }
  });
}

export async function getAllMediaTypesFromIndexedDB() {
  const types = ['audio', 'image', 'video'];
  const db = await openDB();
  const results = {};

  for (const type of types) {
    if (db.objectStoreNames.contains(type)) {
      const tx = db.transaction(type, 'readonly');
      const store = tx.objectStore(type);
      results[type] = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } else {
      results[type] = [];
    }
  }
  return results;
}

// indexDbStore.js

// Fetch ONLY Raw Uploads (Normal assets)
export const getRawMedia = async () => {
  const db = await openDB();
  const transaction = db.transaction(['video'], 'readonly');
  const store = transaction.objectStore('video');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const allVideos = request.result || [];
      // Filter out the generated ones
      const rawVideos = allVideos.filter(v => v.model !== 'scene builder');
      resolve(rawVideos);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

// Fetch ONLY Generated Videos
export const getGeneratedMedia = async () => {
  const db = await openDB();
  const transaction = db.transaction(['video'], 'readonly');
  const store = transaction.objectStore('video');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const allVideos = request.result || [];
      // Grab ONLY the generated ones
      const generatedVideos = allVideos.filter(v => v.model === 'scene builder');
      resolve(generatedVideos);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};