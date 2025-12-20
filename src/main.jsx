import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import MobileApp from './MobileApp.jsx'
import ResponsiveRouter from './ResponsiveRouter.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ResponsiveRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/mobile" element={<MobileApp />} />
        </Routes>
      </ResponsiveRouter>
    </BrowserRouter>
  </StrictMode>,
)
