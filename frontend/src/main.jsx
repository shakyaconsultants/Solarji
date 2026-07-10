import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataCacheProvider } from './context/DataCacheContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataCacheProvider>
          <App />
        </DataCacheProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
