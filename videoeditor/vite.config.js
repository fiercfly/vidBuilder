import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        // Required for @ffmpeg/ffmpeg SharedArrayBuffer support
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Resource-Policy': 'cross-origin',
        },
    },
    build: {
        outDir: 'dist',
    },
    esbuild: {
        loader: 'jsx',
        include: /.*\.jsx?$/,
        exclude: [],
    },
    optimizeDeps: {
        // Keep your FFmpeg exclusions so they don't break during build
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    }
})
