import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/SortDropdown.css'

export interface SortOption {
  id: string
  label: string
  field: string
  order: 'asc' | 'desc'
}

interface SortDropdownProps {
  value?: SortOption
  onChange: (option: SortOption) => void
  disabled?: boolean
}

const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const sortOptions: SortOption[] = [
    { id: 'name-asc', label: 'Имя (A-Z)', field: 'original_name', order: 'asc' },
    { id: 'name-desc', label: 'Имя (Z-A)', field: 'original_name', order: 'desc' },
    { id: 'date-desc', label: 'Дата (новые)', field: 'created_at', order: 'desc' },
    { id: 'date-asc', label: 'Дата (старые)', field: 'created_at', order: 'asc' },
    { id: 'size-desc', label: 'Размер (большие)', field: 'size_bytes', order: 'desc' },
    { id: 'size-asc', label: 'Размер (маленькие)', field: 'size_bytes', order: 'asc' },
    { id: 'type-asc', label: 'Тип (A-Z)', field: 'mime_type', order: 'asc' },
    { id: 'type-desc', label: 'Тип (Z-A)', field: 'mime_type', order: 'desc' }
  ]

  const currentOption = value || sortOptions[2]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = (option: SortOption) => {
    onChange(option)
    setIsOpen(false)
  }

  const getSortIcon = () => {
    if (currentOption.order === 'asc') {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
          <path d="M8 12V4M8 4L5 7M8 4L11 7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
        <path d="M8 4V12M8 12L5 9M8 12L11 9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }

  return (
    <div className="sort-dropdown-container" ref={dropdownRef}>
      <motion.button
        className={`sort-dropdown-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        whileHover={!disabled ? { scale: 1.02 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
      >
        <span className="sort-icon">
          {getSortIcon()}
        </span>
        <span className="sort-label">{currentOption.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`}
        >
          <path d="M4 6L8 10L12 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sort-dropdown-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="sort-dropdown-header">
              <span className="sort-dropdown-title">Сортировка</span>
            </div>
            <div className="sort-dropdown-list">
              {sortOptions.map((option) => (
                <motion.button
                  key={option.id}
                  className={`sort-option ${currentOption.id === option.id ? 'active' : ''}`}
                  onClick={() => handleSelect(option)}
                  whileHover={{ backgroundColor: 'var(--bg-tertiary)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="option-label">{option.label}</span>
                  {currentOption.id === option.id && (
                    <motion.svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      className="check-icon"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <path d="M3 8L6 11L13 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </motion.svg>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SortDropdown
