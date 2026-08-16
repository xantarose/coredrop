import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast, Toast } from '../contexts/ToastContext'
import '../styles/ToastNotification.css'

const ToastNotification: React.FC = () => {
  const { toasts, removeToast } = useToast()

  return (
    <div className="toast-container">
      <AnimatePresence mode="popLayout">
        {toasts.slice(0, 4).map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

const ToastItem = React.forwardRef<HTMLDivElement, ToastItemProps>(({ toast, onRemove }, ref) => {
  const [uploadProgress, setUploadProgress] = useState(toast.file?.progress || 0)

  useEffect(() => {
    if (toast.file?.progress !== undefined) {
      setUploadProgress(toast.file.progress)
    }
  }, [toast.file?.progress])

  const getIcon = () => {
    if (toast.file) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 18a3 3 0 100-6 3 3 0 000 6zM17 18a3 3 0 100-6 3 3 0 000 6zM12 2v10M8 6a5 5 0 015-5 5 5 0 015 5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }

    switch (toast.type) {
      case 'success':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 12L11 15L16 9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'error':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9L9 15M9 9L15 15" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'warning':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 20H22L12 2Z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 9V13M12 17V17.5" strokeLinecap="round"/>
          </svg>
        )
      case 'info':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16V12M12 8V8.5" strokeLinecap="round"/>
          </svg>
        )
    }
  }

  return (
    <motion.div
      ref={ref}
      className={`toast ${toast.type}`}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      layout
    >
      <div className="toast-icon">{getIcon()}</div>

      <div className="toast-content">
        <h4 className="toast-title">{toast.title}</h4>
        {toast.message && <p className="toast-message">{toast.message}</p>}

        {toast.file && toast.file.progress !== undefined && (
          <>
            <div className="toast-progress">
              <div
                className="toast-progress-bar"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="toast-upload-progress">
              <span className="toast-progress-text">{uploadProgress}% uploaded...</span>
            </div>
          </>
        )}

        {toast.actions && toast.actions.length > 0 && (
          <div className="toast-actions">
            {toast.actions.map((action, idx) => (
              <button
                key={idx}
                className={`toast-action-btn ${action.primary ? 'primary' : ''}`}
                onClick={() => {
                  action.onClick()
                  if (!action.primary) {
                    onRemove(toast.id)
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Close notification"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3L11 11M11 3L3 11" strokeLinecap="round"/>
        </svg>
      </button>
    </motion.div>
  )
})

ToastItem.displayName = 'ToastItem'

export default ToastNotification
