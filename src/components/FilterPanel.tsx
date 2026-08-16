import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/FilterPanel.css'

interface FilterOptions {
  fileTypes: string[]
  dateRange: string
  sizeRange: string
}

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: FilterOptions) => void
  currentFilters?: FilterOptions
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    currentFilters?.fileTypes || []
  )
  const [dateRange, setDateRange] = useState<string>(
    currentFilters?.dateRange || 'all'
  )
  const [sizeRange, setSizeRange] = useState<string>(
    currentFilters?.sizeRange || 'all'
  )

  const getFileTypeIcon = (typeId: string) => {
    switch (typeId) {
      case 'image':
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <circle cx="11" cy="11" r="2" fill="currentColor"/>
            <path d="M28 20L20 12L12 20M12 20L9 17L4 22V25C4 26.7 5.3 28 7 28H25C26.7 28 28 26.7 28 25V20Z" fill="currentColor"/>
          </svg>
        )
      case 'video':
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="7" width="26" height="18" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <path d="M13 11L21 16L13 21V11Z" fill="currentColor"/>
          </svg>
        )
      case 'audio':
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="4" width="20" height="24" rx="3" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <circle cx="16" cy="20" r="4" fill="currentColor"/>
            <path d="M20 20V8L24 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'document':
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M20 3H8C6.3 3 5 4.3 5 6V26C5 27.7 6.3 29 8 29H24C25.7 29 27 27.7 27 26V10L20 3Z" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <path d="M20 3V10H27M11 16H21M11 20H21M11 24H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'archive':
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M20 3H8C6.3 3 5 4.3 5 6V26C5 27.7 6.3 29 8 29H24C25.7 29 27 27.7 27 26V10L20 3Z" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <path d="M20 3V10H27M14 7H18M14 11H18M14 15H18M14 19H18M12 23H20V29H12V23Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'other':
        return (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M20 3H8C6.3 3 5 4.3 5 6V26C5 27.7 6.3 29 8 29H24C25.7 29 27 27.7 27 26V10L20 3Z" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
            <path d="M20 3V10H27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="19" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="23" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="15" r="1.5" fill="currentColor"/>
          </svg>
        )
      default:
        return null
    }
  }

  const fileTypes = [
    { id: 'image', label: 'Изображения' },
    { id: 'video', label: 'Видео' },
    { id: 'audio', label: 'Аудио' },
    { id: 'document', label: 'Документы' },
    { id: 'archive', label: 'Архивы' },
    { id: 'other', label: 'Другое' }
  ]

  const dateRanges = [
    { id: 'all', label: 'Все время' },
    { id: 'today', label: 'Сегодня' },
    { id: 'week', label: 'За неделю' },
    { id: 'month', label: 'За месяц' },
    { id: 'year', label: 'За год' }
  ]

  const sizeRanges = [
    { id: 'all', label: 'Любой размер' },
    { id: 'small', label: 'До 1 МБ' },
    { id: 'medium', label: '1 - 10 МБ' },
    { id: 'large', label: '10 - 100 МБ' },
    { id: 'xlarge', label: 'Более 100 МБ' }
  ]

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    )
  }

  const handleApply = () => {
    onApplyFilters({
      fileTypes: selectedTypes,
      dateRange,
      sizeRange
    })
    onClose()
  }

  const handleReset = () => {
    setSelectedTypes([])
    setDateRange('all')
    setSizeRange('all')
  }

  const hasActiveFilters = selectedTypes.length > 0 || dateRange !== 'all' || sizeRange !== 'all'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="filter-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="filter-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="filter-header">
              <h3 className="filter-title">Фильтры</h3>
              <button className="filter-close-btn" onClick={onClose}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                  <path d="M5 5L15 15M15 5L5 15" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="filter-content">
              <div className="filter-section">
                <h4 className="filter-section-title">Тип файла</h4>
                <div className="filter-types-grid">
                  {fileTypes.map(type => (
                    <motion.button
                      key={type.id}
                      className={`filter-type-btn ${selectedTypes.includes(type.id) ? 'active' : ''}`}
                      onClick={() => handleTypeToggle(type.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="filter-type-icon">{getFileTypeIcon(type.id)}</span>
                      <span className="filter-type-label">{type.label}</span>
                      {selectedTypes.includes(type.id) && (
                        <motion.div
                          className="filter-type-check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                            <path d="M3 8L6 11L13 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="filter-divider" />

              <div className="filter-section">
                <h4 className="filter-section-title">Дата создания</h4>
                <div className="filter-radio-group">
                  {dateRanges.map(range => (
                    <label key={range.id} className="filter-radio-label">
                      <input
                        type="radio"
                        name="dateRange"
                        value={range.id}
                        checked={dateRange === range.id}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="filter-radio-input"
                      />
                      <span className="filter-radio-custom" />
                      <span className="filter-radio-text">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-divider" />

              <div className="filter-section">
                <h4 className="filter-section-title">Размер файла</h4>
                <div className="filter-radio-group">
                  {sizeRanges.map(range => (
                    <label key={range.id} className="filter-radio-label">
                      <input
                        type="radio"
                        name="sizeRange"
                        value={range.id}
                        checked={sizeRange === range.id}
                        onChange={(e) => setSizeRange(e.target.value)}
                        className="filter-radio-input"
                      />
                      <span className="filter-radio-custom" />
                      <span className="filter-radio-text">{range.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-footer">
              {hasActiveFilters && (
                <motion.button
                  className="filter-reset-btn"
                  onClick={handleReset}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Сбросить
                </motion.button>
              )}
              <motion.button
                className="filter-apply-btn"
                onClick={handleApply}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Применить
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default FilterPanel
