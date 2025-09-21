import React from 'react'
import Dashboard from './components/Dashboard'
import UserAuth from './components/UserAuth'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="app-container">
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
            <h2>Air Quality Dashboard</h2>
            <UserAuth />
          </header>
          <Dashboard />
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
