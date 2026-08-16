import React, { useState, useEffect } from 'react'
import { useQRCode } from '../hooks/useQRCode'
import { downloadQRCode } from '../utils/qrCodeGenerator'
import '../styles/QRCodeModal.css'

interface QRCodeModalProps {
  isOpen: boolean
  url: string
  fileName?: string
  onClose: () => void
  showAnimation?: boolean
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  url,
  fileName = '',
  onClose,
  showAnimation = false
}) => {
  const [animationComplete, setAnimationComplete] = useState(!showAnimation)
  const [imageVisible, setImageVisible] = useState(false)
  const { qrCode, loading, error } = useQRCode(url, { size: 300, errorCorrectionLevel: 'M' })

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (showAnimation && qrCode && isOpen) {
      setAnimationComplete(false)
      setImageVisible(false)

      const timer = setTimeout(() => {
        setAnimationComplete(true)
        setImageVisible(true)
      }, 3000)

      return () => clearTimeout(timer)
    } else if (!showAnimation) {
      setAnimationComplete(true)
      setImageVisible(true)
    }
  }, [showAnimation, qrCode, isOpen])

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleDownload = () => {
    if (qrCode) {
      const filename = fileName ? `${fileName}-qr.png` : 'qrcode.png'
      downloadQRCode(qrCode, filename)
    }
  }

  if (!isOpen) return null

  return (
    <div className="qr-modal-overlay" onClick={handleOverlayClick}>
      <div className="qr-modal">
        <div className="qr-modal-header">
          <h3 className="qr-modal-title">QR-Код для скачивания</h3>
          <button
            type="button"
            className="qr-modal-close"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
              <path d="M4 4L14 14M14 4L4 14" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="qr-modal-content">
          {loading ? (
            <div className="qr-loading">
              <svg className="qr-loading-spinner" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor">
                <circle cx="20" cy="20" r="16" strokeWidth="4" strokeLinecap="round" strokeDasharray="80 40" opacity="0.3"/>
              </svg>
              <p className="qr-loading-text">Генерация QR-кода...</p>
            </div>
          ) : error ? (
            <div className="qr-loading">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
                <circle cx="24" cy="24" r="20" strokeWidth="3" opacity="0.2"/>
                <path d="M24 16V24M24 32V32.5" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <p className="qr-loading-text">{error}</p>
            </div>
          ) : qrCode ? (
            <>
              <div className="qr-code-container">
                <div className="qr-code-corners">
                  <div className="qr-corner top-left"></div>
                  <div className="qr-corner top-right"></div>
                  <div className="qr-corner bottom-left"></div>
                  <div className="qr-corner bottom-right"></div>
                </div>

                {!animationComplete && (
                  <div className="qr-scan-animation">
                    <div className="qr-scan-radar"></div>
                    <div className="qr-scan-grid"></div>
                    <div className="qr-scan-line"></div>
                    <div className="qr-scan-pulse"></div>
                  </div>
                )}

                <img
                  src={qrCode}
                  alt="QR Code"
                  className={`qr-code-image ${imageVisible ? 'visible' : ''}`}
                  style={{ opacity: imageVisible ? 1 : 0 }}
                />
              </div>

              <div className="qr-modal-actions">
                {fileName && (
                  <div className="qr-file-info">
                    {fileName}
                  </div>
                )}
                <button
                  type="button"
                  className="qr-download-btn"
                  onClick={handleDownload}
                  disabled={!animationComplete}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M10 3V13M10 13L7 10M10 13L13 10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 14V16C3 16.6 3.4 17 4 17H16C16.6 17 17 16.6 17 16V14" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Скачать QR-код
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default QRCodeModal
