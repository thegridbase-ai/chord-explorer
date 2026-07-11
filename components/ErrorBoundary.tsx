import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Catches render/runtime errors (audio engine, Songsterr viewer, etc.) so a
// single failing component doesn't white-screen the whole app.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Unhandled error in Chord Explorer:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="bg-bg-abyss text-bone min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-bg-steel/60 border border-crimson/20 rounded-2xl p-8 text-center shadow-[0_0_60px_rgba(220,20,60,0.15)]">
          <h1 className="text-2xl font-gothic tracking-[0.2em] text-crimson mb-3">
            SOMETHING BROKE A STRING
          </h1>
          <p className="text-sm text-bone/60 font-industrial mb-6">
            An unexpected error occurred. Your progression is saved - reload to keep exploring.
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-2.5 rounded-md bg-crimson/15 hover:bg-crimson/25 border border-crimson/30 text-crimson font-metal font-semibold text-sm transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
