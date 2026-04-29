"use client";

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary — catches unexpected JS crashes in any child component
 * and shows a friendly recovery UI instead of a blank white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CookOnCall] Unexpected error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[50vh] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 rounded-full bg-[var(--cream-200)] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-[var(--orange-500)]" />
            </div>
            <h2 className="font-display font-bold text-lg mb-2">
              Something went wrong
            </h2>
            <p className="text-[0.85rem] text-[var(--text-muted)] mb-6">
              An unexpected error occurred. You can try again or reload the page.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-full bg-[var(--orange-500)] text-white text-[0.85rem] font-semibold hover:bg-[var(--orange-600)] transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-full border border-[var(--cream-300)] text-[var(--text-primary)] text-[0.85rem] font-semibold hover:bg-[var(--cream-100)] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
