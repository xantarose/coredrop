import React from 'react'
import { useLocation } from 'react-router-dom'
import MobileMenuButton from './MobileMenuButton'
import DashboardHome from '../pages/DashboardHome'
import AllFiles from '../pages/AllFiles'
import RecentFiles from '../pages/RecentFiles'
import FavoriteFiles from '../pages/FavoriteFiles'
import Bin from '../pages/Bin'
import Settings from '../pages/Settings'
import '../styles/DashboardContent.css'

const DashboardContent: React.FC = () => {
  const location = useLocation()

  const renderPage = () => {
    if (location.pathname === '/me/dashboard') return <DashboardHome />
    if (location.pathname === '/me/storage/all') return <AllFiles />
    if (location.pathname === '/me/storage/recent') return <RecentFiles />
    if (location.pathname === '/me/storage/fav') return <FavoriteFiles />
    if (location.pathname === '/me/bin') return <Bin />
    if (location.pathname === '/me/settings') return <Settings />
    return <DashboardHome />
  }

  return (
    <>
      <MobileMenuButton />
      <main className="dashboard-content">
        {renderPage()}
      </main>
    </>
  )
}

export default DashboardContent
