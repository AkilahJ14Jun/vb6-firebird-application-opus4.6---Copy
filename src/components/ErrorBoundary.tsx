import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white border border-red-200 shadow-xl rounded-2xl max-w-lg mx-auto mt-16 text-center animate-fadeIn">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">An unexpected error occurred</h3>
          <p className="text-xs text-slate-500 mt-1">
            The view encountered a rendering issue.
          </p>
          {this.state.error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-mono text-left overflow-x-auto border border-red-100">
              {this.state.error.message}
            </div>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
