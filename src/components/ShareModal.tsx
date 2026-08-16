import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../contexts/ToastContext'
import QRCodeModal from './QRCodeModal'
import '../styles/ShareModal.css'

interface UserShareLink {
  id: number
  token: string
  file_id: number
  file_name: string
  expires_at: string
  download_count: number
  created_at: string
}

interface ShareModalProps {
  fileId: number | null
  fileName?: string
  onClose: () => void
}

const ShareModal: React.FC<ShareModalProps> = ({ fileId, fileName = '', onClose }) => {
  const isOpen = fileId !== null
  const [shareLink, setShareLink] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [expiresIn, setExpiresIn] = useState<number>(7)
  const [copied, setCopied] = useState(false)
  const [userShareLinks, setUserShareLinks] = useState<UserShareLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [previousToken, setPreviousToken] = useState<string>('')
  const { addToast } = useToast()

  useEffect(() => {
    if (fileId) {
      setCopied(false)
      setShareLink('')
      setToken('')
      setUserShareLinks([])
      setQrModalOpen(false)
      setPreviousToken('')
      loadUserShareLinks()
    }
  }, [fileId])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleClose = () => {
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const loadUserShareLinks = async () => {
    setLoadingLinks(true)
    try {
      const authToken = localStorage.getItem('auth_token')
      const response = await fetch('/api/share/user/list', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load user share links')
      }

      const data = await response.json()
      setUserShareLinks(data.links || [])

      if (fileId && !shareLink) {
        const existingLink = (data.links || []).find((link: UserShareLink) => link.file_id === fileId)
        if (existingLink) {
          const link = `${window.location.origin}/s/${existingLink.token}`
          setShareLink(link)
          setToken(existingLink.token)
          setExpiresIn(Math.ceil((new Date(existingLink.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        }
      }
    } catch (error) {
      console.error('Failed to load user share links:', error)
    } finally {
      setLoadingLinks(false)
    }
  }

  const generateShareLink = async (days?: number) => {
    if (!fileId) return
    if (userShareLinks.length >= 10) {
      addToast({
        type: 'error',
        title: 'Достигнут лимит',
        message: 'Достигнут лимит в 10 активных ссылок. Удалите старые ссылки.',
        duration: 5000
      })
      return
    }

    const expiryDays = days !== undefined ? days : expiresIn

    setGeneratingLink(true)
    try {
      const authToken = localStorage.getItem('auth_token')
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          file_id: fileId,
          expires_in_days: expiryDays
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 400 && errorData.error?.includes('limit')) {
          addToast({
            type: 'error',
            title: 'Достигнут лимит',
            message: 'Достигнут лимит в 10 активных ссылок. Удалите старые ссылки.',
            duration: 5000
          })
          return
        }
        addToast({
          type: 'error',
          title: 'Ошибка',
          message: errorData.error || 'Не удалось создать ссылку для общего доступа',
          duration: 5000
        })
        return
      }

      const data = await response.json()
      const link = `${window.location.origin}/s/${data.token}`
      setShareLink(link)
      setToken(data.token)
      setExpiresIn(expiryDays)
      await loadUserShareLinks()
      addToast({
        type: 'success',
        title: 'Готово',
        message: 'Ссылка для общего доступа создана',
        duration: 3000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось создать ссылку для общего доступа',
        duration: 5000
      })
    } finally {
      setGeneratingLink(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      addToast({
        type: 'success',
        title: 'Скопировано',
        message: 'Ссылка скопирована в буфер обмена',
        duration: 3000
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось скопировать ссылку',
        duration: 3000
      })
    }
  }

  const handleExpiresChange = async (days: number) => {
    if (days === expiresIn || generatingLink) return

    await generateShareLink(days)
  }

  const handleDeleteUserLink = async (linkToken: string) => {
    try {
      const authToken = localStorage.getItem('auth_token')
      const response = await fetch(`/api/share/${linkToken}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete share link')
      }

      setUserShareLinks(prevLinks => prevLinks.filter(link => link.token !== linkToken))

      if (linkToken === token) {
        setShareLink('')
        setToken('')
      }

      addToast({
        type: 'success',
        title: 'Удалено',
        message: 'Ссылка удалена',
        duration: 3000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось удалить ссылку',
        duration: 3000
      })
    }
  }

  const handleDeleteLink = async () => {
    if (!token) return

    try {
      const authToken = localStorage.getItem('auth_token')
      const response = await fetch(`/api/share/${token}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete share link')
      }

      setShareLink('')
      setToken('')
      await loadUserShareLinks()
      addToast({
        type: 'success',
        title: 'Удалено',
        message: 'Ссылка для общего доступа удалена',
        duration: 3000
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось удалить ссылку',
        duration: 3000
      })
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const shortenToken = (fullToken: string): string => {
    if (fullToken.length <= 8) return fullToken
    return `...${fullToken.slice(-8)}`
  }

  const handleOpenQR = () => {
    setQrModalOpen(true)
  }

  const handleCloseQR = () => {
    setQrModalOpen(false)
    setPreviousToken(token)
  }

  const shouldShowQRAnimation = () => {
    return token !== previousToken
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="share-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className="share-modal"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-header">
              <h2 className="share-title">Поделиться файлом</h2>
              <button
                type="button"
                className="share-close-btn"
                onClick={handleClose}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                  <path d="M4 4L14 14M14 4L4 14" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="share-content">
              {fileName?.trim() && (
                <div className="share-file-info">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M12 2H5C4.2 2 3.5 2.7 3.5 3.5V16.5C3.5 17.3 4.2 18 5 18H15C15.8 18 16.5 17.3 16.5 16.5V6.5L12 2Z" strokeWidth="1.5" opacity="0.3"/>
                    <path d="M12 2V6.5H16.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="share-file-name">{fileName}</span>
                </div>
              )}

              {shareLink ? (
                <div className="share-link-section">
                  <div className="share-link-input-wrapper">
                    <input
                      type="text"
                      className="share-link-input"
                      value={shareLink}
                      readOnly
                    />
                    <div className="share-link-actions">
                      <button
                        type="button"
                        className="qr-code-btn"
                        onClick={handleOpenQR}
                        title="QR-Код"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                          <rect x="2" y="2" width="6" height="6" rx="1" strokeWidth="1.5"/>
                          <rect x="10" y="2" width="6" height="6" rx="1" strokeWidth="1.5"/>
                          <rect x="2" y="10" width="6" height="6" rx="1" strokeWidth="1.5"/>
                          <rect x="10" y="10" width="6" height="6" rx="1" strokeWidth="1.5"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={`copy-link-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopyLink}
                      >
                        {copied ? (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                            <path d="M4 9L7 12L14 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                            <rect x="6" y="6" width="10" height="10" rx="2" strokeWidth="1.5"/>
                            <path d="M12 6V4C12 2.9 11.1 2 10 2H4C2.9 2 2 2.9 2 4V10C2 11.1 2.9 12 4 12H6" strokeWidth="1.5"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="share-expires-section">
                    <label className="share-expires-label">Срок действия ссылки</label>
                    <div className="share-expires-options">
                      <button
                        type="button"
                        className={`expires-option-btn ${expiresIn === 1 ? 'active' : ''}`}
                        onClick={() => handleExpiresChange(1)}
                        disabled={generatingLink}
                      >
                        1 день
                      </button>
                      <button
                        type="button"
                        className={`expires-option-btn ${expiresIn === 7 ? 'active' : ''}`}
                        onClick={() => handleExpiresChange(7)}
                        disabled={generatingLink}
                      >
                        7 дней
                      </button>
                      <button
                        type="button"
                        className={`expires-option-btn ${expiresIn === 30 ? 'active' : ''}`}
                        onClick={() => handleExpiresChange(30)}
                        disabled={generatingLink}
                      >
                        30 дней
                      </button>
                    </div>
                  </div>

                  <button type="button" className="share-delete-btn" onClick={handleDeleteLink}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                      <path d="M2 5H14M6 5V3C6 2.4 6.4 2 7 2H9C9.6 2 10 2.4 10 3V5M4 5V14C4 14.6 4.4 15 5 15H11C11.6 15 12 14.6 12 14V5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Удалить ссылку
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="share-create-btn"
                  onClick={() => generateShareLink()}
                  disabled={generatingLink || userShareLinks.length >= 10}
                >
                  {generatingLink ? 'Создание...' : 'Создать ссылку'}
                </button>
              )}

              <div className="share-divider" />

              <div className="share-links-section">
                <div className="share-links-header">
                  <h3 className="share-links-title">
                    Все активные ссылки
                  </h3>
                  <span className={`share-links-count ${userShareLinks.length >= 10 ? 'limit-reached' : ''}`}>
                    {userShareLinks.length}/10
                  </span>
                </div>

                {userShareLinks.length > 0 ? (
                  <div className="share-links-list">
                    {userShareLinks.map((link) => (
                      <motion.div
                        key={link.token}
                        className="share-link-item"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="share-link-item-icon">
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                            <path d="M11 2H4C3.2 2 2.5 2.7 2.5 3.5V14.5C2.5 15.3 3.2 16 4 16H14C14.8 16 15.5 15.3 15.5 14.5V5.5L11 2Z" strokeWidth="1.5" opacity="0.3"/>
                            <path d="M11 2V5.5H15.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="share-link-item-info">
                          <div className="share-link-item-name">{link.file_name}</div>
                          <div className="share-link-item-details">
                            <span className="share-link-item-token">{shortenToken(link.token)}</span>
                            <span className="share-link-item-separator">•</span>
                            <span className="share-link-item-date">До {formatDate(link.expires_at)}</span>
                            <span className="share-link-item-separator">•</span>
                            <span className="share-link-item-downloads">{link.download_count} скач.</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="share-link-item-delete"
                          onClick={() => handleDeleteUserLink(link.token)}
                          title="Удалить ссылку"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
                            <path d="M3 3L11 11M11 3L3 11" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="share-links-empty">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor">
                      <path d="M20 6V20M20 20L26 14M20 20L14 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
                      <path d="M6 24V30C6 31.1 6.9 32 8 32H32C33.1 32 34 31.1 34 30V24" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
                    </svg>
                    <p>У вас пока нет активных ссылок</p>
                  </div>
                )}

                {userShareLinks.length >= 10 && (
                  <div className="share-links-limit-warning">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
                      <circle cx="7" cy="7" r="6" strokeWidth="1.5"/>
                      <path d="M7 3V7M7 10V10.5" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>Достигнут лимит. Удалите старые ссылки для создания новых.</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <QRCodeModal
        isOpen={qrModalOpen}
        url={shareLink}
        fileName={fileName}
        onClose={handleCloseQR}
        showAnimation={shouldShowQRAnimation()}
      />
    </AnimatePresence>
  )
}

export default ShareModal
