import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

// Bootstraps the React app into the root DOM container.
createRoot(document.getElementById('root')).render(
  // Enables extra development checks for unsafe React patterns.
  <StrictMode>
    // Provides global auth state/actions to the full component tree.
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
