// Stub for GenerationSlice
export const startGeneration = () => ({ type: 'START_GENERATION' });
export const stopGeneration = () => ({ type: 'STOP_GENERATION' });

const initialState = { isGenerating: false };
export default function generationSlice(state = initialState, action) {
    switch (action.type) {
        case 'START_GENERATION': return { ...state, isGenerating: true };
        case 'STOP_GENERATION': return { ...state, isGenerating: false };
        default: return state;
    }
}
