import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/Button";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoDashboard = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            Terjadi Kendala Saat Menampilkan Halaman
          </h2>
          <p className="mb-6 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Sistem mendeteksi kesalahan sementara pada komponen ini. Silakan muat ulang halaman atau kembali ke Dashboard.
          </p>
          {this.state.error && (
            <p className="mb-6 max-w-lg rounded-lg bg-slate-100 p-2.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400 overflow-x-auto text-left">
              {this.state.error.toString()}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={this.handleGoDashboard}>
              <Home className="h-4 w-4 mr-1.5" />
              Ke Dashboard
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Muat Ulang
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

