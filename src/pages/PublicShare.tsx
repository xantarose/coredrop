import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatFileSize } from '../utils/formatFileSize'
import Logo from '../components/ui/Logo'
import '../styles/PublicShare.css'

interface FileData {
  file_name: string
  file_size: number
  mime_type: string
  expires_at: string
  download_count: number
}

const PublicShare: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    loadFileData()
  }, [token])

  const loadFileData = async () => {
    if (!token) {
      setError('Недействительная ссылка')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/share/${token}`)

      if (!response.ok) {
        if (response.status === 404) {
          setError('Ссылка не найдена или истекла')
        } else {
          setError('Ошибка загрузки данных')
        }
        setLoading(false)
        return
      }

      const data = await response.json()
      setFileData(data)
    } catch (err) {
      setError('Не удалось подключиться к серверу')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!token || downloading) return

    setDownloading(true)
    try {
      const response = await fetch(`/api/share/download/${token}`)

      if (!response.ok) {
        throw new Error('Ошибка скачивания')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileData?.file_name || 'file'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      await loadFileData()
    } catch (err) {
      setError('Не удалось скачать файл')
    } finally {
      setDownloading(false)
    }
  }

  const isCyrillic = (text: string): boolean => /[\u0400-\u04FF]/.test(text)

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
          <rect x="10" y="10" width="60" height="60" rx="6" opacity="0.2"/>
          <circle cx="28" cy="28" r="5"/>
          <path d="M70 50L53 33L37 50M37 50L27 40L10 57V63C10 66.9 13.1 70 17 70H63C66.9 70 70 66.9 70 63V50Z"/>
        </svg>
      )
    }
    if (mimeType.startsWith('video/')) {
      return (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
          <rect x="7" y="17" width="66" height="46" rx="6" opacity="0.2"/>
          <path d="M33 27L53 40L33 53V27Z"/>
        </svg>
      )
    }
    if (mimeType.startsWith('audio/')) {
      return (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
          <rect x="17" y="10" width="46" height="60" rx="6" opacity="0.2"/>
          <circle cx="40" cy="50" r="10"/>
          <path d="M50 50V20L60 17V47"/>
        </svg>
      )
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
          <path d="M47 7H20C16.7 7 14 9.7 14 13V67C14 70.3 16.7 73 20 73H60C63.3 73 66 70.3 66 67V27L47 7Z" opacity="0.2"/>
          <path d="M47 7V27H66M33 40H47M33 53H47"/>
        </svg>
      )
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
          <path d="M47 7H20C16.7 7 14 9.7 14 13V67C14 70.3 16.7 73 20 73H60C63.3 73 66 70.3 66 67V27L47 7Z" opacity="0.2"/>
          <path d="M47 7V27H66M27 40H53M27 47H53M27 53H40"/>
        </svg>
      )
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
      return (
        <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
          <path d="M47 7H20C16.7 7 14 9.7 14 13V67C14 70.3 16.7 73 20 73H60C63.3 73 66 70.3 66 67V27L47 7Z" opacity="0.2"/>
          <path d="M47 7V27H66M37 17H43M37 23H43M37 30H43M37 37H43M33 43H47V57H33V43Z"/>
        </svg>
      )
    }
    return (
      <svg width="80" height="80" viewBox="0 0 80 80" fill="currentColor">
        <path d="M47 7H20C16.7 7 14 9.7 14 13V67C14 70.3 16.7 73 20 73H60C63.3 73 66 70.3 66 67V27L47 7Z" opacity="0.2"/>
        <path d="M47 7V27H66"/>
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="public-share-page">
        <header className="share-header">
          <div className="share-logo">
            <div className="share-logo-mark">
              <Logo width={16} height={16} />
            </div>
            <span className="share-logo-text">CoreDrop</span>
          </div>
          <div className="share-header-divider" />
          <span className="share-header-label">Общий доступ</span>
        </header>
        <div className="share-container">
          <motion.div
            className="share-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor">
                <circle cx="18" cy="18" r="14" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="60 30" />
              </svg>
            </motion.div>
            <p className="loading-text">Загрузка</p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error || !fileData) {
    return (
      <div className="public-share-page">
        <header className="share-header">
          <div className="share-logo" onClick={() => navigate('/')}>
            <div className="share-logo-mark">
              <Logo width={16} height={16} />
            </div>
            <span className="share-logo-text">CoreDrop</span>
          </div>
          <div className="share-header-divider" />
          <span className="share-header-label">Общий доступ</span>
        </header>
        <div className="share-container">
          <motion.div
            className="share-error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="error-icon">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor">
                <circle cx="28" cy="28" r="24" strokeWidth="1.5" opacity="0.3"/>
                <path d="M28 18V28M28 35V36" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="error-title">{error || 'Файл не найден'}</h2>
            <p className="error-message">
              Ссылка могла истечь или быть удалена владельцем
            </p>
            <motion.button
              className="error-home-btn"
              onClick={() => navigate('/')}
              whileTap={{ scale: 0.97 }}
            >
              Вернуться на главную
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="public-share-page">
      <header className="share-header">
        <motion.div
          className="share-logo"
          onClick={() => navigate('/')}
          whileTap={{ scale: 0.97 }}
        >
          <div className="share-logo-mark">
            <Logo width={16} height={16} />
          </div>
          <span className="share-logo-text">CoreDrop</span>
        </motion.div>
        <div className="share-header-divider" />
        <span className="share-header-label">Общий доступ</span>
      </header>

      <div className="share-container">
        <motion.div
          className="share-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="file-preview">
            <div className="file-icon-large">
              {getFileIcon(fileData.mime_type)}
            </div>
          </div>

          <div className="file-details">
            <h1 className={`file-title${isCyrillic(fileData.file_name) ? ' is-cyrillic' : ''}`}>{fileData.file_name}</h1>

            <div className="file-meta">
              <div className="meta-item">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M3 8C3 6.9 3.9 6 5 6H7L9 8H15C16.1 8 17 8.9 17 10V15C17 16.1 16.1 17 15 17H5C3.9 17 3 16.1 3 15V8Z" strokeWidth="1.5"/>
                </svg>
                <span>{formatFileSize(fileData.file_size)}</span>
              </div>

              <div className="meta-item">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <circle cx="10" cy="10" r="7" strokeWidth="1.5"/>
                  <path d="M10 6V10L13 11" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{formatDate(fileData.expires_at)}</span>
              </div>

              <div className="meta-item">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M10 3V12M10 12L7 9M10 12L13 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 14V16C3 16.6 3.4 17 4 17H16C16.6 17 17 16.6 17 16V14" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{fileData.download_count} загрузок</span>
              </div>
            </div>
          </div>

          <div className="download-section">
            <motion.button
              className="download-btn"
              onClick={handleDownload}
              disabled={downloading}
              whileTap={downloading ? undefined : { scale: 0.98 }}
            >
              {downloading ? (
                <>
                  <motion.svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <circle cx="10" cy="10" r="7" strokeWidth="2" strokeLinecap="round" strokeDasharray="28 14" opacity="0.6"/>
                  </motion.svg>
                  Скачивание...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M10 3V13M10 13L7 10M10 13L13 10" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 14.5V16C3 16.8 3.7 17.5 4.5 17.5H15.5C16.3 17.5 17 16.8 17 16V14.5" strokeWidth="1.75" strokeLinecap="round"/>
                  </svg>
                  Скачать файл
                </>
              )}
            </motion.button>

            <div className="share-footer">
              <p className="footer-text">
                Файл предоставлен через <strong>CoreDrop</strong>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default PublicShare
