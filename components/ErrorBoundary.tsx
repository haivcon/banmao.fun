"use client";

import React, { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '20px',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '60px' }}>😿</div>
                    <h1 style={{ color: '#fff', fontSize: '24px', margin: 0 }}>
                        Oops! Something went wrong
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '400px' }}>
                        An error occurred while loading the page. This might be a temporary issue.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}
                        >
                            🔄 Reload Page
                        </button>
                        <a
                            href="/"
                            style={{
                                padding: '12px 24px',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: '14px'
                            }}
                        >
                            ← Back to Home
                        </a>
                    </div>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details style={{
                            marginTop: '20px',
                            background: 'rgba(239,68,68,0.1)',
                            padding: '15px',
                            borderRadius: '10px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            maxWidth: '600px',
                            width: '100%',
                            textAlign: 'left'
                        }}>
                            <summary style={{ color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                                🐛 Error Details (Dev Mode)
                            </summary>
                            <pre style={{
                                color: '#fca5a5',
                                fontSize: '12px',
                                overflowX: 'auto',
                                marginTop: '10px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                            }}>
                                {this.state.error.message}
                                {'\n\n'}
                                {this.state.error.stack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
