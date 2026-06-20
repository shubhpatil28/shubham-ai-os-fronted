import { StrictMode } from 'react'
console.log("DEPLOYMENT_AUDIT_V1");
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { keepAlive } from './config/api.js'

// Wake up Render dyno immediately and keep it alive every 4.5 minutes
keepAlive();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
