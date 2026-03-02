import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import VideoEditor from './VideoEditor.jsx'
import storylineSlicer from './standalone/storylineSlicer'
import generationSlice from './standalone/GenerationSlice'
import './VideoEditor.css' // Import CSS if needed globally

// Create a local Redux store wrapping the existing stubs
const store = configureStore({
    reducer: {
        storylineData: storylineSlicer,
        GenerationData: generationSlice
    }
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <VideoEditor />
            </BrowserRouter>
        </Provider>
    </React.StrictMode>,
)
