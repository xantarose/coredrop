import React from 'react'
import { DashboardProvider } from '../contexts/DashboardContext'
import DashboardSidebar from '../dashboard/components/DashboardSidebar'
import DashboardContent from '../dashboard/components/DashboardContent'
import '../dashboard/styles/Dashboard.css'

const Dashboard: React.FC = () => {
  return (
    <DashboardProvider>
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <DashboardSidebar />
          <DashboardContent />
        </div>
      </div>
    </DashboardProvider>
  )
}

export default Dashboard
