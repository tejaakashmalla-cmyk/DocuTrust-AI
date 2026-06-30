import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      {/* Background grid */}
      <div className="fixed inset-0 bg-grid-ink bg-grid opacity-30 pointer-events-none" />
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-trust-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
