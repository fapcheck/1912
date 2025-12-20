// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                    <AlertTriangle size={24} className="text-red-400 mb-2" />
                    <p className="text-sm text-red-400 font-medium mb-2">Ошибка загрузки</p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-white transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                    >
                        <RefreshCw size={12} />
                        Повторить
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Compact fallback for inline errors (e.g., inside cards)
export const CompactErrorFallback = () => (
    <div className="flex items-center gap-1 text-red-400 text-xs p-1">
        <AlertTriangle size={12} />
        <span>Ошибка</span>
    </div>
);
