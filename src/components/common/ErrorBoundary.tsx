import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SpacePulse telemetry boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px',
          margin: '24px auto',
          maxWidth: '600px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center'
        }}>
          <AlertTriangle size={36} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>
            {this.props.fallbackTitle || 'Telemetry Render Disrupted'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            An unexpected error occurred while rendering this scientific component. External data feeds remain unaffected.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn btn-primary"
            style={{ margin: '0 auto' }}
          >
            <RefreshCw size={14} />
            <span>Reset Telemetry View</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
