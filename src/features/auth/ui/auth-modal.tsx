'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

interface AuthModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: 'login' | 'register'
}

export const AuthModal = ({ isOpen, onOpenChange, defaultTab = 'login' }: AuthModalProps) => {
  const t = useTranslations('features.auth')
  const [authType, setAuthType] = useState<'login' | 'register'>(defaultTab)

  useEffect(() => {
    if (isOpen) {
      setAuthType(defaultTab)
    }
  }, [defaultTab, isOpen])

  const toggleAuthType = () => {
    setAuthType(prev => prev === 'login' ? 'register' : 'login')
  }

  const handleClose = () => onOpenChange(false)

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-bg-card p-6 shadow-2xl border border-border-subtle overflow-hidden max-h-[90vh] overflow-y-auto">

          <Dialog.Title className="sr-only">{t('common.authTitle')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('common.authDescription')}</Dialog.Description>

          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-full p-1.5 text-text-muted hover:bg-bg-sidebar hover:text-text-main transition-colors"
              aria-label={t('common.ariaClose')}
            >
              <X size={18} />
            </button>
          </Dialog.Close>

          {authType === 'login' ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5 text-center mb-6">
                <h2 className="text-xl font-bold text-text-main">{t('login.title')}</h2>
                <p className="text-sm text-text-muted">{t('login.subtitle')}</p>
              </div>

              <LoginForm onSuccess={handleClose} />

              <div className="text-center mt-4">
                <p className="text-sm text-text-muted">
                  Don&apos;t have an account?{' '}
                  <button onClick={toggleAuthType} className="text-primary hover:underline font-medium">
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5 text-center mb-6">
                <h2 className="text-xl font-bold text-text-main">{t('register.title')}</h2>
                <p className="text-sm text-text-muted">{t('register.subtitle')}</p>
              </div>

              <RegisterForm onAuthenticated={handleClose} />

              <div className="text-center mt-4">
                <p className="text-sm text-text-muted">
                  Already have an account?{' '}
                  <button onClick={toggleAuthType} className="text-primary hover:underline font-medium">
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
