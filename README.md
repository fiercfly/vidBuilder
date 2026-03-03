# VidBuilder

VidBuilder is a full-stack browser-based video editor supporting multi-track timelines, real-time canvas interactions, and cloud-based MP4 rendering.

It is designed to handle performance-heavy UI interactions while maintaining smooth playback and scalable backend rendering workflows.

---

## 🚀 Key Features

- Multi-track drag-and-drop timeline engine
- Real-time canvas preview using React + Konva
- Handles 50+ concurrent media elements without UI lag
- ~60% reduction in unnecessary re-renders via requestAnimationFrame batching
- Cloud-based video rendering using Remotion
- Asynchronous render pipeline with status polling
- Streamed MP4 downloads without loading entire file into memory
- Responsive layout (desktop + mobile support)

---

## 🏗 Architecture Overview

### Frontend (Vercel)

- React 18 (Hooks, useCallback, useMemo, useRef)
- Konva + React-Konva for canvas rendering
- Redux for timeline state management
- Remotion Player for real-time preview
- Custom multi-track timeline engine
- Export pipeline:
  - Upload assets
  - Serialize timeline
  - Submit render job
  - Poll status every 2 seconds
  - Stream file download

### Backend (Render)

- Node.js (ESM modules)
- Express.js REST APIs
- Remotion Bundler + Renderer
- Multer for asset handling
- In-memory async job tracking
- Streaming via `fs.createReadStream`

---

## ⚡ Performance Optimizations

- Introduced requestAnimationFrame-based batching to coalesce resize and drag events
- Reduced unnecessary React re-renders by ~60%
- Optimized timeline state updates to prevent UI jank
- Implemented streaming downloads to avoid memory spikes for large MP4 files

---

## 🔄 Rendering Workflow

1. Client uploads assets to backend
2. Timeline configuration serialized into JSON
3. Render job submitted to backend
4. Backend uses Remotion to bundle and render composition
5. Client polls `/status` endpoint
6. Completed video streamed directly to disk via browser API

This architecture separates real-time UI concerns from heavy rendering tasks.

---

## 🧠 Technical Challenges Solved

- Managing performance in real-time canvas systems
- Designing a scalable async rendering pipeline
- Preventing UI lag under high timeline element density
- Handling cross-origin isolation for FFmpeg WASM
- Maintaining smooth 30fps preview playback

---

## 🛠 Tech Stack

### Frontend
- React 18
- Vite
- Konva / React-Konva
- Redux
- Remotion Player
- FFmpeg WASM
- CSS (Grid + Flexbox)

### Backend
- Node.js
- Express.js
- Remotion Renderer
- Multer
- dotenv
- CORS

### Deployment
- Vercel (Frontend)
- Render (Backend)
- GitHub CI/CD auto-deploy

---

## 🌐 Live Demo

Frontend: https://vidbuilder.vercel.app  
Backend API: https://vidbuilder.onrender.com  

---

## 📦 Installation (Local Setup)

### Frontend
```bash
npm install
npm run dev
