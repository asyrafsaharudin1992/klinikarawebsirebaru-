import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/30 p-6 rounded-xl max-w-lg w-full">
            <h2 className="text-xl font-semibold text-red-500 mb-4">Something went wrong</h2>
            <pre className="bg-black/50 p-4 rounded-lg text-sm overflow-auto text-red-200 whitespace-pre-wrap">
              {this.state.error?.message}
            </pre>
            <button
              className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              onClick={() => window.location.reload()}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
