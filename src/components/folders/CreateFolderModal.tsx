import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './CreateFolderModal.css'

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateFolder: (name: string, parentId?: number | null) => Promise<void>
  parentId?: number | null
  parentName?: string
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
  parentId = null,
  parentName
}) => {
  const [folderName, setFolderName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setFolderName('')
      setError(null)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!folderName.trim()) {
      setError('Введите название папки')
      return
    }

    if (folderName.length > 255) {
      setError('Название слишком длинное (максимум 255 символов)')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onCreateFolder(folderName.trim(), parentId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать папку')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="create-folder-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="create-folder-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="create-folder-header">
            <h3 className="create-folder-title">Создать папку</h3>
            <button
              className="create-folder-close"
              onClick={onClose}
              type="button"
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M5 5L15 15M15 5L5 15" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <form className="create-folder-form" onSubmit={handleSubmit}>
            <div className="create-folder-content">
              {parentName && (
                <div className="folder-location">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                    <path d="M3 6C3 5.4 3.4 5 4 5H6L7 6H14C14.6 6 15 6.4 15 7V13C15 13.6 14.6 14 14 14H4C3.4 14 3 13.6 3 13V6Z" strokeWidth="1.5"/>
                  </svg>
                  <span className="location-text">Создать в: {parentName}</span>
                </div>
              )}

              <div className="folder-input-wrapper">
                <div className="folder-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 7C4 5.9 4.9 5 6 5H9L11 7H18C19.1 7 20 7.9 20 9V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V7Z" opacity="0.2"/>
                    <path d="M4 7C4 5.9 4.9 5 6 5H9L11 7H18C19.1 7 20 7.9 20 9V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V7Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  className="folder-name-input"
                  placeholder="Название папки"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={255}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              {error && (
                <motion.div
                  className="folder-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                    <circle cx="8" cy="8" r="7" strokeWidth="1.5"/>
                    <path d="M8 4V8M8 11V11.5" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="folder-hint">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
                  <circle cx="7" cy="7" r="6" strokeWidth="1.5"/>
                  <path d="M7 10V7M7 4V4.5" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Используйте понятное название для удобной навигации</span>
              </div>
            </div>

            <div className="create-folder-footer">
              <button
                type="button"
                className="folder-cancel-btn"
                onClick={onClose}
                disabled={isLoading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="folder-create-btn"
                disabled={isLoading || !folderName.trim()}
              >
                {isLoading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" className="spinner">
                      <circle cx="9" cy="9" r="7" strokeWidth="2" strokeLinecap="round" strokeDasharray="40 20" opacity="0.3"/>
                    </svg>
                    Создание...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                      <path d="M9 3V9M9 9V15M9 9H15M9 9H3" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Создать папку
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CreateFolderModal
