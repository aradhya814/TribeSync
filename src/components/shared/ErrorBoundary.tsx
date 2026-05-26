'use client'

import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Component } from 'react'

import { Button } from '@/components/ui/button'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="mb-4 size-8 text-amber-300" />
          <h2 className="heading-3">Something broke</h2>
          <p className="body-text mt-2 max-w-md">Refresh the page and try again.</p>
          <Button className="mt-5 bg-tribe-primary hover:bg-tribe-primary-hover" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
