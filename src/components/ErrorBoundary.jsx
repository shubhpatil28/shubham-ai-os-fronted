import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-red-500 flex flex-col items-center justify-center p-10 font-mono border-4 border-red-900">
          <h1 className="text-2xl font-bold mb-4">CRITICAL SYSTEM ERROR</h1>
          <div className="bg-black/50 p-6 rounded border border-red-500/30 max-w-2xl w-full overflow-auto">
            <p className="text-sm mb-4">The SHUBHAM AI OS core has encountered a terminal exception.</p>
            <pre className="text-xs text-red-400">
              {this.state.error?.toString()}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 bg-red-900/20 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded"
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
