import React, { useState, useEffect } from 'react'
import '../styles/FilePreview.css'

interface FilePreviewProps {
  fileId: number | null
  fileName?: string
  fileSize?: number
  mimeType?: string
  onClose: () => void
}

const FilePreview: React.FC<FilePreviewProps> = ({
  fileId,
  fileName,
  fileSize,
  mimeType,
  onClose
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!fileId) {
      setLoading(false)
      return
    }

    const loadFile = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('auth_token')
        const response = await fetch(`/api/download/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Не удалось загрузить файл')
        }

        const blob = await response.blob()

        if (mimeType?.startsWith('text/')) {
          const text = await blob.text()
          setTextContent(text)
        } else {
          const url = window.URL.createObjectURL(blob)
          setFileUrl(url)
        }

        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
        setLoading(false)
      }
    }

    loadFile()

    return () => {
      if (fileUrl) {
        window.URL.revokeObjectURL(fileUrl)
      }
    }
  }, [fileId, mimeType])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isFullscreen, onClose])

  useEffect(() => {
    if (fileId) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [fileId])

  if (!fileId) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleDownload = () => {
    if (fileUrl && fileName) {
      const a = document.createElement('a')
      a.href = fileUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Б'
    const k = 1024
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="preview-loading">
          <svg className="loading-spinner" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
            <circle cx="24" cy="24" r="20" strokeWidth="4" strokeLinecap="round" strokeDasharray="80 40" opacity="0.3">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 24 24"
                to="360 24 24"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          <p className="loading-text">Загрузка...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="preview-error">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor">
            <circle cx="40" cy="40" r="32" strokeWidth="4"/>
            <path d="M40 24V44M40 52V52.5" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <h3 className="error-title">Ошибка</h3>
          <p className="error-message">{error}</p>
          <button className="error-retry" onClick={() => window.location.reload()}>
            Повторить
          </button>
        </div>
      )
    }

    if (mimeType?.startsWith('image/')) {
      return (
        <div className={`preview-image-container ${isFullscreen ? 'fullscreen' : ''}`}>
          <img
            src={fileUrl || ''}
            alt={fileName}
            className={isFullscreen ? 'preview-image-fullscreen' : 'preview-image'}
          />
        </div>
      )
    }

    if (mimeType === 'application/pdf') {
      return (
        <div className={`preview-pdf-container ${isFullscreen ? 'fullscreen' : ''}`}>
          <iframe
            src={fileUrl || ''}
            className={isFullscreen ? 'preview-pdf-fullscreen' : 'preview-pdf'}
            title={fileName}
          />
        </div>
      )
    }

    if (mimeType?.startsWith('text/')) {
      return (
        <div className="preview-text-container">
          <pre className="preview-text-content">{textContent}</pre>
        </div>
      )
    }

    if (mimeType?.startsWith('audio/')) {
      return (
        <div className="preview-audio-container">
          <svg className="audio-icon" width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor">
            <path d="M20 28L32 20V60L20 52V28Z" strokeWidth="3" strokeLinejoin="round"/>
            <path d="M40 32C44 36 44 44 40 48M48 24C56 32 56 48 48 56" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <audio src={fileUrl || ''} controls className="preview-audio" />
          <p className="audio-name">{fileName}</p>
        </div>
      )
    }

    return (
      <div className="preview-unsupported">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor">
          <rect x="16" y="20" width="48" height="48" rx="4" strokeWidth="3"/>
          <path d="M32 36H48M32 44H44" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <h3>Предпросмотр недоступен</h3>
        <p>Для этого типа файла предпросмотр не поддерживается</p>
        <button className="download-button" onClick={handleDownload}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
            <path d="M10 4V12M10 12L7 9M10 12L13 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 14V16C4 16.6 4.4 17 5 17H15C15.6 17 16 16.6 16 16V14" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Скачать файл
        </button>
      </div>
    )
  }

  return (
    <div
      className={`file-preview-overlay ${isFullscreen ? 'fullscreen-mode' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="file-preview-modal">
        <div className="preview-header">
          <div className="preview-info">
            <h2 className="preview-title">{fileName || 'Файл'}</h2>
            {fileSize && <span className="preview-size">{formatFileSize(fileSize)}</span>}
          </div>
          <div className="preview-actions">
            {(mimeType?.startsWith('image/') || mimeType === 'application/pdf') && (
              <button className="preview-action-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}>
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M14 6L18 2M18 2H14M18 2V6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 14L2 18M2 18H6M2 18V14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M2 6L6 2M6 2H2M6 2V6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 14L14 18M14 18H18M14 18V14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )}
            <button className="preview-action-btn" onClick={handleDownload} title="Скачать">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M10 4V12M10 12L7 9M10 12L13 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 14V16C4 16.6 4.4 17 5 17H15C15.6 17 16 16.6 16 16V14" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="preview-close-btn" onClick={onClose} title="Закрыть">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M6 6L14 14M14 6L6 14" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="preview-content">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default FilePreview
