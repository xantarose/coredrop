import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface Stats {
  total_users: number
  total_files: number
  total_storage: number
  active_users: number
}

interface ChartData {
  date: string
  count: number
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [registrations, setRegistrations] = useState<ChartData[]>([])
  const [activity, setActivity] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      })

      const data = await response.json()
      setStats(data.stats)
      setRegistrations(data.registrations)
      setActivity(data.activity)
    } catch (error) {
      console.error('Load stats error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const registrationChartData = {
    labels: registrations.map(r => new Date(r.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })),
    datasets: [
      {
        label: 'Регистрации',
        data: registrations.map(r => r.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        fill: false
      }
    ]
  }

  const activityChartData = {
    labels: activity.map(a => new Date(a.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })),
    datasets: [
      {
        label: 'Загрузки файлов',
        data: activity.map(a => a.count),
        backgroundColor: 'rgba(16, 185, 129, 0.9)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(16, 185, 129, 1)'
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 13,
            weight: '500'
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <h1>Панель администратора</h1>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Всего пользователей</div>
            <div className="admin-stat-value">{stats?.total_users || 0}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Всего файлов</div>
            <div className="admin-stat-value">{stats?.total_files || 0}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 2h-1V1h-2v1H9V1H7v1H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V9h12v11z"/>
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Использовано места</div>
            <div className="admin-stat-value">{formatBytes(stats?.total_storage || 0)}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Активных за неделю</div>
            <div className="admin-stat-value">{stats?.active_users || 0}</div>
          </div>
        </div>
      </div>

      <div className="admin-charts-grid">
        <div className="admin-chart-card">
          <h2>Регистрации за последние 30 дней</h2>
          <div className="admin-chart-container">
            <Line data={registrationChartData} options={chartOptions} />
          </div>
        </div>

        <div className="admin-chart-card">
          <h2>Активность загрузок за последние 30 дней</h2>
          <div className="admin-chart-container">
            <Bar data={activityChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
