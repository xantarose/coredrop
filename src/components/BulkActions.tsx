import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/BulkActions.css'

interface BulkActionsProps {
  selectedCount: number
  onDownload?: () => void
  onDelete?: () => void
  onMove?: () => void
  onShare?: () => void
  onClearSelection: () => void
  isVisible?: boolean
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  onDownload,
  onDelete,
  onMove,
  onShare,
  onClearSelection,
  isVisible = true
}) => {
  if (!isVisible || selectedCount === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="bulk-actions-container"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="bulk-actions-content">
          <div className="bulk-actions-info">
            <motion.div
              className="selection-count"
              key={selectedCount}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2C5.1 2 2 5.1 2 9C2 12.9 5.1 16 9 16C12.9 16 16 12.9 16 9C16 5.1 12.9 2 9 2Z" opacity="0.3"/>
                <path d="M6 9L8 11L12 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="count-text">{selectedCount}</span>
            </motion.div>
            <span className="selection-label">
              {selectedCount === 1 ? 'файл выбран' : selectedCount < 5 ? 'файла выбрано' : 'файлов выбрано'}
            </span>
          </div>

          <div className="bulk-actions-buttons">
            {onDownload && (
              <motion.button
                className="bulk-action-btn"
                onClick={onDownload}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                title="Скачать выбранные"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M10 3V12M10 12L7 9M10 12L13 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 14V16C3 16.6 3.4 17 4 17H16C16.6 17 17 16.6 17 16V14" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="btn-label">Скачать</span>
              </motion.button>
            )}

            {onMove && (
              <motion.button
                className="bulk-action-btn"
                onClick={onMove}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                title="Переместить выбранные"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M3 8C3 6.9 3.9 6 5 6H7L9 8H15C16.1 8 17 8.9 17 10V15C17 16.1 16.1 17 15 17H5C3.9 17 3 16.1 3 15V8Z" strokeWidth="1.5"/>
                  <path d="M12 11L14 13M14 13L12 15M14 13H8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="btn-label">Переместить</span>
              </motion.button>
            )}

            {onShare && (
              <motion.button
                className="bulk-action-btn"
                onClick={onShare}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                title="Поделиться выбранными"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <circle cx="15" cy="5" r="2.5" strokeWidth="1.5"/>
                  <circle cx="5" cy="10" r="2.5" strokeWidth="1.5"/>
                  <circle cx="15" cy="15" r="2.5" strokeWidth="1.5"/>
                  <path d="M7.5 11L12.5 13.5M12.5 6.5L7.5 9" strokeWidth="1.5"/>
                </svg>
                <span className="btn-label">Поделиться</span>
              </motion.button>
            )}

            {onDelete && (
              <motion.button
                className="bulk-action-btn danger"
                onClick={onDelete}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                title="Удалить выбранные"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M3 6H17M8 6V4C8 3.4 8.4 3 9 3H11C11.6 3 12 3.4 12 4V6M5 6V16C5 16.6 5.4 17 6 17H14C14.6 17 15 16.6 15 16V6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 10V14M12 10V14" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="btn-label">Удалить</span>
              </motion.button>
            )}

            <div className="bulk-actions-divider"></div>

            <motion.button
              className="bulk-action-btn clear"
              onClick={onClearSelection}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Снять выделение"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                <path d="M5 5L15 15M15 5L5 15" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="btn-label">Отменить</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BulkActions
