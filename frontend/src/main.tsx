import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeNativeFeatures, isNative, platform } from './hooks/useCapacitor'

// Initialize native features if running on Capacitor
if (isNative) {
  initializeNativeFeatures();
  console.log(`Running on ${platform}`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
