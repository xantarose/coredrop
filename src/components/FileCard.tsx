import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import '../styles/FileCard.css'

interface FileCardProps {
  id: number
  filename: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  path: string
  isSelected?: boolean
  viewMode?: 'grid' | 'list'
  onSelect?: (id: number, selected: boolean) => void
  onClick?: (id: number) => void
  onDoubleClick?: (id: number) => void
  onContextMenu?: (id: number, x: number, y: number) => void
  onRename?: (id: number, newName: string) => void
  onDelete?: (id: number) => void
  onDownload?: (id: number) => void
  onShare?: (id: number) => void
  onPreview?: (id: number) => void
}

const FileCard: React.FC<FileCardProps> = ({
  id,
  filename,
  originalName,
  mimeType,
  sizeBytes,
  createdAt,
  path,
  isSelected = false,
  viewMode = 'grid',
  onSelect,
  onClick,
  onDoubleClick,
  onContextMenu,
  onRename,
  onDelete,
  onDownload,
  onShare,
  onPreview
}) => {
  const [showActions, setShowActions] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(originalName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  const getFileIcon = () => {
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
    if (mimeType.startsWith('audio/')) {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <rect x="10" y="6" width="28" height="36" rx="4" opacity="0.2"/>
          <circle cx="24" cy="30" r="6"/>
          <path d="M30 30V12L36 10V28"/>
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
    if (mimeType.includes('word') || mimeType === 'application/msword') {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <path d="M28 4H12C9.8 4 8 5.8 8 8V40C8 42.2 9.8 44 12 44H36C38.2 44 40 42.2 40 40V16L28 4Z" opacity="0.2"/>
          <path d="M28 4V16H40M16 24H32M16 28H32M16 32H24"/>
        </svg>
      )
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <path d="M28 4H12C9.8 4 8 5.8 8 8V40C8 42.2 9.8 44 12 44H36C38.2 44 40 42.2 40 40V16L28 4Z" opacity="0.2"/>
          <path d="M28 4V16H40M16 22H32M16 26H32M16 30H32M24 22V34"/>
        </svg>
      )
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <path d="M28 4H12C9.8 4 8 5.8 8 8V40C8 42.2 9.8 44 12 44H36C38.2 44 40 42.2 40 40V16L28 4Z" opacity="0.2"/>
          <path d="M28 4V16H40M22 10H26M22 14H26M22 18H26M22 22H26M20 26H28V34H20V26Z"/>
        </svg>
      )
    }
    if (mimeType.startsWith('text/')) {
      return (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
          <path d="M28 4H12C9.8 4 8 5.8 8 8V40C8 42.2 9.8 44 12 44H36C38.2 44 40 42.2 40 40V16L28 4Z" opacity="0.2"/>
          <path d="M28 4V16H40M16 22H32M16 26H32M16 30H28"/>
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

  const handleClick = (e: React.MouseEvent) => {
    if (isRenaming) return

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      onSelect?.(id, !isSelected)
    } else {
      onClick?.(id)
    }
  }

  const handleDoubleClick = () => {
    if (isRenaming) return
    onDoubleClick?.(id)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu?.(id, e.clientX, e.clientY)
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelect?.(id, e.target.checked)
  }

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== originalName) {
      onRename?.(id, newName.trim())
    }
    setIsRenaming(false)
  }

  const handleRenameCancel = () => {
    setNewName(originalName)
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit()
    } else if (e.key === 'Escape') {
      handleRenameCancel()
    }
  }

  return (
    <motion.div
      className={`file-card ${viewMode} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      whileHover={{ y: -4 }}
      layout
    >
      <div className="file-card-checkbox">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="file-card-preview">
        {mimeType.startsWith('image/') ? (
          <img
            src={`/api/files/${id}/thumbnail`}
            alt={originalName}
            className="file-thumbnail"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : null}
        <div className="file-icon">
          {getFileIcon()}
        </div>
      </div>

      <div className="file-card-info">
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            className="file-rename-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4 className="file-card-name" title={originalName}>
            {originalName}
          </h4>
        )}

        <div className="file-card-meta">
          <span className="file-card-size">{formatFileSize(sizeBytes)}</span>
          <span className="file-card-separator">•</span>
          <span className="file-card-date">{formatDate(createdAt)}</span>
        </div>
      </div>

      {showActions && !isRenaming && (
        <motion.div
          className="file-card-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {onPreview && (
            <button
              className="file-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onPreview(id)
              }}
              title="Предпросмотр"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                <path d="M1 9C1 9 4 3 9 3C14 3 17 9 17 9C17 9 14 15 9 15C4 15 1 9 1 9Z" strokeWidth="1.5"/>
                <circle cx="9" cy="9" r="2.5" strokeWidth="1.5"/>
              </svg>
            </button>
          )}

          {onShare && (
            <button
              className="file-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onShare(id)
              }}
              title="Поделиться"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                <circle cx="13" cy="5" r="2.5" strokeWidth="1.5"/>
                <circle cx="5" cy="9" r="2.5" strokeWidth="1.5"/>
                <circle cx="13" cy="13" r="2.5" strokeWidth="1.5"/>
                <path d="M7.5 10L10.5 11.5M10.5 6.5L7.5 8" strokeWidth="1.5"/>
              </svg>
            </button>
          )}

          {onDownload && (
            <button
              className="file-action-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(id)
              }}
              title="Скачать"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                <path d="M9 3V11M9 11L6 8M9 11L12 8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 13V14C3 14.6 3.4 15 4 15H14C14.6 15 15 14.6 15 14V13" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}

          <button
            className="file-action-btn"
            onClick={(e) => {
              e.stopPropagation()
              setShowActions(true)
            }}
            title="Ещё"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <circle cx="9" cy="4" r="1.5"/>
              <circle cx="9" cy="9" r="1.5"/>
              <circle cx="9" cy="14" r="1.5"/>
            </svg>
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}

export default FileCard
