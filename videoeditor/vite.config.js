import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000
    },
    optimizeDeps: {
        // Keep your FFmpeg exclusions so they don't break during build
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] 
    }
})
