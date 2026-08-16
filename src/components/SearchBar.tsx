import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import '../styles/SearchBar.css'

interface SearchBarProps {
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  debounceDelay?: number
  showClearButton?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

const SearchBar: React.FC<SearchBarProps> = ({
  value = '',
  onChange,
  onSearch,
  placeholder = 'Поиск файлов...',
  debounceDelay = 300,
  showClearButton = true,
  disabled = false,
  autoFocus = false
}) => {
  const [searchValue, setSearchValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSearchValue(value)
  }, [value])

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    debounceTimeout.current = setTimeout(() => {
      if (onSearch && searchValue !== value) {
        onSearch(searchValue)
      }
    }, debounceDelay)

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [searchValue, debounceDelay, onSearch, value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchValue(newValue)
    onChange?.(newValue)
  }

  const handleClear = () => {
    setSearchValue('')
    onChange?.('')
    onSearch?.('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(searchValue)
    } else if (e.key === 'Escape') {
      handleClear()
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  return (
    <motion.div
      className={`search-bar ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="search-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <circle cx="9" cy="9" r="6" strokeWidth="1.5" />
          <path d="M14 14L18 18" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck="false"
      />

      {showClearButton && searchValue && !disabled && (
        <motion.button
          className="search-clear"
          onClick={handleClear}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Очистить поиск"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
            <path d="M4 4L12 12M12 4L4 12" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.button>
      )}

      {isFocused && searchValue && (
        <div className="search-hint">
          <span className="hint-text">Enter для поиска</span>
          <span className="hint-divider">•</span>
          <span className="hint-text">Esc для очистки</span>
        </div>
      )}
    </motion.div>
  )
}

export default SearchBar
