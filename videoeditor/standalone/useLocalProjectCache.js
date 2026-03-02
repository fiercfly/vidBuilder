// Stub for useLocalProjectCache
export const useLocalProjectCache = () => {
    return {
        saveProjectToCache: async (projectId, data) => console.log('Mock saveProjectToCache:', projectId, data),
        loadProjectFromCache: async (projectId) => {
            console.log('Mock loadProjectFromCache:', projectId);
            return null;
        },
    };
};
