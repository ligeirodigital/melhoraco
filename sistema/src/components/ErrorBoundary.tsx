
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/button";
import { reportError } from "@/lib/reportError";

interface Props {
  children: ReactNode;
  scope?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(error, {
      scope: this.props.scope ?? "error-boundary",
      silent: true,
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg max-w-md border border-slate-200 dark:border-slate-800">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ops! Algo deu errado</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Recarregar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
