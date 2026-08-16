import React, { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/FileUpload.css'

interface FileWithPreview {
  file: File
  id: string
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface FileUploadProps {
  onUploadComplete?: (files: any[]) => void
  onUploadError?: (error: string) => void
  folderId?: number | null
  maxFiles?: number
  maxSize?: number
  acceptedTypes?: string[]
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  folderId,
  maxFiles = 10,
  maxSize = 100 * 1024 * 1024,
  acceptedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'application/json'
  ]
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateId = () => Math.random().toString(36).substring(7)

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `Файл слишком большой (макс. ${Math.round(maxSize / 1024 / 1024)} МБ)`
    }
    if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
      return 'Неподдерживаемый тип файла'
    }
    return null
  }

  const createPreview = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return undefined
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles: FileWithPreview[] = []
    const currentCount = files.length

    for (let i = 0; i < fileList.length && (currentCount + newFiles.length) < maxFiles; i++) {
      const file = fileList[i]
      const error = validateFile(file)

      newFiles.push({
        file,
        id: generateId(),
        preview: createPreview(file),
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined
      })
    }

    setFiles(prev => [...prev, ...newFiles])

    if (fileList.length + currentCount > maxFiles) {
      onUploadError?.(`Можно загрузить максимум ${maxFiles} файлов`)
    }

    newFiles.filter(f => f.status === 'pending').forEach(fileWithPreview => {
      uploadFile(fileWithPreview)
    })
  }

  const uploadFile = async (fileWithPreview: FileWithPreview) => {
    const { file, id } = fileWithPreview

    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, status: 'uploading' as const } : f
    ))

    const formData = new FormData()
    formData.append('file', file)
    if (folderId !== undefined && folderId !== null) {
      formData.append('folder_id', String(folderId))
    }

    try {
      const token = localStorage.getItem('auth_token')
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, progress } : f
          ))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText)
          setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, status: 'success' as const, progress: 100 } : f
          ))

          setTimeout(() => {
            setFiles(prev => prev.filter(f => f.id !== id))
            onUploadComplete?.([response.file])
          }, 1500)
        } else {
          throw new Error('Ошибка загрузки')
        }
      })

      xhr.addEventListener('error', () => {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'error' as const, error: 'Ошибка загрузки' } : f
        ))
      })

      xhr.open('POST', '/api/upload/single')
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.send(formData)
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'error' as const, error: 'Ошибка загрузки' } : f
      ))
      onUploadError?.(error instanceof Error ? error.message : 'Ошибка загрузки')
    }
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const retryUpload = (id: string) => {
    const file = files.find(f => f.id === id)
    if (file) {
      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'pending' as const, error: undefined, progress: 0 } : f
      ))
      uploadFile(file)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15L16 10L11 15M11 15L8 12L3 17V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V15Z"/>
        </svg>
      )
    }
    if (type.startsWith('video/')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="5" width="20" height="14" rx="2" opacity="0.2"/>
          <path d="M10 8L16 12L10 16V8Z"/>
        </svg>
      )
    }
    if (type === 'application/pdf') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" opacity="0.2"/>
          <path d="M14 2V8H20M10 12H14M10 16H14"/>
        </svg>
      )
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" opacity="0.2"/>
        <path d="M14 2V8H20"/>
      </svg>
    )
  }

  return (
    <div className="file-upload-container">
      <motion.div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="file-input-hidden"
          accept={acceptedTypes.join(',')}
        />

        <div className="upload-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor">
            <path d="M24 32V16M24 16L18 22M24 16L30 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M38 30V38C38 39.1 37.1 40 36 40H12C10.9 40 10 39.1 10 38V30" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <h3 className="upload-title">
          {isDragging ? 'Отпустите файлы' : 'Перетащите файлы сюда'}
        </h3>
        <p className="upload-subtitle">
          или нажмите для выбора файлов
        </p>
        <p className="upload-hint">
          До {maxFiles} файлов, максимум {Math.round(maxSize / 1024 / 1024)} МБ каждый
        </p>
      </motion.div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            className="upload-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {files.map((fileItem) => (
              <motion.div
                key={fileItem.id}
                className={`upload-item ${fileItem.status}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="upload-item-preview">
                  {fileItem.preview ? (
                    <img src={fileItem.preview} alt={fileItem.file.name} />
                  ) : (
                    <div className="upload-item-icon">
                      {getFileIcon(fileItem.file.type)}
                    </div>
                  )}
                </div>

                <div className="upload-item-info">
                  <div className="upload-item-name">{fileItem.file.name}</div>
                  <div className="upload-item-size">
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} МБ
                  </div>
                  {fileItem.error && (
                    <div className="upload-item-error">{fileItem.error}</div>
                  )}
                </div>

                <div className="upload-item-actions">
                  {fileItem.status === 'uploading' && (
                    <div className="upload-progress">
                      <div
                        className="upload-progress-bar"
                        style={{ width: `${fileItem.progress}%` }}
                      />
                      <span className="upload-progress-text">{fileItem.progress}%</span>
                    </div>
                  )}

                  {fileItem.status === 'success' && (
                    <div className="upload-status-icon success">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <circle cx="10" cy="10" r="10"/>
                        <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}

                  {fileItem.status === 'error' && (
                    <button
                      className="upload-retry-btn"
                      onClick={() => retryUpload(fileItem.id)}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                        <path d="M2 9C2 5.1 5.1 2 9 2C11.4 2 13.5 3.3 14.6 5.2M16 9C16 12.9 12.9 16 9 16C6.6 16 4.5 14.7 3.4 12.8" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14 2V5.2H10.8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}

                  <button
                    className="upload-remove-btn"
                    onClick={() => removeFile(fileItem.id)}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor">
                      <path d="M4 4L14 14M14 4L4 14" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default FileUpload
