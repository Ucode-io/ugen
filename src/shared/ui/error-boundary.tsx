'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

import { useTranslations } from 'next-intl';

const DefaultErrorFallback = ({ error, reset }: { error: Error | null; reset: () => void }) => {
  const t = useTranslations('shared.errorBoundary');
  return (
    <div className="flex flex-col items-center justify-center p-6 m-4 border border-red-500/20 bg-red-500/10 rounded-lg text-center h-full max-h-[400px]">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold text-text-main mb-2">{t('title')}</h2>
      <p className="text-sm text-text-muted mb-6 max-w-md">
        {t('description')}
        <br />
        <span className="font-mono text-xs text-red-400 mt-2 block break-all">
          {error?.message}
        </span>
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 bg-bg-card hover:bg-hover-bg border border-border-subtle rounded-md transition-colors text-sm font-medium"
      >
        <RefreshCcw size={16} />
        {t('retry')}
      </button>
    </div>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}
