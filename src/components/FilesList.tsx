import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFiles } from '../../hooks/useFiles'
import '../styles/FilesList.css'

interface FilesListProps {
  searchQuery?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  folderId?: number | string | null
  viewMode?: 'grid' | 'list'
  onFileSelect?: (fileId: number) => void
  onFileOpen?: (fileId: number) => void
}

const FilesList: React.FC<FilesListProps> = ({
  searchQuery = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
  folderId = null,
  viewMode = 'grid',
  onFileSelect,
  onFileOpen
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set())

  const { files, loading, error, loadFiles } = useFiles({
    autoLoad: false,
    search: searchQuery,
    sort: sortBy,
    order: sortOrder,
    folder_id: folderId
  })

  useEffect(() => {
    loadFiles({
      search: searchQuery,
      sort: sortBy,
      order: sortOrder,
      folder_id: folderId
    })
  }, [searchQuery, sortBy, sortOrder, folderId, loadFiles])

  const handleFileClick = (fileId: number, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      const newSelected = new Set(selectedFiles)
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId)
      } else {
        newSelected.add(fileId)
      }
      setSelectedFiles(newSelected)
      onFileSelect?.(fileId)
    } else {
      onFileOpen?.(fileId)
    }
  }

  const handleFileDoubleClick = (fileId: number) => {
    onFileOpen?.(fileId)
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <rect x="6" y="6" width="36" height="36" rx="4" opacity="0.2"/>
          <circle cx="17" cy="17" r="3"/>
          <path d="M42 30L32 20L22 30M22 30L16 24L6 34V38C6 40.2 7.8 42 10 42H38C40.2 42 42 40.2 42 38V30Z"/>
        </svg>
      )
    }
    if (mimeType.startsWith('video/')) {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <rect x="4" y="10" width="40" height="28" rx="4" opacity="0.2"/>
          <path d="M20 16L32 24L20 32V16Z"/>
        </svg>
      )
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <path d="M28 4H12C9.8 4 8 5.8 8 8V40C8 42.2 9.8 44 12 44H36C38.2 44 40 42.2 40 40V16L28 4Z" opacity="0.2"/>
          <path d="M28 4V16H40M20 24H28M20 32H28"/>
        </svg>
      )
    }
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
        <path d="M28 4H12C9.8 4 8 5.8 8 8V40C8 42.2 9.8 44 12 44H36C38.2 44 40 42.2 40 40V16L28 4Z" opacity="0.2"/>
        <path d="M28 4V16H40"/>
      </svg>
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Б'
    const k = 1024
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Сегодня'
    if (days === 1) return 'Вчера'
    if (days < 7) return `${days} дн. назад`

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  if (loading) {
    return (
      <div className="files-list-loading">
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
            <circle cx="24" cy="24" r="20" strokeWidth="4" strokeLinecap="round" strokeDasharray="80 40" opacity="0.3"/>
          </svg>
        </motion.div>
        <p className="loading-text">Загрузка файлов...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="files-list-error">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor">
          <circle cx="32" cy="32" r="28" strokeWidth="3" opacity="0.2"/>
          <path d="M32 20V32M32 40V40.5" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <h3 className="error-title">Ошибка загрузки</h3>
        <p className="error-message">{error}</p>
        <button className="error-retry" onClick={() => loadFiles()}>
          Повторить попытку
        </button>
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <div className="files-list-empty">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor">
          <rect x="16" y="20" width="48" height="48" rx="4" strokeWidth="3" opacity="0.3"/>
          <path d="M32 36H48M32 44H44" strokeWidth="3" strokeLinecap="round" opacity="0.3"/>
        </svg>
        <h3 className="empty-title">Файлы не найдены</h3>
        <p className="empty-message">
          {searchQuery ? 'Попробуйте изменить параметры поиска' : 'Загрузите свои первые файлы'}
        </p>
      </div>
    )
  }

  return (
    <div className={`files-list ${viewMode}`}>
      <AnimatePresence mode="popLayout">
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            className={`file-item ${selectedFiles.has(file.id) ? 'selected' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            onClick={(e) => handleFileClick(file.id, e)}
            onDoubleClick={() => handleFileDoubleClick(file.id)}
            whileHover={{ y: -4 }}
            layout
          >
            <div className="file-icon">
              {getFileIcon(file.mime_type)}
            </div>

            <div className="file-info">
              <h4 className="file-name" title={file.original_name}>
                {file.original_name}
              </h4>
              <div className="file-meta">
                <span className="file-size">{formatFileSize(file.size_bytes)}</span>
                <span className="file-date">{formatDate(file.created_at)}</span>
              </div>
            </div>

            <div className="file-actions">
              <button className="file-action-btn" onClick={(e) => e.stopPropagation()}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <circle cx="10" cy="5" r="1.5"/>
                  <circle cx="10" cy="10" r="1.5"/>
                  <circle cx="10" cy="15" r="1.5"/>
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export default FilesList
