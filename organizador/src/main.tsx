import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Netlify (plan gratis) agrega una etiqueta fija abajo a la derecha: reservar espacio para no tapar botones
if (location.hostname.endsWith('.netlify.app')) document.documentElement.style.setProperty('--host-badge', '64px')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
