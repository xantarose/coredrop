import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/ContextMenu.css'

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  danger?: boolean
  divider?: boolean
  disabled?: boolean
  onClick?: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  items: MenuItem[]
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  isOpen,
  onClose,
  items
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    if (x + menuRect.width > viewportWidth) {
      adjustedX = viewportWidth - menuRect.width - 8
    }

    if (y + menuRect.height > viewportHeight) {
      adjustedY = viewportHeight - menuRect.height - 8
    }

    if (adjustedX < 8) adjustedX = 8
    if (adjustedY < 8) adjustedY = 8

    if (viewportWidth < 640) {
      adjustedX = Math.min(adjustedX, viewportWidth - menuRect.width - 16)
      if (adjustedX < 16) adjustedX = 16
    }

    setPosition({ x: adjustedX, y: adjustedY })
  }, [x, y, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handleScroll = () => {
      onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, onClose])

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return
    item.onClick?.()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`
          }}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {items.map((item, index) => (
            item.divider ? (
              <div key={`divider-${index}`} className="context-menu-divider" />
            ) : (
              <motion.button
                key={item.id}
                className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                whileHover={!item.disabled ? { backgroundColor: 'var(--bg-tertiary)' } : {}}
                whileTap={!item.disabled ? { scale: 0.98 } : {}}
              >
                <span className="menu-item-icon">{item.icon}</span>
                <span className="menu-item-label">{item.label}</span>
              </motion.button>
            )
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ContextMenu
