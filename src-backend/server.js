import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import multer from 'multer';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Allow all origins — simplest approach for a personal deployment
app.use(cors());


app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5000;
const COMPOSITION_ID = 'EditorVideo';
const ENTRY_POINT = path.resolve(__dirname, 'index.ts');

// Ensure renders directory exists
const rendersDir = path.join(__dirname, 'public', 'renders');
if (!fs.existsSync(rendersDir)) {
    fs.mkdirSync(rendersDir, { recursive: true });
}

// Serve static files (optional, but good for direct access)
app.use('/downloads', express.static(rendersDir));

// Store render status in memory (In production, use Redis/DB)
const renderJobs = new Map();

// Configure Multer for processing file uploads from the frontend
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, rendersDir),
        filename: (req, file, cb) => cb(null, `${uuidv4()}_${file.originalname}`)
    })
});

/**
 * 0. POST /api/upload
 * Handles local blob uploads from the frontend before exporting.
 */
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const serverUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        // Return a reachable URL for the newly uploaded file
        res.json({ url: `${serverUrl}/downloads/${req.file.filename}` });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

/**
 * 1. POST /api/render 
 * Receives the timelineItems and starts the background rendering process.
 */
app.post('/api/render', async (req, res) => {
    try {
        const inputProps = req.body;
        const renderId = uuidv4();

        // Set initial status
        renderJobs.set(renderId, {
            status: 'rendering',
            progress: 0,
        });

        // Respond immediately to the frontend so it can start polling
        res.json({
            renderId,
            bucketName: 'local'
        });

        // --- BACKGROUND RENDER PROCESS ---
        (async () => {
            try {
                console.log(`[${renderId}] Bundling project...`);
                // 1. Bundle the project
                const bundleLocation = await bundle({
                    entryPoint: ENTRY_POINT,
                    webpackOverride: (config) => config,
                });

                console.log(`[${renderId}] Selecting composition...`);
                // 2. Select the composition and retrieve its metadata
                const composition = await selectComposition({
                    serveUrl: bundleLocation,
                    id: COMPOSITION_ID,
                    inputProps,
                });

                // 3. Render the video
                const outputLocation = path.join(rendersDir, `${renderId}.mp4`);
                console.log(`[${renderId}] Starting render...`);

                await renderMedia({
                    composition,
                    serveUrl: bundleLocation,
                    codec: 'h264',
                    outputLocation,
                    inputProps,
                    imageFormat: 'jpeg', // Speeds up rendering compared to default PNG
                    timeoutInMilliseconds: 600000, // 10 minutes to prevent TimeoutError
                    onProgress: ({ progress }) => {
                        renderJobs.set(renderId, {
                            status: 'rendering',
                            progress: progress,
                        });
                    },
                });

                // 4. Mark as done and provide the URL
                console.log(`[${renderId}] Render complete: ${outputLocation}`);
                const serverUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
                const finalUrl = `${serverUrl}/downloads/${renderId}.mp4`;

                renderJobs.set(renderId, {
                    status: 'done',
                    progress: 1,
                    url: finalUrl,
                });

            } catch (err) {
                console.error(`[${renderId}] Render failed:`, err);
                renderJobs.set(renderId, {
                    status: 'error',
                    progress: 0,
                    error: err.message || 'Unknown render error',
                });
            }
        })();

    } catch (error) {
        console.error(error);
        res.status(500).send(error.message);
    }
});

/**
 * 2. POST /api/status 
 * Used by the frontend to poll for rendering progress.
 */
app.post('/api/status', (req, res) => {
    const { renderId } = req.body;
    if (!renderId) return res.status(400).json({ error: 'Missing renderId' });

    const job = renderJobs.get(renderId);
    if (!job) return res.status(404).json({ error: 'Render job not found' });

    res.json(job);
});

/**
 * 3. POST /download
 * The frontend uses this to pipe the MP4 stream to the client filesystem API.
 */
app.post('/download', async (req, res) => {
    try {
        const { url, filename } = req.body;
        if (!url) return res.status(400).json({ error: 'Missing URL' });

        console.log(`Downloading stream for: ${url}`);

        // Simple verification (only allow pulling files from /downloads folder internally)
        // Extract the filename from the URL assuming it matches our format
        const match = url.match(/\/downloads\/(.+)$/);
        if (!match) {
            // Fallback for external URLs if the frontend passes them (blob/etc)
            const fetchRes = await fetch(url);
            if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status} from ${url}`);
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);
            const stream = fetchRes.body;
            // Native fetch body is Web ReadableStream, need to adapt it. 
            // Best approach for Node fetch -> Express is pipe
            return Readable.fromWeb(stream).pipe(res);
        }

        const localFilename = match[1];
        const filepath = path.join(rendersDir, localFilename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);

        // Stream local file to response
        const fileStream = fs.createReadStream(filepath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download proxy error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend render server listening on http://localhost:${PORT}`);
});
