import React from 'react'

interface BrandLogoProps {
  className?: string
  size?: number
}

export default function BrandLogo({ className = 'w-8 h-8', size }: BrandLogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt="Uppshot Logo"
      className={`rounded-lg object-contain shadow-xs flex-shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
      onError={(e) => {
        // Fallback to PNG if SVG encounters any rendering issue
        (e.currentTarget as HTMLImageElement).src = '/favicon-96x96.png'
      }}
    />
  )
}
