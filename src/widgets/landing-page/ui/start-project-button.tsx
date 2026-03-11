'use client'
import { Rocket } from 'lucide-react'
import { Button } from '@/shared/ui/ui/button'

export const StartProjectButton = ({ 
  className, 
  variant = 'default',
  children
}: { 
  className?: string, 
  variant?: any,
  children?: React.ReactNode 
}) => {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))
  }

  return (
    <Button 
      onClick={handleClick}
      size="lg" 
      variant={variant}
      className={className || "bg-primary hover:bg-primary-hover text-white rounded-xl px-8 shadow-lg shadow-primary/25 gap-2 group h-14 text-base font-semibold"}
    >
      {children || (
        <>
          Start your project
          <Rocket size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </>
      )}
    </Button>
  )
}
