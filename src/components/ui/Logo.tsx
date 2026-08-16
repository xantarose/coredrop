import React from 'react'
import { useThemeIcon } from '../../hooks/useThemeIcon'

interface LogoProps {
  width?: number
  height?: number
  className?: string
}

const Logo: React.FC<LogoProps> = ({ width = 32, height = 32, className = '' }) => {
  const { logoPath } = useThemeIcon()

  return (
    <img
      src={logoPath}
      alt="CoreDrop Logo"
      width={width}
      height={height}
      className={className}
    />
  )
}

export default Logo
